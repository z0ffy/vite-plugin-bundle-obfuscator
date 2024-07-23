import type {Plugin} from 'vite';
import type {ObfuscatorOptions} from 'javascript-obfuscator';

import javascriptObfuscator from 'javascript-obfuscator';

interface Config {
  /*
  * bundle names that need to be excluded
  * */
  excludes: string[];
  /*
  * javascript obfuscator options
  * */
  options: ObfuscatorOptions;
}

export default function viteBundleObfuscator(config: Config): Plugin {
  return {
    name: 'vite-plugin-bundle-obfuscator',
    transformIndexHtml: {
      enforce: 'post',
      transform(t, e) {
        if (!(e !== null && e.bundle)) return t;
        console.log('obfuscate files');
        for (const [r, o] of Object.entries(e.bundle)) {
          if ("code" in o && o.code && config.excludes.every((i) => !r.includes(i))) {
            console.log(`Obfuscating ${r}...`);
            o.code = javascriptObfuscator.obfuscate(o.code, config.options).getObfuscatedCode();
          }
        }
        console.log('obfuscate done');
        return t;
      }
    },
  }
}
