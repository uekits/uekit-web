<!--
    表单编辑场景的受控对话框容器。

    组件管理临时全屏状态，表单数据、提交结果和可见性最终由消费方持有。
-->
<template>
    <ElDialog
        class="ue-form-dialog"
        :model-value="modelValue"
        :width="dialogWidth"
        :fullscreen="fullscreen"
        :style="dialogStyle"
        :draggable="draggable && !fullscreen"
        :close-on-click-modal="closeOnOverlay"
        append-to-body
        destroy-on-close
        align-center
        @update:model-value="(visible: boolean) => emit('update:modelValue', visible)"
        @close="handleClosed"
    >
        <template #header>
            <div class="ue-form-dialog__header flex items-start justify-between gap-3 pr-7">
                <div class="min-w-0">
                    <strong class="text-lg font-semibold">{{ title }}</strong>
                    <p
                        v-if="description"
                        class="mt-[5px] text-sm text-muted-foreground"
                    >
                        {{ description }}
                    </p>
                </div>
                <button
                    type="button"
                    class="grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-primary-soft hover:text-primary"
                    :aria-label="fullscreen ? '还原窗口' : '全屏窗口'"
                    @click="fullscreen = !fullscreen"
                >
                    <Icon :icon="fullscreen ? Minimize2 : Expand" />
                </button>
            </div>
        </template>
        <div
            class="ue-form-dialog__body relative max-h-[calc(100vh-190px)] overflow-auto p-6"
            :style="bodyStyle"
        >
            <div
                v-if="loading"
                class="ue-form-dialog__loading absolute inset-0 z-[2] grid place-items-center bg-primary-soft/40 text-primary"
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
                    :loading="loading"
                    @click="emit('confirm')"
                    >{{ confirmText }}</ElButton
                >
            </slot>
        </template>
    </ElDialog>
</template>

<script setup lang="ts">
import { Expand, LoaderCircle, Minimize2 } from '@lucide/vue';
import { Icon } from '@/components/ui/icon';
import { ElButton, ElDialog } from 'element-plus';
import 'element-plus/es/components/button/style/css';
import 'element-plus/es/components/dialog/style/css';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { FormDialogEmits, FormDialogProps, FormDialogSlots } from './form-dialog-types';

const props = withDefaults(defineProps<FormDialogProps>(), {
    description: '',
    width: 860,
    height: 680,
    minWidth: 560,
    minHeight: 420,
    draggable: true,
    showFooter: true,
    loading: false,
    confirmText: '确定',
    cancelText: '取消',
    closeOnOverlay: false,
});

const emit = defineEmits<FormDialogEmits>();
defineSlots<FormDialogSlots>();
const fullscreen = ref(false);
const viewportWidth = ref(props.width + 48);
const availableWidth = computed(() => Math.max(viewportWidth.value - 48, 0));
const dialogWidth = computed(
    () => `${Math.min(Math.max(props.width, props.minWidth), availableWidth.value)}px`,
);
const dialogStyle = computed(() => ({
    '--ue-form-dialog-min-width': `${props.minWidth}px`,
}));
const bodyStyle = computed(() => ({
    minHeight: `${props.minHeight - 180}px`,
    height: fullscreen.value ? 'auto' : `${Math.max(props.height - 180, 240)}px`,
}));

watch(
    () => props.modelValue,
    (visible) => {
        if (!visible) fullscreen.value = false;
    },
);

function updateViewportWidth(): void {
    viewportWidth.value = globalThis.innerWidth || props.width + 48;
}

onMounted(() => {
    updateViewportWidth();
    globalThis.addEventListener('resize', updateViewportWidth);
});

onBeforeUnmount(() => {
    globalThis.removeEventListener('resize', updateViewportWidth);
});

function close(): void {
    emit('update:modelValue', false);
}

function handleClosed(): void {
    emit('cancel');
}
</script>

<style>
.ue-form-dialog.el-dialog {
    max-width: calc(100vw - 48px);
    min-width: min(var(--ue-form-dialog-min-width), calc(100vw - 48px));
    overflow: hidden;
    color: var(--ue-color-text-primary);
    background: var(--ue-color-page);
    border: 1px solid var(--ue-color-border);
    border-radius: var(--ue-radius-xl);
    box-shadow: var(--ue-shadow-dialog);
}

.ue-form-dialog .el-dialog__header,
.ue-form-dialog .el-dialog__footer {
    padding: var(--ue-spacing-lg) var(--ue-spacing-xl);
    margin: 0;
    background: var(--ue-color-surface);
}

.ue-form-dialog .el-dialog__header {
    border-bottom: 1px solid var(--ue-color-border-subtle);
}

.ue-form-dialog .el-dialog__footer {
    border-top: 1px solid var(--ue-color-border-subtle);
}

.ue-form-dialog .el-dialog__body {
    padding: 0;
}
</style>
