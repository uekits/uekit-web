/**
 * 构建后 Registry 的协议、条目内容和摘要一致性检查。
 *
 * @remarks
 * 可校验本地目录或带重试的远端地址，两种来源必须且只能选择一种。
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('拒绝在 NODE_TLS_REJECT_UNAUTHORIZED=0 时验证 Registry。');
}

const argumentsMap = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
    argumentsMap.set(process.argv[index], process.argv[index + 1]);
}

const directory = argumentsMap.get('--dir');
const baseUrl = argumentsMap.get('--url');
if ((!directory && !baseUrl) || (directory && baseUrl)) {
    throw new Error('请且仅提供 --dir <directory> 或 --url <base-url>。');
}

function hash(content) {
    return createHash('sha256').update(content).digest('hex');
}

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readResource(name) {
    if (directory) {
        return readFile(path.resolve(directory, name), 'utf8');
    }
    const url = new URL(name, `${baseUrl.replace(/\/$/, '')}/`).toString();
    let lastError;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
            if (response.ok) {
                return response.text();
            }
            lastError = new Error(`${response.status} ${response.statusText}`);
        } catch (error) {
            lastError = error;
        }
        await sleep(attempt * 1_000);
    }
    throw new Error(`Registry 资源不可用：${url}；${String(lastError)}`);
}

async function readJson(name) {
    let value;
    try {
        value = JSON.parse(await readResource(name));
    } catch (cause) {
        throw new Error(`${name} 不是有效 JSON。`, { cause });
    }
    if (!isRecord(value)) {
        throw new Error(`${name} 必须是 JSON 对象。`);
    }
    return value;
}

const index = await readJson('index.json');
if (index.schemaVersion !== 1) {
    throw new Error('Registry schemaVersion 不是 1。');
}
if (index.$schema !== './schema.json') {
    throw new Error('Registry Schema 地址不正确。');
}
if (!isRecord(index.compatibility) || index.compatibility['element-plus'] !== '>=2.14.0 <3') {
    throw new Error('Element Plus compatibility 配置不正确。');
}
if (!Array.isArray(index.items) || !index.items.length) {
    throw new Error('Registry 没有条目。');
}

await Promise.all([readJson('schema.json'), readJson('config.schema.json')]);

const names = new Set();
let fileCount = 0;
for (const summary of index.items) {
    if (
        !isRecord(summary) ||
        typeof summary.name !== 'string' ||
        typeof summary.version !== 'string' ||
        typeof summary.url !== 'string'
    ) {
        throw new Error('Registry index 包含无效条目摘要。');
    }
    if (names.has(summary.name)) {
        throw new Error(`Registry 条目重复：${summary.name}`);
    }
    names.add(summary.name);
    const expectedUrl = `items/${summary.name}/${summary.version}.json`;
    if (summary.url !== expectedUrl) {
        throw new Error(`${summary.name} 没有指向不可变版本资源。`);
    }
    const item = await readJson(summary.url);
    if (
        item.name !== summary.name ||
        item.version !== summary.version ||
        item.url !== summary.url
    ) {
        throw new Error(`${summary.name} 的条目与 index 不一致。`);
    }
    if (!Array.isArray(item.files) || !item.files.length) {
        throw new Error(`${summary.name} 没有源码文件。`);
    }
    for (const file of item.files) {
        if (
            !isRecord(file) ||
            typeof file.path !== 'string' ||
            typeof file.content !== 'string' ||
            typeof file.hash !== 'string' ||
            !/^[a-f0-9]{64}$/.test(file.hash)
        ) {
            throw new Error(`${summary.name} 包含缺少源码或 hash 的文件。`);
        }
        if (hash(file.content) !== file.hash) {
            throw new Error(`${summary.name}/${file.path} 的 hash 校验失败。`);
        }
        fileCount += 1;
    }
}

console.log(`Registry 验证通过：${index.items.length} 个条目，${fileCount} 个源码文件。`);
