/**
 * 校验 Registry 当前版本、Playground 源码、Base 与 Lock 的内容一致性。
 */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playground = path.join(root, 'apps/playground');
const registryRoot = path.join(root, 'apps/registry-server/dist/web/v1');

function hash(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function readJson(file) {
    return JSON.parse(await readFile(file, 'utf8'));
}

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...(await listFiles(target)));
        else if (entry.isFile()) files.push(target);
    }
    return files;
}

const index = await readJson(path.join(registryRoot, 'index.json'));
const lock = await readJson(path.join(playground, 'uekit.lock.json'));
const expectedNames = index.items.map((item) => item.name).sort();
const lockedNames = Object.keys(lock.items).sort();
if (JSON.stringify(lockedNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
        `Playground 条目与 Registry 不一致：expected=${expectedNames.join(',')} actual=${lockedNames.join(',')}`,
    );
}
if (lock.registry !== 'file:../registry-server/dist/web/v1') {
    throw new Error(`Playground Lock Registry 不可移植：${lock.registry}`);
}

const expectedBaseFiles = new Set();
for (const summary of index.items) {
    const item = await readJson(path.join(registryRoot, summary.url));
    const locked = lock.items[item.name];
    const expectedSource = `file:../registry-server/dist/web/v1/${summary.url}`;
    if (
        locked.version !== item.version ||
        locked.source !== expectedSource ||
        item.url !== summary.url
    ) {
        throw new Error(`${item.name} 的版本化来源与 Lock 不一致。`);
    }
    const lockedFiles = new Map(locked.files.map((file) => [file.path, file]));
    for (const file of item.files) {
        const relative = file.target
            .replace('{ui}', 'src/components/ui')
            .replace('{pro}', 'src/components/pro')
            .replace('{layouts}', 'src/layouts')
            .replace('{blocks}', 'src/blocks')
            .replace('{integrations}', 'src/integrations')
            .replace('{lib}', 'src/lib/uekit')
            .replace('{styles}', 'src/styles');
        const lockedFile = lockedFiles.get(relative);
        if (!lockedFile) throw new Error(`${item.name} 的 Lock 缺少 ${relative}。`);
        const source = await readFile(path.join(playground, relative));
        const baseRelative = path.join(item.name, item.version, relative);
        const base = await readFile(path.join(playground, '.uekit/bases', baseRelative));
        expectedBaseFiles.add(baseRelative);
        const digest = hash(source);
        if (
            !source.equals(base) ||
            digest !== file.hash ||
            digest !== lockedFile.hash ||
            digest !== lockedFile.baseHash
        ) {
            throw new Error(
                `${item.name} 的 Registry、源码、Base 或 Lock Hash 不一致：${relative}`,
            );
        }
        lockedFiles.delete(relative);
    }
    if (lockedFiles.size) {
        throw new Error(`${item.name} 的 Lock 含多余文件：${[...lockedFiles.keys()].join(', ')}`);
    }
}

const actualBaseFiles = (await listFiles(path.join(playground, '.uekit/bases')))
    .map((file) => path.relative(path.join(playground, '.uekit/bases'), file))
    .sort();
if (JSON.stringify(actualBaseFiles) !== JSON.stringify([...expectedBaseFiles].sort())) {
    throw new Error('Playground Base 目录存在缺失或遗留文件。');
}

console.log(`Playground 一致性验证通过：${expectedNames.length} 个条目。`);
