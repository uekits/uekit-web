# 贡献指南

感谢你参与 UEKit Web。提交代码即表示你同意以本仓库的 MIT License 提供贡献，并确认贡献内容有合法来源。

## 开发环境

- Node.js 20 或 22（本地推荐使用仓库 `.node-version`）
- pnpm 11，通过 Corepack 使用

```bash
corepack enable
pnpm install
pnpm check
pnpm test:e2e
pnpm smoke:package
```

## 工作流程

1. 先通过 Issue 说明较大的 API、协议或架构调整；小型修复可直接提交 PR。
2. 从最新 `main` 创建功能分支，不要把生成目录、密钥、个人路径或内部地址提交到仓库。
3. Registry 源码只修改 `registry/`，不要手工修改 Playground 中由 CLI 安装的副本。
4. 修改公开行为时同步类型、文档和测试；不得覆盖已存在的 `registry-releases` 版本。
5. 对影响 npm 包的用户可见改动执行 `pnpm changeset`，说明版本级别和变更内容。
6. 提交 PR 前运行完整质量门禁，并填写 PR 模板中的风险和验证结果。

编码、注释和工程规则见[编码规范](./docs/standards/编码规范.md)、[注释规范](./docs/standards/注释规范.md)和[工程化规范](./docs/standards/工程化规范.md)。安全问题请按 [`SECURITY.md`](./SECURITY.md) 私下报告。

## 提交与评审

提交信息应简洁说明意图。PR 应保持单一目标，避免混入无关格式化；破坏性 API 调整必须明确迁移方案并经维护者批准。
