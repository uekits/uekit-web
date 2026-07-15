# `registry.json` 协议

本文对应根目录 `registry.schema.json`，Schema 版本为 1。

## 1. 根对象

```json
{
  "$schema": "./registry.schema.json",
  "schemaVersion": 1,
  "name": "uekit-web",
  "homepage": "https://uekit.com",
  "compatibility": {
    "node": ">=20.19.0",
    "vue": ">=3.5.0"
  },
  "items": []
}
```

| 字段            | 必填 | 说明               |
| --------------- | ---: | ------------------ |
| `$schema`       |   否 | 编辑器 Schema 地址 |
| `schemaVersion` |   是 | 当前固定为 `1`     |
| `name`          |   是 | Registry 名称      |
| `homepage`      |   否 | 合法 URI           |
| `compatibility` |   是 | 全局兼容性范围     |
| `items`         |   是 | 至少一个条目       |

根对象不允许未定义字段。

## 2. 条目对象

```json
{
  "name": "button",
  "type": "registry:ui",
  "version": "0.1.0",
  "url": "items/button/0.1.0.json",
  "description": "UEKit button adapter backed by Element Plus.",
  "dependencies": ["element-plus@^2.14.0"],
  "devDependencies": [],
  "registryDependencies": ["theme"],
  "compatibility": {},
  "files": [
    {
      "path": "registry/ui/button/Button.vue",
      "target": "{ui}/button/Button.vue"
    }
  ]
}
```

| 字段                   | 必填 | 约束                       |
| ---------------------- | ---: | -------------------------- |
| `name`                 |   是 | 小写字母、数字和连字符     |
| `type`                 |   是 | Schema 定义的 Registry 类型 |
| `version`              |   是 | 标准 SemVer                 |
| `url`                  |   是 | `items/<name>/<version>.json` |
| `description`          |   否 | 非空描述                   |
| `dependencies`         |   否 | 唯一 npm 运行时依赖列表    |
| `devDependencies`      |   否 | 唯一 npm 开发依赖列表      |
| `registryDependencies` |   否 | 唯一 Registry 条目名称列表 |
| `compatibility`        |   否 | 条目级兼容性               |
| `files`                |   是 | 至少一个文件               |

## 3. 文件对象

源清单写法：

```json
{
  "path": "registry/ui/button/Button.vue",
  "target": "{ui}/button/Button.vue"
}
```

构建后的条目还会包含：

```json
{
  "content": "<script setup lang=...",
  "hash": "64位小写十六进制 SHA-256"
}
```

| 字段      |   必填 | 说明                              |
| --------- | -----: | --------------------------------- |
| `path`    |     是 | 相对仓库根目录的源文件路径        |
| `target`  |     是 | 消费项目目标路径，可用 alias 占位符 |
| `content` | 构建后 | 源码正文                          |
| `hash`    | 构建后 | 源码 SHA-256                      |

## 4. 目标路径占位符

支持：

```text
{ui}
{pro}
{layouts}
{blocks}
{integrations}
{lib}
{styles}
```

它们由消费项目 `uekit.json.aliases` 解析。

## 5. 依赖版本写法

依赖数组使用 npm 包规格：

```json
"dependencies": [
  "element-plus@^2.14.0",
  "@lucide/vue@^1.17.0"
]
```

不要省略版本范围，也不要把 Registry 条目写进 npm dependencies。

## 6. 兼容性

```json
"compatibility": {
  "node": ">=20.19.0",
  "vue": ">=3.5.0",
  "element-plus": ">=2.14.0 <3"
}
```

CLI 会校验当前 Node 版本，并在消费项目已声明相应包时校验版本范围是否相交。维护者仍需在 Node 和消费链测试矩阵中真实验证声明。

## 7. 构建期额外校验

Schema 之外还会检查：

- 名称唯一。
- Registry 依赖存在。
- 没有依赖环。
- 源文件可读取。
- 源路径和目标路径不穿越目录。
- 同一条目没有重复文件。
- 不同条目不会产生非法重复目标。
- URL 与名称、版本严格一致。
- 已归档的同名同版本内容不可覆盖。
- 单个条目最多包含 100 个文件，单个文件内容最大为 1 MiB。

远端读取还会限制单个响应最多 5 MiB、请求超时 15 秒，并拒绝带用户名或密码的 URL、非回环 HTTP 地址以及不安全重定向。Index 中的名称、版本和 URL 必须与最终条目响应完全一致。

## 8. 协议变更

新增可选字段可以在同一 Schema 版本内谨慎推进；删除字段、改变含义或引入不兼容结构时必须升级 `schemaVersion`，同时提供 CLI 兼容策略。
