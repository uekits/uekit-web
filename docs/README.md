# UEKit Web 文档中心

这里是 UEKit Web 的统一中文文档入口。建议第一次接触项目时先阅读技术白皮书，再根据角色进入对应指南。

## 推荐阅读路径

### 产品负责人和技术负责人

1. [UEKit Web 技术白皮书](./UEKit-Web技术白皮书.md)
2. [当前状态与 Roadmap](../README.md#当前状态)
3. [整体架构](./architecture/整体架构.md)
4. [源码安装与升级机制](./architecture/源码安装与升级机制.md)
5. [组件分层与命名规范](./standards/组件分层与命名规范.md)
6. [版本升级与回滚](./releasing/版本升级与回滚.md)

### 组件开发人员

1. [本地开发指南](./guides/本地开发指南.md)
2. [新增组件指南](./guides/新增组件指南.md)
3. [编码规范](./standards/编码规范.md)
4. [注释规范](./standards/注释规范.md)
5. [Vue 组件开发规范](./standards/Vue组件开发规范.md)
6. [样式与主题规范](./standards/样式与主题规范.md)
7. [工程化规范](./standards/工程化规范.md)
8. [测试体系](./testing/测试体系.md)

### 业务项目开发人员

1. [快速开始](./guides/快速开始.md)
2. [消费项目接入指南](./guides/消费项目接入指南.md)
3. [CLI 命令参考](./reference/CLI命令参考.md)
4. [`uekit.json` 配置参考](./reference/uekit.json配置参考.md)
5. [调试与排错指南](./guides/调试与排错指南.md)

### 发布维护人员

1. [Registry 部署指南](./releasing/Registry部署指南.md)
2. [npm 发布指南](./releasing/npm发布指南.md)
3. [发布前验收清单](./testing/发布前验收清单.md)
4. [版本升级与回滚](./releasing/版本升级与回滚.md)

## 文档目录

```text
docs/
├─ UEKit-Web技术白皮书.md
├─ guides/               # 使用、开发与排错教程
├─ architecture/         # 系统原理与关键设计
├─ reference/            # CLI、配置和协议参考
├─ standards/            # 团队开发规范
├─ testing/              # 测试与验收
└─ releasing/            # Registry 和 npm 发布
```

## 指南

- [快速开始](./guides/快速开始.md)
- [本地开发指南](./guides/本地开发指南.md)
- [新增组件指南](./guides/新增组件指南.md)
- [消费项目接入指南](./guides/消费项目接入指南.md)
- [调试与排错指南](./guides/调试与排错指南.md)

## 架构

- [整体架构](./architecture/整体架构.md)
- [Registry 工作原理](./architecture/Registry工作原理.md)
- [CLI 工作原理](./architecture/CLI工作原理.md)
- [源码安装与升级机制](./architecture/源码安装与升级机制.md)
- [主题与样式架构](./architecture/主题与样式架构.md)

## 参考

- [CLI 命令参考](./reference/CLI命令参考.md)
- [`registry.json` 协议](./reference/registry.json协议.md)
- [`uekit.json` 配置参考](./reference/uekit.json配置参考.md)
- [`uekit.lock.json` 说明](./reference/uekit.lock.json说明.md)
- [Registry 条目类型参考](./reference/Registry条目类型参考.md)

## 规范

- [编码规范](./standards/编码规范.md)
- [注释规范](./standards/注释规范.md)
- [工程化规范](./standards/工程化规范.md)
- [组件分层与命名规范](./standards/组件分层与命名规范.md)
- [Vue 组件开发规范](./standards/Vue组件开发规范.md)
- [样式与主题规范](./standards/样式与主题规范.md)
- [依赖管理规范](./standards/依赖管理规范.md)
- [文档编写规范](./standards/文档编写规范.md)

## 测试与发布

- [测试体系](./testing/测试体系.md)
- [发布前验收清单](./testing/发布前验收清单.md)
- [Registry 部署指南](./releasing/Registry部署指南.md)
- [npm 发布指南](./releasing/npm发布指南.md)
- [版本升级与回滚](./releasing/版本升级与回滚.md)
- [Changelog](../CHANGELOG.md)

## 法律与社区

- [法律与第三方软件说明](./legal/README.md)
- [第三方许可证清单](./legal/THIRD_PARTY_LICENSES.md)
- [商标使用说明](./legal/TRADEMARKS.md)
- [贡献指南](../.github/CONTRIBUTING.md)
- [社区行为准则](../.github/CODE_OF_CONDUCT.md)
- [支持说明](../.github/SUPPORT.md)
- [安全策略](../.github/SECURITY.md)

## 文档维护原则

- 默认使用中文说明；代码标识、协议字段和命令保持原文。
- 文档必须描述仓库中已经存在的行为，规划内容必须显式标注“规划中”。
- 修改 CLI、Registry 协议、配置文件或发布流程时，必须同步修改对应参考文档。
- 当前版本、能力边界和 Roadmap 以根 README 为唯一公开事实来源，其他文档通过链接引用，不重复维护时间表。
- 所有 Markdown 内部链接必须通过 `pnpm docs:verify` 校验。
