<div align="center">

<img height="160" src="https://obfuscator.io/images/logo.png" alt="vite-plugin-bundle-obfuscator logo" />

# vite-plugin-bundle-obfuscator

适用于`Vite`环境的`JavaScript`混淆器插件

[![awesome-vite](https://awesome.re/badge.svg)](https://github.com/vitejs/awesome-vite)
[![npm version](https://img.shields.io/npm/v/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=28CF8D&logo=npm)](https://www.npmjs.com/package/vite-plugin-bundle-obfuscator)
[![npm downloads](https://img.shields.io/npm/dt/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=28CF8D&logo=npm)](https://www.npmjs.com/package/vite-plugin-bundle-obfuscator)
[![GitHub Release Date](https://img.shields.io/github/release-date/z0ffy/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=a855f7)](https://github.com/z0ffy/vite-plugin-bundle-obfuscator/releases)
[![codecov](https://codecov.io/gh/z0ffy/vite-plugin-bundle-obfuscator/graph/badge.svg)](https://codecov.io/gh/z0ffy/vite-plugin-bundle-obfuscator)
[![GitHub License](https://img.shields.io/github/license/z0ffy/vite-plugin-bundle-obfuscator?style=flat&colorA=18181B&colorB=white)](https://github.com/z0ffy/vite-plugin-bundle-obfuscator/blob/main/LICENSE)

[📝 更新日志](./CHANGELOG.md) · [🐛 报告问题][github-issues-link] · [✨ 请求功能][github-pr-link]

<p align="center">
  <a href="./README.md">English</a> | <strong>中文</strong>
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

## ⭐️ 特性

- ✅ ⚡ 支持`Vite`项目中的`JavaScript`混淆。
- ✅ 🚀 多线程支持，以获得更好的性能。
- ✅ ⚙️ 可定制的混淆器选项，以满足您的需求。
- ✅ 🛡️ 自动排除`node_modules`。
- ✅ 📦 支持`node_modules`拆分块。

## ⚠️ 注意

- 如果遇到内存溢出，修改打包命令为`"build": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vite build"`,
  `max-old-space-size`的值根据配置自行设置。
- 在设置`node_modules`分包时，请把准确的包名前置。例如：["vue-router", "vue"]，`"vue"`可以同时匹配到`vue`以及`vue-router`。

## 🌐 在线试用

✦ [Vite - Vanilla](https://stackblitz.com/edit/vitejs-vite-zsytij?file=vite.config.js)
✦ [Vite - Vue](https://stackblitz.com/edit/vitejs-vite-ywho91?file=vite.config.js)
✦ [Vite - React](https://stackblitz.com/edit/vitejs-vite-wyeur4?file=vite.config.js)
✦ [Vite - PReact](https://stackblitz.com/edit/vitejs-vite-oujmks?file=vite.config.js)
✦ [Vite - lit](https://stackblitz.com/edit/vitejs-vite-ru4gws?file=vite.config.js)
✦ [Vite - Svelte](https://stackblitz.com/edit/vitejs-vite-fthdtu?file=vite.config.js)
✦ [Vite - Solid](https://stackblitz.com/edit/vitejs-vite-dcx3eh?file=vite.config.js)
✦ [Vite - Qwik](https://stackblitz.com/edit/vitejs-vite-i2bjvq?file=vite.config.js)
✦ ...

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

// 全部配置
const allObfuscatorConfig = {
  excludes: [],
  enable: true,
  log: true,
  autoExcludeNodeModules: false,
  // autoExcludeNodeModules: { enable: true, manualChunks: ['vue'] }
  threadPool: false,
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

// 简化配置
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

// 默认配置
export default {
  plugins: [
    vitePluginBundleObfuscator()
  ]
};
```

## 🧵 Web Worker 支持

默认支持对 `?worker` / `new Worker(new URL(...))` 生成的 worker bundle 进行混淆，无需额外配置。

禁用 worker 混淆：

```js
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

export default {
  plugins: [
    vitePluginBundleObfuscator({
      worker: false,
    }),
  ],
};
```

仅对 worker 额外排除某些文件：

```js
vitePluginBundleObfuscator({
  workerExcludes: [/comlink\\.worker.*\\.js$/],
});
```

## 🚀 性能比较

拥有 **7000+ modules** 和 **400+ bundles** 在 **4C 8G** 机器上：

- **ThreadPool Enabled**   : 🟩🟩🟩⬜⬜⬜⬜⬜⬜ (大约30秒)
- **ThreadPool Disabled**  : 🟥🟥🟥🟥🟥🟥🟥🟥🟥 (大约90秒)

## 🛠️ 选项

| 属性                     | 描述                         | 类型                                                                                  | 默认值                     | 版本                                   |
|------------------------|----------------------------|-------------------------------------------------------------------------------------|-------------------------|--------------------------------------|
| threadPool             | 线程池的配置。                    | boolean \| ({ enable: true; size: number } \| { enable: false })                    | false                   | v1.2.0                               |
| apply                  | 仅将插件应用于服务或构建，或在特定条件下。      | 'serve' \| 'build' \| ((this: void, config: UserConfig, env: ConfigEnv) => boolean) | build                   | v1.1.0                               |
| autoExcludeNodeModules | 启用自动排除node_modules。        | boolean \| ({ enable: true; manualChunks: string[] } \| { enable: false })          | false                   | v1.0.9（原本为boolean，在v1.3.0版本中扩展到当前类型） |
| worker                 | 启用或禁用 Web Worker 产物混淆。       | boolean \| { enable: boolean }                                                     | true                    | v1.10.0                              |
| workerExcludes         | 仅对 worker 额外排除（最终：`excludes + workerExcludes`）。 | (RegExp \| string)[]                                                                | []                      | v1.10.0                              |
| log                    | 显示或隐藏日志输出。                 | boolean                                                                             | true                    | v1.0.4                               |
| enable                 | 启用或禁用混淆器。                  | boolean                                                                             | true                    | v1.0.1                               |
| excludes               | 排除的bundle名。从v1.0.8开始，支持正则。 | (RegExp \| string)[]                                                                | []                      | v1.0.0                               |
| options                | JavaScript混淆器的选项。          | ObfuscatorOptions                                                                   | defaultObfuscatorConfig | v1.0.0                               |

## 📄 License

[MIT](https://opensource.org/licenses/MIT) License Copyright (c) 2024-present, Zoffy
