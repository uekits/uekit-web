# 第三方开源软件说明

UEKit Web 使用了 Vue、Element Plus、Lucide、Tailwind CSS、Vite、TypeScript、ECharts、AMap Loader 及其传递依赖。这些项目仍分别受各自许可证约束。

UEKit Web 的 MIT License 不会替代或改变第三方项目的许可证。发行、再分发或修改第三方代码时，使用者仍需遵守对应条款。

Registry 条目主要分发 UEKit 自有适配和组合源码；第三方库通过 npm 依赖安装，不应把第三方构建产物直接复制进 Registry。

完整依赖许可证见自动生成的 [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)。新增依赖时必须按[依赖管理规范](./docs/standards/依赖管理规范.md)检查许可证兼容性，并执行 `pnpm licenses:generate` 后复核变化。
