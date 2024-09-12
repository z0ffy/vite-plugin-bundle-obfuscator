import type {ObfuscatorOptions} from "javascript-obfuscator";
import type {UserConfig} from "vite";

export type ViteConfigFn = (config: UserConfig, env: { mode: string, command: string }) => UserConfig | null | void;

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
  * enable auto exclude node_modules
  * */
  autoExcludeNodeModules: boolean;
  /**
   * JavaScript obfuscator options.
   */
  options: ObfuscatorOptions;
}
