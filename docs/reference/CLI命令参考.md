# CLI 命令参考

## 1. 调用方式

```bash
pnpm dlx @uekits/web@latest <command>
```

团队和 CI 推荐固定版本：

```bash
pnpm dlx @uekits/web@0.1.0 <command>
```

npm 包名为 `@uekits/web`，可执行文件名为 `uekit-web`。

## 2. 全局信息

```bash
pnpm dlx @uekits/web@latest --help
pnpm dlx @uekits/web@latest --version
```

## 3. init

在当前 Vue 项目初始化 UEKit Web：

```bash
pnpm dlx @uekits/web@latest init
```

选项：

| 选项                  | 说明                             |
| --------------------- | -------------------------------- |
| `--cwd <path>`        | 项目目录，默认当前目录           |
| `--registry <source>` | 临时指定 Registry URL 或本地目录 |
| `--skip-install`      | 不执行 npm 依赖安装              |
| `--dry-run`           | 仅输出安装计划，不修改项目       |

行为：创建配置，安装 `theme`，建立 Base，配置 Tailwind Vite 插件并注入主题 CSS。

## 4. add

安装一个或多个条目：

```bash
pnpm dlx @uekits/web@latest add button avatar pro-table
```

| 选项                  | 说明                       |
| --------------------- | -------------------------- |
| `--cwd <path>`        | 项目目录                   |
| `--registry <source>` | Registry URL 或本地目录    |
| `--overwrite`         | 允许覆盖已有文件，谨慎使用 |
| `--skip-install`      | 跳过 npm 依赖安装          |
| `--dry-run`           | 仅输出安装计划             |

CLI 会递归安装 `registryDependencies`。

## 5. list

列出 Registry 可用条目：

```bash
pnpm dlx @uekits/web@latest list
```

`list` 在项目外也可使用；如当前目录没有 `uekit.json`，使用默认 Registry。

选项：`--cwd <path>`、`--registry <source>`。

## 6. view

输出一个远端 Registry 条目的完整 JSON：

```bash
pnpm dlx @uekits/web@latest view pro-table
```

选项：`--cwd <path>`、`--registry <source>`。

当前实现要求项目中存在 `uekit.json`。

## 7. info

列出本地已经安装的条目：

```bash
pnpm dlx @uekits/web@latest info
```

输出条目名称、版本和文件数。数据来源是 `uekit.lock.json`。

选项：`--cwd <path>`。

## 8. diff

比较本地源码与安装时 Base：

```bash
pnpm dlx @uekits/web@latest diff pro-table
```

选项：`--cwd <path>`。

内部使用 `git diff --no-index` 展示文本差异。项目需要可执行 Git。

## 9. update

更新单个已安装条目：

```bash
pnpm dlx @uekits/web@latest update pro-table
pnpm dlx @uekits/web@latest update pro-table --merge
```

| 选项                  | 说明                          |
| --------------------- | ----------------------------- |
| `--cwd <path>`        | 项目目录                      |
| `--registry <source>` | 新版本 Registry 来源          |
| `--merge`             | 本地有修改时尝试 Git 三方合并 |
| `--dry-run`           | 仅输出升级计划，不修改项目    |

本地有修改且不指定 `--merge` 时，CLI 不覆盖文件。

指定 `--merge` 后，CLI 使用旧 Base、Local 和新 Registry 源码执行三方合并。无冲突时写入合并结果；有冲突时保留 Local，并生成 `.uekit-merge`。Lock 和 Base 都会推进到新的上游版本，使后续 `diff` 基于最新上游基线继续追踪本地定制。

## 10. build

从仓库根目录的 `registry.json` 和源文件构建静态 Registry：

```bash
pnpm dlx @uekits/web@latest build
```

| 选项              | 说明               |
| ----------------- | ------------------ |
| `--cwd <path>`    | UEKit Web 仓库目录 |
| `--output <path>` | 自定义输出目录     |
| `--release`       | 归档新的不可变条目版本后构建 |

该命令主要用于 UEKit Web 仓库和兼容的私有 Registry 维护者。

## 11. cat

打印项目中的一个本地文件：

```bash
pnpm dlx @uekits/web@latest cat src/components/ui/button/Button.vue
```

选项：`--cwd <path>`。

主要用于自动化冒烟测试，不等同于 `view`。

## 12. Registry 参数

HTTP 示例：

```bash
pnpm dlx @uekits/web@latest list \
  --registry http://127.0.0.1:4174/web/v1
```

本地目录示例：

```bash
pnpm dlx @uekits/web@latest add button \
  --registry /absolute/path/to/registry-output
```

也可在项目配置或命令行中使用相对项目目录的 `file:../registry-output`。非回环地址的 HTTP Registry 会被拒绝。

## 13. 退出码

- 成功：`0`
- 参数错误、网络错误、配置错误、文件冲突或构建校验失败：非 `0`

自动化脚本应检查退出码，不应只匹配控制台文本。
