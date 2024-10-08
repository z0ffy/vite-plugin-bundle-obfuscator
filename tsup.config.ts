import {defineConfig} from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/worker/index.ts'],
  format: ['esm', 'cjs'],
  external: ['javascript-obfuscator', 'vite'],
  dts: {
    entry: 'src/index.ts',
    resolve: true,
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
})
