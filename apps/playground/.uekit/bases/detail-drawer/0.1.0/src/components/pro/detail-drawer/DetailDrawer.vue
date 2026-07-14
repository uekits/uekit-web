<!--
    只读详情场景的抽屉容器。

    可见性由消费方通过 v-model 持有；组件只发出确认、取消与可见性变更事件。
-->
<template>
    <ElDrawer
        class="ue-detail-drawer"
        :model-value="modelValue"
        :size="width"
        append-to-body
        destroy-on-close
        @update:model-value="(visible: boolean) => emit('update:modelValue', visible)"
        @close="handleClosed"
    >
        <template #header>
            <div class="ue-detail-drawer__heading min-w-0">
                <strong class="block text-lg font-semibold">{{ title }}</strong>
                <p
                    v-if="description"
                    class="mt-[5px] block text-sm text-muted-foreground"
                >
                    {{ description }}
                </p>
            </div>
        </template>
        <div class="ue-detail-drawer__body min-h-full">
            <div
                v-if="loading"
                class="ue-detail-drawer__loading grid min-h-60 place-items-center text-primary"
            >
                <Icon
                    :icon="LoaderCircle"
                    spin
                    :size="22"
                />
            </div>
            <slot v-else />
        </div>
        <template
            v-if="showFooter"
            #footer
        >
            <slot name="footer">
                <ElButton @click="close">{{ cancelText }}</ElButton>
                <ElButton
                    type="primary"
                    @click="emit('confirm')"
                    >{{ confirmText }}</ElButton
                >
            </slot>
        </template>
    </ElDrawer>
</template>

<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue';
import { Icon } from '@/components/ui/icon';
import { ElButton, ElDrawer } from 'element-plus';
import 'element-plus/es/components/button/style/css';
import 'element-plus/es/components/drawer/style/css';
import type {
    DetailDrawerEmits,
    DetailDrawerProps,
    DetailDrawerSlots,
} from './detail-drawer-types';

withDefaults(defineProps<DetailDrawerProps>(), {
    description: '',
    width: 'var(--ue-drawer-width)',
    loading: false,
    confirmText: '确定',
    cancelText: '取消',
    showFooter: true,
});

const emit = defineEmits<DetailDrawerEmits>();
defineSlots<DetailDrawerSlots>();

function close(): void {
    emit('update:modelValue', false);
}

function handleClosed(): void {
    emit('cancel');
}
</script>

<style>
.ue-detail-drawer.el-drawer,
.ue-detail-drawer .el-drawer {
    color: var(--ue-color-text-primary);
    background: var(--ue-color-page);
}

.ue-detail-drawer .el-drawer__header {
    min-height: 72px;
    padding: var(--ue-spacing-lg) var(--ue-spacing-xl);
    margin: 0;
    background: var(--ue-color-surface);
    border-bottom: 1px solid var(--ue-color-border-subtle);
}

.ue-detail-drawer .el-drawer__body {
    padding: 0;
}

.ue-detail-drawer .el-drawer__footer {
    padding: var(--ue-spacing-md) var(--ue-spacing-xl);
    background: var(--ue-color-surface);
    border-top: 1px solid var(--ue-color-border-subtle);
}
</style>
