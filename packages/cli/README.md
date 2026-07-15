# @uekits/web

UEKit Web Registry CLI。它把可编辑 Vue 源码安装到应用中，而不是要求应用引入一个运行时组件库。

```bash
pnpm dlx @uekits/web@latest init
pnpm dlx @uekits/web@latest add avatar pro-table
```

CLI 从 `https://registry.uekit.com/web/v1/` 读取带版本的源码定义。安装后的文件归调用方项目所有，可以本地阅读、修改、比较和升级。

`latest` 是经过完整消费验证的稳定通道，`next` 用于发布候选验证。自动化环境应固定明确版本，避免未评估升级：

```bash
pnpm dlx @uekits/web@0.1.2 --version
```

环境要求：Node.js 20.19 或更高版本，以及 Vue 3 + Vite 项目。

## 主要命令

```text
init      初始化主题、配置、Lock 和 Base
add       按需安装一个或多个条目
list      查看 Registry 可用条目
view      查看远端条目内容
info      查看本地已安装条目
diff      比较本地源码与安装基准
update    更新条目，可选三方合并
build     构建静态 Registry
cat       打印本地文件，主要用于自动化检查
```

`init`、`add` 和 `update` 支持 `--dry-run` 预览计划。`@uekits/web` 是纯 CLI 包，不提供可导入的 JavaScript API。

完整文档见仓库的 [CLI 命令参考](https://github.com/uekits/uekit-web/blob/main/docs/reference/CLI%E5%91%BD%E4%BB%A4%E5%8F%82%E8%80%83.md)和[快速开始](https://github.com/uekits/uekit-web/blob/main/docs/guides/%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B.md)。
