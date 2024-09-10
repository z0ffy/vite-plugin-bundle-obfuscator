# vite-plugin-bundle-obfuscator

![stars](https://img.shields.io/github/stars/z0ffy/vite-plugin-bundle-obfuscator)
[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
![NPM License](https://img.shields.io/npm/l/vite-plugin-bundle-obfuscator)
![downloads](https://img.shields.io/npm/dt/vite-plugin-bundle-obfuscator)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/vite-plugin-bundle-obfuscator)
[![NPM Version](https://img.shields.io/npm/v/vite-plugin-bundle-obfuscator)](https://www.npmjs.com/package/vite-plugin-bundle-obfuscator?activeTab=readme)

JavaScript obfuscator plugin for Vite environments

## ⭐️ Feature
- [ ] support the stringArray options
- [ ] support the node_modules split chunk

## 👨‍💻 Usage

1. Run npm install vite-plugin-bundle-obfuscator -D
2. Register the plugin in `vite.config.js`
3. Set your own configuration or set empty to use default options

```shell
npm install vite-plugin-bundle-obfuscator -D
```

```javascript
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

const obfuscatorConfig = {
  enable: true,
  excludes: [],
  options: {}
};

export default {
  plugins: [vitePluginBundleObfuscator(obfuscatorConfig)]
};
```

## 💪 Config

| Property Name | Description                                                             | Type                 | Default        | Version |
|---------------|-------------------------------------------------------------------------|----------------------|----------------|---------|
| log           | Show or hide log output.                                                | boolean              | true           | v1.0.4  |
| enable        | Enable or disable the obfuscator.                                       | boolean              | true           | v1.0.1  |
| excludes      | Bundle names to be excluded. Starting from v1.0.8, RegExp is supported. | (RegExp \| string)[] | []             | v1.0.0  |
| options       | Options for the JavaScript obfuscator.                                  | ObfuscatorOptions    | Config example | v1.0.0  |

## 💪 Config example

```javascript
const obfuscatorConfig = {
  // You can temporarily package the dependency of node_modules into a bundle named vendor-modules or other names, and configure it as a filter item.
  excludes: ['vendor-modules'],
  enable: true,
  log: true,
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
