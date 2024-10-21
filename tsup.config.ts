import {defineConfig, Options} from 'tsup';

const baseConfig: Options = {
  entry: ['src/index.ts', 'src/worker/index.ts'],
  target: 'es2020',
  shims: true,
  outDir: 'dist',
  external: ['javascript-obfuscator', 'vite'],
  dts: {
    entry: 'src/index.ts',
    resolve: true,
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
};

export default defineConfig([
  {
    ...baseConfig,
    format: ['cjs'],
    define: {
      WORKER_FILE_PATH: JSON.stringify('./worker/index.js'),
    },
  },
  {
    ...baseConfig,
    format: ['esm'],
    define: {
      WORKER_FILE_PATH: JSON.stringify('./worker/index.mjs'),
    },
  },
]);
