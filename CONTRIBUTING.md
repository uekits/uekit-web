# 贡献指南

感谢你参与 UEKit Web。提交代码即表示你同意以本仓库的 MIT License 提供贡献，并确认贡献内容有合法来源。

## 开发环境

- Node.js `>= 22.12.0`（CLI 消费兼容边界为 `>= 20.19.0`）
- pnpm 11，通过 Corepack 使用

```bash
corepack enable
pnpm install
pnpm check
pnpm test:e2e
pnpm smoke:package
```

日常开发至少运行 `pnpm check`；涉及交互时补充 E2E，涉及 CLI、Registry 或正式发布时补充 tarball 消费验证。

## 工作流程

1. `dev` 是日常开发分支，`main` 只保存已经验收的正式发布版本。
2. 仓库维护者可以直接向 `dev` 提交；外部贡献从最新 `dev` 创建功能分支，并向 `dev` 提交 PR。
3. 只有正式发布和紧急修复可以向 `main` 提交 PR；常规发布使用 `dev → main` Merge Commit。
4. 先通过 Issue 说明较大的 API、协议或架构调整；小型修复可以直接提交 PR。
5. Registry 源码只修改 `registry/`，不要手工修改 Playground 中由 CLI 安装的副本。
6. 修改公开行为时同步类型、文档和测试；不得覆盖已存在的 `registry-releases` 版本。
7. 对影响 npm 包的用户可见改动执行 `pnpm changeset`，使用中文说明版本级别和变更内容。
8. 日常提交至少执行与变更相关的检查；`dev → main` 发布 PR 必须通过完整自动化门禁。
9. 发布 PR 合并开始后暂停向 `dev` Push，直到 Registry、npm 验证完成并将 `dev` 快进同步到 `main`。

正式发布只能由受保护的 `v*` Tag 触发 OIDC 工作流；仓库不提供本地 npm 发布脚本。完整流程见 [npm 发布指南](./docs/releasing/npm发布指南.md)。

编码、注释和工程规则见[编码规范](./docs/standards/编码规范.md)、[注释规范](./docs/standards/注释规范.md)和[工程化规范](./docs/standards/工程化规范.md)。安全问题请按 [`SECURITY.md`](./SECURITY.md) 私下报告。

## 提交与评审

提交信息和 PR 说明默认使用中文，并简洁说明意图。PR 应保持单一目标，避免混入无关格式化；破坏性 API 调整必须明确迁移方案并经维护者批准。
