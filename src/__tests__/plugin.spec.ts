import {expect, describe, it, vi, beforeEach, afterEach} from "vitest";
import type { Rollup } from 'vite';

vi.mock('node:worker_threads');

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
  createWorkerTask
} from "../utils";
import {BundleList, Config} from "../type";
import {isArray, isFunction, isFileNameExcluded} from '../utils/is';
import { Worker } from 'node:worker_threads';
import { encode } from '@jridgewell/sourcemap-codec';
import { TraceMap, originalPositionFor, sourceContentFor } from '@jridgewell/trace-mapping';

// Mock WORKER_FILE_PATH
vi.stubGlobal('WORKER_FILE_PATH', './worker.js');

// Mock javascript-obfuscator
vi.mock('javascript-obfuscator', () => ({
  default: {
    obfuscate: () => ({
      getObfuscatedCode: () => 'obfuscated code',
      getSourceMap: () => JSON.stringify({ version: 3, sources: [], names: [], mappings: '' })
    })
  }
}));

vi.mock('node:worker_threads', () => ({
  Worker: vi.fn(() => ({
    postMessage: vi.fn(),
    on: vi.fn(),
    unref: vi.fn()
  }))
}));

const defaultConfig: Config = {
  enable: true,
  excludes: [],
  apply: 'build',
  log: false,
  autoExcludeNodeModules: true,
  threadPool: true,
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
    expect(isEnabledFeature({ enable: true })).toBe(true);
    expect(isEnabledFeature({ enable: false })).toBe(false);
  });

  it('should return false for invalid input', () => {
    expect(isEnabledFeature({} as any)).toBe(false);
    expect(isEnabledFeature(null as any)).toBe(false);
    expect(isEnabledFeature(undefined as any)).toBe(false);
  });
});

describe('isEnableThreadPool', () => {
  it('should correctly determine thread pool status', () => {
    expect(isEnableThreadPool({ ...defaultConfig, threadPool: true })).toBe(true);
    expect(isEnableThreadPool({ ...defaultConfig, threadPool: false })).toBe(false);
    expect(isEnableThreadPool({ ...defaultConfig, threadPool: { enable: true, size: 4 } })).toBe(true);
    expect(isEnableThreadPool({ ...defaultConfig, threadPool: { enable: false } })).toBe(false);
  });
});

describe('isEnableAutoExcludesNodeModules', () => {
  it('should correctly determine node modules exclusion status', () => {
    expect(isEnableAutoExcludesNodeModules({ ...defaultConfig, autoExcludeNodeModules: true })).toBe(true);
    expect(isEnableAutoExcludesNodeModules({ ...defaultConfig, autoExcludeNodeModules: false })).toBe(false);
    expect(isEnableAutoExcludesNodeModules({ ...defaultConfig, autoExcludeNodeModules: { enable: true, manualChunks: [] } })).toBe(true);
    expect(isEnableAutoExcludesNodeModules({ ...defaultConfig, autoExcludeNodeModules: { enable: false } })).toBe(false);
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

    const firstLine = originalPositionFor(trace, { line: 1, column: 0 });
    expect(firstLine.source).toBe('original.ts');
    expect(firstLine.line).toBe(1);
    expect(firstLine.column).toBe(0);

    const secondLine = originalPositionFor(trace, { line: 2, column: 0 });
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
    // Mock performance.now() to return predictable values
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
      ['test.js', { code: 'console.log("test");' } as any]
    ];

    const obfuscatedBundle: BundleList = [
      ['test.js', { code: 'var _0x123456=function(){console.log("test")};' } as any]
    ];

    analyzer.start(originalBundle);
    analyzer.end(obfuscatedBundle);

    const lastCallArgs = logSpy.mock.lastCall;
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    expect(lastCallArgs[1]).toMatch(/obfuscated in \ds/);
  });

  it('should handle empty bundles', () => {
    const emptyBundle: BundleList = [];

    analyzer.start(emptyBundle);
    analyzer.end(emptyBundle);

    const lastCallArgs = logSpy.mock.lastCall;
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    expect(lastCallArgs[1]).toContain('0B');
  });

  it('should format sizes with appropriate units', () => {
    const largeBundle: BundleList = [
      ['test.js', { code: 'a'.repeat(1024 * 1024) } as any]
    ];

    analyzer.start(largeBundle);
    analyzer.end(largeBundle);

    const lastCallArgs = logSpy.mock.lastCall;
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    expect(lastCallArgs[1]).toContain('MB');
  });

  it('should calculate percentage correctly when units differ', () => {
    const originalBundle: BundleList = [
      ['test.js', { code: 'a'.repeat(500 * 1024) } as any]
    ];

    const obfuscatedBundle: BundleList = [
      ['test.js', { code: 'a'.repeat(2 * 1024 * 1024) } as any]
    ];

    analyzer.start(originalBundle);
    analyzer.end(obfuscatedBundle);

    const lastCallArgs = logSpy.mock.lastCall;
    expect(lastCallArgs[0]).toBe('\x1b[32m%s\x1b[0m');
    const result = lastCallArgs[1];
    
    expect(result).toMatch(/\d+(\.\d+)?KB.*→.*\d+(\.\d+)?MB/);
    expect(result).toMatch(/309\.\d+%/);
  });

  it('should handle zero division when calculating percentage', () => {
    const emptyOriginalBundle: BundleList = [];

    const obfuscatedBundle: BundleList = [
      ['test.js', { code: 'console.log("test");' } as any]
    ];

    analyzer.start(emptyOriginalBundle);
    analyzer.end(obfuscatedBundle);

    const lastCallArgs = logSpy.mock.lastCall;
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
      expect(isArray(new Array())).toBe(true);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should correctly identify functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
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

import { ObfuscatedFilesRegistry } from '../utils';

describe('createWorkerTask', () => {
  beforeEach(() => {
    ObfuscatedFilesRegistry.getInstance().clear();
  });

  it('should call worker methods properly', () => {
    const finalConfig: Config = {
      ...defaultConfig
    };
    const chunk: BundleList = [
      ['test.js', { code: 'console.log("test")' } as Rollup.OutputChunk]
    ];

    createWorkerTask(finalConfig, chunk);

    expect(Worker).toHaveBeenCalled();
    
    const mockWorkerInstance = vi.mocked(Worker).mock.results[0].value;
    
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ config: finalConfig, chunk, registryState: [] });
    
    expect(mockWorkerInstance.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorkerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
