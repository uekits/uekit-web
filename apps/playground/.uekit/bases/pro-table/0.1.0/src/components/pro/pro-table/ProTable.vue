<!--
    企业数据表格外壳。

    支持客户端或服务端分页、动态列插槽与全屏展示；数据请求和选中状态由消费方持有。
-->
<template>
    <section
        class="ue-pro-table relative min-w-0 overflow-hidden rounded-lg border border-border bg-surface text-foreground"
        :class="
            isFullscreen
                ? 'fixed inset-3 z-[var(--ue-z-index-dialog)] flex flex-col shadow-dialog'
                : ''
        "
    >
        <header
            class="ue-pro-table__header flex min-h-[52px] items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5"
        >
            <div class="min-w-0">
                <strong class="font-semibold">{{ title }}</strong>
                <p
                    v-if="description"
                    class="mt-[3px] text-xs text-muted-foreground"
                >
                    {{ description }}
                </p>
            </div>
            <div class="ue-pro-table__actions flex shrink-0 items-center gap-2">
                <slot name="actions" />
                <button
                    class="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-foreground-regular hover:bg-primary-soft hover:text-primary"
                    type="button"
                    aria-label="刷新表格"
                    @click="emit('refresh')"
                >
                    <Icon :icon="RotateCw" />
                </button>
                <button
                    type="button"
                    class="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-foreground-regular hover:bg-primary-soft hover:text-primary"
                    :aria-label="isFullscreen ? '退出全屏' : '全屏表格'"
                    @click="toggleFullscreen"
                >
                    <Icon :icon="isFullscreen ? Minimize2 : Maximize2" />
                </button>
            </div>
        </header>

        <div class="ue-pro-table__body relative min-h-40 flex-1">
            <ElTable
                :data="rows"
                :row-key="rowKey"
                :table-layout="tableLayout"
                :border="border"
                :height="height"
                :max-height="maxHeight"
                @selection-change="(selection: unknown[]) => emit('selectionChange', selection)"
            >
                <ElTableColumn
                    v-for="(column, columnIndex) in columns"
                    :key="String(column.prop ?? column.slot ?? columnIndex)"
                    :prop="column.prop ? String(column.prop) : undefined"
                    :label="column.label"
                    :type="column.type"
                    :width="column.width"
                    :min-width="column.minWidth"
                    :fixed="column.fixed"
                    :align="column.align"
                    :header-align="column.headerAlign"
                    :show-overflow-tooltip="column.showOverflowTooltip ?? showOverflowTooltip"
                >
                    <template
                        v-if="column.slot || column.formatter"
                        #default="scope"
                    >
                        <slot
                            v-if="column.slot"
                            :name="column.slot"
                            v-bind="scope"
                        />
                        <span v-else>{{ cellValue(scope.row, column, scope.$index) }}</span>
                    </template>
                </ElTableColumn>
                <template #empty>
                    <div
                        class="ue-pro-table__empty grid justify-items-center gap-1 px-4 py-[42px] text-muted-foreground"
                    >
                        <strong class="font-semibold">{{ emptyTitle }}</strong>
                        <span class="text-xs">{{ emptyDescription }}</span>
                    </div>
                </template>
            </ElTable>
            <div
                v-if="loading"
                class="ue-pro-table__loading absolute inset-0 grid place-items-center bg-surface/65"
                aria-label="正在加载"
            >
                <span
                    class="size-6 animate-spin rounded-full border-2 border-border border-t-primary"
                />
            </div>
        </div>

        <footer
            v-if="pagination && effectiveTotal > 0"
            class="ue-pro-table__footer flex min-h-[52px] items-center justify-between gap-3 border-t border-border-subtle px-4 py-2 text-xs text-muted-foreground max-[640px]:flex-col max-[640px]:items-start"
        >
            <span>共 {{ effectiveTotal }} 条</span>
            <ElPagination
                :current-page="currentPage"
                :page-size="pageSize"
                :page-sizes="pageSizes"
                :total="effectiveTotal"
                layout="sizes, prev, pager, next, jumper"
                background
                @update:current-page="updatePage"
                @update:page-size="updatePageSize"
            />
        </footer>
    </section>
</template>

<script setup lang="ts" generic="Row extends object = Record<string, unknown>">
import { Maximize2, Minimize2, RotateCw } from '@lucide/vue';
import { Icon } from '@/components/ui/icon';
import { ElPagination, ElTable, ElTableColumn } from 'element-plus';
import 'element-plus/es/components/pagination/style/css';
import 'element-plus/es/components/table/style/css';
import 'element-plus/es/components/table-column/style/css';
import { computed, ref } from 'vue';
import type { ProTableEmits, ProTableProps, ProTableSlots, TableColumn } from './table-types';

const props = withDefaults(defineProps<ProTableProps<Row>>(), {
    description: '',
    total: 0,
    loading: false,
    data: () => [],
    columns: () => [],
    rowKey: 'id',
    tableLayout: 'auto',
    showOverflowTooltip: true,
    border: false,
    height: undefined,
    maxHeight: undefined,
    pagination: false,
    paginationMode: 'client',
    currentPage: 1,
    pageSize: 10,
    pageSizes: () => [10, 20, 50],
    emptyTitle: '暂无数据',
    emptyDescription: '当前筛选条件下没有可展示的数据。',
});

const emit = defineEmits<ProTableEmits>();
defineSlots<ProTableSlots<Row>>();

const isFullscreen = ref(false);
const effectiveTotal = computed(() => props.total || props.data.length);
const rows = computed(() => {
    if (!props.pagination || props.paginationMode === 'server') return props.data;
    const start = (props.currentPage - 1) * props.pageSize;
    return props.data.slice(start, start + props.pageSize);
});

function cellValue(row: Row, column: TableColumn<Row>, index: number): unknown {
    const value: unknown = column.prop ? Reflect.get(row, String(column.prop)) : undefined;
    return column.formatter ? column.formatter(row, column, value, index) : (value ?? '-');
}

function updatePage(page: number): void {
    emit('update:currentPage', page);
    emit('pageChange', { currentPage: page, pageSize: props.pageSize });
}

function updatePageSize(size: number): void {
    emit('update:pageSize', size);
    emit('update:currentPage', 1);
    emit('pageChange', { currentPage: 1, pageSize: size });
}

function toggleFullscreen(): void {
    isFullscreen.value = !isFullscreen.value;
    emit('fullscreen', isFullscreen.value);
}
</script>

<style scoped>
.ue-pro-table__body :deep(.el-table) {
    --el-table-header-bg-color: var(--ue-color-surface-muted);
    --el-table-tr-bg-color: var(--ue-color-surface);
    --el-table-bg-color: var(--ue-color-surface);
    --el-table-row-hover-bg-color: var(--ue-color-primary-soft);
    --el-table-border-color: var(--ue-color-border-subtle);

    color: var(--ue-color-text-regular);
    background: var(--ue-color-surface);
}

.ue-pro-table__body :deep(.el-table tr),
.ue-pro-table__body :deep(.el-table td.el-table__cell),
.ue-pro-table__body :deep(.el-table__fixed-right-patch) {
    background-color: var(--ue-color-surface);
}

.ue-pro-table__body :deep(.el-table__body tr:hover > td.el-table__cell) {
    background: var(--ue-color-primary-soft);
}

.ue-pro-table__body :deep(.el-table th.el-table__cell) {
    height: 42px;
    color: var(--ue-color-text-secondary);
    font-weight: var(--ue-font-weight-semibold);
}

.ue-pro-table__body :deep(.el-table td.el-table__cell) {
    min-height: 52px;
}

.ue-pro-table__footer :deep(.el-select__wrapper),
.ue-pro-table__footer :deep(.el-input__wrapper) {
    color: var(--ue-color-text-regular);
    background: var(--ue-color-surface-muted);
    box-shadow: 0 0 0 1px var(--ue-color-border) inset;
}

@media (width <= 640px) {
    .ue-pro-table__footer :deep(.el-pagination__sizes),
    .ue-pro-table__footer :deep(.el-pagination__jump) {
        display: none;
    }
}
</style>
