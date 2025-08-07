<div align="center">

<img height="160" src="https://obfuscator.io/images/logo.png" alt="vite-plugin-bundle-obfuscator logo" />

# vite-plugin-bundle-obfuscator

JavaScript `obfuscator` plugin for `Vite` environments

[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
[![npm version](https://img.shields.io/npm/v/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=28CF8D&logo=npm)](https://www.npmjs.com/package/vite-plugin-bundle-obfuscator)
[![npm downloads](https://img.shields.io/npm/dt/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=28CF8D&logo=npm)](https://www.npmjs.com/package/vite-plugin-bundle-obfuscator)
[![GitHub Release Date](https://img.shields.io/github/release-date/z0ffy/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=a855f7)](https://github.com/z0ffy/vite-plugin-bundle-obfuscator/releases)
[![codecov](https://codecov.io/gh/z0ffy/vite-plugin-bundle-obfuscator/graph/badge.svg)](https://codecov.io/gh/z0ffy/vite-plugin-bundle-obfuscator)
[![GitHub License](https://img.shields.io/github/license/z0ffy/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=white)](https://github.com/z0ffy/vite-plugin-bundle-obfuscator/blob/main/LICENSE)

[📝 Changelog](./CHANGELOG.md) · [🐛 Report Bug][github-issues-link] · [✨ Request Feature][github-pr-link]

<p align="center">
  <strong>English</strong> | <a href="./README.zh-CN.md">中文</a>
</p>

![](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

</div>

<!-- Badge Links -->
[npm-release-shield]: https://img.shields.io/npm/v/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=28CF8D&logo=npm
[npm-downloads-shield]: https://img.shields.io/npm/dt/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=28CF8D&logo=npm
[npm-release-link]: https://www.npmjs.com/package/vite-plugin-bundle-obfuscator
[github-releasedate-shield]: https://img.shields.io/github/release-date/z0ffy/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=a855f7
[github-releasedate-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/releases
[github-license-shield]: https://img.shields.io/github/license/z0ffy/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=white
[github-license-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/blob/main/LICENSE
[github-issues-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/issues
[github-pr-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/pulls

## ⭐️ Features

- ✅ ⚡ Supports `JavaScript obfuscation` in `Vite` projects.
- ✅ 🚀 Multi-threading support for better performance.
- ✅ ⚙️ Customizable obfuscator options to fit your needs.
- ✅ 🛡️ Auto-excludes `node_modules`.
- ✅ 📦 Support the `node_modules` split chunk.

## ⚠️ Notice

- If a memory overflow occurs, modify the packaging command to
  `"build": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vite build"`, where `max-old-space-size` is set according
  to the configuration.
- When setting up `node_modules` split chunk, please place the accurate package name at the front. For
  example: ["vue-router", "vue"], "vue" can match both "vue" and "vue-router" at the same time.

## 🌐 Online

✦ [Vite - Vanilla](https://stackblitz.com/edit/vitejs-vite-zsytij?file=vite.config.js)
✦ [Vite - Vue](https://stackblitz.com/edit/vitejs-vite-ywho91?file=vite.config.js)
✦ [Vite - React](https://stackblitz.com/edit/vitejs-vite-wyeur4?file=vite.config.js)
✦ [Vite - PReact](https://stackblitz.com/edit/vitejs-vite-oujmks?file=vite.config.js)
✦ [Vite - lit](https://stackblitz.com/edit/vitejs-vite-ru4gws?file=vite.config.js)
✦ [Vite - Svelte](https://stackblitz.com/edit/vitejs-vite-fthdtu?file=vite.config.js)
✦ [Vite - Solid](https://stackblitz.com/edit/vitejs-vite-dcx3eh?file=vite.config.js)
✦ [Vite - Qwik](https://stackblitz.com/edit/vitejs-vite-i2bjvq?file=vite.config.js)
✦ ...

## 📦 Installation

```bash
# Using npm
npm install vite-plugin-bundle-obfuscator -D

# Using pnpm
pnpm add vite-plugin-bundle-obfuscator -D

# Using yarn
yarn add vite-plugin-bundle-obfuscator -D
```

## 👨‍💻 Usage

1. Install the plugin using your preferred package manager.
2. Register the plugin in `vite.config.js`
3. Customize the obfuscator configuration or use the default options.

Example:

```javascript
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

// All configurations
const allObfuscatorConfig = {
  excludes: [],
  enable: true,
  log: true,
  autoExcludeNodeModules: true,
  // autoExcludeNodeModules: { enable: true, manualChunks: ['vue'] }
  threadPool: true,
  // threadPool: { enable: true, size: 4 }
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: false,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: false,
    ignoreImports: true,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.5,
    stringArrayEncoding: [],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
  }
};

export default {
  plugins: [
    vitePluginBundleObfuscator(allObfuscatorConfig)
  ]
};

// Simplified configurations
const minimizeObfuscatorConfig = {
  autoExcludeNodeModules: true,
  // autoExcludeNodeModules: { enable: true, manualChunks: ['vue'] }
  threadPool: true,
  // threadPool: { enable: true, size: 4 }
};

export default {
  plugins: [
    vitePluginBundleObfuscator(minimizeObfuscatorConfig)
  ]
};

// Default configurations
export default {
  plugins: [
    vitePluginBundleObfuscator()
  ]
};
```

## 🚀 Performance Comparison

With **7000+ modules** and **400+ bundles** on a **4C 8G** machine:

- **ThreadPool Enabled**   : 🟩🟩🟩⬜⬜⬜⬜⬜⬜ (About 30 seconds)
- **ThreadPool Disabled**  : 🟥🟥🟥🟥🟥🟥🟥🟥🟥 (About 90 seconds)

## 🛠️ Options

| Property Name          | Description                                                             | Type                                                                                | Default                 | Version                                                         |
|------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------|-------------------------|-----------------------------------------------------------------|
| threadPool             | Configuration for the thread pool.                                      | boolean \| ({ enable: true; size: number } \| { enable: false })                    | false                   | v1.2.0                                                          |
| apply                  | Apply the plugin only for serve or build, or on certain conditions.     | 'serve' \| 'build' \| ((this: void, config: UserConfig, env: ConfigEnv) => boolean) | build                   | v1.1.0                                                          |
| autoExcludeNodeModules | Enable auto exclude node_modules.                                       | boolean \| ({ enable: true; manualChunks: string[] } \| { enable: false })          | false                   | v1.0.9 (originally boolean, extended to current type in v1.3.0) |
| log                    | Show or hide log output.                                                | boolean                                                                             | true                    | v1.0.4                                                          |
| enable                 | Enable or disable the obfuscator.                                       | boolean                                                                             | true                    | v1.0.1                                                          |
| excludes               | Bundle names to be excluded. Starting from v1.0.8, RegExp is supported. | (RegExp \| string)[]                                                                | []                      | v1.0.0                                                          |
| options                | Options for the JavaScript obfuscator.                                  | ObfuscatorOptions                                                                   | defaultObfuscatorConfig | v1.0.0                                                          |

## 📄 License

[MIT](https://opensource.org/licenses/MIT) License Copyright (c) 2024-present, Zoffy
