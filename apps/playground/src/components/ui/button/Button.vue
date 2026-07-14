<!--
    UEKit 基础按钮外壳。

    保留 Element Plus 的交互语义和属性透传，仅统一常用类型、默认值与视觉基线。
-->
<template>
    <ElButton
        class="ue-button font-medium"
        :type="type"
        :size="size"
        :native-type="nativeType"
        :loading="loading"
        :disabled="disabled"
        :plain="plain"
        :text="text"
        :link="link"
    >
        <slot />
    </ElButton>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus';
import 'element-plus/es/components/button/style/css';
import type { ButtonProps, ButtonSlots } from './button-types';

withDefaults(defineProps<ButtonProps>(), {
    type: 'default',
    size: 'default',
    nativeType: 'button',
    loading: false,
    disabled: false,
    plain: false,
    text: false,
    link: false,
});
defineSlots<ButtonSlots>();
</script>
