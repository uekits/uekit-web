<!--
    CLI npm 包冒烟测试的最小消费页面。

    组件源码由测试中的 CLI 安装，页面仅验证导入、类型和构建链可用。
-->
<template>
    <main>
        <Avatar name="UEKit" />
        <Button
            type="primary"
            @click="detailVisible = true"
            >Open detail</Button
        >
        <ProTable
            title="Users"
            :data="rows"
            :columns="columns"
            :total="rows.length"
        />
        <DetailDrawer
            v-model="detailVisible"
            title="User detail"
            :show-footer="false"
        >
            UEKit consumer smoke
        </DetailDrawer>
    </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DetailDrawer } from '@/components/pro/detail-drawer';
import { ProTable, type TableColumn } from '@/components/pro/pro-table';

interface UserRow {
    id: number;
    name: string;
    account: string;
}

const detailVisible = ref(false);
const rows: UserRow[] = [{ id: 1, name: 'UEKit', account: 'uekit-dev' }];
const columns: TableColumn<UserRow>[] = [
    { label: 'Name', prop: 'name' },
    { label: 'Account', prop: 'account' },
];
</script>
