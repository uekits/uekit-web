/**
 * Button 的公开 Props 与 Slots 契约。
 */

import type { ButtonHTMLAttributes } from 'vue';

/** Button 公开属性。 */
export interface ButtonProps {
    type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';
    size?: 'large' | 'default' | 'small';
    nativeType?: ButtonHTMLAttributes['type'];
    loading?: boolean;
    disabled?: boolean;
    plain?: boolean;
    text?: boolean;
    link?: boolean;
}

/** Button 公开插槽。 */
export interface ButtonSlots {
    default?: () => unknown;
}
