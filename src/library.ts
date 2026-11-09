import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import javascriptObfuscator from 'javascript-obfuscator';
import type { Rollup } from 'vite';
import { version } from '../package.json';
import type { Config } from './type';
import {
  CodeSizeAnalyzer,
  createWorkerTask,
  getThreadPoolSize,
  getValidBundleList,
  isEnablePro,
  isEnableThreadPool,
  Log,
  obfuscateLibBundle,
  serializeSourcemap,
} from './utils';

const sourceMapComment = /(?:^|\r?\n)[\t ]*\/\/[#@][\t ]*sourceMappingURL=([^\r\n]*)(?:\r?\n)*$/;
const mapMetadataComment = /(?:^|\r?\n)[\t ]*\/\/[#@][\t ]*(sourceMappingURL|debugId)=([^\r\n]*)(?:\r?\n)*$/;
type SourcemapPattern = (chunk: Rollup.PreRenderedChunk) => string;

function chunkKey(chunk: Rollup.PreRenderedChunk): string {
  return JSON.stringify([chunk.name, chunk.facadeModuleId, chunk.moduleIds]);
}

function hashSourcemapFileName(fileName: string, pattern: string | undefined, source: string, characters: Rollup.OutputOptions['hashCharacters']): string {
  if (!pattern || !/\[hash(?::\d+)?\]/.test(pattern)) return fileName;

  // Keep the bundler's resolved name, format and chunk hash; replace only map-content hashes.
  const parts = pattern.split(/(\[\w+(?::\d+)?\])/g);
  const hashSize = Number(/\[hash(?::(\d+))?\]/.exec(pattern)![1]) || 8;
  const matcher = parts.map((part, i) => i % 2
    ? /^\[hash(?::\d+)?\]$/.test(part) ? `([\\w-]{${hashSize}})` : '(.*?)'
    : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  const match = new RegExp(`^${matcher}$`).exec(fileName);
  if (!match) throw new Error(`[vite-plugin-bundle-obfuscator] Cannot resolve sourcemap filename ${fileName} from ${pattern}.`);

  const digest = createHash('sha256').update(source).digest();
  const hash = characters === 'hex'
    ? digest.toString('hex')
    : characters === 'base36'
      ? BigInt(`0x${digest.toString('hex')}`).toString(36)
      : digest.toString('base64url');
  let capture = 0;
  return parts.map((part, i) => {
    if (!(i % 2)) return part;
    const value = match[++capture];
    const token = /^\[hash(?::(\d+))?\]$/.exec(part);
    return token ? hash.slice(0, Number(token[1]) || value.length) : value;
  }).join('');
}

function createDebugId(code: string): string {
  const hash = createHash('sha256').update(code).digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), `4${hash.slice(13, 16)}`,
    `${((parseInt(hash[16], 16) & 3) | 8).toString(16)}${hash.slice(17, 20)}`, hash.slice(20, 32)].join('-');
}

export function createLibraryHooks(config: Config, log: Log) {
  const sourcemapPatterns = new WeakMap<SourcemapPattern, Map<string, string>>();
  const outputOptions: Rollup.Plugin['outputOptions'] = (options) => {
    const original = options.sourcemapFileNames;
    if (!original) return null;
    const patterns = new Map<string, string>();
    const capture: SourcemapPattern = (chunk) => {
      const pattern = typeof original === 'function' ? original(chunk) : original;
      patterns.set(chunkKey(chunk), pattern);
      return pattern;
    };
    // Record each output's templates without invoking the naming callback again.
    sourcemapPatterns.set(capture, patterns);
    return { ...options, sourcemapFileNames: capture };
  };

  const buildStart = () => {
    if (isEnableThreadPool(config)) getThreadPoolSize(config);
  };

  const augmentChunkHash = () => {
    const seed = config.options.seed;
    const random = !seed || seed === '0' || isEnablePro(config);
    return createHash('sha256').update(JSON.stringify({
      version,
      obfuscatorVersion: javascriptObfuscator.version,
      options: config.options,
      excludes: config.excludes.map(String),
      // Random obfuscation needs a fresh hash contribution for each chunk.
      nonce: random ? randomBytes(16).toString('hex') : undefined,
    })).digest('hex');
  };

  const generateBundle: Rollup.Plugin['generateBundle'] = async function (outputOptions, bundle) {
    const bundleList = getValidBundleList(config, bundle);
    if (!bundleList.length) return;

    const sourcemap = outputOptions.sourcemap ?? (config.options.sourceMap
      ? config.options.sourceMapMode === 'inline' ? 'inline' : true
      : false);
    // Always obtain a separate map, then publish the composed map in the requested format.
    const libraryConfig: Config = {
      ...config,
      options: {
        ...config.options,
        sourceMap: !!sourcemap,
        sourceMapMode: 'separate',
        sourceMapBaseUrl: '',
      },
    };
    const originalMapUrls = new Map<string, string>();
    const analyzer = new CodeSizeAnalyzer(log);
    analyzer.start(bundleList);
    for (const [fileName, chunk] of bundleList) {
      let match;
      while ((match = mapMetadataComment.exec(chunk.code))) {
        if (match[1] === 'sourceMappingURL') originalMapUrls.set(fileName, match[2]);
        chunk.code = chunk.code.slice(0, match.index);
      }
    }

    if (isEnableThreadPool(libraryConfig)) {
      const poolSize = Math.min(getThreadPoolSize(libraryConfig), bundleList.length);
      const chunkSize = Math.ceil(bundleList.length / poolSize);
      const tasks = [];
      for (let i = 0; i < poolSize; i++) {
        // Every output and rebuild has its own chunks; never reuse the global registry.
        tasks.push(createWorkerTask(libraryConfig, bundleList.slice(i * chunkSize, (i + 1) * chunkSize), true));
      }
      await Promise.all(tasks);
    } else {
      for (const [fileName, chunk] of bundleList) {
        const result = await obfuscateLibBundle(libraryConfig, fileName, chunk.code, chunk.map);
        chunk.code = result.code;
        chunk.map = result.map as Rollup.SourceMap;
      }
    }

    const obsoleteMapFiles = new Set<string>();
    for (const [fileName, chunk] of bundleList) {
      // Replace the obfuscator's map comment with the final composed map reference.
      chunk.code = chunk.code.replace(sourceMapComment, '');
      if (!sourcemap || !chunk.map) continue;

      const serialized = serializeSourcemap(chunk.map)!;
      const map = JSON.parse(serialized);
      map.file = path.posix.basename(fileName);
      if (outputOptions.sourcemapExcludeSources) delete map.sourcesContent;
      if (outputOptions.sourcemapDebugIds) {
        // The ID must identify the final code, rather than the pre-obfuscation bundle.
        map.debugId = createDebugId(chunk.code);
        chunk.code += `\n//# debugId=${map.debugId}\n`;
      }
      chunk.map = Object.assign(chunk.map, map);
      if (outputOptions.sourcemapExcludeSources) delete chunk.map.sourcesContent;
      const source = JSON.stringify(map);

      if (sourcemap === 'inline') {
        chunk.code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(source).toString('base64')}\n`;
        continue;
      }

      const originalMapFileName = chunk.sourcemapFileName || `${fileName}.map`;
      const naming = outputOptions.sourcemapFileNames;
      const pattern = typeof naming === 'function'
        ? sourcemapPatterns.get(naming)?.get(chunkKey(chunk)) ?? naming(chunk)
        : naming;
      const mapFileName = hashSourcemapFileName(originalMapFileName, pattern, source, outputOptions.hashCharacters);
      chunk.sourcemapFileName = mapFileName;
      if (mapFileName !== originalMapFileName) obsoleteMapFiles.add(originalMapFileName);
      const asset = bundle[mapFileName];
      if (asset?.type === 'asset') asset.source = source;
      else this.emitFile({ type: 'asset', fileName: mapFileName, source });

      if (sourcemap !== 'hidden') {
        const baseUrl = outputOptions.sourcemapBaseUrl || config.options.sourceMapBaseUrl;
        const originalUrl = originalMapUrls.get(fileName);
        const mapUrl = baseUrl
          ? new URL(mapFileName, baseUrl).href
          : mapFileName === originalMapFileName && originalUrl && !originalUrl.startsWith('data:')
            ? originalUrl
            : path.posix.relative(path.posix.dirname(fileName), mapFileName);
        chunk.code += `\n//# sourceMappingURL=${mapUrl}\n`;
      }
    }
    for (const fileName of obsoleteMapFiles) {
      if (!Object.values(bundle).some(chunk => chunk.type === 'chunk' && chunk.sourcemapFileName === fileName)) delete bundle[fileName];
    }
    analyzer.end(bundleList);
  };

  return { buildStart, outputOptions, augmentChunkHash, generateBundle };
}
