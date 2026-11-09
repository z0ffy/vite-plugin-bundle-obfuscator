import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import viteBundleObfuscator from '../index';
import { defaultConfig } from '../utils/constants';
import { getViteMajorVersion } from '../utils';

const root = mkdtempSync(join(tmpdir(), 'bundle-obfuscator-library-'));
const entry = join(root, 'entry.js');
const source = 'export function add(a, b) {\n  return a + b;\n}\nexport function fail() {\n  throw new Error("LIBRARY_SENTINEL");\n}\nconsole.log("sum", add(1, 2));\n';
const bundlerKey = getViteMajorVersion() >= 8 ? 'rolldownOptions' : 'rollupOptions';
let nextBuild = 0;

beforeAll(() => {
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  writeFileSync(entry, source);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
  rmSync(root, {recursive: true, force: true});
});

async function buildLibrary({plugin = viteBundleObfuscator({log: false}), formats = ['es'], output = {}, sourcemap = false, beforePlugins = [], additionalPlugins = [], write = true}: any = {}) {
  const outDir = join(root, `dist-${nextBuild++}`);
  const result: any = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [...beforePlugins, plugin, ...additionalPlugins],
    build: {
      outDir,
      write,
      sourcemap,
      lib: {entry, formats, name: 'TestLibrary'},
      [bundlerKey]: {output},
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const chunks = outputs.flatMap((r: any, i: number) => r.output.filter((item: any) => item.type === 'chunk').map((chunk: any) => ({...chunk, format: formats[i] || formats[0], path: join(outDir, chunk.fileName)})));
  return {chunks, outDir};
}

function execute(chunk: any, fail = false) {
  const importCode = chunk.format === 'es'
    ? `lib = await import(${JSON.stringify(pathToFileURL(chunk.path).href)});`
    : chunk.format === 'iife'
      ? `const context = {console}; vm.runInNewContext(readFileSync(${JSON.stringify(chunk.path)}, 'utf8'), context); lib = context.TestLibrary;`
      : `lib = createRequire(import.meta.url)(${JSON.stringify(chunk.path)});`;
  const program = `import {createRequire} from 'node:module'; import {readFileSync} from 'node:fs'; import vm from 'node:vm'; let lib; ${importCode} if (lib.add(2,3) !== 5) throw Error('Invalid library exports'); ${fail ? 'lib.fail();' : 'console.log("EXPORT_OK");'}`;
  return spawnSync(process.execPath, ['--enable-source-maps', '--input-type=module', '-e', program], {encoding: 'utf8', timeout: 2000, killSignal: 'SIGKILL'});
}

describe('library output', () => {
  it('runs every format with the default selfDefending protection after other output hooks', async () => {
    const {chunks} = await buildLibrary({
      formats: ['es', 'cjs', 'umd', 'iife'],
      additionalPlugins: [{
        name: 'format-before-obfuscation',
        generateBundle(_: any, bundle: any) {
          for (const chunk of Object.values(bundle) as any[]) {
            if (chunk.type === 'chunk') chunk.code = chunk.code.replace(/;/g, ';\n');
          }
        },
      }],
    });
    expect(chunks).toHaveLength(4);
    for (const chunk of chunks) {
      expect(chunk.code).toMatch(/_0x[\da-f]+/);
      const run = execute(chunk);
      expect(run.error).toBeUndefined();
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toContain('sum 3');
      expect(run.stdout).toContain('EXPORT_OK');
    }
  });

  it('obfuscates repeated builds and identical filenames in separate outputs', async () => {
    const plugin = viteBundleObfuscator({log: false});
    for (let i = 0; i < 2; i++) {
      // Inspect both outputs in memory so the formats do not overwrite the same physical file.
      const {chunks} = await buildLibrary({plugin, formats: ['es', 'cjs'], output: {entryFileNames: 'entry.js'}, write: false});
      expect(chunks).toHaveLength(2);
      for (const chunk of chunks) expect(chunk.code).toMatch(/_0x[\da-f]+/);
    }
  });

  it('respects excluded library filenames', async () => {
    const {chunks} = await buildLibrary({plugin: viteBundleObfuscator({log: false, excludes: ['entry.js']})});
    expect(chunks[0].code).not.toMatch(/_0x[\da-f]+/);
    expect(execute(chunks[0]).status).toBe(0);
  });

  it.each([/entry/g, /entry/y])('respects stateful exclusion %s across outputs and rebuilds', async pattern => {
    pattern.lastIndex = 2;
    const plugin = viteBundleObfuscator({log: false, excludes: [pattern]});
    for (let i = 0; i < 2; i++) {
      const {chunks} = await buildLibrary({plugin, formats: ['es', 'cjs', 'umd', 'iife'], write: false});
      for (const chunk of chunks) expect(chunk.code).not.toMatch(/_0x[\da-f]+/);
      expect(pattern.lastIndex).toBe(2);
    }
  });

  it.each([-1, 0, 0.5, NaN, Infinity])('rejects enabled pool size %s instead of emitting plain code', async size => {
    await expect(buildLibrary({plugin: viteBundleObfuscator({log: false, threadPool: {enable: true, size}})}))
      .rejects.toThrow('threadPool.size must be a positive integer');
  });

  it('preserves selfDefending after an earlier post-order mutating plugin', async () => {
    const plugin = viteBundleObfuscator({log: false}) as any;
    plugin.enforce = 'post';
    const {chunks} = await buildLibrary({plugin, beforePlugins: [{
      name: 'post-order-formatter',
      enforce: 'post',
      generateBundle: {order: 'post', handler(_: any, bundle: any) {
        for (const chunk of Object.values(bundle) as any[]) {
          if (chunk.type === 'chunk') chunk.code = chunk.code.replace(/;/g, ';\n');
        }
      }},
    }]});
    const run = execute(chunks[0]);
    expect(run.error).toBeUndefined();
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain('EXPORT_OK');
  });

  it.each([true, 'inline', 'hidden'])('publishes a composed sourcemap for %s', async sourcemap => {
    // Keep the assertion independent of javascript-obfuscator's unmapped control-flow helper frames.
    const {chunks, outDir} = await buildLibrary({sourcemap, plugin: viteBundleObfuscator({log: false, options: {...defaultConfig.options, seed: 1, controlFlowFlattening: false}})});
    const chunk = chunks[0];
    const matches = [...chunk.code.matchAll(/sourceMappingURL=([^\r\n]+)/g)];
    expect(matches).toHaveLength(sourcemap === 'hidden' ? 0 : 1);
    const maps = readdirSync(outDir).filter(name => name.endsWith('.map'));
    expect(maps).toHaveLength(sourcemap === 'inline' ? 0 : 1);
    const map = sourcemap === 'inline'
      ? JSON.parse(Buffer.from(matches[0][1].split(',')[1], 'base64').toString())
      : JSON.parse(readFileSync(join(outDir, maps[0]), 'utf8'));
    expect(map.sourcesContent).toContain(source);
    expect(map.mappings).toBe(chunk.map.mappings);
    const run = execute(chunk, true);
    expect(run.status).toBe(1);
    expect(run.error).toBeUndefined();
    if (sourcemap === 'hidden') {
      const position = /entry\.js:(\d+):(\d+)\)/.exec(run.stderr)!;
      const original = originalPositionFor(new TraceMap(map), {line: Number(position[1]), column: Number(position[2]) - 1});
      expect(original.line).toBe(5);
    } else {
      expect(run.stderr).toContain('/entry.js:5:');
    }
  });

  it('preserves custom map filenames, base URLs and excluded sources', async () => {
    const mapName = getViteMajorVersion() >= 8 ? 'nested/entry.js.map' : 'maps/entry.js.map';
    const naming = getViteMajorVersion() >= 8 ? {entryFileNames: 'nested/entry.js'} : {sourcemapFileNames: 'maps/[name].js.map'};
    const exclusions = getViteMajorVersion() >= 8 ? {} : {sourcemapExcludeSources: true};
    const {chunks, outDir} = await buildLibrary({sourcemap: true, output: {...naming, ...exclusions, sourcemapBaseUrl: 'https://cdn.example.test/'}});
    const mapFile = join(outDir, mapName);
    const map = JSON.parse(readFileSync(mapFile, 'utf8'));
    expect(chunks[0].code).toContain(`//# sourceMappingURL=https://cdn.example.test/${mapName}`);
    if (getViteMajorVersion() < 8) expect(map.sourcesContent).toBeUndefined();
  });

  it('honors an output disabling maps even when plugin maps are enabled', async () => {
    const {chunks, outDir} = await buildLibrary({
      sourcemap: true,
      output: {sourcemap: false},
      plugin: viteBundleObfuscator({log: false, options: {...defaultConfig.options, sourceMap: true}}),
    });
    expect(chunks[0].code).not.toContain('sourceMappingURL');
    expect(chunks[0].map).toBeNull();
    expect(readdirSync(outDir).filter(name => name.endsWith('.map'))).toEqual([]);
    expect(execute(chunks[0]).status).toBe(0);
  });

  it('keeps map settings independent across outputs', async () => {
    const {chunks, outDir} = await buildLibrary({sourcemap: true, formats: ['es', 'cjs'], output: [
      {format: 'es', entryFileNames: 'no-map.js', sourcemap: false},
      {format: 'cjs', entryFileNames: 'hidden.cjs', sourcemap: 'hidden'},
    ]});
    for (const chunk of chunks) expect(chunk.code).not.toContain('sourceMappingURL');
    expect(chunks[0].map).toBeNull();
    expect(chunks[1].map).not.toBeNull();
    expect(readdirSync(outDir).filter(name => name.endsWith('.map'))).toEqual(['hidden.cjs.map']);
  });

  it.each([true, 'inline', 'hidden'])('publishes matching final Debug IDs with sourcemap=%s', async sourcemap => {
    const run = async (seed: number) => {
      const {chunks, outDir} = await buildLibrary({sourcemap, output: {sourcemapDebugIds: true},
        plugin: viteBundleObfuscator({log: false, options: {...defaultConfig.options, seed, controlFlowFlattening: false}})});
      const chunk = chunks[0];
      const ids = [...chunk.code.matchAll(/\/\/# debugId=([\da-f-]+)/g)];
      expect(ids).toHaveLength(1);
      expect(ids[0][1]).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
      const map = sourcemap === 'inline'
        ? JSON.parse(Buffer.from(/base64,([^\r\n]+)/.exec(chunk.code)![1], 'base64').toString())
        : JSON.parse(readFileSync(join(outDir, `${chunk.fileName}.map`), 'utf8'));
      expect(map.debugId).toBe(ids[0][1]);
      expect(chunk.map.debugId).toBe(map.debugId);
      const result = execute(chunk, true);
      expect(result.status).toBe(1);
      expect(result.error).toBeUndefined();
      if (sourcemap !== 'hidden') expect(result.stderr).toContain('/entry.js:5:');
      return map.debugId;
    };
    const first = await run(123);
    expect(await run(123)).toBe(first);
    expect(await run(456)).not.toBe(first);
  });

  // Rolldown does not yet support Rollup's custom sourcemap filename patterns.
  it.skipIf(getViteMajorVersion() >= 8).each(['base64', 'base36', 'hex'])('hashes final sourcemaps with %s filenames', async hashCharacters => {
    const run = async (seed: number) => {
      const naming = vi.fn(() => 'maps/[format]-[name]-[chunkhash]-[hash:10].map');
      const {chunks, outDir} = await buildLibrary({sourcemap: true,
        output: {entryFileNames: '[name]-[hash].js', sourcemapFileNames: naming, hashCharacters},
        plugin: viteBundleObfuscator({log: false, options: {...defaultConfig.options, seed, controlFlowFlattening: false}})});
      expect(naming).toHaveBeenCalledTimes(1);
      const chunk = chunks[0];
      const names = readdirSync(join(outDir, 'maps'));
      expect(names).toHaveLength(1);
      const name = `maps/${names[0]}`;
      expect(chunk.sourcemapFileName).toBe(name);
      expect(chunk.code).toContain(`//# sourceMappingURL=${name}`);
      const map = readFileSync(join(outDir, name), 'utf8');
      expect(JSON.parse(map).mappings).toBe(chunk.map.mappings);
      expect(execute(chunk).status).toBe(0);
      return {name, map, hash: /([\w-]{10})\.map$/.exec(name)![1]};
    };
    const first = await run(123);
    expect(await run(123)).toEqual(first);
    const changed = await run(456);
    expect(changed.map).not.toBe(first.map);
    expect(changed.name).not.toBe(first.name);
    expect(changed.hash).not.toBe(first.hash);
  });

  it('invalidates hashed filenames when obfuscation settings change, with stable seeded builds', async () => {
    const run = async (seed: number) => (await buildLibrary({plugin: viteBundleObfuscator({log: false, options: {...defaultConfig.options, seed}}), output: {entryFileNames: '[name]-[hash].js'}})).chunks[0];
    const first = await run(123);
    const repeated = await run(123);
    const changed = await run(456);
    expect(first.fileName).toBe(repeated.fileName);
    expect(first.code).toBe(repeated.code);
    expect(changed.fileName).not.toBe(first.fileName);
    expect(changed.code).not.toBe(first.code);
  });

  it('invalidates hashes on each random build using the same plugin', async () => {
    const plugin = viteBundleObfuscator({log: false});
    const first = await buildLibrary({plugin, output: {entryFileNames: '[name]-[hash].js'}});
    const second = await buildLibrary({plugin, output: {entryFileNames: '[name]-[hash].js'}});
    expect(first.chunks[0].fileName).not.toBe(second.chunks[0].fileName);
  });

});
