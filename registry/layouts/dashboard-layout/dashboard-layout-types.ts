/**
 * DashboardLayout 的公开 Props 与 Slots 契约。
 */

/** DashboardLayout 公开属性。 */
export interface DashboardLayoutProps {
    sidebarWidth?: string;
    collapsed?: boolean;
}

/** DashboardLayout 公开插槽。 */
export interface DashboardLayoutSlots {
    header?: () => unknown;
    sidebar?: () => unknown;
    default?: () => unknown;
}
