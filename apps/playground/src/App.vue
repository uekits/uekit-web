<!--
    UEKit Web 组件联调演示页。

    仅提供共享组件链的交互样例，不作为 Registry 源码或业务状态管理实现。
-->
<template>
    <main class="playground-shell">
        <header class="playground-header">
            <div>
                <p class="playground-eyebrow">Universal Enterprise Kit</p>
                <h1>UEKit Web Components</h1>
                <p>Theme, icons and reusable enterprise interaction shells.</p>
            </div>
            <Button
                aria-label="Toggle color theme"
                @click="toggleTheme"
            >
                <Icon
                    :icon="isDark ? Sun : Moon"
                    :size="17"
                />
                {{ isDark ? 'Light' : 'Dark' }}
            </Button>
        </header>

        <section
            class="playground-status"
            aria-label="Workspace status"
        >
            <Avatar
                name="UEKit"
                :size="42"
            />
            <div>
                <strong>First validated component chain</strong>
                <span>Shared user-management building blocks.</span>
            </div>
            <StatusTag
                label="Ready"
                tone="success"
            />
        </section>

        <section class="component-section">
            <div class="component-section__heading">
                <div>
                    <h2>User management</h2>
                    <p>
                        Search, table, status, detail drawer and form dialog use one public
                        contract.
                    </p>
                </div>
                <div class="component-section__actions">
                    <Button @click="drawerVisible = true">Open detail</Button>
                    <Button
                        type="primary"
                        @click="dialogVisible = true"
                        >Create user</Button
                    >
                </div>
            </div>

            <SearchPanel
                mode="embedded"
                density="compact"
                :collapsible="false"
            >
                <label class="playground-field">
                    <span>Keyword</span>
                    <input
                        v-model="keyword"
                        placeholder="Name / account"
                    />
                </label>
                <label class="playground-field">
                    <span>Status</span>
                    <select>
                        <option>All statuses</option>
                        <option>Enabled</option>
                        <option>Disabled</option>
                    </select>
                </label>
            </SearchPanel>

            <ProTable
                title="Users"
                :data="users"
                :columns="columns"
                :total="users.length"
                row-key="id"
                pagination
            >
                <template #identity="{ row }">
                    <div class="user-identity">
                        <Avatar
                            :name="row.name"
                            :size="36"
                        />
                        <div>
                            <strong>{{ row.name }}</strong
                            ><span>{{ row.account }}</span>
                        </div>
                    </div>
                </template>
                <template #status="{ row }">
                    <StatusTag
                        :label="row.status === 'enabled' ? 'Enabled' : 'Disabled'"
                        :tone="row.status === 'enabled' ? 'success' : 'danger'"
                    />
                </template>
                <template #operation="{ row }">
                    <button
                        class="text-action"
                        type="button"
                        @click="drawerVisible = true"
                    >
                        View {{ row.name }}
                    </button>
                </template>
            </ProTable>
        </section>

        <DetailDrawer
            v-model="drawerVisible"
            title="User detail"
            description="Account, role and status."
            :show-footer="false"
        >
            <div class="demo-detail">
                <Avatar
                    name="林晓"
                    :size="58"
                />
                <div>
                    <h3>林晓</h3>
                    <p>linxiao · System administrator</p>
                </div>
                <StatusTag
                    label="Enabled"
                    tone="success"
                />
            </div>
        </DetailDrawer>

        <FormDialog
            v-model="dialogVisible"
            title="Create user"
            description="Maintain account and role information."
            :width="720"
            :height="520"
        >
            <div class="demo-form">
                <label class="playground-field"
                    ><span>Name</span><input placeholder="Enter name"
                /></label>
                <label class="playground-field"
                    ><span>Account</span><input placeholder="Enter account"
                /></label>
                <label class="playground-field"
                    ><span>Role</span
                    ><select>
                        <option>System administrator</option>
                    </select></label
                >
            </div>
        </FormDialog>
    </main>
</template>

<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { DetailDrawer } from '@/components/pro/detail-drawer';
import { FormDialog } from '@/components/pro/form-dialog';
import { ProTable, type TableColumn } from '@/components/pro/pro-table';
import { SearchPanel } from '@/components/pro/search-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StatusTag } from '@/components/ui/status-tag';
import { ref } from 'vue';

interface UserRow {
    id: number;
    name: string;
    account: string;
    role: string;
    status: 'enabled' | 'disabled';
}

const isDark = ref(false);
const drawerVisible = ref(false);
const dialogVisible = ref(false);
const keyword = ref('');
const users: UserRow[] = [
    { id: 1, name: '林晓', account: 'linxiao', role: '系统管理员', status: 'enabled' },
    { id: 2, name: '周明', account: 'zhouming', role: '项目管理员', status: 'enabled' },
    { id: 3, name: '陈安', account: 'chenan', role: '资料维护员', status: 'disabled' },
];
const columns: TableColumn<UserRow>[] = [
    { label: '用户信息', slot: 'identity', minWidth: 220 },
    { label: '角色', prop: 'role', minWidth: 160 },
    { label: '状态', slot: 'status', width: 120, align: 'center', headerAlign: 'center' },
    { label: '操作', slot: 'operation', width: 120, align: 'center', headerAlign: 'center' },
];

function toggleTheme(): void {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle('dark', isDark.value);
}
</script>
