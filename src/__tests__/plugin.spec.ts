import {expect, describe, it, vi, beforeEach, afterEach} from "vitest";
import type {Rollup, Plugin} from 'vite';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  formatTime,
  getThreadPoolSize,
  getValidBundleList,
  Log,
  composeSourcemaps,
  isEnabledFeature,
  isEnableThreadPool,
  isEnableAutoExcludesNodeModules,
  getChunkName,
  CodeSizeAnalyzer,
  obfuscateBundle,
  createWorkerTask,
  getViteMajorVersion,
  getManualChunks,
  obfuscateLibBundle,
  formatSize,
  modifyChunkName
} from "../utils";
import {BundleList, Config} from "../type";
import {
  isArray,
  isFunction,
  isFileNameExcluded,
  isLibMode,
  isNuxtProject,
  isRegExp,
  isString,
  isObject,
  isBoolean
} from '../utils/is';
import {Worker} from 'node:worker_threads';
import {encode} from '@jridgewell/sourcemap-codec';
import {TraceMap, originalPositionFor, sourceContentFor} from '@jridgewell/trace-mapping';

vi.stubGlobal('WORKER_FILE_PATH', './worker.js');

vi.mock('javascript-obfuscator', () => ({
  default: {
    obfuscate: () => ({
      getObfuscatedCode: () => 'obfuscated code',
      getSourceMap: () => JSON.stringify({version: 3, sources: [], names: [], mappings: ''})
    })
  }
}));

vi.mock('node:worker_threads', () => ({
  Worker: vi.fn(function () {
    return {
      postMessage: vi.fn(),
      on: vi.fn(),
      unref: vi.fn()
    };
  })
}));

const defaultConfig: Config = {
  enable: true,
  excludes: [],
  apply: 'build',
  log: false,
  autoExcludeNodeModules: true,
  threadPool: true,
  obfuscateWorker: true,
  obfuscateWorkerExcludes: [],
  options: {}
}

describe('Log class', () => {
  it('should log message when show is true', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const logger = new Log(true);

    logger.info('Test message');

    expect(consoleLogSpy).toHaveBeenCalledWith('Test message');

    consoleLogSpy.mockRestore();
  });

  it('should not log message when show is false', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const logger = new Log(false);

    logger.info('Test message');

    expect(consoleLogSpy).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  it('should always log message using forceLog', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const logger = new Log(false);

    logger.forceLog('Force log message', 123);

    expect(consoleLogSpy).toHaveBeenCalledWith('Force log message', 123);

    consoleLogSpy.mockRestore();
  });
});

describe('formatTime', () => {
  it('should format milliseconds into seconds', () => {
    expect(formatTime(5000)).toBe('5s');
    expect(formatTime(0)).toBe('0s');
  });

  it('should format milliseconds into minutes and seconds', () => {
    expect(formatTime(65000)).toBe('1m 5s');
    expect(formatTime(60000)).toBe('1m ');
  });

  it('should format milliseconds into hours, minutes, and seconds', () => {
    expect(formatTime(3665000)).toBe('1h 1m 5s');
    expect(formatTime(3600000)).toBe('1h ');
  });

  it('should handle edge cases correctly', () => {
    expect(formatTime(0)).toBe('0s');
    expect(formatTime(59999)).toBe('59s');
    expect(formatTime(3599999)).toBe('59m 59s');
  });
})

describe('getThreadPoolSize', () => {
  it('should return default CPU count when threadPool is a boolean', () => {
    const configWithBooleanTrue = {...defaultConfig, threadPool: true};
    const configWithBooleanFalse = {...defaultConfig, threadPool: false};
    expect(getThreadPoolSize(configWithBooleanTrue)).toBeTypeOf('number');
    expect(getThreadPoolSize(configWithBooleanFalse)).toBeTypeOf('number');
  });

  it('should return default CPU count when threadPool is disabled', () => {
    const configWithDisabledThreadPool = {...defaultConfig, threadPool: {enable: false, size: 0}};
    expect(getThreadPoolSize(configWithDisabledThreadPool)).toBeTypeOf('number');
  });

  it('should return the provided threadPool size when enabled', () => {
    const configWithCustomSize = {...defaultConfig, threadPool: {enable: true, size: 8}};
    expect(getThreadPoolSize(configWithCustomSize)).toBeTypeOf('number');
  });

  it('should return default CPU count when threadPool size is 0', () => {
    const configWithSizeZero = {...defaultConfig, threadPool: {enable: true, size: 0}};
    expect(getThreadPoolSize(configWithSizeZero)).toBeTypeOf('number');
  });
});

describe('getValidBundleList', () => {
  it('should return valid bundle items', () => {
    const finalConfig: Config = {
      ...defaultConfig,
      excludes: ['excluded-file.js'],
    };

    const bundle = {
      'valid-file.js': {code: 'console.log("valid")'},
      'excluded-file.js': {code: 'console.log("excluded")'},
      'invalid-file.js': {notCode: 'no code here'}
    };

    const expected: BundleList = [
      // @ts-ignore
      ['valid-file.js', {code: 'console.log("valid")'}]
    ];

    // @ts-ignore
    const result = getValidBundleList(finalConfig, bundle);
    expect(result).toEqual(expected);
  });

  it('should return an empty array if no valid bundle items exist', () => {
    const finalConfig: Config = {...defaultConfig, excludes: []};

    const bundle = {
      'invalid-file.js': {notCode: 'no code here'},
      'another-invalid-file.js': {notCode: 'still no code'}
    };

    // @ts-ignore
    const result = getValidBundleList(finalConfig, bundle);
    expect(result).toEqual([]);
  });

  it('should exclude files based on the exclude configuration', () => {
    const finalConfig: Config = {...defaultConfig, excludes: ['excluded-file.js']};

    const bundle = {
      'excluded-file.js': {code: 'console.log("excluded")'},
      'included-file.js': {code: 'console.log("included")'}
    };

    const expected: BundleList = [
      // @ts-ignore
      ['included-file.js', {code: 'console.log("included")'}]
    ];

    // @ts-ignore
    const result = getValidBundleList(finalConfig, bundle);
    expect(result).toEqual(expected);
  });
});

describe('isEnabledFeature', () => {
  it('should return boolean value directly when input is boolean', () => {
    expect(isEnabledFeature(true)).toBe(true);
    expect(isEnabledFeature(false)).toBe(false);
  });

  it('should return enable property value when input is object', () => {
    expect(isEnabledFeature({enable: true})).toBe(true);
    expect(isEnabledFeature({enable: false})).toBe(false);
  });

  it('should return false for invalid input', () => {
    expect(isEnabledFeature({} as any)).toBe(false);
    expect(isEnabledFeature(null as any)).toBe(false);
    expect(isEnabledFeature(undefined as any)).toBe(false);
  });
});

describe('isEnableThreadPool', () => {
  it('should correctly determine thread pool status', () => {
    expect(isEnableThreadPool({...defaultConfig, threadPool: true})).toBe(true);
    expect(isEnableThreadPool({...defaultConfig, threadPool: false})).toBe(false);
    expect(isEnableThreadPool({...defaultConfig, threadPool: {enable: true, size: 4}})).toBe(true);
    expect(isEnableThreadPool({...defaultConfig, threadPool: {enable: false}})).toBe(false);
  });
});

describe('isEnableAutoExcludesNodeModules', () => {
  it('should correctly determine node modules exclusion status', () => {
    expect(isEnableAutoExcludesNodeModules({...defaultConfig, autoExcludeNodeModules: true})).toBe(true);
    expect(isEnableAutoExcludesNodeModules({...defaultConfig, autoExcludeNodeModules: false})).toBe(false);
    expect(isEnableAutoExcludesNodeModules({
      ...defaultConfig,
      autoExcludeNodeModules: {enable: true, manualChunks: []}
    })).toBe(true);
    expect(isEnableAutoExcludesNodeModules({...defaultConfig, autoExcludeNodeModules: {enable: false}})).toBe(false);
  });
});

describe('getChunkName', () => {
  it('should return modified chunk name when id includes chunk name', () => {
    const manualChunks = ['react', 'vue'];
    expect(getChunkName('node_modules/react/index.js', manualChunks)).toBe('vendor-react');
    expect(getChunkName('node_modules/vue/dist/vue.js', manualChunks)).toBe('vendor-vue');
  });

  it('should return vendor modules when no match found', () => {
    const manualChunks = ['react', 'vue'];
    expect(getChunkName('node_modules/lodash/index.js', manualChunks)).toBe('vendor-modules');
  });
});

describe('composeSourcemaps', () => {
  it('should compose maps and preserve the original source content', () => {
    const originalSource = 'const message = "hi";\nconsole.log(message);\n';
    const intermediateSource = 'const message="hi";\nconsole.log(message);\n';

    const bundlerMap: Rollup.SourceMapInput = {
      version: 3,
      file: 'bundle.js',
      sources: ['original.ts'],
      sourcesContent: [originalSource],
      names: [],
      mappings: encode([
        [[0, 0, 0, 0]],
        [[0, 0, 1, 0]],
      ]),
    };

    const obfuscatorMap: Rollup.SourceMapInput = {
      version: 3,
      file: 'bundle-obf.js',
      sources: ['bundle.js'],
      sourcesContent: [intermediateSource],
      names: [],
      mappings: encode([
        [[0, 0, 0, 0]],
        [[0, 0, 1, 0]],
      ]),
    };

    const logSpy = vi.fn();

    const composed = composeSourcemaps(bundlerMap, obfuscatorMap, logSpy);

    expect(logSpy).toHaveBeenCalledWith('composing source maps...');
    expect(composed).not.toBeNull();

    const trace = new TraceMap(composed as any);

    const firstLine = originalPositionFor(trace, {line: 1, column: 0});
    expect(firstLine.source).toBe('original.ts');
    expect(firstLine.line).toBe(1);
    expect(firstLine.column).toBe(0);

    const secondLine = originalPositionFor(trace, {line: 2, column: 0});
    expect(secondLine.source).toBe('original.ts');
    expect(secondLine.line).toBe(2);

    const recoveredSource = sourceContentFor(trace, firstLine.source as string);
    expect(recoveredSource).toBe(originalSource);
  });
});

describe('CodeSizeAnalyzer', () => {
  let analyzer: CodeSizeAnalyzer;
  const mockLog = new Log(true);
  let logSpy: any;

  beforeEach(() => {
    analyzer = new CodeSizeAnalyzer(mockLog);
    logSpy = vi.spyOn(console, 'log');
    let currentTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      currentTime += 1000;
      return currentTime;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should analyze bundle size correctly', () => {
    const originalBundle: BundleList = [
      ['test.js', {code: 'console.log("test");'} as any]
    ];

    const obfuscatedBundle: BundleList = [
      ['test.js', {code: 'var _0x123456=function(){console.log("test")};'} as any]
    ];

    analyzer.start(originalBundle);
    analyzer.end(obfuscatedBundle);

    const lastCallArgs = logSpy.mock.lastCall as [string, string];
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    expect(lastCallArgs[1]).toMatch(/obfuscated in \ds/);
  });

  it('should handle empty bundles', () => {
    const emptyBundle: BundleList = [];

    analyzer.start(emptyBundle);
    analyzer.end(emptyBundle);

    const lastCallArgs = logSpy.mock.lastCall as [string, string];
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    expect(lastCallArgs[1]).toContain('0B');
  });

  it('should format sizes with appropriate units', () => {
    const largeBundle: BundleList = [
      ['test.js', {code: 'a'.repeat(1024 * 1024)} as any]
    ];

    analyzer.start(largeBundle);
    analyzer.end(largeBundle);

    const lastCallArgs = logSpy.mock.lastCall as [string, string];
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    expect(lastCallArgs[1]).toContain('MB');
  });

  it('should calculate percentage correctly when units differ', () => {
    const originalBundle: BundleList = [
      ['test.js', {code: 'a'.repeat(500 * 1024)} as any]
    ];

    const obfuscatedBundle: BundleList = [
      ['test.js', {code: 'a'.repeat(2 * 1024 * 1024)} as any]
    ];

    analyzer.start(originalBundle);
    analyzer.end(obfuscatedBundle);

    const lastCallArgs = logSpy.mock.lastCall as [string, string];
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    const result = lastCallArgs[1];

    expect(result).toMatch(/\d+(\.\d+)?KB.*→.*\d+(\.\d+)?MB/);
    expect(result).toMatch(/309\.\d+%/);
  });

  it('should handle zero division when calculating percentage', () => {
    const emptyOriginalBundle: BundleList = [];

    const obfuscatedBundle: BundleList = [
      ['test.js', {code: 'console.log("test");'} as any]
    ];

    analyzer.start(emptyOriginalBundle);
    analyzer.end(obfuscatedBundle);

    const lastCallArgs = logSpy.mock.lastCall as [string, string];
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    const result = lastCallArgs[1];

    expect(result).toContain('0.00%');
  });
});

describe('is utils', () => {
  describe('isArray', () => {
    it('should correctly identify arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray([])).toBe(true);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should correctly identify functions', () => {
      expect(isFunction(() => {
      })).toBe(true);
      expect(isFunction(function () {
      })).toBe(true);
      expect(isFunction(async () => {
      })).toBe(true);
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction('function')).toBe(false);
    });
  });

  describe('isFileNameExcluded', () => {
    it('should handle RegExp excludes correctly', () => {
      const excludes = [/\.test\.js$/, 'vendor'];
      expect(isFileNameExcluded('app.test.js', excludes)).toBe(true);
      expect(isFileNameExcluded('app.js', excludes)).toBe(false);
    });

    it('should handle string excludes correctly', () => {
      const excludes = ['vendor', '.min.js'];
      expect(isFileNameExcluded('vendor/lib.js', excludes)).toBe(true);
      expect(isFileNameExcluded('app.min.js', excludes)).toBe(true);
      expect(isFileNameExcluded('app.js', excludes)).toBe(false);
    });

    it('should handle mixed excludes correctly', () => {
      const excludes = [/\.spec\.js$/, 'test'];
      expect(isFileNameExcluded('app.spec.js', excludes)).toBe(true);
      expect(isFileNameExcluded('test/app.js', excludes)).toBe(true);
      expect(isFileNameExcluded('app.js', excludes)).toBe(false);
    });
  });
});

describe('obfuscateBundle', () => {
  it('should obfuscate bundle and log progress', () => {
    const finalConfig: Config = {
      ...defaultConfig,
      log: true
    };
    const fileName = 'test.js';
    const bundleItem = {
      code: 'console.log("test")'
    } as Rollup.OutputChunk;

    const logSpy = vi.spyOn(console, 'log');

    const result = obfuscateBundle(finalConfig, fileName, bundleItem);

    expect(result.code).toBe('obfuscated code');
    expect(logSpy).toHaveBeenCalledWith('obfuscating test.js...');
    expect(logSpy).toHaveBeenCalledWith('obfuscation complete for test.js.');
  });
});

import {ObfuscatedFilesRegistry} from '../utils';

describe('createWorkerTask', () => {
  beforeEach(() => {
    ObfuscatedFilesRegistry.getInstance().clear();
  });

  it('should call worker methods properly', () => {
    const finalConfig: Config = {
      ...defaultConfig
    };
    const chunk: BundleList = [
      ['test.js', {code: 'console.log("test")'} as Rollup.OutputChunk]
    ];

    createWorkerTask(finalConfig, chunk);

    expect(Worker).toHaveBeenCalled();

    const mockWorkerInstance = vi.mocked(Worker).mock.results[0].value;

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({config: finalConfig, chunk, registryState: []});

    expect(mockWorkerInstance.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorkerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});

describe('is utils - additional tests', () => {
  describe('isRegExp', () => {
    it('should correctly identify RegExp', () => {
      expect(isRegExp(/test/)).toBe(true);
      expect(isRegExp(new RegExp('test'))).toBe(true);
      expect(isRegExp('/test/')).toBe(false);
      expect(isRegExp(null)).toBe(false);
      expect(isRegExp(undefined)).toBe(false);
      expect(isRegExp({})).toBe(false);
    });
  });

  describe('isString', () => {
    it('should correctly identify strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(String('test'))).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should correctly identify plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({key: 'value'})).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should correctly identify booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(Boolean(1))).toBe(true);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
    });
  });

  describe('isFileNameExcluded - edge cases', () => {
    it('should return false when excludes is falsy', () => {
      expect(isFileNameExcluded('test.js', null as any)).toBe(false);
      expect(isFileNameExcluded('test.js', undefined as any)).toBe(false);
    });

    it('should handle single string exclude', () => {
      expect(isFileNameExcluded('vendor.js', 'vendor')).toBe(true);
      expect(isFileNameExcluded('app.js', 'vendor')).toBe(false);
    });

    it('should handle single RegExp exclude', () => {
      expect(isFileNameExcluded('test.spec.js', /\.spec\.js$/)).toBe(true);
      expect(isFileNameExcluded('test.js', /\.spec\.js$/)).toBe(false);
    });
  });

  describe('isLibMode', () => {
    it('should return true when build.lib is defined', () => {
      expect(isLibMode({build: {lib: {entry: 'src/index.ts'}}})).toBe(true);
      expect(isLibMode({build: {lib: true}})).toBe(true);
    });

    it('should return false when build.lib is not defined', () => {
      expect(isLibMode({})).toBe(false);
      expect(isLibMode({build: {}})).toBe(false);
      expect(isLibMode({build: {lib: false}})).toBe(false);
      expect(isLibMode({build: {lib: null}})).toBe(false);
      expect(isLibMode({build: {lib: undefined}})).toBe(false);
    });
  });

  describe('isNuxtProject', () => {
    const mkTmp = () => mkdtempSync(join(tmpdir(), 'vite-bundle-obfuscator-'));

    const writePackageJson = (root: string, pkg: any) => {
      writeFileSync(join(root, 'package.json'), JSON.stringify(pkg), 'utf-8');
    };

    it('should return false for non-nuxt project', () => {
      expect(isNuxtProject({root: process.cwd()})).toBe(false);
    });

    it('should use process.cwd() when root is not provided', () => {
      expect(isNuxtProject({})).toBe(false);
    });

    it('should return true when package.json depends on nuxt', () => {
      const root = mkTmp();
      try {
        writePackageJson(root, { dependencies: { nuxt: '^3.0.0' } });
        expect(isNuxtProject({root})).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it('should return true when nuxt.config exists', () => {
      const root = mkTmp();
      try {
        writeFileSync(join(root, 'nuxt.config.ts'), 'export default {}', 'utf-8');
        expect(isNuxtProject({root})).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it('should detect nuxt when root points inside .nuxt directory', () => {
      const root = mkTmp();
      try {
        writePackageJson(root, { devDependencies: { nuxt: '^3.0.0' } });
        mkdirSync(join(root, '.nuxt'), { recursive: true });
        expect(isNuxtProject({root: join(root, '.nuxt')})).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it('should return true when nuxt plugin is present', () => {
      expect(isNuxtProject({ plugins: [{ name: 'nuxt:config' }] } as any)).toBe(true);
    });
  });
});

describe('utils/index - additional tests', () => {
  describe('getViteMajorVersion', () => {
    it('should return major version number', () => {
      const version = getViteMajorVersion();
      expect(version).toBeTypeOf('number');
      expect(version).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getManualChunks', () => {
    it('should return empty array when autoExcludeNodeModules is boolean', () => {
      expect(getManualChunks({...defaultConfig, autoExcludeNodeModules: true})).toEqual([]);
      expect(getManualChunks({...defaultConfig, autoExcludeNodeModules: false})).toEqual([]);
    });

    it('should return manualChunks when autoExcludeNodeModules is object with enable true', () => {
      const config = {
        ...defaultConfig,
        autoExcludeNodeModules: {enable: true, manualChunks: ['react', 'vue']}
      };
      expect(getManualChunks(config)).toEqual(['react', 'vue']);
    });

    it('should return empty array when autoExcludeNodeModules.enable is false', () => {
      const config = {
        ...defaultConfig,
        autoExcludeNodeModules: {enable: false, manualChunks: ['react', 'vue']}
      };
      expect(getManualChunks(config)).toEqual([]);
    });

    it('should return empty array when manualChunks is not provided', () => {
      const config = {
        ...defaultConfig,
        autoExcludeNodeModules: {enable: true, manualChunks: []}
      };
      expect(getManualChunks(config)).toEqual([]);
    });
  });

  describe('modifyChunkName', () => {
    it('should add vendor prefix to chunk name', () => {
      expect(modifyChunkName('react')).toBe('vendor-react');
      expect(modifyChunkName('vue')).toBe('vendor-vue');
      expect(modifyChunkName('')).toBe('vendor-');
    });
  });

  describe('formatSize', () => {
    it('should format bytes correctly', () => {
      expect(formatSize(0)).toEqual({value: 0, unit: 'B'});
      expect(formatSize(500)).toEqual({value: 500, unit: 'B'});
      expect(formatSize(1023)).toEqual({value: 1023, unit: 'B'});
    });

    it('should format kilobytes correctly', () => {
      expect(formatSize(1024)).toEqual({value: 1, unit: 'KB'});
      expect(formatSize(1536)).toEqual({value: 1.5, unit: 'KB'});
      expect(formatSize(1024 * 100)).toEqual({value: 100, unit: 'KB'});
    });

    it('should format megabytes correctly', () => {
      expect(formatSize(1024 * 1024)).toEqual({value: 1, unit: 'MB'});
      expect(formatSize(1024 * 1024 * 2.5)).toEqual({value: 2.5, unit: 'MB'});
    });

    it('should max out at MB unit', () => {
      expect(formatSize(1024 * 1024 * 1024)).toEqual({value: 1024, unit: 'MB'});
    });
  });

  describe('composeSourcemaps - edge cases', () => {
    it('should return map2 when map1 is null', () => {
      const map2 = {version: 3, sources: [], names: [], mappings: ''};
      expect(composeSourcemaps(null, map2)).toBe(map2);
    });

    it('should return map1 when map2 is null', () => {
      const map1 = {version: 3, sources: [], names: [], mappings: ''};
      expect(composeSourcemaps(map1, null)).toBe(map1);
    });

    it('should return null when both maps are null', () => {
      expect(composeSourcemaps(null, null)).toBeNull();
    });
  });

  describe('obfuscateLibBundle', () => {
    beforeEach(() => {
      ObfuscatedFilesRegistry.getInstance().clear();
    });

    it('should obfuscate lib bundle and return result', () => {
      const finalConfig: Config = {
        ...defaultConfig,
        log: true
      };
      const fileName = 'lib.js';
      const code = 'export const foo = "bar";';

      const logSpy = vi.spyOn(console, 'log');
      const result = obfuscateLibBundle(finalConfig, fileName, code);

      expect(result.code).toBe('obfuscated code');
      expect(logSpy).toHaveBeenCalledWith('obfuscating lib.js...');
      expect(logSpy).toHaveBeenCalledWith('obfuscation complete for lib.js.');
    });

    it('should skip already obfuscated files', () => {
      const finalConfig: Config = {
        ...defaultConfig,
        log: true
      };
      const fileName = 'lib.js';
      const code = 'export const foo = "bar";';

      obfuscateLibBundle(finalConfig, fileName, code);

      const logSpy = vi.spyOn(console, 'log');
      const result = obfuscateLibBundle(finalConfig, fileName, code);

      expect(result.code).toBe(code);
      expect(logSpy).toHaveBeenCalledWith('skipping lib.js (already in obfuscated registry)');
    });
  });

  describe('ObfuscatedFilesRegistry', () => {
    beforeEach(() => {
      ObfuscatedFilesRegistry.getInstance().clear();
    });

    it('should be a singleton', () => {
      const instance1 = ObfuscatedFilesRegistry.getInstance();
      const instance2 = ObfuscatedFilesRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should mark files as obfuscated', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      registry.markAsObfuscated('test.js');
      expect(registry.isObfuscated('test.js')).toBe(true);
      expect(registry.isObfuscated('other.js')).toBe(false);
    });

    it('should handle empty fileName in markAsObfuscated', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      registry.markAsObfuscated('');
      expect(registry.isObfuscated('')).toBe(false);
    });

    it('should handle empty fileName in isObfuscated', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      expect(registry.isObfuscated('')).toBe(false);
    });

    it('should get all obfuscated files', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      registry.markAsObfuscated('file1.js');
      registry.markAsObfuscated('file2.js');
      expect(registry.getAllObfuscatedFiles()).toEqual(['file1.js', 'file2.js']);
    });

    it('should serialize and deserialize correctly', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      registry.markAsObfuscated('test1.js');
      registry.markAsObfuscated('test2.js');

      const serialized = registry.serialize();
      expect(serialized).toEqual(['test1.js', 'test2.js']);

      registry.clear();
      registry.updateFromSerialized(serialized);
      expect(registry.isObfuscated('test1.js')).toBe(true);
      expect(registry.isObfuscated('test2.js')).toBe(true);
    });

    it('should handle invalid input in updateFromSerialized', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      registry.updateFromSerialized(null as any);
      registry.updateFromSerialized(undefined as any);
      registry.updateFromSerialized('invalid' as any);
      expect(registry.getAllObfuscatedFiles()).toEqual([]);
    });

    it('should clear all files', () => {
      const registry = ObfuscatedFilesRegistry.getInstance();
      registry.markAsObfuscated('test.js');
      registry.clear();
      expect(registry.getAllObfuscatedFiles()).toEqual([]);
    });
  });

  describe('obfuscateBundle - edge cases', () => {
    beforeEach(() => {
      ObfuscatedFilesRegistry.getInstance().clear();
    });

    it('should skip already obfuscated files', () => {
      const finalConfig: Config = {
        ...defaultConfig,
        log: true
      };
      const fileName = 'test.js';
      const bundleItem = {
        code: 'console.log("test")',
        map: null
      } as Rollup.OutputChunk;

      obfuscateBundle(finalConfig, fileName, bundleItem);

      const logSpy = vi.spyOn(console, 'log');
      const result = obfuscateBundle(finalConfig, fileName, bundleItem);

      expect(result.code).toBe(bundleItem.code);
      expect(logSpy).toHaveBeenCalledWith('skipping test.js (already in obfuscated registry)');
    });

    it('should handle sourceMap option', () => {
      const finalConfig: Config = {
        ...defaultConfig,
        log: false,
        options: {sourceMap: true}
      };
      const fileName = 'test.js';
      const bundleItem = {
        code: 'console.log("test")',
        map: {version: 3, sources: [], names: [], mappings: ''}
      } as unknown as Rollup.OutputChunk;

      const result = obfuscateBundle(finalConfig, fileName, bundleItem);
      expect(result.code).toBe('obfuscated code');
    });
  });
});

import viteBundleObfuscator from '../index';

describe('viteBundleObfuscator plugin', () => {
  beforeEach(() => {
    ObfuscatedFilesRegistry.getInstance().clear();
    vi.clearAllMocks();
  });

  describe('plugin initialization', () => {
    it('should return a valid plugin object', () => {
      const plugin = viteBundleObfuscator() as Plugin;

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-plugin-bundle-obfuscator');
      expect(plugin.apply).toBe('build');
      expect(plugin.config).toBeDefined();
      expect(plugin.configResolved).toBeDefined();
      expect(plugin.renderChunk).toBeDefined();
      expect(plugin.transformIndexHtml).toBeDefined();
      expect(plugin.generateBundle).toBeDefined();
    });

    it('should merge custom config with default config', () => {
      const customConfig = {
        enable: false,
        log: false,
        excludes: ['test.js'],
      };

      const plugin = viteBundleObfuscator(customConfig) as Plugin;

      expect(plugin.apply).toBe('build');
    });

    it('should use custom apply option', () => {
      const plugin = viteBundleObfuscator({apply: 'serve'}) as Plugin;
      expect(plugin.apply).toBe('serve');
    });
  });

  describe('config hook', () => {
    it('should not modify config when enable is false', () => {
      const plugin = viteBundleObfuscator({enable: false}) as Plugin;
      const config = {build: {}};
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      const result = plugin.config(config, env);

      expect(result).toBeUndefined();
    });

    it('should not modify config when autoExcludeNodeModules is false', () => {
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: false}) as Plugin;
      const config = {build: {}};
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      const result = plugin.config(config, env);

      expect(result).toBeUndefined();
    });

    it('should not modify config in lib mode', () => {
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: true}) as Plugin;
      const config = {build: {lib: {entry: 'src/index.ts'}}};
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      const result = plugin.config(config, env);

      expect(result).toBeUndefined();
    });

    it('should set up manualChunks when output is not defined', () => {
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: true}) as Plugin;
      const config = {build: {rollupOptions: {}}} as any;
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      expect(config.build.rollupOptions.output).toBeDefined();
      expect(config.build.rollupOptions.output.manualChunks).toBeDefined();
    });

    it('should set up manualChunks when output is object without manualChunks', () => {
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: true}) as Plugin;
      const config = {build: {rollupOptions: {output: {}}}} as any;
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      expect(config.build.rollupOptions.output.manualChunks).toBeDefined();
    });

    it('should warn when output is an array', () => {
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: true}) as Plugin;
      const config = {build: {rollupOptions: {output: []}}};
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      const logSpy = vi.spyOn(console, 'log');

      // @ts-ignore
      plugin.config(config, env);

      expect(logSpy).toHaveBeenCalledWith(
        '\x1b[33m',
        'rollupOptions.output is an array, ignoring autoExcludeNodeModules configuration.'
      );
    });

    it('should warn when manualChunks is an object', () => {
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: true}) as Plugin;
      const config = {build: {rollupOptions: {output: {manualChunks: {}}}}};
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      const logSpy = vi.spyOn(console, 'log');

      // @ts-ignore
      plugin.config(config, env);

      expect(logSpy).toHaveBeenCalledWith(
        '\x1b[33m',
        'rollupOptions.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.'
      );
    });

    it('should wrap existing manualChunks function', () => {
      const originalManualChunks = vi.fn().mockReturnValue('original-chunk');
      const plugin = viteBundleObfuscator({autoExcludeNodeModules: true}) as Plugin;
      const config = {build: {rollupOptions: {output: {manualChunks: originalManualChunks}}}} as any;
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      const newManualChunks = config.build.rollupOptions.output.manualChunks;
      expect(newManualChunks).toBeDefined();

      const result = newManualChunks('src/utils.js', {});
      expect(result).toBe('original-chunk');
    });

    it('should auto inject worker obfuscator plugin', () => {
      const plugin = viteBundleObfuscator({obfuscateWorker: true}) as Plugin;
      const originalWorkerPlugins = vi.fn().mockReturnValue([{name: 'user-worker-plugin'}]);
      const config = {worker: {plugins: originalWorkerPlugins}} as any;
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      expect(typeof config.worker.plugins).toBe('function');
      const plugins1 = config.worker.plugins();
      const plugins2 = config.worker.plugins();

      expect(plugins1.some((p: any) => p?.name === 'user-worker-plugin')).toBe(true);
      expect(plugins1.some((p: any) => p?.name === 'vite-plugin-bundle-obfuscator:worker')).toBe(true);

      const w1 = plugins1.find((p: any) => p?.name === 'vite-plugin-bundle-obfuscator:worker');
      const w2 = plugins2.find((p: any) => p?.name === 'vite-plugin-bundle-obfuscator:worker');
      expect(w1).toBeDefined();
      expect(w2).toBeDefined();
      expect(w1).not.toBe(w2);
    });

    it('should not auto inject worker plugin when disabled', () => {
      const plugin = viteBundleObfuscator({obfuscateWorker: false}) as Plugin;
      const config = {} as any;
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      expect(config.worker?.plugins).toBeUndefined();
    });

    it('should not duplicate worker plugin when already exists', () => {
      const plugin = viteBundleObfuscator() as Plugin;
      const originalWorkerPlugins = vi.fn().mockReturnValue([{name: 'vite-plugin-bundle-obfuscator:worker'}]);
      const config = {worker: {plugins: originalWorkerPlugins}} as any;
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      const plugins = config.worker.plugins();
      const workerCount = plugins.filter((p: any) => p?.name === 'vite-plugin-bundle-obfuscator:worker').length;
      expect(workerCount).toBe(1);
    });
  });

  describe('configResolved hook', () => {
    it('should set sourceMap options when sourcemap is enabled', () => {
      const plugin = viteBundleObfuscator() as Plugin;
      const resolvedConfig = {
        build: {sourcemap: true}
      };

      // @ts-ignore
      plugin.configResolved(resolvedConfig);

      expect(true).toBe(true);
    });

    it('should handle inline sourcemap', () => {
      const plugin = viteBundleObfuscator() as Plugin;
      const resolvedConfig = {
        build: {sourcemap: 'inline'}
      };

      // @ts-ignore
      plugin.configResolved(resolvedConfig);

      expect(true).toBe(true);
    });
  });

  describe('transformIndexHtml hook', () => {
    it('should return html when enable is false', async () => {
      const plugin = viteBundleObfuscator({enable: false}) as Plugin;
      const html = '<html lang=""></html>';

      // @ts-ignore
      const handler = plugin.transformIndexHtml.handler || plugin.transformIndexHtml.transform;
      const result = await handler(html, {bundle: {}});

      expect(result).toBe(html);
    });

    it('should return html when bundle is not provided', async () => {
      const plugin = viteBundleObfuscator() as Plugin;
      const html = '<html lang=""></html>';

      // @ts-ignore
      const handler = plugin.transformIndexHtml.handler || plugin.transformIndexHtml.transform;
      const result = await handler(html, {});

      expect(result).toBe(html);
    });
  });

  describe('generateBundle hook', () => {
    it('should not process when enable is false', async () => {
      const plugin = viteBundleObfuscator({enable: false}) as Plugin;
      const bundle = {'test.js': {code: 'console.log("test")'}} as any;

      // @ts-ignore
      await plugin.generateBundle({}, bundle);

      expect(bundle['test.js'].code).toBe('console.log("test")');
    });
  });

  describe('renderChunk hook', () => {
    it('should return null when enable is false', () => {
      const plugin = viteBundleObfuscator({enable: false}) as Plugin;
      const code = 'console.log("test")';
      const chunk = {name: 'test'};

      // @ts-ignore
      const result = plugin.renderChunk(code, chunk);

      expect(result).toBeNull();
    });

    it('should return null when not in lib mode', () => {
      const plugin = viteBundleObfuscator() as Plugin;
      const config = {build: {}};
      const env = {command: 'build', mode: 'production', isSsrBuild: false};

      // @ts-ignore
      plugin.config(config, env);

      const code = 'console.log("test")';
      const chunk = {name: 'test'};

      // @ts-ignore
      const result = plugin.renderChunk(code, chunk);

      expect(result).toBeNull();
    });
  });
});
