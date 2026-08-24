import { defineConfig, Options } from 'tsup';

const baseConfig: Options = {
  entry: ['src/index.ts', 'src/worker/index.ts'],
  target: 'es2020',
  shims: true,
  outDir: 'dist',
  external: ['javascript-obfuscator', 'vite'],
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  dts: {
    entry: 'src/index.ts',
    resolve: true,
  },
  esbuildOptions(options) {
    options.legalComments = 'none';
    return options;
  },
};

export default defineConfig([
  {
    ...baseConfig,
    format: ['cjs'],
    outExtension: () => ({ js: '.cjs', dts: '.d.cts' }),
    define: {
      WORKER_FILE_PATH: JSON.stringify('./worker/index.cjs'),
    },
  },
  {
    ...baseConfig,
    format: ['esm'],
    outExtension: () => ({ js: '.mjs', dts: '.d.ts' }),
    define: {
      WORKER_FILE_PATH: JSON.stringify('./worker/index.mjs'),
    },
  },
]);
