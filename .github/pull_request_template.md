## 变更说明

<!-- 说明解决的问题、范围和关联 Issue。 -->

> 日常开发 PR 应合并到 `dev`；只有正式发布或紧急修复可以合并到 `main`。

## 公共契约与风险

- [ ] 不改变公共 API；或已明确列出 API、协议、Registry 和迁移影响
- [ ] 未覆盖已发布的 `registry-releases` 资源
- [ ] 不包含密钥、个人路径、内部地址或无关改动
- [ ] 用户可见变更已同步文档和 Changeset

## 验证

- [ ] `pnpm check`
- [ ] `pnpm test:e2e`（涉及交互或视觉行为时）
- [ ] `pnpm smoke:package`（涉及 CLI、Registry 或发布时）
- [ ] `pnpm release:verify`（仅 `dev → main` 发布 PR）

补充的测试结果：
