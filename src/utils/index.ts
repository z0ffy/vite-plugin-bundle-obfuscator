import * as vite from 'vite';
import { Rollup } from 'vite';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import javascriptObfuscator from 'javascript-obfuscator';

import type { BundleList, Config, FormatSizeResult, ObfuscationResult, SizeResult } from '../type';
import { isBoolean, isFileNameExcluded, isObject } from './is';
import { CHUNK_PREFIX, LOG_COLOR, SizeUnit, VENDOR_MODULES } from './constants';

export class Log {
  private readonly _log: (msg: string) => void;

  constructor(show: boolean) {
    this._log = show ? console.log.bind(console) : this.noop;
  }

  private noop(): void {
  }

  forceLog(...reset: (string | number)[]): void {
    console.log(...reset);
  }

  info(msg: string): void {
    this._log(msg);
  }
}

export function getViteMajorVersion(): number {
  return vite?.version ? Number(vite.version.split('.')[0]) : 2;
}

export function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return [
    hours ? `${hours}h ` : '',
    minutes ? `${minutes}m ` : '',
    seconds || (!hours && !minutes) ? `${seconds}s` : '',
  ].filter(Boolean).join('');
}

export function isEnabledFeature(featureConfig: boolean | { enable: boolean }): boolean {
  if (isBoolean(featureConfig)) return featureConfig;
  if (isObject(featureConfig) && 'enable' in featureConfig) return featureConfig.enable;
  return false;
}

export function isEnableThreadPool(finalConfig: Config): boolean {
  return isEnabledFeature(finalConfig.threadPool);
}

export function isEnableAutoExcludesNodeModules(finalConfig: Config): boolean {
  return isEnabledFeature(finalConfig.autoExcludeNodeModules);
}

export function getManualChunks(finalConfig: Config): string[] {
  const { autoExcludeNodeModules } = finalConfig;

  if (isBoolean(autoExcludeNodeModules)) return [];
  if (isObject(autoExcludeNodeModules) && autoExcludeNodeModules.enable) return autoExcludeNodeModules.manualChunks || [];

  return [];
}

export function modifyChunkName(chunkName: string): string {
  return CHUNK_PREFIX + chunkName;
}

export function getThreadPoolSize(finalConfig: Config): number {
  const { threadPool } = finalConfig;
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

export class ObfuscatedFilesRegistry {
  private static instance: ObfuscatedFilesRegistry;
  private obfuscatedFiles: Set<string> = new Set();

  private constructor() {
  }

  public static getInstance(): ObfuscatedFilesRegistry {
    if (!ObfuscatedFilesRegistry.instance) {
      ObfuscatedFilesRegistry.instance = new ObfuscatedFilesRegistry();
    }
    return ObfuscatedFilesRegistry.instance;
  }

  public markAsObfuscated(fileName: string): void {
    if (!fileName) return;
    this.obfuscatedFiles.add(fileName);
  }

  public isObfuscated(fileName: string): boolean {
    if (!fileName) return false;
    return this.obfuscatedFiles.has(fileName);
  }

  public getAllObfuscatedFiles(): string[] {
    return Array.from(this.obfuscatedFiles);
  }

  public clear(): void {
    this.obfuscatedFiles.clear();
  }

  public serialize(): string[] {
    return Array.from(this.obfuscatedFiles);
  }

  public updateFromSerialized(serializedFiles: string[]): void {
    if (!serializedFiles || !Array.isArray(serializedFiles)) return;

    serializedFiles.forEach((file) => {
      this.obfuscatedFiles.add(file);
    });
  }
}

export function obfuscateBundle(finalConfig: Config, fileName: string, bundleItem: Rollup.OutputChunk): { code: string; map: Rollup.SourceMapInput } {
  const _log = new Log(finalConfig.log);
  const registry = ObfuscatedFilesRegistry.getInstance();

  if (registry.isObfuscated(fileName)) {
    _log.info(`skipping ${fileName} (already in obfuscated registry)`);
    return { code: bundleItem.code, map: bundleItem.map };
  }

  _log.info(`obfuscating ${fileName}...`);
  const fileSpecificOptions = finalConfig.options.sourceMap
    ? {
        ...finalConfig.options,
        inputFileName: fileName,
        sourceMapFileName: `${fileName}.map`,
      }
    : finalConfig.options;
  const obfuscationResult = javascriptObfuscator.obfuscate(bundleItem.code, fileSpecificOptions);
  _log.info(`obfuscation complete for ${fileName}.`);

  registry.markAsObfuscated(fileName);
  _log.info(`added ${fileName} to obfuscated files registry`);

  const sourceMap = obfuscationResult.getSourceMap();

  return {
    code: obfuscationResult.getObfuscatedCode(),
    map: sourceMap ? JSON.parse(sourceMap) : null,
  };
}

export function obfuscateLibBundle(finalConfig: Config, fileName: string, code: string): { code: string; map: Rollup.SourceMapInput } {
  const _log = new Log(finalConfig.log);
  const registry = ObfuscatedFilesRegistry.getInstance();

  if (registry.isObfuscated(fileName)) {
    _log.info(`skipping ${fileName} (already in obfuscated registry)`);
    return { code, map: null };
  }

  _log.info(`obfuscating ${fileName}...`);
  const fileSpecificOptions = finalConfig.options.sourceMap
    ? {
        ...finalConfig.options,
        inputFileName: fileName,
        sourceMapFileName: `${fileName}.map`,
      }
    : finalConfig.options;
  const obfuscated = javascriptObfuscator.obfuscate(code, fileSpecificOptions);
  _log.info(`obfuscation complete for ${fileName}.`);

  registry.markAsObfuscated(fileName);
  _log.info(`added ${fileName} to obfuscated files registry`);

  return {
    code: obfuscated.getObfuscatedCode(),
    map: JSON.parse(obfuscated.getSourceMap() || 'null'),
  };
}

export function createWorkerTask(finalConfig: Config, chunk: BundleList) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, WORKER_FILE_PATH));
    const registry = ObfuscatedFilesRegistry.getInstance();

    worker.postMessage({
      config: finalConfig,
      chunk: JSON.parse(JSON.stringify(chunk)),
      registryState: registry.serialize(),
    });

    worker.on('message', (value) => {
      if (value.results && Array.isArray(value.results)) {
        chunk.forEach(([fileName, bundleItem]) => {
          const result = value.results.find((i: ObfuscationResult) => i.fileName === fileName);
          if (result && result.obfuscatedCode) {
            bundleItem.code = result.obfuscatedCode;
            bundleItem.map = result.map || null;
          }
        });
      }

      if (value.registryState && Array.isArray(value.registryState)) {
        registry.updateFromSerialized(value.registryState);
      }

      resolve(value);
      worker.unref();
    });

    worker.on('error', (err) => {
      reject(err);
      worker.unref();
    });
  });
}

export function formatSize(bytes: number): FormatSizeResult {
  const units = Object.values(SizeUnit);
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return {
    value: Number(bytes.toFixed(2)),
    unit: units[i],
  };
}

export class CodeSizeAnalyzer {
  private _log;
  private originalSize: SizeResult;
  private obfuscatedSize: SizeResult;
  private startTime: number;
  private endTime: number;

  constructor(log: Log) {
    this._log = log;
    this.originalSize = this.createEmptySizeResult();
    this.obfuscatedSize = this.createEmptySizeResult();
    this.startTime = 0;
    this.endTime = 0;
  }

  private createEmptySizeResult(): SizeResult {
    return {
      original: { value: 0, unit: SizeUnit.B },
      gzip: { value: 0, unit: SizeUnit.B },
    };
  }

  start(originalBundleList: BundleList): void {
    this.startTime = performance.now();
    this.originalSize = this.calculateBundleSize(originalBundleList);
  }

  end(obfuscatedBundleList: BundleList): void {
    this.obfuscatedSize = this.calculateBundleSize(obfuscatedBundleList);
    this.endTime = performance.now();
    this.logResult();
  }

  private calculateBundleSize(bundleList: BundleList): { original: FormatSizeResult; gzip: FormatSizeResult } {
    const { totalSize, gzipSize } = bundleList.reduce(
      (acc, [, bundleItem]) => {
        if (bundleItem.code) {
          const { code } = bundleItem;
          acc.totalSize += Buffer.byteLength(code, 'utf-8');
          acc.gzipSize += gzipSync(code, { level: 9 }).byteLength;
        }
        return acc;
      },
      { totalSize: 0, gzipSize: 0 },
    );

    return {
      original: formatSize(totalSize),
      gzip: formatSize(gzipSize),
    };
  }

  private analyze(): string {
    const { originalSize, obfuscatedSize } = this;

    const consume = formatTime(this.endTime - this.startTime);

    const percentageIncrease = (
      ((obfuscatedSize.original.value - originalSize.original.value) / originalSize.original.value)
      * 100
    ).toFixed(2);

    const gzipPercentageIncrease = (
      ((obfuscatedSize.gzip.value - originalSize.gzip.value) / originalSize.gzip.value)
      * 100
    ).toFixed(2);

    return `✓ obfuscated in ${consume} | 📦 ${originalSize.original.value}${originalSize.original.unit} (gzip: ${originalSize.gzip.value}${originalSize.gzip.unit}) → 🔒 ${obfuscatedSize.original.value}${obfuscatedSize.original.unit} (gzip: ${obfuscatedSize.gzip.value}${obfuscatedSize.gzip.unit}) | 📈 ${percentageIncrease}% (gzip: ${gzipPercentageIncrease}%)`;
  }

  private logResult(): void {
    this._log.forceLog(LOG_COLOR.success + '%s\x1b[0m', this.analyze());
  }
}
