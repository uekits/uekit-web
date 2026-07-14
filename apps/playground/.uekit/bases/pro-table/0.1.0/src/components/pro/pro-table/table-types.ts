/**
 * ProTable 的公开列配置类型。
 */

/** 表格单元格支持的水平对齐方式。 */
export type TableAlign = 'left' | 'center' | 'right';

/** ProTable 的声明式列配置。 */
export interface TableColumn<Row = Record<string, unknown>> {
    label?: string;
    prop?: keyof Row | string;
    /** 命名作用域插槽；插槽优先于 formatter。 */
    slot?: string;
    type?: 'selection' | 'index' | 'expand';
    width?: number | string;
    minWidth?: number | string;
    fixed?: boolean | 'left' | 'right';
    align?: TableAlign;
    headerAlign?: TableAlign;
    showOverflowTooltip?: boolean;
    /** 返回单元格展示文本；未配置时按 prop 读取行字段。 */
    formatter?: (row: Row, column: TableColumn<Row>, value: unknown, index: number) => string;
}

/** ProTable 公开属性。 */
export interface ProTableProps<Row extends object> {
    title: string;
    description?: string;
    total?: number;
    loading?: boolean;
    data?: Row[];
    columns?: TableColumn<Row>[];
    rowKey?: string;
    tableLayout?: 'fixed' | 'auto';
    showOverflowTooltip?: boolean;
    border?: boolean;
    height?: string | number;
    maxHeight?: string | number;
    pagination?: boolean;
    paginationMode?: 'client' | 'server';
    currentPage?: number;
    pageSize?: number;
    pageSizes?: number[];
    emptyTitle?: string;
    emptyDescription?: string;
}

/** ProTable 公开事件。 */
export interface ProTableEmits {
    refresh: [];
    fullscreen: [active: boolean];
    selectionChange: [rows: unknown[]];
    'update:currentPage': [page: number];
    'update:pageSize': [size: number];
    pageChange: [payload: { currentPage: number; pageSize: number }];
}

/** 动态单元格插槽收到的行上下文。 */
export interface ProTableSlotProps<Row extends object> {
    row: Row;
    column: unknown;
    $index: number;
}

/** ProTable 工具栏和动态单元格插槽。 */
export type ProTableSlots<Row extends object> = {
    actions?: () => unknown;
} & Record<string, (props: ProTableSlotProps<Row>) => unknown>;
