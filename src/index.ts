import type { IndexHtmlTransformHook, PluginOption, Rollup } from 'vite';
import { Config, ViteConfigFn } from './type';
import {
  CodeSizeAnalyzer,
  createWorkerTask,
  getChunkName,
  getManualChunks,
  getThreadPoolSize,
  getValidBundleList,
  getViteMajorVersion,
  isEnableAutoExcludesNodeModules,
  isEnableThreadPool,
  Log,
  modifyChunkName,
  obfuscateBundle,
} from './utils';
import { isArray, isFunction, isObject } from './utils/is';
import { defaultConfig, LOG_COLOR, NODE_MODULES, VENDOR_MODULES } from './utils/constants';

export default function viteBundleObfuscator(config?: Partial<Config>): PluginOption {
  const finalConfig = { ...defaultConfig, ...config };
  const _log = new Log(finalConfig.log);

  const modifyConfigHandler: ViteConfigFn = (config) => {
    if (!finalConfig.enable || !isEnableAutoExcludesNodeModules(finalConfig)) return;

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

  const transformIndexHtmlHandler: IndexHtmlTransformHook = async (html, { bundle }) => {
    if (!finalConfig.enable || !bundle) return html;

    _log.forceLog(LOG_COLOR.info + '\nstarting obfuscation process...');
    const analyzer = new CodeSizeAnalyzer(_log);
    const bundleList = getValidBundleList(finalConfig, bundle);
    analyzer.start(bundleList);

    if (isEnableThreadPool(finalConfig)) {
      const poolSize = Math.min(getThreadPoolSize(finalConfig), bundleList.length);
      const chunkSize = Math.ceil(bundleList.length / poolSize);
      const workerPromises = [];

      for (let i = 0; i < poolSize; i++) {
        const chunk = bundleList.slice(i * chunkSize, (i + 1) * chunkSize);
        workerPromises.push(createWorkerTask(finalConfig, chunk));
      }

      await Promise.all(workerPromises);
    } else {
      bundleList.forEach(([fileName, bundleItem]) => {
        bundleItem.code = obfuscateBundle(finalConfig, fileName, bundleItem);
      });
    }

    analyzer.end(bundleList);

    return html;
  };

  return {
    name: 'vite-plugin-bundle-obfuscator',
    apply: finalConfig.apply,
    config: modifyConfigHandler,
    transformIndexHtml: getViteMajorVersion() >= 5 ? {
      order: 'post',
      handler: transformIndexHtmlHandler,
    } : {
      enforce: 'post',
      transform: transformIndexHtmlHandler,
    },
  };
}
