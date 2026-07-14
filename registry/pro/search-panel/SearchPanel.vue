<!--
    查询条件、折叠摘要和操作区的组合容器。

    组件只管理展示折叠状态，不持有或重置消费方的查询字段值。
-->
<template>
    <section
        class="ue-search-panel text-foreground"
        :class="mode === 'panel' ? 'rounded-lg border border-border bg-surface' : 'bg-transparent'"
    >
        <header
            v-if="mode === 'panel' && (title || $slots.description || collapsible)"
            class="ue-search-panel__header flex items-center justify-between gap-3 border-b border-border-subtle p-4"
        >
            <div class="min-w-0">
                <strong
                    v-if="title"
                    class="font-semibold"
                    >{{ title }}</strong
                >
                <p
                    v-if="$slots.description"
                    class="mt-1 text-xs text-muted-foreground"
                >
                    <slot name="description" />
                </p>
            </div>
            <button
                v-if="collapsible"
                type="button"
                class="inline-flex min-h-[var(--ue-control-height)] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-[13px] font-medium text-foreground-regular hover:border-primary hover:text-primary"
                :aria-expanded="contentVisible"
                @click="toggleCollapsed"
            >
                <Icon :icon="collapsed ? ChevronDown : ChevronUp" />
                {{ collapsed ? '展开筛选' : '收起筛选' }}
            </button>
        </header>

        <div
            v-if="mode === 'panel' && collapsible && collapsed"
            class="ue-search-panel__summary px-4 py-3 text-sm text-muted-foreground"
        >
            <slot name="collapsedSummary">{{ summary }}</slot>
        </div>

        <div
            v-if="mode === 'embedded' || contentVisible"
            class="ue-search-panel__content flex flex-wrap items-center gap-3"
            :class="density === 'compact' || mode === 'embedded' ? 'p-0' : 'p-4'"
        >
            <div
                class="ue-search-panel__fields grid min-w-0 flex-[1_1_640px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
            >
                <slot />
            </div>
            <div
                v-if="$slots.advanced && advancedVisible"
                class="ue-search-panel__advanced grid min-w-0 flex-[1_1_100%] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
            >
                <slot name="advanced" />
            </div>
            <div class="ue-search-panel__actions flex self-end gap-2">
                <button
                    v-if="$slots.advanced && advancedCollapsible"
                    class="inline-flex min-h-[var(--ue-control-height)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-[13px] font-medium text-foreground-regular hover:border-primary hover:text-primary"
                    type="button"
                    @click="advancedCollapsed = !advancedCollapsed"
                >
                    <Icon :icon="SlidersHorizontal" />
                    {{ advancedCollapsed ? '更多筛选' : '收起更多' }}
                </button>
                <slot name="actions">
                    <button
                        class="inline-flex min-h-[var(--ue-control-height)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-primary bg-primary px-[13px] font-medium text-white hover:bg-primary-hover"
                        type="button"
                        @click="emit('search')"
                    >
                        <Icon :icon="Search" />{{ searchText }}
                    </button>
                    <button
                        class="inline-flex min-h-[var(--ue-control-height)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-[13px] font-medium text-foreground-regular hover:border-primary hover:text-primary"
                        type="button"
                        @click="emit('reset')"
                    >
                        <Icon :icon="RotateCcw" />{{ resetText }}
                    </button>
                </slot>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal } from '@lucide/vue';
import { Icon } from '@/components/ui/icon';
import { computed, ref } from 'vue';
import type { SearchPanelEmits, SearchPanelProps, SearchPanelSlots } from './search-panel-types';

const props = withDefaults(defineProps<SearchPanelProps>(), {
    title: '查询筛选',
    summary: '已收起筛选条件',
    collapsible: true,
    defaultCollapsed: false,
    searchText: '查询',
    resetText: '重置',
    density: 'standard',
    mode: 'panel',
    advancedCollapsible: false,
    defaultAdvancedCollapsed: true,
});

const emit = defineEmits<SearchPanelEmits>();
defineSlots<SearchPanelSlots>();
const collapsed = ref(props.defaultCollapsed);
const advancedCollapsed = ref(props.defaultAdvancedCollapsed);
const contentVisible = computed(() => !props.collapsible || !collapsed.value);
const advancedVisible = computed(() => !props.advancedCollapsible || !advancedCollapsed.value);

function toggleCollapsed(): void {
    collapsed.value = !collapsed.value;
    emit('collapse', collapsed.value);
}
</script>
