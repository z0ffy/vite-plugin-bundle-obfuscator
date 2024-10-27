<div align="center">

<img height="160" src="https://www.obfuscator.io/static/images/logo.png" alt="vite-plugin-bundle-obfuscator logo" />

# vite-plugin-bundle-obfuscator

适用于`Vite`环境的`JavaScript`混淆器插件

[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
[![][npm-release-shield]][npm-release-link]
[![][npm-downloads-shield]][npm-release-link]
[![][github-releasedate-shield]][github-releasedate-link]
[![][github-license-shield]][github-license-link]

[Changelog](./CHANGELOG.md) · [Report Bug][github-issues-link] · [Request Feature][github-pr-link]

<p align="center">
  <a href="./README.md">English</a> | <strong>中文</strong>
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

## ⭐️ 特性

- [x] ⚡ 支持`Vite`项目中的`JavaScript`混淆。
- [x] ⚙️ 可定制的混淆器选项，以满足您的需求。
- [x] 🛡️ 自动排除`node_modules`。
- [x] 🚀 多线程支持，以获得更好的性能。
- [ ] 📦 支持`node_modules`拆分块。

## ⚠️ 注意

- 如果混淆选项`stringArray`为`true`。
    - 您的结果可能会丢失一些捆绑包（在`__vite__mapDeps`数组中）。
    - 我正在寻找一个准确的案例。
- 如果遇到内存溢出，修改打包命令为`"build": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vite build"`,`max-old-space-size`的值根据配置自行设置

## 📦 安装

```bash
# 使用npm
npm install vite-plugin-bundle-obfuscator -D

# 使用pnpm
pnpm add vite-plugin-bundle-obfuscator -D

# 使用yarn
yarn add vite-plugin-bundle-obfuscator -D
```

## 👨‍💻 使用

1. 使用您首选的软件包管理器安装插件。
2. 在`vite.config.js`中注册插件。
3. 自定义混淆器配置或使用默认选项。

示例:

```javascript
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

const defaultObfuscatorConfig = {
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
    // vitePluginBundleObfuscator()
    vitePluginBundleObfuscator(defaultObfuscatorConfig)
  ]
};
```

## 🛠️ 选项

| 属性                     | 描述                         | 类型                                                                                  | 默认值                     | 版本     |
|------------------------|----------------------------|-------------------------------------------------------------------------------------|-------------------------|--------|
| threadPool             | 线程池的配置。                    | boolean \| ({ enable: true; size: number } \| { enable: false })                    | false                   | v1.2.0 |
| apply                  | 仅将插件应用于服务或构建，或在特定条件下。      | 'serve' \| 'build' \| ((this: void, config: UserConfig, env: ConfigEnv) => boolean) | build                   | v1.1.0 |
| autoExcludeNodeModules | 启用自动排除node_modules。        | boolean                                                                             | false                   | v1.0.9 |
| log                    | 显示或隐藏日志输出。                 | boolean                                                                             | true                    | v1.0.4 |
| enable                 | 启用或禁用混淆器。                  | boolean                                                                             | true                    | v1.0.1 |
| excludes               | 排除的bundle名。从v1.0.8开始，支持正则。 | (RegExp \| string)[]                                                                | []                      | v1.0.0 |
| options                | JavaScript混淆器的选项。          | ObfuscatorOptions                                                                   | defaultObfuscatorConfig | v1.0.0 |

## 📄 License

[MIT](https://opensource.org/licenses/MIT) License Copyright (c) 2024-present, Zoffy
