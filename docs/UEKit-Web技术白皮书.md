# UEKit Web 技术白皮书

> 文档版本：0.1  
> 对应实现：UEKit Web 早期版本  
> 适用对象：产品负责人、架构师、组件开发人员、业务项目开发人员和发布维护人员

## 1. 摘要

UEKit Web 是 UEKit 生态中的 Web 产品线。它不是传统意义上通过 npm 提供运行时组件的 UI 库，而是一套以 **Registry + CLI + 可拥有源码** 为核心的企业应用开发基础设施。

调用方通过 `@uekits/web` CLI 初始化项目并按需安装能力：

```bash
pnpm dlx @uekits/web@latest init
pnpm dlx @uekits/web@latest add button pro-table dashboard-layout
```

CLI 会把组件源码、主题文件和必要依赖写入调用方项目。业务代码引用的是本地源码，而不是 UEKit 的黑盒运行时组件。

这一模式希望同时解决四个问题：

1. 传统组件库难以满足企业项目的深度定制。
2. 各业务项目重复封装 Element Plus，视觉和交互逐渐失控。
3. 整包依赖和全局注册增加无用代码及样式。
4. 复制源码虽然灵活，但如果没有来源记录、差异检查和升级机制，长期维护成本很高。

## 2. 产品定位

### 2.1 UEKit Web 是什么

UEKit Web 是：

- 面向 Vue 3 企业后台和业务中台的源码 Registry。
- 基于 Element Plus 能力构建的统一适配层、组合层和布局层。
- 包含主题、图标、基础组件、高级组件、布局、业务区块和集成能力的开发平台。
- 允许业务项目拥有、修改并审计组件源码的分发系统。
- 为多个团队和多个应用建立统一设计语言及工程约束的载体。

### 2.2 UEKit Web 不是什么

UEKit Web 不是：

- 要求 `app.use(UEKit)` 的整包运行时 UI 库。
- Element Plus 的简单改名或无差别二次包装。
- 一套只展示视觉稿、不约束真实业务代码的设计基线。
- 把地图、图表、视频等所有 SDK 强制装入每个项目的超级依赖。
- 自动解决所有本地二次修改冲突的代码生成器。

### 2.3 与 shadcn-vue 理念的关系

UEKit Web 借鉴“组件源码属于调用方”和“Registry 按需分发”的思想，但两者底层条件不同：

| 维度     | shadcn-vue 常见模式        | UEKit Web                                         |
| -------- | -------------------------- | ------------------------------------------------- |
| 底层能力 | Reka UI 等无样式 Primitive | Element Plus 成品组件与企业组合组件               |
| 样式体系 | Tailwind CSS               | Tailwind CSS + 语义 Token + Element Plus CSS 变量 |
| 目标场景 | 通用 Web UI                | 企业后台、运营平台、SaaS 管理端                   |
| 高阶能力 | 组件为主                   | Pro 组件、布局、业务区块和集成为重点              |
| 升级策略 | 重新添加和手工比较         | Lock、Base、Diff、Update 和基础三方合并           |

UEKit Web 不追求机械复制其他项目，而是把源码分发思想应用到企业系统。

## 3. 核心设计原则

### 3.1 本地源码优先

组件安装后位于业务项目：

```text
src/
├─ components/
│  ├─ ui/button/
│  ├─ ui/avatar/
│  └─ pro/pro-table/
├─ layouts/dashboard-layout/
├─ integrations/map-amap/
├─ lib/uekit/
└─ styles/uekit.css
```

团队可以直接调试和修改，不需要 fork 整个 UEKit 仓库，也不需要等待上游发版才能处理项目特有需求。

### 3.2 按需分发

Registry 条目声明自己的源码、npm 依赖和 Registry 依赖。安装 `pro-table` 时，CLI 只递归安装它真正依赖的条目。

### 3.3 平台约束与项目自由并存

UEKit 提供默认设计语言、目录结构和组件行为；调用方拥有最终源码。统一不是靠禁止修改，而是靠：

- 明确的语义 Token。
- 可审查的本地差异。
- 可重复的 Registry 基准。
- 团队级代码评审和升级流程。

### 3.4 业务与通用能力分离

项目、设备、告警等具体业务不进入通用组件。通用库只承载可跨行业复用的交互和结构，例如搜索区、表格、详情抽屉和后台布局。

### 3.5 真实实现优先于文档承诺

文档必须区分当前能力与规划能力。任何没有被自动化测试覆盖的升级或发布能力，都不能被描述为完全可靠。

## 4. 总体架构

```text
                         ┌────────────────────────────┐
                         │      registry.uekit.com    │
                         │ /web/v1/index.json         │
                         │ /web/v1/<item>.json        │
                         └─────────────┬──────────────┘
                                       │ HTTP / 本地文件服务
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     @uekits/web CLI                          │
│ init │ add │ list │ view │ info │ diff │ update │ build │ cat│
└──────────────┬───────────────────────────────────────────────┘
               │ 解析依赖、改写别名、写入源码、安装 npm 依赖
               ▼
┌──────────────────────────────────────────────────────────────┐
│                         调用方项目                            │
│ uekit.json │ uekit.lock.json │ .uekit/bases │ src/components │
└──────────────────────────────────────────────────────────────┘

UEKit Web 仓库内：

registry.json 清单 + registry/ 源码
          │
          ▼
Registry 构建与校验脚本 ──► apps/registry-server/dist/web/v1/*.json
          │
          ├─► GitHub Pages / registry.uekit.com
          └─► Admin Demo、Vitest、Playwright、冒烟测试
```

详细说明见[整体架构](./architecture/整体架构.md)。

## 5. 仓库组成

### 5.1 CLI

`packages/cli` 构建并发布为 npm 包 `@uekits/web`。它是当前唯一计划公开发布的 UEKit Web npm 包。

CLI 负责：

- 初始化配置与主题。
- 获取 Registry 索引和条目。
- 递归解析条目依赖。
- 写入和更新本地源码。
- 安装 npm 运行时及开发依赖。
- 维护安装清单和基准源码。
- 显示本地差异并执行基础合并。
- 构建本地 Registry。

### 5.2 Registry

Registry 是可分发能力的事实来源，主要由以下部分组成：

```text
uekit-web/
├─ registry.json          # 条目清单
├─ registry/              # 原始源码
├─ registry.schema.json   # Registry Schema
└─ uekit.schema.json      # 调用方配置 Schema
```

构建后每个条目都有独立 JSON：

```text
/web/v1/index.json
/web/v1/items/button/0.1.0.json
/web/v1/items/pro-table/0.1.0.json
```

索引指向不可变的版本化条目资源。这种结构允许 CLI 单独获取需要的条目，也利于 CDN 缓存、历史版本保留和独立校验。

### 5.3 Playground

`apps/playground` 是真实 Vue 应用，用于：

- 展示 Registry 组件。
- 验证亮色和深色主题。
- 进行响应式和交互验收。
- 为 Playwright 提供稳定页面。

它不是面向最终客户的业务产品，也不应成为业务数据和行业逻辑的存放位置。

### 5.4 自动化脚本和测试

仓库同时验证：

- Registry 数据和依赖图。
- TypeScript 类型。
- ESLint、Stylelint 和 Prettier。
- Vitest 单元测试。
- Playwright 浏览器测试。
- npm tarball 安装和 CLI 真实执行。

## 6. Registry 模型

一个条目由元数据、依赖和文件组成：

```json
{
  "name": "pro-table",
  "type": "registry:pro",
  "version": "0.1.0",
  "dependencies": ["element-plus"],
  "registryDependencies": ["button", "status-tag"],
  "files": [
    {
      "path": "pro/pro-table/ProTable.vue",
      "target": "src/components/pro/pro-table/ProTable.vue",
      "type": "registry:pro"
    }
  ]
}
```

构建阶段会：

1. 验证 Schema。
2. 检查名称、路径和目标路径安全性。
3. 检查缺失依赖和循环依赖。
4. 检查重复文件和重复目标。
5. 读取源码并计算 SHA-256。
6. 生成条目 JSON、索引和公开 Schema。

完整协议见[`registry.json` 协议](./reference/registry.json协议.md)。

## 7. CLI 工作流

### 7.1 初始化

```text
用户执行 init
  ├─ 检查 package.json
  ├─ 创建或读取 uekit.json
  ├─ 初始化 uekit.lock.json
  ├─ 创建 .uekit/bases
  ├─ 安装 theme 条目
  ├─ 配置 Tailwind CSS Vite 插件
  └─ 注入主题入口样式
```

默认使用 Tailwind CSS v4，并关闭 Preflight，避免调用方现有 Element Plus 和业务样式被全局重置。

### 7.2 添加组件

```text
add pro-table
  ├─ 获取 pro-table.json
  ├─ 递归解析 registryDependencies
  ├─ 计算输出路径并改写别名
  ├─ 检查本地文件是否可写
  ├─ 写入源码
  ├─ 保存安装时基准源码
  ├─ 安装 npm dependencies/devDependencies
  └─ 更新 uekit.lock.json
```

### 7.3 查看差异

`diff` 将当前本地文件与 `.uekit/bases/` 中安装时的基准源码比较。它不依赖远端仍然保留旧版本，因此适合代码评审和升级前检查。

### 7.4 更新组件

当前更新策略：

- 本地未修改：允许覆盖为新版本。
- 本地已修改且未指定合并：跳过并提示。
- 本地已修改且指定 `--merge`：使用 Git 三方合并能力尝试合并。
- 合并冲突：保留本地文件，并生成 `.uekit-merge` 文件供人工处理。

当前实现仍属于基础版本，文件匹配和冲突后 Lock 推进机制需要继续强化。详见[源码安装与升级机制](./architecture/源码安装与升级机制.md)。

## 8. 主题与样式

UEKit Web 的样式不是“Tailwind 或 Element Plus”二选一，而是三层协作：

```text
语义 Token
  ├─ UEKit 组件使用
  ├─ 映射到 Element Plus CSS Variables
  └─ 暴露给 Tailwind CSS 工具类和自定义样式
```

核心原则：

- 使用 `--ue-*` 表达产品语义。
- 使用 Element Plus 的 `--el-*` 变量完成底层组件主题映射。
- Tailwind 用于布局、间距、响应式和复杂组合组件开发。
- `preflight: false`，不对调用方进行全局 DOM 重置。
- 亮色和深色必须使用同一语义，不在业务组件中散落硬编码颜色。

## 9. 组件分层

```text
Foundation
  theme、utils、icons

UI
  button、input、select、avatar、badge、dialog

Pro
  search-panel、pro-table、detail-drawer、form-dialog

Layouts
  admin-layout、auth-layout、dashboard-layout

Blocks
  user-management、permission-settings、dashboard

Integrations
  map-amap、charts-echarts、ai-chat、editor-tiptap
```

当前 Registry 已包含 Foundation、UI、Pro、Layout 和 Integration 的首批条目；Blocks 类型已保留，但完整业务区块仍在规划中。

## 10. 依赖策略

### 10.1 为什么调用方仍会安装 Element Plus

源码组件运行时会直接导入 Element Plus，因此调用方需要拥有对应 npm 依赖。CLI 会根据条目声明自动安装，调用方不需要手工猜测版本。

### 10.2 为什么不全量注册 Element Plus

UEKit 明确避免：

```ts
app.use(ElementPlus);
```

也避免全量引入：

```ts
import "element-plus/dist/index.css";
```

Registry 源码显式导入实际使用的组件及样式，让构建工具能够 tree-shaking。

### 10.3 依赖归属

- Registry 条目声明运行时依赖和开发依赖。
- CLI 自身只承担命令执行所需依赖。
- 地图和图表 SDK 仅在安装对应集成条目时进入调用方项目。
- 业务项目可以升级底层依赖，但必须执行 UEKit 验收测试。

## 11. 配置与状态文件

### 11.1 `uekit.json`

描述调用方的目录别名、主题路径、Registry 地址和 Tailwind 配置，是“希望如何安装”的配置。

### 11.2 `uekit.lock.json`

记录实际安装的条目版本、来源、依赖和文件哈希，是“已经安装了什么”的清单。

### 11.3 `.uekit/bases/`

保存每次安装时的上游基准源码，是计算本地差异和三方合并的 Base。

三者不能互相替代，也不建议忽略 `uekit.lock.json` 和 `.uekit/bases/`。团队项目应将它们提交到 Git。

## 12. 安全与可靠性

源码分发系统本质上会向调用方写入可执行代码，因此必须建立供应链边界：

- Registry 构建时限制路径穿越和非法目标。
- 每个文件包含 SHA-256 哈希。
- CLI 只写入配置允许的项目路径。
- 未追踪的同名文件默认不覆盖。
- 已修改文件默认不覆盖。
- npm 发布和 Registry 部署由独立工作流完成。
- 发布前使用 tarball 冒烟测试验证实际安装行为。

规划中的增强项包括签名清单、来源证明、兼容性矩阵自动验证和更稳健的 AST 迁移能力。

## 13. 测试策略

```text
静态验证
  ├─ Registry Schema 与依赖图
  ├─ TypeScript
  ├─ ESLint / Stylelint
  └─ Prettier / 文档链接

逻辑验证
  ├─ CLI 单元测试
  ├─ Registry 构建测试
  └─ 安装、差异与更新测试

浏览器验证
  ├─ Admin Demo
  ├─ 亮色 / 深色
  ├─ 桌面 / 移动端
  └─ Playwright 截图与交互

发布物验证
  ├─ npm pack
  ├─ 临时消费项目
  └─ 使用 tarball 执行真实 CLI
```

## 14. 发布架构

UEKit Web 有两个独立发布物：

| 发布物   | 地址                        | 用途                          |
| -------- | --------------------------- | ----------------------------- |
| CLI      | npm `@uekits/web`           | 初始化、安装、检查和升级      |
| Registry | `registry.uekit.com/web/v1` | 提供索引、条目 JSON 和 Schema |

二者必须兼容，但不应混为一次不可拆分的部署。Registry 可以修复内容分发问题，CLI 可以独立升级解析和安装能力。

版本发布使用 Changesets 管理 npm 版本，GitHub Actions 负责 CI、Registry Pages 部署和 npm 发布。

## 15. 调用方接入模型

推荐流程：

```text
建立业务项目
  ↓
执行 uekit init
  ↓
提交 uekit.json、uekit.lock.json、.uekit/bases 和安装源码
  ↓
按业务需要 add 组件
  ↓
在本地组件上进行受控定制
  ↓
升级前执行 diff
  ↓
在独立分支 update / update --merge
  ↓
执行类型、单测、构建和 Playwright 验收
```

调用方不应该把安装后的代码视为一次性生成物。它是业务仓库的正式源码，但仍然保留上游来源和升级轨迹。

## 16. 当前能力边界

截至本文档对应版本，已经实现：

- `init`、`add`、`list`、`view`、`info`、`diff`、`update`、`build`、`cat`。
- Registry 依赖递归解析与循环检测。
- 源码写入、别名改写和 npm 依赖安装。
- Lock 与 Base 文件管理。
- 未修改文件升级和基础三方合并。
- Tailwind CSS v4 自动配置，Preflight 默认关闭。
- Registry 静态构建和 GitHub Pages 发布工作流。
- npm tarball 冒烟测试、Vitest 与 Playwright。

当前限制：

- `update --merge` 仍是基础实现，复杂重命名和跨文件迁移需要人工处理。
- Registry 尚未建立数字签名和来源证明。
- Blocks 业务区块尚未形成稳定目录。
- 跨 Element Plus 大版本兼容矩阵尚未自动化。

## 17. 路线图

### 近期

- 完成首个 npm 正式版本和公开 Registry 部署。
- 强化 CLI 错误提示、离线调试和配置迁移。
- 扩充基础表单、数据展示和反馈组件。
- 完成用户管理验证链路在多个真实项目中的接入。

### 中期

- 引入更可靠的文件重命名识别和升级计划。
- 增加 Registry 条目可视化文档和在线预览。
- 建立 Design Token 版本和兼容性治理。
- 建立 Blocks、地图、图表和 AI 集成规范。

### 长期

- Registry 来源签名与企业私有 Registry。
- 面向大型项目的自动迁移和 Codemod。
- 与 UEKit Contracts、UEKit SaaS 和 UEKit Stack 协同。
- 形成 Web、后端、移动端和小程序一致的企业应用开发生态。

## 18. 结语

UEKit Web 的价值不在于把 `<el-button>` 换成另一种前缀，而在于让企业团队能够共享经过验证的组件、布局和交互模式，同时保留业务项目对源码的最终控制权。

Registry 解决分发，CLI 解决安装和升级，设计 Token 解决一致性，测试体系解决可信度。四者共同组成 UEKit Web，而不是任何一个单独 npm 包。

下一步阅读：

- [快速开始](./guides/快速开始.md)
- [整体架构](./architecture/整体架构.md)
- [新增组件指南](./guides/新增组件指南.md)
- [发布前验收清单](./testing/发布前验收清单.md)
