<!--
    高德地图 JavaScript API 的 Vue 生命周期适配器。

    异步 SDK 加载可能晚于组件卸载，因此创建实例前检查存活状态，并统一销毁组件持有的地图。
-->
<template>
    <div
        ref="container"
        class="ue-map-amap min-h-80 w-full"
        role="img"
        :aria-label="ariaLabel"
    />
</template>

<script setup lang="ts">
import AMapLoader from '@amap/amap-jsapi-loader';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { MapAmapEmits, MapAmapInstance, MapAmapProps } from './map-amap-types';

const props = withDefaults(defineProps<MapAmapProps>(), {
    securityCode: '',
    center: () => [116.397428, 39.90923],
    zoom: 12,
    mapStyle: 'amap://styles/normal',
    ariaLabel: '交互式地图',
});

const emit = defineEmits<MapAmapEmits>();
const container = ref<HTMLElement | null>(null);
let map: MapAmapInstance | undefined;
let disposed = false;
let initialization = 0;

async function initializeMap(): Promise<void> {
    const request = ++initialization;
    map?.destroy();
    map = undefined;
    try {
        if (props.securityCode) {
            // 这是高德 SDK 的进程级配置，不能在单个组件卸载时删除，以免影响其他地图实例。
            globalThis._AMapSecurityConfig = { securityJsCode: props.securityCode };
        }
        const AMap = await AMapLoader.load({ key: props.apiKey, version: '2.0' });
        if (disposed || request !== initialization || !container.value) {
            return;
        }
        const instance: MapAmapInstance = new AMap.Map(container.value, {
            center: props.center,
            zoom: props.zoom,
            mapStyle: props.mapStyle,
        });
        if (disposed || request !== initialization) {
            instance.destroy();
            return;
        }
        map = instance;
        emit('ready', map, AMap);
    } catch (error) {
        if (!disposed && request === initialization) {
            emit('error', error);
        }
    }
}

onMounted(() => {
    void initializeMap();
});

watch([() => props.apiKey, () => props.securityCode], () => void initializeMap());
watch(
    () => props.center,
    (center) => map?.setCenter(center),
);
watch(
    () => props.zoom,
    (zoom) => map?.setZoom(zoom),
);
watch(
    () => props.mapStyle,
    (style) => map?.setMapStyle(style),
);

onBeforeUnmount(() => {
    disposed = true;
    initialization += 1;
    map?.destroy();
    map = undefined;
});
</script>
