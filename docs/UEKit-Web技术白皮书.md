# UEKit Web 技术白皮书

> 适用对象：架构师、组件开发人员、业务项目开发人员和发布维护人员
>
> 发布阶段：Pre-1.0
>
> Registry 协议：v1

## 1. 摘要

UEKit Web 是面向 Vue 3 企业应用的源码组件基础设施。它不以运行时组件包为主要交付物，而是通过 **Registry + CLI + 可拥有源码**，将经过验证的组件、主题、布局和集成能力安装到消费项目。

业务项目直接拥有安装后的源码，可以审计、修改和提交到自己的 Git 仓库；UEKit 同时保留来源、版本、Hash 和升级基线，避免普通复制粘贴失去上游关系。

这一模型重点解决：

- 企业项目需要深度定制，传统黑盒组件包难以覆盖所有业务约束；
- 多个项目重复封装 Element Plus，容易造成视觉、交互和工程规范分裂；
- 全量注册和整包样式增加无关依赖及全局副作用；
- 直接复制源码缺少版本、差异和升级治理。

当前版本、公开能力和 Roadmap 以根 [README](../README.md) 为唯一事实来源。

## 2. 产品定位

### 2.1 UEKit Web 是什么

UEKit Web 是：

- 面向 Vue 3 企业后台、运营平台和 SaaS 管理端的源码 Registry；
- 基于 Element Plus 构建的统一适配层、组合层和布局层；
- 将设计 Token、组件契约、安装升级和质量门禁组合起来的工程平台；
- 允许消费方拥有、修改并审计最终源码的分发系统。

### 2.2 UEKit Web 不是什么

UEKit Web 不是：

- 要求 `app.use(UEKit)` 的整包运行时 UI 库；
- Element Plus 的简单改名或无差别二次包装；
- 自动解决所有本地二次修改冲突的代码生成器；
- 将地图、图表等可选 SDK 强制安装到每个项目的超级依赖；
- 面向单一客户或商业项目的私有业务模板集合。

## 3. 与 shadcn-vue 的关系

UEKit Web 借鉴了“组件源码属于消费方”和“Registry 按需分发”的理念，但两者的底层能力与目标场景不同：

| 维度 | shadcn-vue 常见模式 | UEKit Web |
| --- | --- | --- |
| 底层能力 | Reka UI 等无样式 Primitive | Element Plus 成品组件和企业组合组件 |
| 样式体系 | Tailwind CSS | Tailwind CSS、语义 Token、Element Plus CSS 变量 |
| 目标场景 | 通用 Web UI | 企业后台、运营平台和 SaaS 管理端 |
| 组件层级 | 基础 UI 为主 | Foundation、UI、Pro、Layout、Integration |
| 升级状态 | 以覆盖和人工比较为主 | Lock、Base、Hash、Diff 和三方合并 |
| 发布模型 | Registry 当前资源 | 版本化、不可变的条目资源 |

UEKit Web 的目标不是复刻 shadcn-vue，而是在源码所有权模型之上补充企业项目所需的状态记录、可重复验证和升级边界。

## 4. 总体架构

```text
┌──────────────────────────────────────────────────────────────┐
│                    UEKit Registry v1                         │
│  index.json │ items/{name}/{version}.json │ schema.json      │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS + Schema + Hash
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                     @uekits/web CLI                          │
│       初始化 │ 安装 │ 查询 │ 差异 │ 更新 │ 本地构建         │
└──────────────────────────────┬───────────────────────────────┘
                               │ 安装计划 + 文件事务 + 依赖安装
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                        消费项目                              │
│  uekit.json │ uekit.lock.json │ .uekit/bases │ 本地源码      │
└──────────────────────────────────────────────────────────────┘
```

仓库中的关键职责为：

- `registry/`：条目开发源码；
- `registry-releases/`：已经归档的不可变条目版本；
- `packages/cli/`：Registry 读取、安装和升级能力；
- `apps/playground/`：CLI 真实安装后的消费验证应用；
- `apps/registry-server/`：构建后的静态 Registry 站点。

更详细的模块关系和数据流见[整体架构](./architecture/整体架构.md)。

## 5. Registry 协议

Registry 根目录放置索引、Schema 等控制资源，条目统一使用版本化路径：

```text
/web/v1/index.json
/web/v1/schema.json
/web/v1/items/{name}/{version}.json
```

其中：

- `web` 区分 UEKit 产品线；
- `v1` 表示 Registry 协议版本，不是组件版本；
- `items` 明确资源类型，并为其他控制资源预留命名空间；
- `{name}/{version}` 为条目提供不可变寻址。

Index 只负责声明当前推荐版本，历史条目资源不会因 Index 更新而被覆盖。这样可以稳定缓存、复现已经安装的来源，并让 Lock 和 Base 指向精确版本。

构建阶段会验证 Schema、名称、依赖图、源路径、目标路径、循环依赖和重复文件，并为文件内容计算 SHA-256。完整字段定义见[`registry.json` 协议](./reference/registry.json协议.md)。

## 6. 安装与升级模型

CLI 在写入文件前先完成 Registry 获取、依赖解析、安全校验和安装计划生成。计划确认后才安装 npm 依赖，并以文件事务提交源码、Base 和 Lock；失败时恢复包管理器状态及文件状态。

消费项目中的三个状态文件各自承担不同职责：

| 状态 | 职责 |
| --- | --- |
| `uekit.json` | 描述别名、目录、主题和 Registry 来源 |
| `uekit.lock.json` | 记录实际安装版本、来源、依赖和文件 Hash |
| `.uekit/bases/` | 保存安装时的上游源码，支持差异和三方合并 |

升级时：

- 本地文件未修改，可以安全更新；
- 本地文件已修改，默认跳过而不是静默覆盖；
- 显式选择合并时，以 Base、本地源码和远端源码执行三方合并；
- 无法自动处理的冲突保留给人工解决。

这些状态应与安装后的源码一起提交到消费项目 Git。具体算法和限制见[源码安装与升级机制](./architecture/源码安装与升级机制.md)。

## 7. 组件与样式架构

UEKit 组件按职责分层，避免把基础控件、企业组合组件、布局和第三方 SDK 集成混为一体。具体条目以 Registry Index 和根 README 为准，不在白皮书中维护动态清单。

样式采用三层协作：

```text
UEKit 语义 Token
  ├─ 供 Registry 组件和业务扩展使用
  ├─ 映射到 Element Plus CSS Variables
  └─ 暴露给 Tailwind CSS 工具类
```

核心约束包括：

- 使用 `--ue-*` 表达产品语义；
- 通过 `--el-*` 变量适配 Element Plus；
- Tailwind 用于布局、间距、响应式和组合组件；
- 不全量注册 Element Plus，也不导入整包样式；
- Registry 源码显式导入实际使用的 Element Plus 组件样式；
- Tailwind Preflight 保持关闭，UEKit 的受控 Base Layer 由消费方明确审查。

主题细节见[主题与样式架构](./architecture/主题与样式架构.md)。

## 8. 安全与可靠性边界

源码分发会向消费项目写入可执行代码，因此 Registry 和 CLI 都必须按不可信输入处理：

- 限制名称、路径穿越、Symlink 越界和非法目标；
- 限制网络响应和单文件体积；
- 校验 Registry 响应名称、依赖规格、Schema 和文件 Hash；
- 不覆盖未追踪同名文件和已修改文件；
- 使用安装计划、临时文件、原子写入和失败回滚；
- 正式网络验证不得关闭 TLS 证书校验；
- npm 发布使用 OIDC Trusted Publishing 和 Provenance；
- Registry 使用版本化资源、独立部署和线上内容校验。

Hash 可以发现传输损坏和内容不一致，但不能单独证明 Registry 发布者身份。Registry 级签名或来源证明属于后续可扩展的供应链能力，不应与 npm Provenance 混为一谈。

## 9. 质量与发布边界

UEKit Web 分别验证：

- 静态质量：格式、Lint、类型、Schema、依赖图和文档链接；
- 行为质量：CLI 单元测试、安装事务、差异和升级测试；
- 浏览器质量：Playground、主题、响应式和 Playwright；
- 发布物质量：Registry 构建、npm tarball 和干净消费项目；
- 供应链质量：依赖审查、CodeQL、许可证和 OIDC Provenance。

CLI 与 Registry 是两个独立发布物：Registry 在 `main` 更新后部署，npm 包由指向最新 `main` 的版本 Tag 发布。两者可以独立演进，但发布 npm 前必须验证生产 Registry 与候选构建完全一致。

日常协作、质量门禁和发布操作分别以以下文档为准：

- [贡献指南](../CONTRIBUTING.md)
- [测试体系](./testing/测试体系.md)
- [发布前验收清单](./testing/发布前验收清单.md)
- [Registry 部署指南](./releasing/Registry部署指南.md)
- [npm 发布指南](./releasing/npm发布指南.md)

## 10. 能力边界与演进

白皮书只描述稳定架构原则，不记录当前 npm 版本、条目数量、浏览器矩阵或计划日期。以下动态信息具有各自的唯一事实来源：

- 当前版本、已实现能力和 Roadmap：[README](../README.md)
- 当前可安装条目：生产 Registry `index.json`
- CLI 参数和示例：[CLI 命令参考](./reference/CLI命令参考.md)
- 配置与协议字段：[参考文档](./reference/)
- 版本变更：[Changelog](../CHANGELOG.md)

Pre-1.0 阶段仍允许协议和公共组件契约演进，但每项公开变化都必须通过 Changeset、Changelog、迁移说明和发布门禁对消费方透明。

## 11. 结语

UEKit Web 的价值不在于替换 Element Plus 的组件前缀，而在于让企业团队共享经过验证的组件和工程约束，同时保留业务项目对最终源码的控制权。

Registry 负责分发，CLI 负责安全安装和升级，设计 Token 负责一致性，质量体系负责可信度。四者共同组成 UEKit Web。

建议从以下入口继续阅读：

- [快速开始](./guides/快速开始.md)
- [整体架构](./architecture/整体架构.md)
- [消费项目接入指南](./guides/消费项目接入指南.md)
- [新增组件指南](./guides/新增组件指南.md)
