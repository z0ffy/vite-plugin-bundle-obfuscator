// eslint-disable-next-line @typescript-eslint/no-require-imports
import vitePluginBundleObfuscator = require('vite-plugin-bundle-obfuscator');

vitePluginBundleObfuscator.default({
  autoExcludeNodeModules: true,
  threadPool: true,
});
