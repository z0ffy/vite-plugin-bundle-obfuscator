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
