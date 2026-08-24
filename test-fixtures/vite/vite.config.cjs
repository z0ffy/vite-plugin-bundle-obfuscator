// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: vitePluginBundleObfuscator } = require('vite-plugin-bundle-obfuscator');

module.exports = {
  plugins: [
    vitePluginBundleObfuscator({
      log: false,
      threadPool: true,
      options: {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1,
      },
    }),
  ],
};
