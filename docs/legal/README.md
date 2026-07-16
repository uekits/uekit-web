# 法律与第三方软件说明

## 项目许可证

UEKit Web 源代码采用 [MIT License](../../LICENSE)。MIT License 不会替代或改变第三方项目的许可证，也不授予以暗示官方背书、官方来源或合作关系的方式使用 UEKit 名称和标志的权利。

## 第三方软件

UEKit Web 使用 Vue、Element Plus、Lucide、Tailwind CSS、Vite、TypeScript、ECharts、AMap Loader 及其传递依赖。这些项目分别受各自许可证约束，发行、再分发或修改第三方代码时仍需遵守对应条款。

Registry 条目主要分发 UEKit 自有适配和组合源码；第三方库通过 npm 依赖安装，不应把第三方构建产物直接复制进 Registry。

完整依赖许可证见自动生成的[第三方许可证清单](./THIRD_PARTY_LICENSES.md)。新增依赖时必须按照[依赖管理规范](../standards/依赖管理规范.md)检查许可证兼容性，并执行 `pnpm licenses:generate` 后复核变化。

## 商标

UEKit 名称和标志的使用边界见[商标使用说明](./TRADEMARKS.md)。允许如实描述项目使用、基于或兼容 UEKit，但不得冒充官方发行版或暗示未经授权的合作关系。
