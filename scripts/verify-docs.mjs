/**
 * UEKit 文档入口、相对链接和本地锚点完整性检查。
 */

import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ignoredDirectories = new Set([
    '.git',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
]);
const requiredDocuments = [
    'README.md',
    'docs/README.md',
    'docs/UEKit-Web技术白皮书.md',
    'docs/guides/快速开始.md',
    'docs/architecture/整体架构.md',
    'docs/reference/CLI命令参考.md',
    'docs/testing/发布前验收清单.md',
];

async function exists(file) {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

async function collectMarkdown(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...(await collectMarkdown(absolute)));
        else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute);
    }
    return files;
}

function normalizeLink(raw) {
    let target = raw.trim();
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    const titleSeparator = target.match(/\s+["'][^"']*["']$/);
    if (titleSeparator) target = target.slice(0, titleSeparator.index).trim();
    return target;
}

const errors = [];
for (const required of requiredDocuments) {
    if (!(await exists(path.join(root, required)))) errors.push(`缺少必要文档：${required}`);
}

const markdownFiles = await collectMarkdown(root);
const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
    const source = await readFile(file, 'utf8');
    const relativeFile = path.relative(root, file);
    for (const match of source.matchAll(markdownLink)) {
        const target = normalizeLink(match[1]);
        if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
        const withoutAnchor = target.split('#', 1)[0].split('?', 1)[0];
        if (!withoutAnchor) continue;
        let decoded;
        try {
            decoded = decodeURIComponent(withoutAnchor);
        } catch {
            errors.push(`${relativeFile} 包含无法解码的链接：${target}`);
            continue;
        }
        const resolved = path.resolve(path.dirname(file), decoded);
        if (!(await exists(resolved))) errors.push(`${relativeFile} 存在失效链接：${target}`);
    }
}

if (errors.length) {
    console.error(`文档校验失败（${errors.length} 项）：`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
} else {
    console.log(`文档校验通过：已检查 ${markdownFiles.length} 个 Markdown 文件。`);
}
