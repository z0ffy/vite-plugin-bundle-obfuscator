import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, version } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';

const root = import.meta.dirname;
const entry = resolve(root, 'src/library.js');
const bundlerKey = Number(version.split('.')[0]) >= 8 ? 'rolldownOptions' : 'rollupOptions';

async function buildLibrary(name, config = {}, buildOptions = {}, output = {}, plugins) {
  const outDir = resolve(root, 'dist/library', name);
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: plugins || [obfuscator({ log: false, ...config })],
    build: {
      outDir,
      lib: { entry, formats: ['es', 'cjs', 'umd', 'iife'], name: 'TestLibrary' },
      ...buildOptions,
      [bundlerKey]: { output },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const formats = buildOptions.lib?.formats || ['es', 'cjs', 'umd', 'iife'];
  return {
    outDir,
    chunks: outputs.flatMap((item, i) => item.output.filter(chunk => chunk.type === 'chunk').map(chunk => ({
      ...chunk,
      format: formats[i],
      path: resolve(outDir, chunk.fileName),
    }))),
  };
}

function execute(chunk, fail = false) {
  const file = JSON.stringify(chunk.path);
  const load = chunk.format === 'es'
    ? `lib = await import(${JSON.stringify(pathToFileURL(chunk.path).href)});`
    : chunk.format === 'iife'
      ? `const context = {console}; vm.runInNewContext(readFileSync(${file}, 'utf8'), context); lib = context.TestLibrary;`
      : `lib = createRequire(import.meta.url)(${file});`;
  const result = spawnSync(process.execPath, ['--enable-source-maps', '--input-type=module', '-e', `
    import {createRequire} from 'node:module';
    import {readFileSync} from 'node:fs';
    import vm from 'node:vm';
    let lib; ${load}
    if (lib.add(2, 3) !== 5) throw Error('Invalid library exports');
    ${fail ? 'lib.fail();' : 'console.log("EXPORT_OK");'}
  `], { encoding: 'utf8', timeout: 3000, killSignal: 'SIGKILL' });
  assert.equal(result.error, undefined, result.stderr);
  assert.equal(result.status, fail ? 1 : 0, result.stderr);
  if (!fail) assert.match(result.stdout, /EXPORT_OK/);
  return result;
}

const browserBundles = [];
for (const threadPool of [false, { enable: true, size: 2 }]) {
  const { chunks } = await buildLibrary(`formats-${!!threadPool}`, { threadPool });
  assert.equal(chunks.length, 4);
  for (const chunk of chunks) {
    assert.match(chunk.code, /_0x[\da-f]+/);
    execute(chunk);
    browserBundles.push({ format: chunk.format, threadPool: !!threadPool, url: `/library/formats-${!!threadPool}/${chunk.fileName}` });
  }
}

const seeded = seed => ({ options: { seed, compact: true, selfDefending: true, controlFlowFlattening: false } });
for (const sourcemap of [true, 'inline', 'hidden']) {
  const { chunks, outDir } = await buildLibrary(`maps-${sourcemap}`, seeded(123), { sourcemap, lib: { entry, formats: ['es'], name: 'TestLibrary' } });
  const chunk = chunks[0];
  const references = [...chunk.code.matchAll(/sourceMappingURL=([^\r\n]+)/g)];
  assert.equal(references.length, sourcemap === 'hidden' ? 0 : 1);
  const maps = readdirSync(outDir).filter(name => name.endsWith('.map'));
  assert.equal(maps.length, sourcemap === 'inline' ? 0 : 1);
  const map = sourcemap === 'inline'
    ? JSON.parse(Buffer.from(references[0][1].split(',')[1], 'base64').toString())
    : JSON.parse(readFileSync(resolve(outDir, maps[0]), 'utf8'));
  assert.equal(map.mappings, chunk.map.mappings);
  const result = execute(chunk, true);
  if (sourcemap !== 'hidden') assert.match(result.stderr, /library\.js:6:/);
}

for (const threadPool of [false, { enable: true, size: 2 }]) {
  const { chunks, outDir } = await buildLibrary(`no-map-${!!threadPool}`,
    { ...seeded(123), threadPool },
    { sourcemap: true, lib: { entry, formats: ['es'] } }, { sourcemap: false });
  assert.equal(chunks[0].map, null);
  assert.doesNotMatch(chunks[0].code, /sourceMappingURL/);
  assert.deepEqual(readdirSync(outDir).filter(name => name.endsWith('.map')), []);
  execute(chunks[0]);
}

const independentMaps = await buildLibrary('independent-maps', seeded(123), { sourcemap: true, lib: { entry, formats: ['es', 'cjs'] } }, [
  { format: 'es', entryFileNames: 'no-map.js', sourcemap: false },
  { format: 'cjs', entryFileNames: 'hidden.cjs', sourcemap: 'hidden' },
]);
assert.equal(independentMaps.chunks[0].map, null);
assert(independentMaps.chunks[1].map);
for (const chunk of independentMaps.chunks) assert.doesNotMatch(chunk.code, /sourceMappingURL/);
assert.deepEqual(readdirSync(independentMaps.outDir).filter(name => name.endsWith('.map')), ['hidden.cjs.map']);

if (Number(version.split('.')[0]) >= 5) {
  for (const threadPool of [false, { enable: true, size: 2 }]) {
    for (const sourcemap of [true, 'inline', 'hidden']) {
      const ids = [];
      for (const seed of [123, 123, 456]) {
        const { chunks, outDir } = await buildLibrary(`debug-id-${!!threadPool}-${sourcemap}-${ids.length}`,
          { ...seeded(seed), threadPool },
          { sourcemap, lib: { entry, formats: ['es'] } }, { sourcemapDebugIds: true });
        const chunk = chunks[0];
        const matches = [...chunk.code.matchAll(/\/\/# debugId=([\da-f-]+)/g)];
        assert.equal(matches.length, 1);
        const map = sourcemap === 'inline'
          ? JSON.parse(Buffer.from(/base64,([^\r\n]+)/.exec(chunk.code)[1], 'base64').toString())
          : JSON.parse(readFileSync(resolve(outDir, `${chunk.fileName}.map`), 'utf8'));
        assert.equal(map.debugId, matches[0][1]);
        assert.equal(chunk.map.debugId, map.debugId);
        if (seed === 123 && !ids.length && threadPool) browserBundles.push({
          format: 'es', threadPool: true, sourcemap, url: `/library/debug-id-true-${sourcemap}-0/${chunk.fileName}`,
        });
        ids.push(map.debugId);
        const result = execute(chunk, true);
        if (sourcemap !== 'hidden') assert.match(result.stderr, /library\.js:6:/);
      }
      assert.equal(ids[0], ids[1]);
      assert.notEqual(ids[0], ids[2]);
    }
  }
}

// Rolldown does not yet implement custom sourcemap filename patterns.
if (Number(version.split('.')[0]) < 8) {
  for (const hashCharacters of Number(version.split('.')[0]) >= 5 ? ['base64', 'base36', 'hex'] : ['base64']) {
    for (const callback of [false, true]) {
      const maps = [];
      for (const seed of [123, 123, 456]) {
        const pattern = 'maps/[format]-[name]-[hash:10].map';
        let calls = 0;
        const sourcemapFileNames = callback
          ? () => {
              calls++;
              return pattern;
            }
          : pattern;
        const { chunks, outDir } = await buildLibrary(`map-hash-${hashCharacters}-${callback}-${maps.length}`, seeded(seed),
          { sourcemap: true, lib: { entry, formats: ['es'] } }, { sourcemapFileNames, ...(Number(version.split('.')[0]) >= 5 && { hashCharacters }) });
        const chunk = chunks[0];
        if (callback) assert.equal(calls, 1);
        const names = readdirSync(resolve(outDir, 'maps'));
        assert.equal(names.length, 1);
        const name = `maps/${names[0]}`;
        assert.equal(chunk.sourcemapFileName, name);
        assert(chunk.code.includes(`//# sourceMappingURL=${name}`));
        const source = readFileSync(resolve(outDir, name), 'utf8');
        assert.equal(JSON.parse(source).mappings, chunk.map.mappings);
        const alphabet = hashCharacters === 'hex' ? '[a-f0-9]' : hashCharacters === 'base36' ? '[a-z0-9]' : '[\\w-]';
        assert.match(name, new RegExp(`-${alphabet}{10}\\.map$`));
        maps.push({ name, source });
        execute(chunk);
      }
      assert.deepEqual(maps[0], maps[1]);
      assert.notEqual(maps[0].source, maps[2].source);
      assert.notEqual(maps[0].name, maps[2].name);
    }
  }
}

const hashes = [];
for (const seed of [123, 123, 456]) {
  const { chunks } = await buildLibrary(`hash-${hashes.length}`, seeded(seed), { lib: { entry, formats: ['es'] } }, { entryFileNames: '[name]-[hash].js' });
  hashes.push(chunks[0].fileName);
}
assert.equal(hashes[0], hashes[1]);
assert.notEqual(hashes[0], hashes[2]);

for (const pattern of [/library/g, /library/y]) {
  pattern.lastIndex = 2;
  const { chunks } = await buildLibrary(`exclude-${pattern.flags}`, { excludes: [pattern] }, { write: false, lib: { entry, formats: ['es', 'cjs'], fileName: 'library' } });
  for (const chunk of chunks) assert.doesNotMatch(chunk.code, /_0x[\da-f]+/);
  assert.equal(pattern.lastIndex, 2);
}

await assert.rejects(buildLibrary('invalid-pool', { threadPool: { enable: true, size: -1 } }, { write: false }), /threadPool.size must be a positive integer/);

const postObfuscator = obfuscator({ log: false });
postObfuscator.enforce = 'post';
const formatter = {
  name: 'earlier-post-formatter',
  enforce: 'post',
  generateBundle: { order: 'post', handler(outputOptions, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'chunk') chunk.code = chunk.code.replaceAll(';', ';\n');
    }
  } },
};
const ordered = await buildLibrary('post-order', {}, { lib: { entry, formats: ['es'] } }, {}, [formatter, postObfuscator]);
execute(ordered.chunks[0]);

writeFileSync(resolve(root, 'dist/library/manifest.json'), JSON.stringify(browserBundles));
console.log(`Library regression checks passed on Vite ${version}`);
