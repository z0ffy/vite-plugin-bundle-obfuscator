import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { build } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';
import './library.mjs';

const root = import.meta.dirname;
const require = createRequire(import.meta.url);
const viteCli = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');

for (const format of ['esm', 'cjs']) {
  const result = spawnSync(process.execPath, [viteCli, 'build', '--config', `vite.config.${format === 'esm' ? 'mjs' : 'cjs'}`, '--outDir', `dist/${format}`, '--base', `/${format}/`], {
    cwd: root,
    stdio: 'inherit',
    timeout: 60000,
    killSignal: 'SIGKILL',
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
}

const outDir = resolve(root, 'dist/browser');
const result = await build({
  root,
  configFile: false,
  logLevel: 'silent',
  plugins: [obfuscator({ log: false, threadPool: { enable: true, size: 2 } })],
  build: {
    outDir,
    lib: { entry: resolve(root, 'src/browser-library.js'), formats: ['es'], fileName: 'browser-library' },
  },
});
const chunks = (Array.isArray(result) ? result[0] : result).output.filter(item => item.type === 'chunk');
assert(chunks.length >= 2, 'Expected a dynamically imported chunk');
for (const chunk of chunks) assert.match(chunk.code, /_0x[\da-f]+/);
writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify({ entry: `/browser/${chunks.find(chunk => chunk.isEntry).fileName}`, chunks: chunks.length }));
