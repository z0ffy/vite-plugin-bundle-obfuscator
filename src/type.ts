import type {ObfuscatorOptions} from "javascript-obfuscator";

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
  /**
   * JavaScript obfuscator options.
   */
  options: ObfuscatorOptions;
}
