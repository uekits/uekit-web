/**
 * CLI 消费项目 Fixture 的最小 Vite 配置。
 *
 * @remarks
 * 保留标准 Vue 插件和 `@` 别名，供 CLI 注入 Tailwind 插件并安装 Registry 源码。
 */

import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
