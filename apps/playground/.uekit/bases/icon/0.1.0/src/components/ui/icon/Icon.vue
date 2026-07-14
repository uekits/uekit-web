<!--
    UEKit 图标渲染与无障碍外壳。

    图标未提供标签时作为装饰内容隐藏，旋转动画遵循用户的减少动态效果偏好。
-->
<template>
    <span
        class="ue-icon inline-flex shrink-0 items-center justify-center align-middle leading-none"
        :class="{ 'is-spinning': spin }"
        :aria-hidden="label ? undefined : 'true'"
        :aria-label="label"
        :role="label ? 'img' : undefined"
    >
        <component
            :is="icon"
            :size="size"
            :stroke-width="strokeWidth"
        />
    </span>
</template>

<script setup lang="ts">
import type { IconProps } from './icon-types';

withDefaults(defineProps<IconProps>(), {
    label: undefined,
    size: 16,
    strokeWidth: 1.9,
    spin: false,
});
</script>

<style scoped>
.ue-icon {
    &.is-spinning {
        animation: ue-icon-spin 0.9s linear infinite;
    }
}

@keyframes ue-icon-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .ue-icon.is-spinning {
        animation-duration: 1.8s;
    }
}
</style>
