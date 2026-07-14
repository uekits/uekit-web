# UEKit Web

UEKit Web 是面向 Vue 企业应用的源码分发平台。它以 Element Plus 为基础能力，通过 Registry 和 CLI 将组件、主题、布局及集成能力按需安装到业务项目中。

UEKit Web 不是需要在运行时整体引入的传统组件库。安装后的源码归业务项目所有，团队可以直接阅读、修改和长期维护。

```bash
pnpm dlx @uekits/web@latest init
pnpm dlx @uekits/web@latest add button avatar pro-table detail-drawer
```

业务项目使用本地源码：

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

## 核心特点

- **按需安装**：只把实际使用的组件和依赖加入项目。
- **源码归属调用方**：组件位于调用方仓库，可直接定制。
- **企业应用优先**：除基础组件外，还提供表格、抽屉、表单弹窗、后台布局等能力。
- **统一主题**：通过语义 Token 同时约束 UEKit、Element Plus 和 Tailwind CSS。
- **可追踪升级**：使用 `uekit.lock.json`、`.uekit/bases/`、`diff` 和 `update --merge` 管理本地修改。
- **扩展使用同一机制**：地图、图表等能力也通过 Registry 分发，不要求长期绑定额外的 UEKit 运行时包。

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

- Node.js `>= 22.12`
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

## 当前状态

公开 CLI 包为 `@uekits/web`，Registry 默认地址为 `https://registry.uekit.com/web/v1`。

现阶段已经具备 CLI 初始化、组件递归安装、Registry 构建校验、本地差异检查和基础三方合并能力。具体能力边界见[技术白皮书](./docs/UEKit-Web技术白皮书.md)。

## 许可证

本项目采用 [MIT License](./LICENSE)。第三方依赖和商标使用说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 与 [TRADEMARKS.md](./TRADEMARKS.md)。
