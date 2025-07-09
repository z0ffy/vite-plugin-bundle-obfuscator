import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { toString } = Object.prototype;

export function isRegExp(input: any): input is RegExp {
  return toString.call(input) === '[object RegExp]';
}

export function isString(input: any): input is string {
  return toString.call(input) === '[object String]';
}

export function isObject(input: any): input is object {
  return toString.call(input) === '[object Object]';
}

export function isArray(input: any): input is any[] {
  return Array.isArray(input);
}

export function isFunction(input: any): input is Function {
  const type = toString.call(input);
  return type === '[object Function]' || type === '[object AsyncFunction]';
}

export function isBoolean(input: any): input is boolean {
  return toString.call(input) === '[object Boolean]';
}

export function isFileNameExcluded(fileName: string, excludes: (RegExp | string)[] | RegExp | string): boolean {
  if (!excludes) return false;

  if (isArray(excludes)) {
    return (excludes as (RegExp | string)[]).some((exclude) => {
      if (isString(exclude)) {
        return fileName.includes(exclude as string);
      } else if (isRegExp(exclude)) {
        return (exclude as RegExp).test(fileName);
      }
      return false;
    });
  }

  if (isString(excludes)) {
    return fileName.includes(excludes as string);
  }

  if (isRegExp(excludes)) {
    return (excludes as RegExp).test(fileName);
  }

  return false;
}

export function isLibMode(config: { build?: { lib?: any } }): boolean {
  return !!config.build?.lib;
}

export function isNuxtProject(config: { root?: string }): boolean {
  const root = config.root || process.cwd();
  const packageJsonPath = resolve(root, 'package.json');

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (dependencies.nuxt) return true;
    } catch {
      /* empty */
    }
  }

  const nuxtPaths = [
    resolve(root, 'nuxt.config.js'),
    resolve(root, 'nuxt.config.ts'),
    resolve(root, '.nuxt'),
    resolve(root, '.output'),
  ];

  return nuxtPaths.some(path => existsSync(path));
}
