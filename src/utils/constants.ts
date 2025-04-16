import { Config } from '../type';

export const defaultConfig: Readonly<Config> = {
  excludes: [],
  enable: true,
  log: true,
  apply: 'build',
  autoExcludeNodeModules: false,
  threadPool: false,
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
    ignoreImports: true,
    stringArray: true,
    stringArrayCallsTransform: true,
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
  },
};

export const NODE_MODULES = 'node_modules';

export const VENDOR_MODULES = 'vendor-modules';

export const CHUNK_PREFIX = 'vendor-';

export enum SizeUnit {
  B = 'B',
  KB = 'KB',
  MB = 'MB',
}

export const LOG_COLOR = Object.freeze({
  info: '\x1b[36m', // Cyan
  warn: '\x1b[33m', // Yellow
  success: '\x1b[32m', // Green
});
