# UEKit Web

UEKit Web 是面向 Vue 企业应用的源码分发平台。它以 Element Plus 为基础能力，通过 Registry 和 CLI 将组件、主题、布局及集成能力按需安装到业务项目中。

UEKit Web 不是需要在运行时整体引入的传统组件库。安装后的源码归业务项目所有，团队可以直接阅读、修改、提交到自己的 Git 仓库并长期维护。

```bash
pnpm dlx @uekits/web@latest init
pnpm dlx @uekits/web@latest add button avatar pro-table detail-drawer
```

业务项目直接使用本地源码：

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { ProTable } from '@/components/pro/pro-table';
</script>

<template>
    <Button>新建用户</Button>
    <ProTable />
</template>
```

## 当前状态

| 项目          | 当前状态                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| 发布阶段      | `0.1.x` / Pre-1.0                                                        |
| CLI           | [`@uekits/web@0.1.2`](https://www.npmjs.com/package/@uekits/web/v/0.1.2) |
| 默认 Registry | `https://registry.uekit.com/web/v1`                                      |
| CLI 运行环境  | Node.js `>= 20.19.0`                                                     |
| 仓库开发环境  | Node.js `>= 22.12.0`、pnpm `>= 11.1.3`                                   |
| 已验证消费链  | pnpm、npm                                                                |

当前版本已经可以用于安装、定制和升级 UEKit 源码。项目仍处于 Pre-1.0 阶段，Registry 协议和公共组件 API 可能继续演进；破坏性变化将通过 Changelog、Changeset 和迁移说明公开。

团队和 CI 如需固定 CLI 行为，建议显式使用版本号：

```bash
pnpm dlx @uekits/web@0.1.2 init
```

## 核心特点

- **按需安装**：只把实际使用的组件和依赖加入项目。
- **源码归属消费方**：组件位于消费方仓库，可直接阅读、提交和定制。
- **企业应用优先**：除基础组件外，还提供表格、抽屉、表单弹窗、后台布局等能力。
- **统一主题**：通过语义 Token 同时约束 UEKit、Element Plus 和 Tailwind CSS。
- **可追踪升级**：使用 `uekit.lock.json`、`.uekit/bases/`、`diff` 和 `update --merge` 管理本地修改。
- **集成使用同一机制**：地图、图表等能力也通过 Registry 分发，不要求长期绑定额外的 UEKit 运行时包。

## 已实现能力

### Registry 与安装

- 通过公共 HTTPS Registry 分发源码；
- 使用 `/web/v1/items/{name}/{version}.json` 保存不可变条目版本；
- 递归解析和安装 Registry 条目依赖；
- 支持官方 Registry、本地 Registry 和兼容的私有 Registry；
- 校验 Registry Schema、条目名称、资源路径、依赖规格、文件 Hash 和响应体积；
- 默认拒绝非本机的 HTTP Registry；
- `init`、`add` 和 `update` 支持 `--dry-run` 安装或升级计划；
- 通过文件事务、原子状态写入和失败回滚保护消费项目。

### 本地源码与升级

- 将 Vue、TypeScript 和样式源码安装到消费项目；
- 使用 `uekit.lock.json` 记录条目版本、来源和文件状态；
- 使用 `.uekit/bases/` 保存已安装版本的上游基线；
- 使用 `diff` 比较本地源码和安装基线；
- 使用 `update` 安全更新未修改的源码；
- 使用 `update --merge` 对上游新版和本地定制执行三方合并；
- 在冲突或覆盖风险出现时保留本地文件并停止静默覆盖。

### 工程与供应链

- TypeScript、ESLint、Stylelint、Vitest 和 Playwright 质量门禁；
- Node.js 20/22 CLI 验证；
- pnpm、npm tarball 消费项目冒烟测试；
- GitHub Actions、CodeQL、Dependency Review 和依赖更新检查；
- npm OIDC Trusted Publishing 和 Provenance；
- Registry 自动部署、不可变版本校验和严格 HTTPS 验收。

## Registry 条目

当前 Registry 提供 12 个条目：

| 分类        | 条目                                                        |
| ----------- | ----------------------------------------------------------- |
| Foundation  | `theme`、`icon`                                             |
| UI          | `button`、`avatar`、`status-tag`                            |
| Pro         | `search-panel`、`pro-table`、`detail-drawer`、`form-dialog` |
| Layout      | `dashboard-layout`                                          |
| Integration | `map-amap`、`charts-echarts`                                |

运行以下命令可以查看线上 Registry 的实时列表：

```bash
pnpm dlx @uekits/web@latest list
```

## 当前能力边界

为避免消费者误判，当前版本尚未提供以下能力：

- 不支持通过 `add button@0.1.0` 显式选择历史条目版本；
- 不支持通过 `install --frozen-lockfile` 从 Lock 完整重放安装状态；
- 不支持通过 `rollback button@0.1.0` 执行 Registry 级回滚；
- 不支持在同一项目中并存同一 Registry 条目的多个版本；
- Registry 当前只分发 TypeScript、Vue 和样式源码，不生成 JavaScript 版本；
- yarn 和 Bun 尚未进入正式消费测试矩阵；
- Pre-1.0 阶段的组件契约和 Registry 协议仍可能调整。

消费项目应将安装后的源码、`uekit.lock.json` 和 `.uekit/bases/` 一并纳入 Git。当前版本的历史恢复和回滚优先通过消费项目自身的 Git 完成。

## Roadmap

Roadmap 表示当前维护方向，不代表固定发布日期。优先级会根据真实消费反馈、安全影响和维护成本调整。

### Next

- 扩充 Props、Emits、Slots 和关键交互的公共组件契约测试；
- 允许消费方覆盖所有用户可见文本和辅助技术文本；
- 建立自动化无障碍门禁，并继续完善键盘与焦点行为；
- 增加 Firefox 和 WebKit 浏览器验证；
- 完善在线组件展示、使用示例和迁移文档；
- 建立组件、Playground 的包体积与性能预算。

### Later

- 支持 `add item@version` 显式安装历史条目；
- 设计 Lock v2 和 `install --frozen-lockfile` 冻结重放能力；
- 在冻结安装模型稳定后提供安全的 Registry 级回滚；
- 为 Registry 依赖增加版本约束和精确解析结果；
- 增加 Registry 发布清单、签名或更强的来源证明；
- 根据社区需求扩展 yarn、Bun 等消费验证矩阵。

如需讨论新能力，请先通过 [GitHub Issue](https://github.com/uekits/uekit-web/issues/new/choose) 描述业务场景、约束和预期行为。只有已经发布并通过验证的能力才会从 Roadmap 移入“已实现能力”。

## 仓库结构

```text
uekit-web/
├─ packages/cli/          # 发布为 @uekits/web 的命令行程序
├─ registry/              # 可分发的标准源码
├─ registry-releases/     # 已发布条目的不可变版本档案
├─ registry.json          # Registry 条目清单
├─ apps/playground/       # 组件展示、联调和视觉验收应用
├─ apps/registry-server/  # Registry 静态站点构建入口
├─ scripts/               # Registry 构建、发布和验证脚本
├─ tests/                 # Vitest、Playwright 与安装冒烟测试
└─ docs/                  # 中文技术文档与白皮书
```

## 本地开发

环境要求：

- Node.js `>= 22.12.0`
- pnpm `>= 11.1.3`

```bash
corepack enable
pnpm install
pnpm dev
```

常用验证命令：

```bash
pnpm registry:build
pnpm playground:verify
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm check
```

## 文档

- [文档中心](./docs/README.md)
- [UEKit Web 技术白皮书](./docs/UEKit-Web技术白皮书.md)
- [快速开始](./docs/guides/快速开始.md)
- [整体架构](./docs/architecture/整体架构.md)
- [CLI 命令参考](./docs/reference/CLI命令参考.md)
- [新增组件指南](./docs/guides/新增组件指南.md)
- [测试体系](./docs/testing/测试体系.md)
- [发布前验收清单](./docs/testing/发布前验收清单.md)
- [Changelog](./CHANGELOG.md)

## 参与贡献与支持

- 提交代码前请阅读[贡献指南](./.github/CONTRIBUTING.md)和[社区行为准则](./.github/CODE_OF_CONDUCT.md)；
- 使用问题和兼容性问题请参考[支持说明](./.github/SUPPORT.md)；
- 安全漏洞请按照[安全策略](./.github/SECURITY.md)私下报告，不要创建公开 Issue。

## 许可证

本项目采用 [MIT License](./LICENSE)。第三方依赖、许可证和商标使用边界见[法律与第三方软件说明](./docs/legal/README.md)。
