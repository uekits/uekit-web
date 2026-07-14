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
```

GitHub 的 `npm` Environment 必须启用 Required reviewers，并将 Deployment branches and tags 限制为 `main` 和受保护的语义化版本 Tag。首次创建包时 npm 平台可能要求包所有者完成一次确认。不要把长期 npm Token 写入仓库 Secrets，当前 workflow 使用 OIDC。

## 3. 版本管理

使用 Changesets：

```bash
pnpm changeset
pnpm version-packages
```

选择：

- patch：兼容缺陷修复。
- minor：兼容新增命令或能力。
- major：不兼容 CLI、配置或协议变化。

## 4. 本地发布候选验证

```bash
pnpm check
pnpm test:e2e
pnpm smoke:package
```

检查 tarball 内容：

```bash
cd packages/cli
npm pack --dry-run
```

必须包含 `dist`、README 和 LICENSE，且 `bin` 指向存在文件。

## 5. GitHub Actions 发布

`.github/workflows/release.yml` 通过手工触发，支持：

- `next`：预发布和首次公开验证。
- `latest`：稳定发布。

工作流只接受 `main` 或与 CLI 版本一致的 `v<semver>` Tag；其他 Ref 即使手工选择也不会运行。npm CLI 使用仓库固定版本，不允许发布时安装漂移的 `npm@latest`。

工作流会：

1. 安装依赖。
2. 执行 `pnpm check && pnpm smoke:package`。
3. 使用 `pnpm changeset publish --tag <tag>`。
4. 通过 OIDC 生成 npm Provenance。

如果环境中存在 `NODE_TLS_REJECT_UNAUTHORIZED=0`，安全检查、包校验和 tarball 冒烟会直接失败，禁止绕过 TLS 证书验证。

## 6. 首次发布建议

1. 先发布 `0.1.0` 到 `next`。
2. 在干净项目执行 `pnpm dlx @uekits/web@next init`。
3. 验证公开 Registry。
4. 确认 npm 页面、README、许可证和 Provenance。
5. 稳定后再发布或提升 `latest`。

## 7. 发布后检查

```bash
npm view @uekits/web version
npm view @uekits/web dist-tags
npm view @uekits/web --json
```

真实执行：

```bash
pnpm dlx @uekits/web@next --version
pnpm dlx @uekits/web@next list
```

## 8. npm 回滚原则

npm 已发布版本原则上不可覆盖。发现问题时：

- 立即发布修复版本。
- 必要时把故障版本标记为 deprecated。
- 调整 dist-tag 指向稳定版本。
- 不依赖 unpublish 作为常规回滚。

```bash
npm deprecate @uekits/web@0.1.0 "该版本存在已知问题，请升级。"
npm dist-tag add @uekits/web@0.1.1 latest
```
