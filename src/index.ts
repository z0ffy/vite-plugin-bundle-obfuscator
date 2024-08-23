import type {IndexHtmlTransformHook, PluginOption} from 'vite';
import * as vite from 'vite';
import type {Config} from "./type";
import javascriptObfuscator from 'javascript-obfuscator';
import {defaultConfig, Log} from "./utils";

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
      if ('code' in bundleItem && bundleItem.code && finalConfig.excludes.every(exclude => !fileName.includes(exclude))) {
        _log.info(`obfuscating ${fileName}...`);
        bundleItem.code = javascriptObfuscator.obfuscate(bundleItem.code, finalConfig.options).getObfuscatedCode();
        _log.info(`obfuscation complete for ${fileName}.`);
      }
    });
    const consume = (performance.now() - now) / 1000;
    _log.alwaysLog('✓ obfuscation process completed in ' + consume.toFixed(1) + 's.');

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
