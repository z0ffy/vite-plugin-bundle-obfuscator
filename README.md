# vite-plugin-bundle-obfuscator

---

![stars](https://img.shields.io/github/stars/z0ffy/vite-plugin-bundle-obfuscator)

The javascript obfuscator plugin used in a vite environment

## 👨‍💻 Usage

1. Register the plugin in `vite.config.js`
2. 

```javascript
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

const obfuscatorConfig = {
  excludes: [],
  options: {}
};

export default {
  plugins: [vitePluginBundleObfuscator(obfuscatorConfig)]
};
```

## Config
