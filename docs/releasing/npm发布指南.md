# npm 发布指南

## 1. 发布物

当前只公开发布一个 npm 包：

```text
@uekits/web
```

它提供 Registry CLI，不包含业务项目运行时组件包。

## 2. npm 前置配置

- npm 组织或 scope：`@uekits`
- 包访问级别：public
- 发布方式：npm Trusted Publishing（GitHub Actions OIDC）
- npm 账号开启 2FA

在 npm 包 Trusted Publisher 页面配置：

```text
Organization/User: uekits
Repository: uekit-web
Workflow: release.yml
Environment: npm
Allowed actions: npm publish
```

GitHub 保留名为 `npm` 的 Environment，并只允许受保护的 `v*` Tag 部署。Environment 不设置人工审批：创建受保护版本 Tag 本身就是发布确认。不要把长期 npm Token 写入仓库 Secrets，当前 Workflow 只使用 OIDC。

## 3. 版本管理

用户可见的功能和修复在 `dev` 开发阶段创建 Changeset，并与实现一起提交：

```bash
pnpm changeset
```

准备发布时在 `dev` 执行：

```bash
pnpm version-packages
```

`version-packages` 会消费待发布 Changeset，并更新 CLI 版本。随后人工更新根 `CHANGELOG.md`；该文件是项目唯一的公开变更日志。发布候选中除说明文件外不得残留 `.changeset/*.md`。

选择：

- patch：兼容缺陷修复。
- minor：兼容新增命令或能力。
- major：不兼容 CLI、配置或协议变化。

## 4. 本地发布候选验证

```bash
pnpm check
pnpm test:e2e
pnpm smoke:package
pnpm release:verify
```

检查 tarball 内容：

```bash
cd packages/cli
npm pack --dry-run
```

必须包含 `dist`、README 和 LICENSE，且 `bin` 指向存在文件。`release:verify` 会检查版本未占用、版本递增、Changeset 已消费、根 Changelog、README 和 Git Tag 状态。仓库不提供本地 npm 发布脚本，正式发布只能由 OIDC 工作流完成。

## 5. GitHub Actions 发布

`.github/workflows/release.yml` 在推送受保护的 `v*` Tag 后自动触发，不接受 `main` 直接发布，也不要求人工选择 Dist Tag。

Tag 必须同时满足：

- 名称严格等于 `v<packages/cli/package.json version>`；
- 指向最新的 `main` 提交；
- 对应 npm 版本尚未发布。

Dist Tag 由版本自动决定：

| 包版本             | npm Dist Tag |
| ------------------ | ------------ |
| `0.1.3`            | `latest`     |
| `0.2.0-beta.1`     | `next`       |
| `0.2.0-rc.1`       | `next`       |

npm CLI 使用仓库固定版本，不允许发布时安装漂移的 `npm@latest`。工作流拒绝 `NODE_AUTH_TOKEN` 和 `NPM_TOKEN`，保证发布身份来自 OIDC，而不是长期 Token。

工作流会：

1. 安装依赖。
2. 校验发布元数据；完整质量检查已经由指向 `main` 的发布 PR 门禁完成。
3. 确认生产 Registry 与当前发布候选逐资源一致。
4. 执行 pnpm、npm tarball 消费验证。
5. 根据版本自动使用 `pnpm changeset publish --tag latest|next`。
6. 通过 OIDC 生成 npm Provenance。
7. 在独立 Job 中自动创建对应的 GitHub Release；稳定版本标记为 Latest，候选版本标记为 Pre-release。

工作流只负责发布尚未存在的新版本，不通过重新运行工作流修改同一版本的 Dist Tag。

如果环境中存在 `NODE_TLS_REJECT_UNAUTHORIZED=0`，安全检查、包校验和 tarball 冒烟会直接失败，禁止绕过 TLS 证书验证。

## 6. 正式发布流程

1. 日常开发期间为用户可见变化提交 Changeset。
2. 在 `dev` 执行 `pnpm version-packages`，补充根 Changelog；仅当 Registry 源码变化时，提升受影响条目版本并执行 `pnpm registry:release`。
3. 执行完整本地发布候选验证，创建 `dev → main` PR。
4. PR 通过完整 CI、E2E、tarball、Node.js 20、Dependency Review 和 CodeQL 后，暂停向 `dev` Push。
5. 使用 Merge Commit 合并到 `main`，等待 `部署 Registry` 工作流及自定义域名验证成功。
6. 在最新 `main` 提交创建与包版本一致的受保护 Tag。
7. Tag 推送后由 GitHub Actions 自动发布 npm、生成 Provenance 并创建 GitHub Release。
8. 验证线上 npm 和 Registry，将 `dev` 快进同步到 `main` 后恢复日常开发。

创建版本 Tag：

```bash
git switch main
git pull --ff-only origin main
VERSION="$(node -p "require('./packages/cli/package.json').version")"
git tag -a "v${VERSION}" -m "发布 @uekits/web ${VERSION}"
git push origin "v${VERSION}"
```

稳定版本会自动发布到 `latest`。需要候选验证时，应发布新的 SemVer 预发布版本，例如 `0.2.0-beta.1`，它会自动进入 `next`；验证完成后再发布新的稳定版本 `0.2.0`，不要把同一个预发布版本提升为稳定版。

线上验证完成后，在不产生合并提交的前提下同步 `dev`：

```bash
git switch dev
git fetch origin
git merge --ff-only origin/main
git push origin dev
```

如果 `--ff-only` 失败，说明发布窗口内 `dev` 出现了新提交；应先停止操作并检查分支关系，不得用强制推送掩盖分叉。

每次发布后必须以 npm Registry 的实际结果为准：

```bash
npm dist-tag ls @uekits/web
npm view @uekits/web@latest version
```

发布预发布版本时，`latest` 必须继续指向已经验收的稳定版本。

## 7. 发布后检查

```bash
npm view @uekits/web version
npm view @uekits/web dist-tags
npm view @uekits/web --json
```

真实执行：

```bash
pnpm dlx @uekits/web@latest --version
pnpm dlx @uekits/web@latest list
```

发布预发布版本时，再使用 `@next` 执行同样的真实消费验证。

检查 `dist.attestations` 或在干净消费项目执行 `npm audit signatures`，确认 Registry 签名和 Provenance 可以验证。

## 8. npm 回滚原则

npm 已发布版本原则上不可覆盖。发现问题时：

- 立即发布修复版本。
- 必要时把故障版本标记为 deprecated。
- 调整 dist-tag 指向稳定版本。
- 不依赖 unpublish 作为常规回滚。

```bash
npm deprecate '@uekits/web@<故障版本>' "该版本存在已知问题，请升级。"
npm dist-tag add '@uekits/web@<稳定版本>' latest
```
