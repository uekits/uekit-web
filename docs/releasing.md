# 发布说明入口

UEKit Web 有两个独立发布物：

```text
registry.uekit.com/web/v1/*  Registry 静态源码协议
@uekits/web                  Registry CLI npm 包
```

完整发布文档已经按职责拆分：

- [Registry 部署指南](./releasing/Registry部署指南.md)
- [npm 发布指南](./releasing/npm发布指南.md)
- [版本升级与回滚](./releasing/版本升级与回滚.md)
- [发布前验收清单](./testing/发布前验收清单.md)

当前稳定版本为 [`v0.1.2`](https://github.com/uekits/uekit-web/releases/tag/v0.1.2)，npm 的 `latest` 与 `next` Dist Tag 均指向 `0.1.2`。`0.1.1` 因发布工作流验证失败而未发布。

## 发布底线

- Registry 协议 v1 固定在 `/web/v1`，条目版本独立管理。
- npm 发布物只能包含允许清单中的 `dist`、README、LICENSE 和 package.json 元数据。
- 自动发布使用 npm Trusted Publishing 和 GitHub OIDC，不保存长期 npm Token。
- `latest` 只指向通过隔离消费项目验证的版本。
- 发布前必须通过 `pnpm check`、`pnpm test:e2e` 和 `pnpm smoke:package`。
- npm 已发布版本不可覆盖；故障通过新补丁版本、deprecated 和 dist-tag 处理。
