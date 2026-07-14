#!/usr/bin/env node

/**
 * UEKit Web 正式源码文件头检查。
 *
 * @remarks
 * TSDoc 规则只能校验已有注释的语法；本脚本补充检查 TS、Vue、样式、脚本和配置文件是否存在有效文件头。
 */

import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDirectory = process.cwd();
const targetRoots = ['apps', 'packages', 'registry', 'scripts', 'tests'];
const rootFiles = [
    '.prettierrc.cjs',
    'eslint.config.js',
    'playwright.config.ts',
    'stylelint.config.js',
    'vitest.config.ts',
];
const supportedExtensions = new Set([
    '.cjs',
    '.css',
    '.js',
    '.jsx',
    '.mjs',
    '.scss',
    '.ts',
    '.tsx',
    '.vue',
]);
const ignoredSegments = new Set([
    '.git',
    '.husky',
    '.uekit',
    'coverage',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
]);
const ignoredPrefixes = [
    'apps/playground/src/components/pro/',
    'apps/playground/src/components/ui/',
    'apps/playground/src/layouts/',
    'apps/playground/src/blocks/',
    'apps/playground/src/integrations/',
    'apps/playground/src/styles/uekit.css',
    'apps/registry-server/public/',
];
const placeholderPatterns = [/TODO/i, /FIXME/i, /待补充/, /文件用途/, /your description/i];
const sensitivePatterns = [
    /(?:password|token|secret|api[_-]?key)\s*[:=]\s*['"]?\S/i,
    /(?:密码|密钥|令牌)\s*[:：=]\s*\S/,
];

function toPosixPath(filePath) {
    return filePath.split(path.sep).join('/');
}

function isIgnored(filePath) {
    const relativePath = toPosixPath(path.relative(rootDirectory, filePath));
    return (
        filePath.split(path.sep).some((segment) => ignoredSegments.has(segment)) ||
        ignoredPrefixes.some((prefix) => relativePath.startsWith(prefix))
    );
}

async function pathExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function collectFiles(directory) {
    if (!(await pathExists(directory))) return [];

    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (isIgnored(fullPath)) continue;

        if (entry.isDirectory()) {
            files.push(...(await collectFiles(fullPath)));
        } else if (supportedExtensions.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }

    return files;
}

function extractHeader(filePath, content) {
    const normalized = content.replace(/^\uFEFF/, '');
    const extension = path.extname(filePath);

    if (extension === '.vue') {
        return normalized.match(/^\s*<!--([\s\S]*?)-->/)?.[1] ?? null;
    }

    if (extension === '.css' || extension === '.scss') {
        return normalized.match(/^\s*\/\*([\s\S]*?)\*\//)?.[1] ?? null;
    }

    const withoutShebang = normalized.replace(/^#!.*\n/, '');
    const withoutReferences = withoutShebang.replace(
        /^(?:\s*\/\/\/\s*<reference[^\n]*\/>\s*\n)+/,
        '',
    );
    return withoutReferences.match(/^\s*\/\*\*([\s\S]*?)\*\//)?.[1] ?? null;
}

function normalizeHeader(header) {
    return header
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trim())
        .filter(Boolean)
        .join('\n')
        .trim();
}

function validateHeader(filePath, header) {
    const relativePath = toPosixPath(path.relative(rootDirectory, filePath));

    if (!header) return `${relativePath}: 缺少文件头注释。`;

    const normalized = normalizeHeader(header);
    if (normalized.length < 8) return `${relativePath}: 文件头内容过短。`;
    if (placeholderPatterns.some((pattern) => pattern.test(normalized))) {
        return `${relativePath}: 文件头包含占位文本。`;
    }
    if (sensitivePatterns.some((pattern) => pattern.test(normalized))) {
        return `${relativePath}: 文件头疑似包含敏感信息。`;
    }
    return null;
}

async function main() {
    const files = [];

    for (const targetRoot of targetRoots) {
        files.push(...(await collectFiles(path.join(rootDirectory, targetRoot))));
    }
    for (const rootFile of rootFiles) {
        const filePath = path.join(rootDirectory, rootFile);
        if (await pathExists(filePath)) files.push(filePath);
    }

    const failures = [];
    for (const filePath of files.sort()) {
        const content = await readFile(filePath, 'utf8');
        const failure = validateHeader(filePath, extractHeader(filePath, content));
        if (failure) failures.push(failure);
    }

    if (failures.length > 0) {
        console.error(`文件头检查失败：${failures.length}/${files.length} 个文件不符合规范。`);
        for (const failure of failures) console.error(`- ${failure}`);
        process.exitCode = 1;
        return;
    }

    console.log(`文件头检查通过：已检查 ${files.length} 个文件。`);
}

await main();
