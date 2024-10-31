import * as vite from "vite";
import {Rollup} from "vite";
import {BundleList, Config, ObfuscationResult} from "../type";
import os from 'node:os';
import {isBoolean, isFileNameExcluded, isObject} from "./is";
import {Worker} from "node:worker_threads";
import path from "node:path";
import javascriptObfuscator from "javascript-obfuscator";
import {CHUNK_PREFIX, VENDOR_MODULES} from "./constants";

export class Log {
  private readonly _log: (msg: string) => void;

  constructor(show: boolean) {
    this._log = show ? console.log.bind(console) : this.noop;
  }

  private noop(_: string): void {
  }

  forceLog(...reset: (string | number)[]): void {
    console.log(...reset);
  }

  info(msg: string): void {
    this._log(msg);
  }
}

export function getViteMajorVersion(): number {
  return vite?.version ? Number(vite.version.split('.')[0]) : 2
}

export function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return [
    hours ? `${hours}h ` : '',
    minutes ? `${minutes}m ` : '',
    seconds || (!hours && !minutes) ? `${seconds}s` : ''
  ].filter(Boolean).join('');
}

export function isEnabledFeature(featureConfig: boolean | { enable: boolean }): boolean {
  if (isBoolean(featureConfig)) return featureConfig;
  if (isObject(featureConfig)) return featureConfig.enable;
  return false;
}

export function isEnableThreadPool(finalConfig: Config): boolean {
  return isEnabledFeature(finalConfig.threadPool);
}

export function isEnableAutoExcludesNodeModules(finalConfig: Config): boolean {
  return isEnabledFeature(finalConfig.autoExcludeNodeModules);
}

export function getManualChunks(finalConfig: Config): string[] {
  const {autoExcludeNodeModules} = finalConfig;

  if (isBoolean(autoExcludeNodeModules)) return [];
  if (isObject(autoExcludeNodeModules) && autoExcludeNodeModules.enable) return autoExcludeNodeModules.manualChunks;

  return [];
}

export function modifyChunkName(chunkName: string): string {
  return CHUNK_PREFIX + chunkName;
}

export function getThreadPoolSize(finalConfig: Config): number {
  const {threadPool} = finalConfig;
  const defaultSize = os.cpus().length;

  if (isBoolean(threadPool)) return defaultSize;
  if (isObject(threadPool)) {
    if (threadPool.enable) {
      if (!threadPool.size) return defaultSize;
      return threadPool.size;
    }
  }

  return defaultSize;
}

export function getValidBundleList(finalConfig: Config, bundle: Rollup.OutputBundle): BundleList {
  const validItems: BundleList = [];
  Object.entries(bundle).forEach(([fileName, bundleItem]) => {
    if ('code' in bundleItem && bundleItem.code && !isFileNameExcluded(fileName, finalConfig.excludes)) {
      validItems.push([fileName, bundleItem]);
    }
  });
  return validItems;
}

export function getChunkName(id: string, manualChunks: string[]): string {
  for (const chunkName of manualChunks) {
    if (id.includes(chunkName)) return modifyChunkName(chunkName);
  }

  return VENDOR_MODULES;
}

export function obfuscateBundle(finalConfig: Config, fileName: string, bundleItem: Rollup.OutputChunk): string {
  const _log = new Log(finalConfig.log);
  _log.info(`obfuscating ${fileName}...`);
  const obfuscatedCode = javascriptObfuscator.obfuscate(bundleItem.code, finalConfig.options).getObfuscatedCode();
  _log.info(`obfuscation complete for ${fileName}.`);
  return obfuscatedCode;
}

export function createWorkerTask(finalConfig: Config, chunk: BundleList) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, WORKER_FILE_PATH));
    worker.postMessage({config: finalConfig, chunk});

    worker.on('message', (value) => {
      chunk.forEach(([fileName, bundleItem]) => {
        const result = value.find((i: ObfuscationResult) => i.fileName === fileName);
        if (result && result.obfuscatedCode) {
          bundleItem.code = result.obfuscatedCode;
        }
      });
      resolve(value);
      worker.unref();
    });

    worker.on('error', (err) => {
      reject(err);
      worker.unref();
    });
  });
}
