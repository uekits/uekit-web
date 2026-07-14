/**
 * UEKit Web Playground 的 Vite 配置。
 *
 * @remarks
 * 只装配 Vue、Tailwind v4 和源码别名；Registry 组件的 Element Plus 样式由组件自身显式导入。
 */

import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        host: '127.0.0.1',
    },
});
