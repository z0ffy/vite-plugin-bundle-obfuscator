import type {IndexHtmlTransformHook, PluginOption} from 'vite';
import * as vite from 'vite';
import type {Config} from "./type";
import javascriptObfuscator from 'javascript-obfuscator';
import {defaultConfig} from "./utils";

function getViteMajorVersion() {
  return vite?.version ? Number(vite.version.split('.')[0]) : 2
}

export default function viteBundleObfuscator(config?: Partial<Config>): PluginOption {
  const finalConfig = {...defaultConfig, ...config};

  const transformIndexHtmlHandler: IndexHtmlTransformHook = (html, {bundle}) => {
    if (!finalConfig.enable || !bundle) return html;

    const now = performance.now();
    console.log('starting obfuscation process...');
    Object.entries(bundle).forEach(([fileName, bundleItem]) => {
      if ('code' in bundleItem && bundleItem.code && finalConfig.excludes.every(exclude => !fileName.includes(exclude))) {
        if (finalConfig.log) console.log(`Obfuscating ${fileName}...`);
        bundleItem.code = javascriptObfuscator.obfuscate(bundleItem.code, finalConfig.options).getObfuscatedCode();
        if (finalConfig.log) console.log(`Obfuscation complete for ${fileName}`);
      }
    });
    const consume = (performance.now() - now) / 1000;
    console.log('obfuscation process completed in ' + consume.toFixed(1) + 's');

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
