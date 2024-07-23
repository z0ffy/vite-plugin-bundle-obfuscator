import { Plugin } from 'vite';
import { ObfuscatorOptions } from 'javascript-obfuscator';

interface Config {
    excludes: string[];
    options: ObfuscatorOptions;
}
declare function viteBundleObfuscator(config: Config): Plugin;

export { viteBundleObfuscator as default };
