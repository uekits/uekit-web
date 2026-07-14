/**
 * DetailDrawer 的公开 Props、Emits 与 Slots 契约。
 */

/** DetailDrawer 公开属性。 */
export interface DetailDrawerProps {
    modelValue: boolean;
    title: string;
    description?: string;
    /** Element Plus Drawer 接受的 CSS 宽度。 */
    width?: string;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    showFooter?: boolean;
}

/** DetailDrawer 公开事件。 */
export interface DetailDrawerEmits {
    'update:modelValue': [visible: boolean];
    confirm: [];
    cancel: [];
}

/** DetailDrawer 公开插槽。 */
export interface DetailDrawerSlots {
    default?: () => unknown;
    footer?: () => unknown;
}
