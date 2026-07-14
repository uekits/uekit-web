/**
 * UEKit Web 的 Vitest 配置。
 *
 * @remarks
 * 当前测试覆盖 CLI 与 Registry 行为，固定使用 Node 环境；未来 Vue DOM 测试应使用独立项目配置。
 */

import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@/components/ui/icon': path.resolve('registry/foundation/icon/index.ts'),
        },
    },
    test: {
        environment: 'node',
        include: ['tests/unit/**/*.test.ts', 'packages/cli/tests/**/*.test.ts'],
        server: {
            deps: {
                inline: ['element-plus'],
            },
        },
    },
});
