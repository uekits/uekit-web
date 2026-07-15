# Registry 部署指南

## 1. 当前部署方式

Registry 由 `.github/workflows/deploy-registry.yml` 构建并发布到 GitHub Pages，自定义域名为：

```text
registry.uekit.com
```

DNS CNAME 指向：

```text
uekits.github.io
```

## 2. GitHub 配置

在 `uekits/uekit-web`：

1. Settings → Pages。
2. Source 选择 GitHub Actions。
3. 确认组织域名已经验证。
4. 配置自定义域名和 Enforce HTTPS。

使用 GitHub Actions 发布 Pages 时，自定义域名必须在 Pages Settings 中配置；不能依赖构建产物中的 `CNAME` 自动完成绑定。

## 3. 触发条件

推送到 `main` 且变更 Registry、CLI 构建器、Schema、Registry Server 或部署工作流时自动触发，也可以手工 `workflow_dispatch`。无论哪种入口，工作流都只允许 `main` Ref 构建和部署；从其他分支手工触发会被跳过。

正式发布时，Registry 部署由 `dev → main` 的 Merge Commit 触发。必须等待 Pages 和自定义域名验证成功后再创建 npm 版本 Tag；Tag 发布工作流还会比较生产 Registry 与当前构建产物，二者不一致时拒绝发布 npm。

## 4. 工作流过程

```text
Checkout
  → 安装 pnpm / Node
  → pnpm install --frozen-lockfile
  → pnpm registry:build
  → pnpm registry:verify
  → 上传 Pages Artifact
  → 部署 Pages
  → 使用线上 URL 再次 verify
```

线上二次验证非常重要，它能发现 DNS、路径前缀、缓存和 Pages 配置问题。

## 5. 部署前本地验证

```bash
pnpm registry:build
pnpm registry:verify
pnpm playground:verify
pnpm dev:registry
```

访问：

```text
http://127.0.0.1:4174/web/v1/index.json
http://127.0.0.1:4174/web/v1/items/button/0.1.0.json
```

实际端口以 Vite 输出为准。

## 6. 部署后验证

```bash
curl -fsSL https://registry.uekit.com/web/v1/index.json
curl -fsSL https://registry.uekit.com/web/v1/items/button/0.1.0.json
```

再用 CLI 做真实读取：

```bash
pnpm dlx @uekits/web@0.1.2 list
```

## 7. 缓存与兼容

当前公开路径是 `/web/v1`，其中 `v1` 是协议版本，不等于组件版本。索引指向 `items/<name>/<version>.json`，历史版本随站点持续保留。

修改 Registry 源码后必须提升受影响条目版本并执行 `pnpm registry:release`。CLI-only、文档或不改变 Registry 源码的发布不得无条件提升全部条目版本。构建器会拒绝同版本内容变化和未归档版本，避免缓存污染与不可重复安装。

## 8. 故障回滚

1. 定位最后一个正常的 Index 推荐版本。
2. 将 `registry.json` 和对应 `registry/` 源码恢复为已经归档的稳定版本内容；不要删除任何已经公开的 `registry-releases` 文件。
3. 如果问题需要修复，优先提升条目版本并发布新的不可变资源。
4. 重新构建、验证并触发部署工作流。
5. 在线验证 Index、稳定条目和故障版本的历史 URL 都仍然可访问。
6. 通知消费方暂停升级或继续使用消费项目 Git 中已经提交的源码。

已安装到消费方的源码不受 Registry 短时故障影响；故障主要影响新的 `init/add/update/list/view`。
