import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

vitePluginBundleObfuscator({
  autoExcludeNodeModules: true,
  threadPool: true,
});
