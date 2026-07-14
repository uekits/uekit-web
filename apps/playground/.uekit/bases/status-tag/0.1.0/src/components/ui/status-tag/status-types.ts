/**
 * StatusTag 的公开视觉类型。
 */

/** StatusTag 支持的语义色调。 */
export type StatusTagTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
/** StatusTag 支持的紧凑尺寸。 */
export type StatusTagSize = 'small' | 'medium';

/** StatusTag 公开属性。 */
export interface StatusTagProps {
    label?: string;
    tone?: StatusTagTone;
    size?: StatusTagSize;
    dot?: boolean;
    disabled?: boolean;
}

/** StatusTag 公开插槽。 */
export interface StatusTagSlots {
    default?: () => unknown;
}
