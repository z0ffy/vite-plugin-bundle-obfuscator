import type {ObfuscatorOptions} from "javascript-obfuscator";
import type {Plugin, Rollup} from "vite";

export type ViteConfigFn = Plugin['config'];

export type BundleList = Array<[string, Rollup.OutputChunk]>;

export interface WorkerMessage {
  config: Config,
  chunk: BundleList
}

export interface ObfuscationResult {
  fileName: string;
  obfuscatedCode: string;
}

export interface Config {
  /**
   * Bundle names that need to be excluded.
   */
  excludes: (RegExp | string)[];
  /**
   * Enable or disable obfuscator.
   */
  enable: boolean;
  /**
   * Show or hide log.
   */
  log: boolean;
  /**
   * Enable auto exclude node_modules.
   * */
  autoExcludeNodeModules: boolean;
  /**
   * Determines if the plugin should apply during `build` or `serve`.
   * It uses the apply type defined in Vite.
   */
  apply: Plugin['apply'];
  /**
   * Configuration for the thread pool.
   * Can be either:
   * - A boolean value.
   * - An object with `enable` and `size` properties when enabled.
   *   - `enable`: true to enable the thread pool.
   *   - `size`: the number of threads in the pool.
   *   - `enable`: false to disable the thread pool (no `size` needed).
   */
  threadPool: boolean | ({ enable: true; size: number } | { enable: false });
  /**
   * JavaScript obfuscator options.
   */
  options: ObfuscatorOptions;
}
