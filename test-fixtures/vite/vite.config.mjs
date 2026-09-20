import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

export default {
  plugins: [
    vitePluginBundleObfuscator({
      log: false,
      threadPool: true,
      obfuscateWorker: true,
      options: {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1,
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
};
