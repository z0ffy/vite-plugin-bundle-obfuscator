import {defineConfig} from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: ['javascript-obfuscator', 'vite'],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
})
