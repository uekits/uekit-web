# Registry 工作原理

## 1. Registry 的职责

Registry 是组件元数据和标准源码的分发协议。它回答：

- 有哪些可安装条目。
- 条目属于哪一层。
- 条目依赖哪些 npm 包和其他条目。
- 哪些文件应写到消费项目的哪个目录。
- 条目要求哪些运行环境和依赖版本。

## 2. 源数据与生成物

源数据：

```text
registry.json
registry/**/*
registry-releases/items/**/*
registry.schema.json
uekit.schema.json
```

生成物：

```text
apps/registry-server/dist/web/v1/
├─ index.json
├─ items/
│  ├─ button/0.1.0.json
│  └─ pro-table/0.1.0.json
├─ schema.json
└─ config.schema.json
```

`registry-releases` 是进入 Git 的不可变发布档案，静态站点生成物由构建和部署流程产生。同一条目同一版本的内容不得覆盖；修改源码后必须先提升条目版本，再执行 `pnpm registry:release`。

## 3. 为什么每个条目一个 JSON

`index.json` 适合列表和发现，单条目 JSON 适合安装。拆分后：

- CLI 不需要下载全部组件源码。
- CDN 可以独立缓存热门条目。
- 单条目更新的传输成本较低。
- 条目内容和哈希可以独立验证。

## 4. 构建过程

```text
读取 registry.json
  ↓
Schema 校验
  ↓
名称、类型、路径检查
  ↓
依赖存在性与循环检查
  ↓
读取每个源文件
  ↓
计算 SHA-256
  ↓
把 content/hash 写入条目 JSON
  ↓
生成 index 和公开 Schema
```

路径校验会阻止绝对路径和 `..` 路径穿越，避免构建或安装写到预期目录之外。

## 5. 依赖模型

### npm 运行时依赖

```json
"dependencies": ["element-plus@^2.14.0"]
```

安装后写入消费项目 `dependencies`。

### npm 开发依赖

```json
"devDependencies": ["tailwindcss@^4.3.0"]
```

安装后写入消费项目 `devDependencies`。

### Registry 依赖

```json
"registryDependencies": ["theme", "icon"]
```

CLI 会递归获取和安装。依赖图必须是有向无环图。

## 6. 路径占位符

目标路径可以使用消费项目 `uekit.json` 的 Alias 占位符：

```json
"target": "{pro}/pro-table/ProTable.vue"
```

CLI 将其解析为 `src/components/pro/pro-table/ProTable.vue`。源码内部的 UEKit 别名也会根据消费项目配置改写。

## 7. 兼容性

Registry 根级兼容性描述整个 Web 产品线的最低环境，条目也可以附加更具体的兼容性。

CLI 会校验当前 Node 版本，以及消费项目已声明的 Vue、Element Plus 等包版本范围是否与条目要求相交。密钥和环境变量不属于 Registry v1 协议；地图等集成通过组件 Props 接收配置，Registry 不存储真实密钥。

## 8. 本地 Registry

开发时可以构建并启动：

```bash
pnpm registry:build
pnpm dev:registry
```

CLI 的 `--registry` 支持 HTTP URL 或本地目录，便于在发布前测试未上线条目。

## 9. 公共与私有 Registry

当前默认公共 Registry：

```text
https://registry.uekit.com/web/v1
```

企业可以部署兼容协议的私有 Registry，并在 `uekit.json` 中改写地址。私有条目仍应遵循相同 Schema、路径安全和版本规则。

## 10. 进一步阅读

- [`registry.json` 协议](../reference/registry.json协议.md)
- [Registry 条目类型参考](../reference/Registry条目类型参考.md)
- [Registry 部署指南](../releasing/Registry部署指南.md)
