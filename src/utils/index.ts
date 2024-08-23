import {Config} from "../type";

export class Log {
  private readonly _log: (msg: string) => void;

  constructor(private show: boolean) {
    this._log = show ? console.log.bind(console) : this.noop;
  }

  private noop(_: string): void {
  }

  alwaysLog(msg: string): void {
    console.log(msg);
  }

  info(msg: string): void {
    this._log(msg);
  }
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
