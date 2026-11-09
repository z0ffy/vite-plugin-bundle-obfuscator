import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, version } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';

const root = mkdtempSync(join(tmpdir(), 'obfuscator-watch-'));
const entry = join(root, 'entry.js');
const outDir = join(root, 'dist');
const bundlerKey = Number(version.split('.')[0]) >= 8 ? 'rolldownOptions' : 'rollupOptions';
writeFileSync(entry, 'export const value = 1;');
let watcher;
let timer;
let editTimer;

try {
  watcher = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [obfuscator({ log: false })],
    build: {
      watch: {},
      outDir,
      emptyOutDir: true,
      lib: { entry, formats: ['es'] },
      [bundlerKey]: { output: { entryFileNames: '[name]-[hash].mjs' } },
    },
  });
  await new Promise((resolve, reject) => {
    let builds = 0;
    let firstFile;
    timer = setTimeout(() => reject(new Error('Library watch rebuild timed out')), 15000);
    watcher.on('event', (event) => {
      if (event.code === 'ERROR') reject(event.error);
      if (event.code !== 'BUNDLE_END') return;
      try {
        const files = readdirSync(outDir).filter(name => name.endsWith('.mjs'));
        assert.equal(files.length, 1);
        const file = join(outDir, files[0]);
        assert.match(readFileSync(file, 'utf8'), /_0x[\da-f]+/);
        builds++;
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
          const lib = await import(${JSON.stringify(pathToFileURL(file).href)});
          if (lib.value !== ${builds}) throw Error('Stale watch output');
        `], { encoding: 'utf8', timeout: 3000, killSignal: 'SIGKILL' });
        assert.equal(result.error, undefined, result.stderr);
        assert.equal(result.status, 0, result.stderr);
        if (builds === 1) {
          firstFile = files[0];
          editTimer = setTimeout(() => writeFileSync(entry, 'export const value = 2;'), 100);
        }
        else {
          assert.notEqual(files[0], firstFile);
          resolve();
        }
      }
      catch (error) {
        reject(error);
      }
    });
  });
  console.log(`Library watch regression passed on Vite ${version}`);
}
finally {
  clearTimeout(timer);
  clearTimeout(editTimer);
  await watcher?.close();
  rmSync(root, { recursive: true, force: true });
}
