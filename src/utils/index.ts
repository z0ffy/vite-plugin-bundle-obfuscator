import {Config} from "../type";
import {isRegExp, isString} from './is';

export class Log {
  private readonly _log: (msg: string) => void;

  constructor(private show: boolean) {
    this._log = show ? console.log.bind(console) : this.noop;
  }

  private noop(_: string): void {
  }

  alwaysLog(...reset: (string | number)[]): void {
    console.log(...reset);
  }

  info(msg: string): void {
    this._log(msg);
  }
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

export const defaultConfig: Readonly<Config> = {
  excludes: [],
  enable: true,
  log: true,
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

export function isFileNameExcluded(name: string, excludes: (RegExp | string)[]): boolean {
  for (const exclude of excludes) {
    if (isRegExp(exclude)) {
      if (exclude.test(name)) return true;
    } else if (isString(exclude)) {
      if (name.includes(exclude)) return true;
    }
  }
  return false;
}
