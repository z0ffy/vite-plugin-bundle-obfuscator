<div align="center">

<img height="160" src="https://www.obfuscator.io/static/images/logo.png" alt="" />

# vite-plugin-bundle-obfuscator

JavaScript obfuscator plugin for Vite environments

[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
[![OSS Compass Analyze](https://oss-compass.org/badge/s6hwec8f.svg?metric=community)](https://oss-compass.org/analyze/s6hwec8f#community_service_support)
[![][npm-release-shield]][npm-release-link]
[![][npm-downloads-shield]][npm-release-link]
[![][github-releasedate-shield]][github-releasedate-link]
[![][github-issues-shield]][github-issues-link]
[![][github-license-shield]][github-license-link]

[Changelog](./CHANGELOG.md) · [Report Bug][github-issues-link] · [Request Feature][github-pr-link]

<p align="center">English | <a href="./README.zh-CN.md">Chinese</a></p>

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

## ✨ Features

- [ ] 💎 support the stringArray options
- [ ] 💎 support the node_modules split chunk

## 📦 Installation

```shell
npm install vite-plugin-bundle-obfuscator -D
```

## 👨‍💻 Usage

1. Run npm install vite-plugin-bundle-obfuscator -D
2. Register the plugin in `vite.config.js`
3. Set your own configuration or set empty to use default options

```javascript
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

const obfuscatorConfig = {
  enable: true,
  log: true,
  autoExcludeNodeModules: true,
  excludes: [],
  options: {}
};

export default {
  plugins: [vitePluginBundleObfuscator(obfuscatorConfig)]
};
```

## 💪 Config

| Property Name          | Description                                                             | Type                                                                                | Default        | Version |
|------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------|----------------|---------|
| log                    | Show or hide log output.                                                | boolean                                                                             | true           | v1.0.4  |
| enable                 | Enable or disable the obfuscator.                                       | boolean                                                                             | true           | v1.0.1  |
| autoExcludeNodeModules | Enable auto exclude node_modules.                                       | boolean                                                                             | false          | v1.0.9  |
| apply                  | Apply the plugin only for serve or build, or on certain conditions.     | 'serve' \| 'build' \| ((this: void, config: UserConfig, env: ConfigEnv) => boolean) | build          | v1.1.0  |
| excludes               | Bundle names to be excluded. Starting from v1.0.8, RegExp is supported. | (RegExp \| string)[]                                                                | []             | v1.0.0  |
| options                | Options for the JavaScript obfuscator.                                  | ObfuscatorOptions                                                                   | Config example | v1.0.0  |

## 💡 Config example

```javascript
const obfuscatorConfig = {
  excludes: [],
  enable: true,
  log: true,
  autoExcludeNodeModules: false,
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
    // stringArray must be false, if you set true.your style sheet will be missing some。
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
```
