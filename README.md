# vite-plugin-bundle-obfuscator

![stars](https://img.shields.io/github/stars/z0ffy/vite-plugin-bundle-obfuscator)
[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
![weekly downloads](https://img.shields.io/npm/dw/vite-plugin-bundle-obfuscator)
![license](https://img.shields.io/npm/l/vite-plugin-bundle-obfuscator)
[![install size](https://packagephobia.com/badge?p=vite-plugin-bundle-obfuscator)](https://packagephobia.com/result?p=vite-plugin-bundle-obfuscator)

Javascript obfuscator plugin for Vite environments

## ⭐️ Feature
- [ ] support the stringArray options
- [ ] support the node_modules split chunk

## 👨‍💻 Usage

1. Register the plugin in `vite.config.js`
2. Set your own configuration

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

## 💪 Config

| Property Name | Description                           | Type              | Default        | version |
|---------------|---------------------------------------|-------------------|----------------|---------|
| enable        | enable or disable obfuscator          | Boolean           | true           | v1.0.1  |
| excludes      | bundle names that need to be excluded | string[]          | []             | v1.0.0  |
| options       | javascript obfuscator options         | ObfuscatorOptions | Config example | v1.0.0  |

## 💪 Config example

```javascript
const obfuscatorConfig = {
  excludes: ['vendor-modules'],
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
