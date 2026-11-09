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

async function buildLibrary(name, config = {}, buildOptions = {}, output = {}) {
  const outDir = resolve(root, 'dist/library', name);
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [obfuscator({ log: false, ...config })],
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
writeFileSync(resolve(root, 'dist/library/manifest.json'), JSON.stringify(browserBundles));

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

const hashes = [];
for (const seed of [123, 123, 456]) {
  const { chunks } = await buildLibrary(`hash-${hashes.length}`, seeded(seed), { lib: { entry, formats: ['es'] } }, { entryFileNames: '[name]-[hash].js' });
  hashes.push(chunks[0].fileName);
}
assert.equal(hashes[0], hashes[1]);
assert.notEqual(hashes[0], hashes[2]);
console.log(`Library regression checks passed on Vite ${version}`);
