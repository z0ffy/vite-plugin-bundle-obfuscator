<div align="center">

<img height="160" src="https://www.obfuscator.io/static/images/logo.png" alt="vite-plugin-bundle-obfuscator logo" />

# vite-plugin-bundle-obfuscator

JavaScript obfuscator plugin for Vite environments

[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
[![][npm-release-shield]][npm-release-link]
[![][npm-downloads-shield]][npm-release-link]
[![][github-releasedate-shield]][github-releasedate-link]
[![][github-license-shield]][github-license-link]

[Changelog](./CHANGELOG.md) · [Report Bug][github-issues-link] · [Request Feature][github-pr-link]

<p align="center">
  <strong>English</strong> | <a href="./README.zh-CN.md">中文</a>
</p>

![](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

</div>

[npm-release-shield]: https://img.shields.io/npm/v/vite-plugin-bundle-obfuscator?color=369eff&labelColor=black&logo=npm&logoColor=white

[npm-downloads-shield]: https://img.shields.io/npm/dt/vite-plugin-bundle-obfuscator?color=red&labelColor=black&logo=npm&logoColor=white

[npm-release-link]: https://www.npmjs.com/package/vite-plugin-bundle-obfuscator

[github-releasedate-shield]: https://img.shields.io/github/release-date/z0ffy/vite-plugin-bundle-obfuscator?labelColor=black

[github-releasedate-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/releases

[github-issues-shield]: https://img.shields.io/github/issues/z0ffy/vite-plugin-bundle-obfuscator?color=ff80eb&labelColor=black

[github-issues-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/issues

[github-license-shield]: https://img.shields.io/github/license/z0ffy/vite-plugin-bundle-obfuscator?color=white&labelColor=black

[github-license-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/blob/main/LICENSE

[github-pr-link]: https://github.com/z0ffy/vite-plugin-bundle-obfuscator/pulls

## ⭐️ Features

---

- [x] Supports JavaScript obfuscation in Vite projects.
- [x] Customizable obfuscator options to fit your needs.
- [x] Auto-excludes `node_modules`.
- [x] Multi-threading support for better performance.
- [ ] ？Support the node_modules split chunk.

## ⚠️ Notice

---

- If the obfuscation option stringArray is true.
    - Your results may lose some bundles (in __vite__mapDeps array).
    - I'm looking for an accurate case.

## 📦 Installation

---

```bash
# Using npm
npm install vite-plugin-bundle-obfuscator -D

# Using pnpm
pnpm add vite-plugin-bundle-obfuscator -D

# Using yarn
yarn add vite-plugin-bundle-obfuscator -D
```

## 👨‍💻 Usage

---

1. Install the plugin using your preferred package manager.
2. Register the plugin in `vite.config.js`
3. Customize the obfuscator configuration or use the default options.

Example:

```javascript
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

const obfuscatorConfig = {
  excludes: [],
  enable: true,
  log: true,
  autoExcludeNodeModules: false,
  threadPool: false,
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
    stringArray: false,
    stringArrayCallsTransform: false,
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
    // vitePluginBundleObfuscator(obfuscatorConfig)
    vitePluginBundleObfuscator(obfuscatorConfig)
  ]
};
```

## 🛠️ Options

---

| Property Name          | Description                                                             | Type                                                                                | Default        | Version |
|------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------|----------------|---------|
| threadPool             | Configuration for the thread pool.                                      | boolean \| ({ enable: true; size: number } \| { enable: false })                    | false          | v1.2.0  |
| apply                  | Apply the plugin only for serve or build, or on certain conditions.     | 'serve' \| 'build' \| ((this: void, config: UserConfig, env: ConfigEnv) => boolean) | build          | v1.1.0  |
| autoExcludeNodeModules | Enable auto exclude node_modules.                                       | boolean                                                                             | false          | v1.0.9  |
| log                    | Show or hide log output.                                                | boolean                                                                             | true           | v1.0.4  |
| enable                 | Enable or disable the obfuscator.                                       | boolean                                                                             | true           | v1.0.1  |
| excludes               | Bundle names to be excluded. Starting from v1.0.8, RegExp is supported. | (RegExp \| string)[]                                                                | []             | v1.0.0  |
| options                | Options for the JavaScript obfuscator.                                  | ObfuscatorOptions                                                                   | Config example | v1.0.0  |

## 📄 License

---

[MIT](https://opensource.org/licenses/MIT) License Copyright (c) 2024-present, Zoffy
