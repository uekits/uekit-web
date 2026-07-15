# Changelog

UEKit Web 的重要变更记录在此文件中，版本遵循 Semantic Versioning。

## [Unreleased]

## [0.1.2] - 2026-07-15

### Fixed

- 修复 `actions/setup-node` 的 npm 认证占位值导致 OIDC-only 发布门禁误报的问题。

## [0.1.1] - 2026-07-15

> 此版本因发布工作流验证失败而未发布，后续修复包含在 `0.1.2` 中。

### Changed

- 加固 npm OIDC 发布来源、Dist Tag 和版本不可覆盖门禁。
- 修正 Registry 不可变版本地址与 npm 发布通道文档。

## [0.1.0] - 2026-07-15

### Added

- 首个 `@uekits/web` CLI、不可变 Registry、Playground 和源码升级工作流。
- Vue、Element Plus、Tailwind CSS、ECharts 与 AMap 的基础 Registry 条目。
- 安装计划、`--dry-run`、原子 Lock/Base 写入和失败回滚。

### Security

- 增加 Registry 输入校验、路径与符号链接防护、响应体积限制和安全发布门禁。
