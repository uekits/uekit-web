/**
 * 消费项目 Vite 配置的 Tailwind v4 适配器。
 *
 * @remarks
 * 仅在能识别的 Vite 结构中执行幂等文本变换；无法安全定位时要求用户手工处理。
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hasFile } from './config.js';
import { assertSafeProjectPath } from './fs-utils.js';

const viteConfigCandidates = [
    'vite.config.ts',
    'vite.config.mts',
    'vite.config.js',
    'vite.config.mjs',
];
const importStatement = "import tailwindcss from '@tailwindcss/vite';";

function addTailwindPlugin(content: string, file: string): string {
    let next = content;
    if (!next.includes('@tailwindcss/vite')) {
        next = `${importStatement}\n${next}`;
    }
    if (/\btailwindcss\s*\(\s*\)/.test(next)) {
        return next;
    }

    const pluginsPattern = /(plugins\s*:\s*\[)([\s\S]*?)(\])/m;
    if (pluginsPattern.test(next)) {
        return next.replace(pluginsPattern, (_, start: string, plugins: string, end: string) => {
            const entries = plugins.trim().replace(/,\s*$/, '');
            return `${start}${entries ? `${entries}, tailwindcss()` : 'tailwindcss()'}${end}`;
        });
    }

    const defineConfigPattern = /(defineConfig\s*\(\s*\{)/m;
    if (defineConfigPattern.test(next)) {
        return next.replace(defineConfigPattern, '$1\n    plugins: [tailwindcss()],');
    }

    throw new Error(
        `${file} 的结构无法安全自动修改。请在 Vite plugins 中加入 tailwindcss() 后重新运行。`,
    );
}

/**
 * 将 Tailwind Vite 插件加入消费项目配置。
 *
 * @returns 被修改或已配置的 Vite 文件名。
 */
export async function configureTailwindVite(cwd: string): Promise<string> {
    for (const candidate of viteConfigCandidates) {
        const file = path.join(cwd, candidate);
        if (!(await hasFile(file))) continue;
        await assertSafeProjectPath(cwd, file, 'Vite 配置路径');
        const content = await readFile(file, 'utf8');
        const next = addTailwindPlugin(content, candidate);
        if (next !== content) {
            await writeFile(file, next, 'utf8');
        }
        return candidate;
    }
    throw new Error(
        '未找到 vite.config.ts/js。UEKit Web 当前要求 Vue + Vite，请先创建 Vite 配置。',
    );
}
