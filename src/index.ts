import type {IndexHtmlTransformHook, PluginOption, Rollup} from 'vite';
import type {Config, ViteConfigFn} from "./type";
import * as vite from 'vite';
import javascriptObfuscator from 'javascript-obfuscator';
import {formatTime, Log} from "./utils";
import {isArray, isFileNameExcluded, isFunction, isObject} from "./utils/is";
import {defaultConfig, LOG_COLOR, NODE_MODULES} from "./utils/constants";

function getViteMajorVersion() {
  return vite?.version ? Number(vite.version.split('.')[0]) : 2
}

export default function viteBundleObfuscator(config?: Partial<Config>): PluginOption {
  const finalConfig = {...defaultConfig, ...config};
  const _log = new Log(finalConfig.log);

  const modifyConfigHandler: ViteConfigFn = (config) => {
    if (!finalConfig.enable || !finalConfig.autoExcludeNodeModules) return;

    config.build = config.build || {};
    config.build.rollupOptions = config.build.rollupOptions || {};
    let {output} = config.build.rollupOptions;

    const defaultManualChunks = (id: string) => {
      finalConfig.excludes.push(NODE_MODULES);
      if (id.includes('node_modules')) return NODE_MODULES;
    };

    if (!output) {
      config.build.rollupOptions.output = {manualChunks: defaultManualChunks};
      return;
    }

    if (isArray(output)) {
      _log.alwaysLog(LOG_COLOR.warn, 'rollupOptions.output is an array, ignoring autoExcludeNodeModules configuration.');
      return;
    }

    if (isObject(output)) {
      if (!output.manualChunks) {
        output.manualChunks = defaultManualChunks;
      } else if (isObject(output.manualChunks)) {
        _log.alwaysLog(LOG_COLOR.warn, 'rollupOptions.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.');
      } else if (isFunction(output.manualChunks)) {
        const originalManualChunks = output.manualChunks as (id: string, meta: Rollup.ManualChunkMeta) => any;
        finalConfig.excludes.push(NODE_MODULES);

        output.manualChunks = (id: string, meta: Rollup.ManualChunkMeta) => {
          if (id.includes('node_modules')) return NODE_MODULES;
          return originalManualChunks(id, meta);
        };
      }
    }
  };

  const transformIndexHtmlHandler: IndexHtmlTransformHook = (html, {bundle}) => {
    if (!finalConfig.enable || !bundle) return html;

    const now = performance.now();
    _log.alwaysLog('starting obfuscation process...');
    Object.entries(bundle).forEach(([fileName, bundleItem]) => {
      if ('code' in bundleItem && bundleItem.code && !isFileNameExcluded(fileName, finalConfig.excludes)) {
        _log.info(`obfuscating ${fileName}...`);
        bundleItem.code = javascriptObfuscator.obfuscate(bundleItem.code, finalConfig.options).getObfuscatedCode();
        _log.info(`obfuscation complete for ${fileName}.`);
      }
    });
    const consume = formatTime(performance.now() - now);
    _log.alwaysLog(LOG_COLOR.info + '%s\x1b[0m %s', '✓', `obfuscation process completed in ${consume}.`);

    return html;
  }

  return {
    name: 'vite-plugin-bundle-obfuscator',
    config: modifyConfigHandler,
    transformIndexHtml: getViteMajorVersion() >= 5 ? {
      order: 'post',
      handler: transformIndexHtmlHandler
    } : {
      enforce: 'post',
      transform: transformIndexHtmlHandler
    }
  };
}
