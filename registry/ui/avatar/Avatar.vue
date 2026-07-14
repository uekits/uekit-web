<!--
    带图片预加载和文字回退的用户头像。

    图片加载由组件持有，并在来源变化或卸载时解除回调，避免过期请求更新当前状态。
-->
<template>
    <ElAvatar
        class="ue-avatar shrink-0 border border-primary/20 bg-primary-soft text-primary shadow-none"
        :src="effectiveSource"
        :size="size"
        :alt="accessibleLabel"
        @error="handleImageError"
    >
        <span
            class="ue-avatar__fallback inline-flex size-full items-center justify-center text-center leading-none text-inherit"
        >
            {{ fallback }}
        </span>
    </ElAvatar>
</template>

<script setup lang="ts">
import { ElAvatar } from 'element-plus';
import 'element-plus/es/components/avatar/style/css';
import { computed, ref, watch } from 'vue';
import type { AvatarProps } from './avatar-types';

const props = withDefaults(defineProps<AvatarProps>(), {
    name: '',
    src: '',
    size: 40,
    alt: '',
});

const fallback = computed(() => props.name.trim().slice(0, 1) || '用');
const failedSource = ref('');
const loadedSource = ref('');
const effectiveSource = computed(() =>
    props.src && props.src === loadedSource.value && props.src !== failedSource.value
        ? props.src
        : undefined,
);
const accessibleLabel = computed(
    () => props.alt || (props.name ? `${props.name}的头像` : '用户头像'),
);

watch(
    () => props.src,
    (source, _previousSource, onCleanup) => {
        failedSource.value = '';
        loadedSource.value = '';

        if (!source || typeof Image === 'undefined') {
            return;
        }

        const image = new Image();
        image.onload = () => {
            if (props.src === source) loadedSource.value = source;
        };
        image.onerror = () => {
            if (props.src === source) failedSource.value = source;
        };
        image.src = source;

        onCleanup(() => {
            image.onload = null;
            image.onerror = null;
        });
    },
    { immediate: true },
);

function handleImageError(): boolean {
    failedSource.value = props.src;
    loadedSource.value = '';
    return false;
}
</script>

<style scoped>
.ue-avatar {
    font-size: calc(var(--el-avatar-size) * 0.38);
    font-weight: 600;
    line-height: 1;
}

.ue-avatar :deep(img) {
    object-fit: cover;
}
</style>
