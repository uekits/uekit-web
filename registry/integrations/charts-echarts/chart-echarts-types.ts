/**
 * ChartEcharts 的公开 Props 与 Emits 契约。
 */

import type { ECharts, EChartsOption } from 'echarts';

/** ChartEcharts 公开属性。 */
export interface ChartEchartsProps {
    /** ECharts 配置；内容变化后应替换对象引用以触发增量更新。 */
    option: EChartsOption;
    /** ECharts 已注册主题名或主题对象；变化后重建实例。 */
    theme?: string | object;
    /** 是否使用 ResizeObserver 跟随容器尺寸。 */
    autoresize?: boolean;
    /** 更新时是否丢弃已有组件状态，默认使用 ECharts 增量合并。 */
    notMerge?: boolean;
    /** 是否延迟更新绘制，默认启用。 */
    lazyUpdate?: boolean;
    /** 图表容器的无障碍名称。 */
    ariaLabel?: string;
}

/** ChartEcharts 公开事件。 */
export interface ChartEchartsEmits {
    ready: [chart: ECharts];
}
