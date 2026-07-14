/**
 * MapAmap 的公开 Props、Emits 与实例契约。
 */

/** 组件依赖的最小高德地图实例能力。 */
export interface MapAmapInstance {
    destroy: () => void;
    setCenter: (center: [number, number]) => void;
    setZoom: (zoom: number) => void;
    setMapStyle: (style: string) => void;
}

/** MapAmap 公开属性。 */
export interface MapAmapProps {
    /** 高德地图 Web 端 Key；变化时组件会销毁并重新初始化地图。 */
    apiKey: string;
    /** 安全密钥；变化时组件会销毁并重新初始化地图。 */
    securityCode?: string;
    /** 地图中心点；变化时调用实例 `setCenter`。 */
    center?: [number, number];
    /** 地图缩放级别；变化时调用实例 `setZoom`。 */
    zoom?: number;
    /** 地图样式；变化时调用实例 `setMapStyle`。 */
    mapStyle?: string;
    /** 地图容器的无障碍名称。 */
    ariaLabel?: string;
}

/** MapAmap 公开事件。 */
export interface MapAmapEmits {
    ready: [map: MapAmapInstance, AMap: unknown];
    error: [error: unknown];
}
