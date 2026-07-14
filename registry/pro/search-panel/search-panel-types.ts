/**
 * SearchPanel 的公开 Props、Emits 与 Slots 契约。
 */

export type SearchPanelDensity = 'standard' | 'compact';
export type SearchPanelMode = 'panel' | 'embedded';

export interface SearchPanelProps {
    title?: string;
    summary?: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    searchText?: string;
    resetText?: string;
    density?: SearchPanelDensity;
    mode?: SearchPanelMode;
    advancedCollapsible?: boolean;
    defaultAdvancedCollapsed?: boolean;
}

export interface SearchPanelEmits {
    search: [];
    reset: [];
    collapse: [collapsed: boolean];
}

export interface SearchPanelSlots {
    default?: () => unknown;
    description?: () => unknown;
    collapsedSummary?: () => unknown;
    advanced?: () => unknown;
    actions?: () => unknown;
}
