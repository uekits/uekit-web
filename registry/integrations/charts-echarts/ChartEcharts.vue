<!--
    ECharts 实例的 Vue 生命周期适配器。

    组件持有图表和 ResizeObserver；主题变化时重建实例，卸载时释放全部浏览器资源。
-->
<template>
    <div
        ref="container"
        class="ue-chart-echarts min-h-[280px] w-full"
        role="img"
        :aria-label="ariaLabel"
    />
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ChartEchartsEmits, ChartEchartsProps } from './chart-echarts-types';

const props = withDefaults(defineProps<ChartEchartsProps>(), {
    theme: undefined,
    autoresize: true,
    notMerge: false,
    lazyUpdate: true,
    ariaLabel: '数据图表',
});

const emit = defineEmits<ChartEchartsEmits>();
const container = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;

function disconnectObserver(): void {
    observer?.disconnect();
    observer = undefined;
}

function configureResizeObserver(): void {
    disconnectObserver();
    if (!props.autoresize || !container.value) {
        return;
    }
    observer = new ResizeObserver(() => chart?.resize());
    observer.observe(container.value);
}

/** ECharts 主题不可在现有实例上变更，因此重建时先释放旧实例及 Observer。 */
function initializeChart(): void {
    if (!container.value) {
        return;
    }
    disconnectObserver();
    chart?.dispose();
    chart = echarts.init(container.value, props.theme);
    chart.setOption(props.option);
    configureResizeObserver();
    emit('ready', chart);
}

onMounted(() => {
    initializeChart();
});

watch(
    () => props.option,
    (option) =>
        chart?.setOption(option, {
            notMerge: props.notMerge,
            lazyUpdate: props.lazyUpdate,
        }),
);

watch(() => props.theme, initializeChart);
watch(() => props.autoresize, configureResizeObserver);

onBeforeUnmount(() => {
    disconnectObserver();
    chart?.dispose();
    chart = undefined;
});
</script>
