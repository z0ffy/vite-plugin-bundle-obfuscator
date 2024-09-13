import { Plugin, PluginOption } from 'vite';
import { ObfuscatorOptions } from 'javascript-obfuscator';

interface Config {
    /**
     * Bundle names that need to be excluded.
     */
    excludes: (RegExp | string)[];
    /**
     * Enable or disable obfuscator.
     */
    enable: boolean;
    log: boolean;
    autoExcludeNodeModules: boolean;
    /**
     * Determines if the plugin should apply during `build` or `serve`.
     * It uses the apply type defined in Vite.
     */
    apply: Plugin['apply'];
    /**
     * JavaScript obfuscator options.
     */
    options: ObfuscatorOptions;
}

declare function viteBundleObfuscator(config?: Partial<Config>): PluginOption;

export { viteBundleObfuscator as default };
