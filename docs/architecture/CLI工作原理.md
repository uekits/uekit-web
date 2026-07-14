# CLI 工作原理

## 1. CLI 定位

`@uekits/web` 是纯命令行源码分发客户端和仓库维护工具。npm 包只公开 `uekit-web` 可执行文件，不提供可导入的程序化模块入口；推荐通过 `pnpm dlx @uekits/web@<version>` 执行。

## 2. 模块划分

```text
packages/cli/src/
├─ index.ts             # 命令入口
├─ config.ts            # 配置与 Lock
├─ registry.ts          # 远端和本地 Registry 读取
├─ validation.ts        # 协议校验
├─ installer.ts         # 依赖解析、源码写入和依赖安装
├─ tailwind.ts          # Vite/Tailwind 配置
├─ upgrade.ts           # diff 和 update
├─ build-registry.ts    # Registry 静态构建
├─ fs-utils.ts          # 文件系统工具
└─ types.ts             # 公共内部类型
```

## 3. Registry 地址解析

默认根地址：

```text
https://registry.uekit.com/web/v1
```

CLI 先读取 `index.json`，再按索引中的版本化 `url` 获取条目。命令行 `--registry` 可以临时覆盖配置；远端必须使用 HTTPS，仅回环地址允许 HTTP，本地目录也可使用相对项目的 `file:` URI。

## 4. 安装算法

```text
输入条目名称列表
  ↓
深度优先解析 registryDependencies
  ↓
检测循环并形成安装顺序
  ↓
生成无副作用安装计划并检查冲突
  ↓
安装 npm 依赖；失败时恢复 package manifest 和 lock
  ↓
检查每个目标文件状态
  ├─ 不存在：写入
  ├─ 已追踪且未修改：可更新
  ├─ 已追踪且已修改：默认跳过
  └─ 未追踪同名文件：默认拒绝覆盖
  ↓
改写别名和目标路径
  ↓
以原子替换提交源码、Base 和 Lock；失败时整体回滚
```

## 5. 包管理器识别

CLI 根据执行环境以及当前目录、工作区祖先目录中的锁文件识别 pnpm、npm、yarn 或 bun。依赖由 Registry 条目声明，CLI 负责去重并调用对应安装命令。

使用 `--skip-install` 可以只写源码和元数据，适用于离线环境或由调用方统一管理依赖的场景，但之后必须手工安装缺失依赖。

`init`、`add` 和 `update` 支持 `--dry-run`，仅输出条目、文件和依赖计划，不修改项目。

## 6. 别名处理

Registry 使用逻辑别名，例如 `{ui}` 和 `{pro}`。CLI 读取 `uekit.json` 映射到真实目录，并同步改写源码中的 UEKit 标准 import。

别名必须是项目内相对路径。任何解析后逃离项目根目录的目标都应被拒绝。

## 7. 主题初始化

`init` 实际是一个受控的首次安装：

1. 创建默认配置。
2. 安装 `theme`。
3. 配置 `@tailwindcss/vite`。
4. 在应用入口注入主题 CSS。
5. 建立 Lock 和 Base。

重复执行应尽量保持幂等，不应重复插入 Vite 插件或主题 import。

## 8. 错误处理原则

- 错误必须指出哪个条目、文件或依赖失败。
- 网络失败不得伪装成“条目不存在”。
- 文件冲突默认保护本地源码。
- 部分安装失败时不得无提示留下错误 Lock。
- 自动化命令以非零退出码表达失败。

## 9. 自动化使用

`cat` 等命令可用于冒烟测试，但 CLI 的主要交互是面向开发者。CI 应固定 CLI 版本，不要在关键发布流程中无约束使用 `latest`。

## 10. 当前限制

- 配置迁移尚未形成多版本迁移器。
- 复杂 AST 级别的 import 和配置修改能力有限。
- 三方合并主要依赖 Git 文本合并。
- 尚未实现离线缓存和 Registry 签名验证。
