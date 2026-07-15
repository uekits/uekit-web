# Registry 条目类型参考

## 1. 类型总览

| 类型                   | 目录                    | 定位                 |
| ---------------------- | ----------------------- | -------------------- |
| `registry:foundation`  | `registry/foundation`   | 主题、图标和通用工具 |
| `registry:ui`          | `registry/ui`           | 基础 UI 组件与适配器 |
| `registry:pro`         | `registry/pro`          | 企业高级组合组件     |
| `registry:layout`      | `registry/layouts`      | 页面和应用布局       |
| `registry:block`       | `registry/blocks`       | 可直接组合的业务区块 |
| `registry:integration` | `registry/integrations` | 第三方 SDK 集成      |

## 2. Foundation

特点：

- 被其他层广泛依赖。
- 不依赖具体业务。
- 变更影响面大，必须保持兼容。

当前示例：`theme`、`icon`。

## 3. UI

特点：

- 单一、稳定的交互职责。
- 可能适配 Element Plus。
- 提供统一语义和 API，不做复杂页面编排。

当前示例：`button`、`avatar`、`status-tag`。

不需要机械包装 Element Plus 的所有组件。只有存在统一视觉、行为或可访问性价值时才进入 UI 层。

## 4. Pro

特点：

- 面向企业后台高频工作流。
- 组合多个基础能力。
- 提供插槽和受控状态，避免绑定业务数据。

当前示例：`search-panel`、`pro-table`、`detail-drawer`、`form-dialog`。

## 5. Layout

特点：

- 管理页面区域和响应式结构。
- 通过插槽承载业务内容。
- 不直接请求菜单、用户或统计接口。

当前示例：`dashboard-layout`。

## 6. Block

Block 是比 Pro 更完整的可组合区块，例如用户管理工作台或权限设置面板。它可以带演示数据适配接口，但不能写死具体客户业务。

当前状态：类型已经保留，稳定条目仍在规划中。

## 7. Integration

特点：

- 封装第三方 SDK 生命周期和通用交互。
- npm 依赖只在安装时进入消费项目。
- 密钥通过消费项目环境变量配置。
- 负责销毁实例和响应容器变化；主题由消费项目通过 `theme`、`mapStyle` 等 Props 显式驱动。

当前示例：`map-amap`、`charts-echarts`。

## 8. 选择流程

```text
是否是主题、工具或图标？ → Foundation
是否是单一基础交互？     → UI
是否是企业通用组合组件？ → Pro
是否主要负责页面结构？   → Layout
是否是完整可组合区块？   → Block
是否封装第三方 SDK？     → Integration
仍然依赖具体行业实体？   → 留在业务项目
```

## 9. 跨层依赖

推荐方向：

```text
Integration / Block / Layout / Pro / UI
                  ↓
              Foundation
```

避免 Foundation 反向依赖 Pro，或 UI 依赖具体 Block。依赖图应保持清晰且无循环。
