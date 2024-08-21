import { Plugin } from 'vite';
import { ObfuscatorOptions } from 'javascript-obfuscator';

interface Config {
    /**
     * Bundle names that need to be excluded.
     */
    excludes: string[];
    /**
     * Enable or disable obfuscator.
     */
    enable: boolean;
    log: boolean;
    /**
     * JavaScript obfuscator options.
     */
    options: ObfuscatorOptions;
}
declare function viteBundleObfuscator(config?: Partial<Config>): Plugin;

export { viteBundleObfuscator as default };
