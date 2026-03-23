import type { Plugin, PluginOption, Rollup, ResolvedConfig, IndexHtmlTransformHook } from 'vite';
import { BundleList, Config, ViteConfigFn } from './type';
import {
  CodeSizeAnalyzer,
  createWorkerTask,
  ensureBundlerOptions,
  getBundlerOptions,
  getChunkName,
  getCodeSplittingGroupNames,
  getManualChunks,
  getThreadPoolSize,
  getValidBundleList,
  getViteMajorVersion,
  isEnabledFeature,
  isEnableAutoExcludesNodeModules,
  isEnableThreadPool,
  Log,
  modifyChunkName,
  obfuscateBundle,
  obfuscateLibBundle,
} from './utils';
import { isArray, isFunction, isLibMode, isNuxtProject, isObject } from './utils/is';
import { defaultConfig, LOG_COLOR, NODE_MODULES, VENDOR_MODULES } from './utils/constants';

export default function viteBundleObfuscator(config?: Partial<Config>): PluginOption {
  const finalConfig: Config = { ...defaultConfig, ...config };
  const _log = new Log(finalConfig.log);
  let _isLibMode = false;
  let _isNuxtProject = false;
  let _isSsrBuild = false;

  const obfuscateAllChunks = async (
    bundle: Rollup.OutputBundle,
    opts: { config?: Config; log?: Log } = {},
  ) => {
    const configToUse = opts.config ?? finalConfig;
    const log = opts.log ?? _log;
    log.forceLog(LOG_COLOR.info + '\nstarting obfuscation process...');
    const analyzer = new CodeSizeAnalyzer(log);
    const bundleList = getValidBundleList(configToUse, bundle);
    analyzer.start(bundleList);

    if (isEnableThreadPool(configToUse)) {
      const poolSize = Math.min(getThreadPoolSize(configToUse), bundleList.length);
      const chunkSize = Math.ceil(bundleList.length / poolSize);
      const workerPromises = [];

      for (let i = 0; i < poolSize; i++) {
        const chunk = bundleList.slice(i * chunkSize, (i + 1) * chunkSize);
        workerPromises.push(createWorkerTask(configToUse, chunk));
      }

      await Promise.all(workerPromises);
    } else {
      bundleList.forEach(([fileName, bundleItem]) => {
        const { code, map } = obfuscateBundle(configToUse, fileName, bundleItem);
        bundleItem.code = code;
        bundleItem.map = map as any;
      });
    }

    analyzer.end(bundleList);
  };

  const modifyConfigHandler: ViteConfigFn = (config, env) => {
    _isSsrBuild = !!env.isSsrBuild;
    _isLibMode = isLibMode(config);
    _isNuxtProject = isNuxtProject(config);

    if (finalConfig.enable && isEnabledFeature(finalConfig.obfuscateWorker)) {
      const original = config.worker?.plugins;

      config.worker = config.worker || {};
      config.worker.plugins = () => {
        const originalPluginsOption = original ?? [];
        const resolvedOriginalPlugins = isFunction(originalPluginsOption)
          ? originalPluginsOption()
          : originalPluginsOption;
        const originalPlugins = (isArray(resolvedOriginalPlugins)
          ? resolvedOriginalPlugins
          : [resolvedOriginalPlugins]
        ).filter(Boolean);

        const hasWorkerPlugin = originalPlugins.some(
          p => isObject(p) && 'name' in p && (p as any).name === 'vite-plugin-bundle-obfuscator:worker',
        );
        if (hasWorkerPlugin) return originalPlugins;

        return [
          ...originalPlugins,
          {
            name: 'vite-plugin-bundle-obfuscator:worker',
            apply: finalConfig.apply,
            enforce: 'post',
            async generateBundle(_outputOptions, bundle) {
              if (!finalConfig.enable || !bundle || _isSsrBuild) return;
              const workerConfig: Config = {
                ...finalConfig,
                excludes: [...finalConfig.excludes, ...finalConfig.obfuscateWorkerExcludes],
              };
              await obfuscateAllChunks(bundle, { config: workerConfig, log: new Log(workerConfig.log) });
            },
          } satisfies Plugin,
        ];
      };
    }

    if (!finalConfig.enable || !isEnableAutoExcludesNodeModules(finalConfig) || _isLibMode || _isNuxtProject) {
      return;
    }

    config.build = config.build || {};
    const bundlerOptions = ensureBundlerOptions(config.build);
    const { output } = bundlerOptions as { output?: Rollup.OutputOptions | Rollup.OutputOptions[] };

    const manualChunks = [...getManualChunks(finalConfig)];

    const addAutoExcludePatterns = (codeSplittingGroupNames: string[] = []) => {
      finalConfig.excludes.push(
        VENDOR_MODULES,
        ...manualChunks.map(modifyChunkName),
        ...codeSplittingGroupNames,
      );
    };

    const defaultManualChunks = (id: string) => {
      if (id.includes(NODE_MODULES)) return getChunkName(id, manualChunks);
      return undefined;
    };

    if (!output) {
      addAutoExcludePatterns();
      bundlerOptions.output = { manualChunks: defaultManualChunks };
      return;
    }

    const optionsName = getViteMajorVersion() >= 8 && config.build.rolldownOptions ? 'rolldownOptions' : 'rollupOptions';
    const isVite8Plus = getViteMajorVersion() >= 8;

    if (isArray(output)) {
      _log.forceLog(LOG_COLOR.warn, `${optionsName}.output is an array, ignoring autoExcludeNodeModules configuration.`);
      return;
    }

    if (isObject(output)) {
      const codeSplittingGroupNames = isVite8Plus
        ? getCodeSplittingGroupNames((output as { codeSplitting?: unknown }).codeSplitting)
        : [];
      const splittingHandlesVendors = isVite8Plus && codeSplittingGroupNames.length > 0 && !output.manualChunks;

      if (!output.manualChunks) {
        if (splittingHandlesVendors) {
          addAutoExcludePatterns(codeSplittingGroupNames);
        } else {
          addAutoExcludePatterns();
          output.manualChunks = defaultManualChunks;
        }
      } else if (isObject(output.manualChunks)) {
        _log.forceLog(LOG_COLOR.warn, `${optionsName}.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.`);
      } else if (isFunction(output.manualChunks)) {
        type ChunkMeta = { getModuleInfo: (moduleId: string) => Rollup.ModuleInfo | null };
        const originalManualChunks = output.manualChunks as (id: string, meta: ChunkMeta) => any;

        addAutoExcludePatterns(codeSplittingGroupNames);
        output.manualChunks = (id: string, meta: ChunkMeta) => {
          return defaultManualChunks(id) || originalManualChunks(id, meta);
        };
      }
    }
  };

  const configResolvedHandler: (resolvedConfig: ResolvedConfig) => void | Promise<void> = (resolvedConfig) => {
    const sourcemap = resolvedConfig.build.sourcemap;
    if (sourcemap) {
      const output = getBundlerOptions(resolvedConfig.build)?.output;
      const sourcemapBaseUrl = !isArray(output) ? output?.sourcemapBaseUrl : undefined;
      finalConfig.options = {
        ...finalConfig.options,
        sourceMap: true,
        sourceMapMode: sourcemap === 'inline' ? 'inline' : 'separate',
        ...(sourcemapBaseUrl && { sourceMapBaseUrl: sourcemapBaseUrl }),
      };
    }
  };

  const transformIndexHtmlHandler: IndexHtmlTransformHook = async (html, { bundle }) => {
    if (!finalConfig.enable || !bundle || _isNuxtProject || _isSsrBuild) return html;
    await obfuscateAllChunks(bundle);
    return html;
  };

  const generateBundleHandler: Rollup.Plugin['generateBundle'] = async (_, bundle) => {
    if (!finalConfig.enable || !bundle || _isLibMode || !_isNuxtProject || _isSsrBuild) return;
    await obfuscateAllChunks(bundle);
  };

  const renderChunkHandler: Rollup.Plugin['renderChunk'] = (code: string, chunk: Rollup.RenderedChunk) => {
    if (!finalConfig.enable || !_isLibMode || _isSsrBuild) return null;

    const analyzer = new CodeSizeAnalyzer(_log);
    const bundleList = [[chunk.name, { code }]] as BundleList;
    analyzer.start(bundleList);

    const { code: obfuscatedCode, map } = obfuscateLibBundle(finalConfig, chunk.name, code);

    analyzer.end(bundleList);

    return {
      code: obfuscatedCode,
      map,
    };
  };

  const getTransformIndexHtml = () => {
    const viteVersion = getViteMajorVersion();
    if (viteVersion >= 5) {
      return {
        order: 'post',
        handler: transformIndexHtmlHandler,
      };
    }

    return {
      enforce: 'post',
      transform: transformIndexHtmlHandler,
    } as any;
  };

  return {
    name: 'vite-plugin-bundle-obfuscator',
    apply: finalConfig.apply,
    config: modifyConfigHandler,
    configResolved: configResolvedHandler,
    renderChunk: renderChunkHandler,
    transformIndexHtml: getTransformIndexHtml(),
    generateBundle: generateBundleHandler,
  };
}
