# `uekit.json` 配置参考

`uekit.json` 位于调用方项目根目录，描述 CLI 如何安装源码。

## 1. 默认配置

```json
{
  "$schema": "https://registry.uekit.com/web/v1/config.schema.json",
  "style": "default",
  "typescript": true,
  "registry": "https://registry.uekit.com/web/v1",
  "aliases": {
    "ui": "src/components/ui",
    "pro": "src/components/pro",
    "layouts": "src/layouts",
    "blocks": "src/blocks",
    "integrations": "src/integrations",
    "lib": "src/lib/uekit",
    "styles": "src/styles"
  },
  "theme": {
    "css": "src/styles/uekit.css"
  },
  "tailwind": {
    "enabled": true,
    "version": 4,
    "preflight": false
  }
}
```

## 2. 根字段

| 字段         | 类型    | 当前值或用途            |
| ------------ | ------- | ----------------------- |
| `$schema`    | string  | 配置 Schema 地址        |
| `style`      | string  | 当前仅支持 `default`    |
| `typescript` | `true`  | v1 仅分发 TypeScript    |
| `registry`   | string  | Registry 根地址或来源   |
| `aliases`    | object  | 安装目录映射            |
| `theme`      | object  | 主题入口路径            |
| `tailwind`   | object  | Tailwind 固定策略       |

Schema 不允许额外字段。

## 3. aliases

| Alias          | 默认目录             | 内容             |
| -------------- | -------------------- | ---------------- |
| `ui`           | `src/components/ui`  | 基础组件         |
| `pro`          | `src/components/pro` | 高级企业组件     |
| `layouts`      | `src/layouts`        | 页面和应用布局   |
| `blocks`       | `src/blocks`         | 可组合业务区块   |
| `integrations` | `src/integrations`   | 地图、图表等集成 |
| `lib`          | `src/lib/uekit`      | 工具和基础能力   |
| `styles`       | `src/styles`         | 主题和公共样式   |

目录必须位于项目根目录内。CLI 会拒绝路径穿越。

## 4. registry

默认使用 Registry 根地址：

```text
https://registry.uekit.com/web/v1
```

CLI 从根地址读取 `index.json`，再获取索引声明的不可变版本资源。v1 不再接受 `{name}` 模板。

本地调试可以通过命令行 `--registry` 临时覆盖，避免频繁修改并提交项目配置。

## 5. theme

`theme.css` 是 CLI 安装 `theme` 条目的目标，也是 `init` 注入应用入口的路径。

已有项目可以调整路径，但应确保：

- alias 的 `styles` 与主题目标一致。
- `src/main.ts` 或 `src/main.js` 能导入该路径。
- 不存在重复主题入口。

## 6. tailwind

当前协议固定：

```json
{
  "enabled": true,
  "version": 4,
  "preflight": false
}
```

这些值不是任意开关，而是当前 UEKit Web Registry 源码的运行约束。需要不同策略时，应先升级 CLI、Schema 和组件测试，而不是只手改配置。

## 7. 团队管理

- 提交到 Git。
- 不在配置中存放密钥。
- Registry 改为企业内部地址时使用 HTTPS。
- 修改 aliases 后，已安装旧文件不会自动搬迁，必须制定迁移步骤。
- 配置 Schema 与 CLI 版本应保持兼容。
