import type {IndexHtmlTransformHook, PluginOption} from 'vite';
import * as vite from 'vite';
import type {Config} from "./type";
import javascriptObfuscator from 'javascript-obfuscator';
import {defaultConfig, formatTime, Log} from "./utils";
import {isFileNameExcluded} from "./utils/is";

function getViteMajorVersion() {
  return vite?.version ? Number(vite.version.split('.')[0]) : 2
}

export default function viteBundleObfuscator(config?: Partial<Config>): PluginOption {
  const finalConfig = {...defaultConfig, ...config};
  const _log = new Log(finalConfig.log);

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
    _log.alwaysLog('\x1b[36m%s\x1b[0m %s', '✓', `obfuscation process completed in ${consume}.`);

    return html;
  }

  return {
    name: 'vite-plugin-bundle-obfuscator',
    transformIndexHtml: getViteMajorVersion() >= 5 ? {
      order: 'post',
      handler: transformIndexHtmlHandler
    } : {
      enforce: 'post',
      transform: transformIndexHtmlHandler
    }
  };
}
