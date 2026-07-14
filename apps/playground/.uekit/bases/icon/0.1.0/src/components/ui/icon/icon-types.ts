/**
 * Icon 的公开 Props 契约。
 */

import type { Component } from 'vue';

/** Icon 公开属性。 */
export interface IconProps {
    /** 要渲染的 Vue 图标组件。 */
    icon: Component;
    /** 图标含独立语义时提供；省略时图标对辅助技术隐藏。 */
    label?: string;
    size?: number | string;
    strokeWidth?: number;
    spin?: boolean;
}
