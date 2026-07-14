# `uekit.lock.json` 说明

`uekit.lock.json` 是 CLI 自动维护的安装事实清单，不建议手工编辑。

## 1. 示例结构

```json
{
  "lockfileVersion": 1,
  "registry": "https://registry.uekit.com/web/v1",
  "items": {
    "button": {
      "version": "0.1.0",
      "source": "https://registry.uekit.com/web/v1/items/button/0.1.0.json",
      "dependencies": ["element-plus@^2.14.0"],
      "devDependencies": [],
      "installedAt": "2026-07-14T00:00:00.000Z",
      "files": [
        {
          "path": "src/components/ui/button/Button.vue",
          "hash": "...",
          "baseHash": "..."
        }
      ]
    }
  }
}
```

## 2. 根字段

| 字段              | 说明                       |
| ----------------- | -------------------------- |
| `lockfileVersion` | Lock 协议版本，当前为 1    |
| `registry`        | 最近安装使用的 Registry    |
| `items`           | 按条目名称索引的已安装状态 |

远端 Registry 使用 HTTPS URL；本地 Registry 会记录为相对消费项目的 `file:` URI，禁止写入开发者机器的绝对路径。

## 3. 条目字段

| 字段              | 说明                      |
| ----------------- | ------------------------- |
| `version`         | 已安装 Registry 条目版本  |
| `source`          | 实际版本化条目安装来源    |
| `dependencies`    | 条目声明的 npm 运行时依赖 |
| `devDependencies` | 条目声明的 npm 开发依赖   |
| `installedAt`     | ISO 安装时间              |
| `files`           | 安装到项目的文件列表      |

当版本、来源、依赖和文件摘要均未变化时，CLI 会保留原有 `installedAt`，避免重复同步产生无意义差异。

## 4. 文件哈希

- `hash`：安装完成时本地文件的 SHA-256，用于判断之后是否被修改。
- `baseHash`：Base 源码哈希，为升级机制预留明确基准。

当前安装时两者通常相同。

## 5. 与 package lock 的区别

`pnpm-lock.yaml` 记录 npm 依赖解析；`uekit.lock.json` 记录 Registry 源码安装。两者都需要提交，不能互相替代。

## 6. 与 `.uekit/bases` 的关系

Lock 保存元数据和哈希，Base 保存真实基准内容：

```text
.uekit/bases/button/0.1.0/src/components/ui/button/Button.vue
```

只有 Lock：可判断变化，但无法展示完整基准内容。  
只有 Base：缺少条目版本、来源和安装文件清单。

## 7. Git 冲突处理

多人同时安装或升级组件时可能发生 Lock 冲突。处理原则：

1. 不要只选择一侧覆盖。
2. 核对真实源码和 package lock。
3. 重新运行对应 `add` 或 `update` 生成一致状态。
4. 执行 `info` 和 `diff`。
5. 把源码、Lock、Base 和 npm 锁文件一起提交。

## 8. 不应做的事

- 不要为了让 `diff` 干净而手工改哈希。
- 不要把 Lock 加入 `.gitignore`。
- 不要只删除条目记录而保留源码。
- 不要在不同分支长期共用一份未提交的 Lock。
