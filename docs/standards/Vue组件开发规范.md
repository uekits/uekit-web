# Vue 组件开发规范

本文只定义 Registry Vue 组件的专项规则。通用格式、命名和 TypeScript 规则见[编码规范](./编码规范.md)，注释要求见[注释规范](./注释规范.md)，质量门禁见[工程化规范](./工程化规范.md)。

## 1. 技术基线

- Vue 3.5+
- TypeScript
- `<script setup lang="ts">`
- Composition API
- Vite

## 2. Props

- 明确定义类型和默认值。
- 布尔 Props 使用肯定语义，如 `disabled`、`loading`。
- 不直接修改 Props。
- 避免把整个业务 DTO 作为唯一 Props。
- 对受控状态提供 `v-model` 或明确更新事件。

```ts
interface Props {
  loading?: boolean;
  pageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  pageSize: 20,
});
```

## 3. Emits

使用类型化事件：

```ts
const emit = defineEmits<{
  submit: [payload: FormPayload];
  cancel: [];
}>();
```

事件名表达业务无关动作，不使用 `handleClick1` 等实现命名。

## 4. Slots

- 为复杂内容优先提供 Slot。
- Slot 名称表达区域，如 `header`、`toolbar`、`empty`、`footer`。
- 作用域 Slot 提供最小必要数据。
- 默认 Slot 应有清晰位置和稳定布局。

## 5. Attributes 和 DOM

- 根交互元素应正确透传 `$attrs`。
- 不需要额外包装时避免无意义 DOM。
- 保持可预测的 `data-slot` 或稳定类名，便于调用方定制。
- 不把 Element Plus 私有 DOM 结构当成长期 API。

## 6. 可访问性

- 图标按钮必须有 `aria-label` 或 Tooltip。
- 表单控件有可关联标签。
- 键盘可以完成主要交互。
- 焦点顺序符合视觉顺序。
- 禁用态不仅靠颜色表达。
- 动画尊重 `prefers-reduced-motion`。

## 7. 状态完整性

组件按需要覆盖：

- 默认。
- Hover、Focus、Active。
- Disabled。
- Loading。
- Empty。
- Error。
- 长文本。
- 窄容器。
- 亮色和深色。

## 8. Element Plus 使用

- Registry 源码必须显式按需导入组件和对应样式。
- 不假设消费项目安装了 `unplugin-element-plus` 等自动样式导入插件。
- 不在 Registry 源码中执行全局注册。
- 优先使用公开 Props、Events 和 Slots。
- 二次封装必须提供真实统一价值。
- 不隐藏底层重要能力而制造更窄的黑盒 API。

## 9. 生命周期和资源

地图、图表、观察器、定时器和事件监听必须在卸载时释放。源变化时先销毁或更新旧实例，避免重复请求和内存泄漏。

## 10. 类型导出

组件对外需要的 Props、列定义、状态类型等从 `index.ts` 导出。不要让调用方导入组件内部深层文件。

## 11. 注释

文件头、公共 API 和复杂边界遵循[注释规范](./注释规范.md)。实现内只解释不明显的设计决策、兼容处理和复杂算法，不为每个赋值写叙述性注释。

## 12. 验收

- TypeScript 无错误。
- 没有 Vue 警告。
- Props、事件、插槽有测试或 Playground 示例。
- 亮色、深色和响应式通过。
- 安装到干净消费项目后可构建。
