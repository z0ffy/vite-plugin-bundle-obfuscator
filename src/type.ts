import type { ObfuscatorOptions } from "javascript-obfuscator";
import type { Plugin } from "vite";

export type ViteConfigFn = Plugin['config'];

export interface Config {
  /**
   * Bundle names that need to be excluded.
   */
  excludes: (RegExp | string)[];
  /**
   * Enable or disable obfuscator.
   */
  enable: boolean;
  /*
  * Show or hide log
  * */
  log: boolean;
  /*
  * Enable auto exclude node_modules
  * */
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
