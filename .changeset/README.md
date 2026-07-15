# Changesets 使用说明

Changeset 用于描述 `@uekits/web` 面向使用者的变化，并驱动 npm 版本更新。

新增或修改公开 CLI、安装升级行为、配置协议以及已发布功能时，应在 `dev` 随实现提交 Changeset：

```bash
pnpm changeset
```

准备发布时执行 `pnpm version-packages`，然后人工更新根目录 `CHANGELOG.md`。仅修改内部文档、测试或无公开影响的重构通常不需要 Changeset。完整流程见[发布前验收清单](../docs/testing/发布前验收清单.md)。
