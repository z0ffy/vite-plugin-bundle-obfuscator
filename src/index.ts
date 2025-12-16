import type { Plugin, PluginOption, Rollup, ResolvedConfig, IndexHtmlTransformHook } from 'vite';
import { BundleList, Config, ViteConfigFn } from './type';
import {
  CodeSizeAnalyzer,
  createWorkerTask,
  getChunkName,
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
  const finalConfig = { ...defaultConfig, ...config };
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

    if (finalConfig.enable && isEnabledFeature(finalConfig.worker)) {
      const original = config.worker?.plugins;

      config.worker = config.worker || {};
      config.worker.plugins = () => {
        const originalPlugins = (isFunction(original) ? original() : []) || [];

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
                excludes: [...finalConfig.excludes, ...finalConfig.workerExcludes],
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
    config.build.rollupOptions = config.build.rollupOptions || {};
    const { output } = config.build.rollupOptions;

    const manualChunks = [...getManualChunks(finalConfig)];

    const addChunks2Excludes = () => {
      finalConfig.excludes.push(VENDOR_MODULES, ...manualChunks.map(modifyChunkName));
    };

    const defaultManualChunks = (id: string) => {
      if (id.includes(NODE_MODULES)) return getChunkName(id, manualChunks);
      return undefined;
    };

    if (!output) {
      addChunks2Excludes();
      config.build.rollupOptions.output = { manualChunks: defaultManualChunks };
      return;
    }

    if (isArray(output)) {
      _log.forceLog(LOG_COLOR.warn, 'rollupOptions.output is an array, ignoring autoExcludeNodeModules configuration.');
      return;
    }

    if (isObject(output)) {
      if (!output.manualChunks) {
        addChunks2Excludes();
        output.manualChunks = defaultManualChunks;
      } else if (isObject(output.manualChunks)) {
        _log.forceLog(LOG_COLOR.warn, 'rollupOptions.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.');
      } else if (isFunction(output.manualChunks)) {
        const originalManualChunks = output.manualChunks as (id: string, meta: Rollup.ManualChunkMeta) => any;

        addChunks2Excludes();
        output.manualChunks = (id: string, meta: Rollup.ManualChunkMeta) => {
          return defaultManualChunks(id) || originalManualChunks(id, meta);
        };
      }
    }
  };

  const configResolvedHandler: (resolvedConfig: ResolvedConfig) => void | Promise<void> = (resolvedConfig) => {
    const sourcemap = resolvedConfig.build.sourcemap;
    if (sourcemap) {
      const output = resolvedConfig.build.rollupOptions?.output;
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

  const renderChunkHandler: Rollup.RenderChunkHook = (code, chunk) => {
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
