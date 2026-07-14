# 样式说明入口

UEKit Web 使用三层协作，而不是把 Tailwind CSS 或 Element Plus 单独视为完整设计系统：

```text
UEKit 语义 Token   产品语言、亮色/深色和密度
Tailwind CSS v4    UEKit 自有布局、响应式和状态
Element Plus       复杂控件和交互能力
```

完整说明：

- [主题与样式架构](./architecture/主题与样式架构.md)
- [样式与主题规范](./standards/样式与主题规范.md)

## 当前固定策略

- `init` 自动安装 `tailwindcss` 和 `@tailwindcss/vite`。
- CLI 将 `tailwindcss()` 加入调用方 Vite 插件。
- 主题入口默认是 `src/styles/uekit.css`。
- Tailwind Preflight 固定关闭，避免重置 Element Plus、地图、图表和已有业务样式。
- Registry 源码使用完整可扫描类名，不动态拼接 `bg-${tone}` 一类工具类。
- Element Plus 组件和 CSS 按需导入，不执行 `app.use(ElementPlus)`。
