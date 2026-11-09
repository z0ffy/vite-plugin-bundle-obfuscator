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

export function createLibraryHooks(config: Config, log: Log) {
  let buildNonce = randomBytes(16).toString('hex');

  const buildStart = () => {
    buildNonce = randomBytes(16).toString('hex');
  };

  const augmentChunkHash = () => {
    const seed = config.options.seed;
    const random = !seed || seed === '0' || isEnablePro(config);
    return createHash('sha256').update(JSON.stringify({
      version,
      obfuscatorVersion: javascriptObfuscator.version,
      options: config.options,
      excludes: config.excludes.map(String),
      nonce: random ? buildNonce : undefined,
    })).digest('hex');
  };

  const generateBundle: Rollup.Plugin['generateBundle'] = async function (outputOptions, bundle) {
    const bundleList = getValidBundleList(config, bundle);
    if (!bundleList.length) return;

    const sourcemap = outputOptions.sourcemap || (config.options.sourceMap
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
      const match = sourceMapComment.exec(chunk.code);
      if (match) {
        originalMapUrls.set(fileName, match[1]);
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

    for (const [fileName, chunk] of bundleList) {
      // Replace the obfuscator's map comment with the final composed map reference.
      chunk.code = chunk.code.replace(sourceMapComment, '');
      if (!sourcemap || !chunk.map) continue;

      const serialized = serializeSourcemap(chunk.map)!;
      const map = JSON.parse(serialized);
      map.file = path.posix.basename(fileName);
      if (outputOptions.sourcemapExcludeSources) delete map.sourcesContent;
      const source = JSON.stringify(map);

      if (sourcemap === 'inline') {
        chunk.code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(source).toString('base64')}\n`;
        continue;
      }

      const mapFileName = chunk.sourcemapFileName || `${fileName}.map`;
      const asset = bundle[mapFileName];
      if (asset?.type === 'asset') asset.source = source;
      else this.emitFile({ type: 'asset', fileName: mapFileName, source });

      if (sourcemap !== 'hidden') {
        const baseUrl = outputOptions.sourcemapBaseUrl || config.options.sourceMapBaseUrl;
        const originalUrl = originalMapUrls.get(fileName);
        const mapUrl = baseUrl
          ? new URL(mapFileName, baseUrl).href
          : originalUrl && !originalUrl.startsWith('data:')
            ? originalUrl
            : path.posix.relative(path.posix.dirname(fileName), mapFileName);
        chunk.code += `\n//# sourceMappingURL=${mapUrl}\n`;
      }
    }
    analyzer.end(bundleList);
  };

  return { buildStart, augmentChunkHash, generateBundle };
}
