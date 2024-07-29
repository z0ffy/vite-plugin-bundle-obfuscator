import type {Plugin} from 'vite';
import type {ObfuscatorOptions} from 'javascript-obfuscator';
import javascriptObfuscator from 'javascript-obfuscator';

interface Config {
  /**
   * Bundle names that need to be excluded.
   */
  excludes: string[];
  /**
   * Enable or disable obfuscator.
   */
  enable: boolean;
  /**
   * JavaScript obfuscator options.
   */
  options: ObfuscatorOptions;
}

const defaultConfig: Readonly<Config> = {
  excludes: [],
  enable: true,
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: false,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: false,
    stringArray: false,
    stringArrayCallsTransform: false,
    stringArrayCallsTransformThreshold: 0.5,
    stringArrayEncoding: [],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
  }
};

export default function viteBundleObfuscator(config?: Partial<Config>): Plugin {
  const finalConfig = {...defaultConfig, ...config};

  return {
    name: 'vite-plugin-bundle-obfuscator',
    transformIndexHtml: {
      enforce: 'post',
      transform(html, {bundle}) {
        if (!finalConfig.enable || !bundle) return html;

        console.log('Starting obfuscation process...');
        Object.entries(bundle).forEach(([fileName, bundleItem]) => {
          if ('code' in bundleItem && bundleItem.code && finalConfig.excludes.every(exclude => !fileName.includes(exclude))) {
            console.log(`Obfuscating ${fileName}...`);
            bundleItem.code = javascriptObfuscator.obfuscate(bundleItem.code, finalConfig.options).getObfuscatedCode();
            console.log(`Obfuscation complete for ${fileName}`);
          }
        });
        console.log('Obfuscation process completed.');

        return html;
      }
    }
  };
}
