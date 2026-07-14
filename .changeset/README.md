# Changesets 使用说明

Changeset 用于描述 `@uekits/web` 面向使用者的变化，并驱动 npm 版本和变更日志。

有以下变化时需要创建 Changeset：

- 新增或修改公开 CLI 命令。
- 修改安装、覆盖、升级或合并行为。
- 修改公开配置或 Registry 协议兼容性。
- 修复已经发布版本中的用户可见缺陷。

```bash
pnpm changeset
```

仅修改内部文档、测试或不影响发布包的重构通常不需要 Changeset。是否发布仍以发布负责人和[发布前验收清单](../docs/testing/发布前验收清单.md)为准。
