/**
 * FormDialog 的公开 Props、Emits 与 Slots 契约。
 */

/** FormDialog 公开属性。 */
export interface FormDialogProps {
    modelValue: boolean;
    title: string;
    description?: string;
    /** 初始对话框宽度，单位为像素。 */
    width?: number;
    /** 非全屏状态的内容区基准高度，单位为像素。 */
    height?: number;
    /** 非全屏状态允许的最小宽度，仍会服从当前视口。 */
    minWidth?: number;
    minHeight?: number;
    draggable?: boolean;
    showFooter?: boolean;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    closeOnOverlay?: boolean;
}

/** FormDialog 公开事件。 */
export interface FormDialogEmits {
    'update:modelValue': [visible: boolean];
    confirm: [];
    cancel: [];
}

/** FormDialog 公开插槽。 */
export interface FormDialogSlots {
    default?: () => unknown;
    footer?: () => unknown;
}
