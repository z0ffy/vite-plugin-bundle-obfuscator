import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

function hasNuxtDependency(packageJsonPath: string): boolean {
  if (!existsSync(packageJsonPath)) return false;
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return !!dependencies?.nuxt;
  } catch {
    return false;
  }
}

function hasNuxtConfigFile(root: string): boolean {
  return [
    resolve(root, 'nuxt.config.js'),
    resolve(root, 'nuxt.config.ts'),
    resolve(root, 'nuxt.config.mjs'),
    resolve(root, 'nuxt.config.cjs'),
  ].some(p => existsSync(p));
}

function* walkUpDirs(startDir: string): Generator<string> {
  let current = startDir;
  while (true) {
    yield current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function hasNuxtPlugins(config: any): boolean {
  const plugins = config?.plugins;
  if (!Array.isArray(plugins)) return false;
  return plugins.some(p => typeof p?.name === 'string' && (p.name === 'nuxt' || p.name.startsWith('nuxt:')));
}

export function isNuxtProject(config: { root?: string; plugins?: any } = {}): boolean {
  if (hasNuxtPlugins(config)) return true;

  const startDir = config.root || process.cwd();

  for (const dir of walkUpDirs(startDir)) {
    if (hasNuxtConfigFile(dir)) return true;
    const packageJsonPath = resolve(dir, 'package.json');
    if (existsSync(packageJsonPath)) {
      return hasNuxtDependency(packageJsonPath);
    }
  }

  return false;
}
