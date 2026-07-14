/**
 * 关键公共组件的事件次数、动态属性与第三方实例生命周期回归测试。
 */

// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChartEcharts from '../../registry/integrations/charts-echarts/ChartEcharts.vue';
import MapAmap from '../../registry/integrations/map-amap/MapAmap.vue';
import DetailDrawer from '../../registry/pro/detail-drawer/DetailDrawer.vue';
import FormDialog from '../../registry/pro/form-dialog/FormDialog.vue';

const amapMocks = vi.hoisted(() => {
    const instances: Array<{
        destroy: ReturnType<typeof vi.fn>;
        setCenter: ReturnType<typeof vi.fn>;
        setMapStyle: ReturnType<typeof vi.fn>;
        setZoom: ReturnType<typeof vi.fn>;
    }> = [];
    class MapInstance {
        destroy = vi.fn();
        setCenter = vi.fn();
        setZoom = vi.fn();
        setMapStyle = vi.fn();

        constructor() {
            instances.push(this);
        }
    }
    return {
        instances,
        load: vi.fn(async () => ({ Map: MapInstance })),
    };
});

const echartsMocks = vi.hoisted(() => ({
    chart: {
        setOption: vi.fn(),
        resize: vi.fn(),
        dispose: vi.fn(),
    },
    init: vi.fn(),
}));

vi.mock('@amap/amap-jsapi-loader', () => ({
    default: { load: amapMocks.load },
}));

vi.mock('echarts', () => ({
    init: echartsMocks.init,
}));

const overlayStub = defineComponent({
    name: 'OverlayStub',
    props: {
        modelValue: Boolean,
        title: String,
        width: String,
    },
    emits: ['close', 'update:modelValue'],
    template: '<div><slot /><slot name="footer" /></div>',
});
const buttonStub = defineComponent({
    name: 'ElButton',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
});

function overlayStubs() {
    return {
        ElDialog: overlayStub,
        ElDrawer: overlayStub,
        ElButton: buttonStub,
        Icon: true,
    };
}

describe('Dialog and Drawer contracts', () => {
    it('emits cancel exactly once after the FormDialog cancel button closes', async () => {
        const wrapper = mount(FormDialog, {
            props: { modelValue: true, title: '编辑' },
            global: { stubs: overlayStubs() },
        });

        const cancelButton = wrapper.findAll('button').find((button) => button.text() === '取消');
        expect(cancelButton).toBeDefined();
        await cancelButton!.trigger('click');
        expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
        expect(wrapper.emitted('cancel')).toBeUndefined();
        wrapper.getComponent(overlayStub).vm.$emit('close');
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('cancel')).toHaveLength(1);
    });

    it('emits cancel exactly once after the DetailDrawer cancel button closes', async () => {
        const wrapper = mount(DetailDrawer, {
            props: { modelValue: true, title: '详情' },
            global: { stubs: overlayStubs() },
        });

        await wrapper.get('button:first-of-type').trigger('click');
        expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
        expect(wrapper.emitted('cancel')).toBeUndefined();
        wrapper.getComponent(overlayStub).vm.$emit('close');
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('cancel')).toHaveLength(1);
    });

    it('applies minWidth and responds to viewport resize', async () => {
        Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 800 });
        const wrapper = mount(FormDialog, {
            props: { modelValue: true, title: '编辑', width: 600, minWidth: 900 },
            global: { stubs: overlayStubs() },
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.getComponent(overlayStub).props('width')).toBe('752px');

        Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 1200 });
        globalThis.dispatchEvent(new Event('resize'));
        await wrapper.vm.$nextTick();
        expect(wrapper.getComponent(overlayStub).props('width')).toBe('900px');
    });
});

describe('Map and chart lifecycles', () => {
    beforeEach(() => {
        amapMocks.instances.length = 0;
        amapMocks.load.mockClear();
        amapMocks.load.mockReset();
        echartsMocks.chart.setOption.mockClear();
        echartsMocks.chart.resize.mockClear();
        echartsMocks.chart.dispose.mockClear();
        echartsMocks.init.mockReset();
        echartsMocks.init.mockReturnValue(echartsMocks.chart);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('updates dynamic map props, rebuilds credentials and emits initialization errors', async () => {
        class MapInstance {
            destroy = vi.fn();
            setCenter = vi.fn();
            setZoom = vi.fn();
            setMapStyle = vi.fn();

            constructor() {
                amapMocks.instances.push(this);
            }
        }
        amapMocks.load.mockResolvedValue({ Map: MapInstance });
        const wrapper = mount(MapAmap, { props: { apiKey: 'key-one' } });
        await flushPromises();
        const first = amapMocks.instances[0];
        expect(wrapper.emitted('ready')).toHaveLength(1);

        await wrapper.setProps({ center: [120, 30], zoom: 15, mapStyle: 'amap://styles/dark' });
        expect(first.setCenter).toHaveBeenCalledWith([120, 30]);
        expect(first.setZoom).toHaveBeenCalledWith(15);
        expect(first.setMapStyle).toHaveBeenCalledWith('amap://styles/dark');

        await wrapper.setProps({ apiKey: 'key-two' });
        await flushPromises();
        expect(first.destroy).toHaveBeenCalledOnce();
        expect(amapMocks.load).toHaveBeenCalledTimes(2);

        const failure = new Error('loader failed');
        amapMocks.load.mockRejectedValueOnce(failure);
        await wrapper.setProps({ apiKey: 'key-three' });
        await flushPromises();
        expect(wrapper.emitted('error')?.at(-1)).toEqual([failure]);
        wrapper.unmount();
    });

    it('uses shallow incremental chart updates and releases observer and chart', async () => {
        const disconnect = vi.fn();
        const observe = vi.fn();
        vi.stubGlobal(
            'ResizeObserver',
            class ResizeObserverMock {
                observe = observe;
                disconnect = disconnect;
            },
        );
        const option = { series: [{ type: 'bar', data: [1] }] };
        const wrapper = mount(ChartEcharts, { props: { option } });
        await wrapper.vm.$nextTick();
        expect(echartsMocks.init).toHaveBeenCalledOnce();
        expect(observe).toHaveBeenCalledOnce();

        const nextOption = { series: [{ type: 'bar', data: [2] }] };
        await wrapper.setProps({ option: nextOption });
        expect(echartsMocks.chart.setOption).toHaveBeenLastCalledWith(nextOption, {
            notMerge: false,
            lazyUpdate: true,
        });
        wrapper.unmount();
        expect(disconnect).toHaveBeenCalled();
        expect(echartsMocks.chart.dispose).toHaveBeenCalled();
    });
});
