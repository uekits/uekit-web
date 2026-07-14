<!--
    企业状态语义标签。

    颜色由有限 tone 集合映射，默认圆点为辅助视觉，不重复暴露给辅助技术。
-->
<template>
    <span
        class="ue-status-tag inline-flex min-h-6 w-fit max-w-full items-center justify-center gap-[5px] overflow-hidden rounded-full border px-[9px] py-0.5 text-xs leading-tight font-semibold text-ellipsis whitespace-nowrap"
        :class="[`is-${tone}`, `is-${size}`, { 'is-disabled': disabled }]"
    >
        <i
            v-if="dot"
            class="size-1.5 shrink-0 rounded-full bg-current"
            aria-hidden="true"
        />
        <slot>{{ label }}</slot>
    </span>
</template>

<script setup lang="ts">
import type { StatusTagProps, StatusTagSlots } from './status-types';

withDefaults(defineProps<StatusTagProps>(), {
    label: '',
    tone: 'neutral',
    size: 'medium',
    dot: true,
    disabled: false,
});
defineSlots<StatusTagSlots>();
</script>

<style scoped>
.ue-status-tag {
    --ue-tag-color: var(--ue-color-info);
    --ue-tag-bg: var(--ue-color-info-soft);
    --ue-tag-border: rgb(var(--ue-color-info-rgb) / 20%);

    color: var(--ue-tag-color);
    background: var(--ue-tag-bg);
    border-color: var(--ue-tag-border);
}

.ue-status-tag.is-small {
    min-height: 20px;
    padding: 1px 7px;
}

.ue-status-tag.is-success {
    --ue-tag-color: var(--ue-color-success);
    --ue-tag-bg: var(--ue-color-success-soft);
    --ue-tag-border: rgb(var(--ue-color-success-rgb) / 20%);
}

.ue-status-tag.is-warning {
    --ue-tag-color: var(--ue-color-warning);
    --ue-tag-bg: var(--ue-color-warning-soft);
    --ue-tag-border: rgb(var(--ue-color-warning-rgb) / 20%);
}

.ue-status-tag.is-danger {
    --ue-tag-color: var(--ue-color-danger);
    --ue-tag-bg: var(--ue-color-danger-soft);
    --ue-tag-border: rgb(var(--ue-color-danger-rgb) / 20%);
}

.ue-status-tag.is-info {
    --ue-tag-color: var(--ue-color-primary);
    --ue-tag-bg: var(--ue-color-primary-soft);
    --ue-tag-border: rgb(var(--ue-color-primary-rgb) / 20%);
}

.ue-status-tag.is-neutral {
    --ue-tag-color: var(--ue-color-text-regular);
    --ue-tag-bg: var(--ue-color-surface-muted);
    --ue-tag-border: var(--ue-color-border);
}

.ue-status-tag.is-disabled {
    opacity: 0.58;
}
</style>
