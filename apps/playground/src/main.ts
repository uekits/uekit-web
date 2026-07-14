/**
 * Playground 浏览器应用入口。
 *
 * @remarks
 * 显式加载 UEKit 主题、Element Plus 暗色变量和演示页局部样式。
 */

import '@/styles/uekit.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import './style.css';

import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
