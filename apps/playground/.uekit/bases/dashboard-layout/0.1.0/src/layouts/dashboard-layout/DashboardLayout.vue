<!--
    两栏企业后台页面骨架。

    组件只负责 Header、Sidebar 与主内容区布局；导航状态和移动端菜单由消费方持有。
-->
<template>
    <div
        class="ue-dashboard-layout grid min-h-screen bg-page text-foreground"
        :class="{ 'is-collapsed': collapsed }"
        :style="{ '--ue-dashboard-sidebar-width': sidebarWidth }"
    >
        <header class="ue-dashboard-layout__header z-[2] border-b border-border bg-surface">
            <slot name="header" />
        </header>
        <aside
            class="ue-dashboard-layout__sidebar overflow-auto border-r border-border bg-surface max-[900px]:hidden"
        >
            <slot name="sidebar" />
        </aside>
        <main class="ue-dashboard-layout__main min-w-0 overflow-auto"><slot /></main>
    </div>
</template>

<script setup lang="ts">
import type { DashboardLayoutProps, DashboardLayoutSlots } from './dashboard-layout-types';

withDefaults(defineProps<DashboardLayoutProps>(), {
    sidebarWidth: '240px',
    collapsed: false,
});
defineSlots<DashboardLayoutSlots>();
</script>

<style scoped>
.ue-dashboard-layout {
    grid-template:
        'header header' 56px
        'sidebar main' minmax(0, 1fr) / var(--ue-dashboard-sidebar-width) minmax(0, 1fr);
}

.ue-dashboard-layout.is-collapsed {
    --ue-dashboard-sidebar-width: 64px !important;
}

.ue-dashboard-layout__header {
    grid-area: header;
}

.ue-dashboard-layout__sidebar {
    grid-area: sidebar;
}

.ue-dashboard-layout__main {
    grid-area: main;
}

@media (width <= 900px) {
    .ue-dashboard-layout {
        grid-template:
            'header' 56px
            'main' minmax(0, 1fr) / minmax(0, 1fr);
    }
}
</style>
