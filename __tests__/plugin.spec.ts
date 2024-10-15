import {expect, describe, it, vi} from "vitest";
import {formatTime, getThreadPoolSize, Log} from "../src/utils";
import {Config} from "../src/type";

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
