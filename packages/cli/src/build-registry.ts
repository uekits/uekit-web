/**
 * 将源码 Registry 清单构建为可发布的静态 JSON。
 *
 * @remarks
 * 构建前验证所有源码路径与依赖关系，输出目录始终被视为可重建产物。
 */

import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hashContent, readJson, toPosix, writeJson } from './fs-utils.js';
import type { RegistryIndex, RegistryItem } from './types.js';
import { assertRegistryItem, validateRegistryManifest } from './validation.js';

const outputMarkerName = '.uekit-registry-output';
const outputMarkerContent = 'UEKit Web generated Registry output. Safe to rebuild.\n';
const releaseDirectory = 'registry-releases';

async function pathExists(file: string): Promise<boolean> {
    try {
        await lstat(file);
        return true;
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
        ) {
            return false;
        }
        throw error;
    }
}

async function prepareOutputDirectory(root: string, output?: string): Promise<string> {
    const repositoryRoot = path.resolve(root);
    const target = path.resolve(repositoryRoot, output ?? 'apps/registry-server/public/web/v1');
    const relative = path.relative(repositoryRoot, target);
    const dangerousTargets = new Set([path.parse(target).root, os.homedir(), repositoryRoot]);
    if (
        !relative ||
        relative.startsWith('..') ||
        path.isAbsolute(relative) ||
        dangerousTargets.has(target)
    ) {
        throw new Error(`Registry 输出目录必须位于仓库内部且不能是危险目录：${target}`);
    }

    await mkdir(path.dirname(target), { recursive: true });
    const [realRoot, realParent] = await Promise.all([
        realpath(repositoryRoot),
        realpath(path.dirname(target)),
    ]);
    const realRelative = path.relative(realRoot, realParent);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
        throw new Error(`Registry 输出目录通过符号链接越出仓库：${target}`);
    }

    if (await pathExists(target)) {
        const stats = await lstat(target);
        if (stats.isSymbolicLink() || !stats.isDirectory()) {
            throw new Error(`Registry 输出目标必须是普通目录：${target}`);
        }
        const marker = path.join(target, outputMarkerName);
        if (!(await pathExists(marker))) {
            throw new Error(`Registry 输出目录缺少安全标记，拒绝删除：${target}`);
        }
        if ((await readFile(marker, 'utf8')) !== outputMarkerContent) {
            throw new Error(`Registry 输出目录安全标记无效，拒绝删除：${target}`);
        }
        await rm(target, { recursive: true, force: true });
    }

    await mkdir(target, { recursive: false });
    await writeFile(path.join(target, outputMarkerName), outputMarkerContent, 'utf8');
    return target;
}

async function createBuiltItems(root: string): Promise<{
    manifest: RegistryIndex;
    items: RegistryItem[];
}> {
    const manifest = await validateRegistryManifest(
        root,
        await readJson(path.join(root, 'registry.json')),
    );
    const items: RegistryItem[] = [];
    for (const item of manifest.items) {
        const files = [];
        for (const file of item.files) {
            const content = await readFile(path.join(root, file.path), 'utf8');
            files.push({ ...file, content, hash: hashContent(content) });
        }
        const built = {
            ...item,
            compatibility: item.compatibility ?? manifest.compatibility,
            files,
        };
        assertRegistryItem(built, { requireBuiltContent: true });
        items.push(built);
    }
    return { manifest, items };
}

/** 创建新的不可变 Registry 版本；同版本内容不一致时拒绝覆盖。 */
export async function releaseRegistry(root: string): Promise<void> {
    const { items } = await createBuiltItems(root);
    for (const item of items) {
        const releaseFile = path.join(root, releaseDirectory, item.url);
        if (await pathExists(releaseFile)) {
            const released = await readJson(releaseFile);
            assertRegistryItem(released, { requireBuiltContent: true });
            if (JSON.stringify(released) !== JSON.stringify(item)) {
                throw new Error(
                    `${item.name}@${item.version} 已存在且内容不同；请提升版本，禁止覆盖已发布资源。`,
                );
            }
            continue;
        }
        await writeJson(releaseFile, item);
    }
}

async function collectReleaseFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectReleaseFiles(file)));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push(file);
        }
    }
    return files;
}

/**
 * 从不可变版本档案构建 Registry index、历史条目和 Schema。
 *
 * @param root - UEKit Web 仓库根目录。
 * @param output - 相对仓库根目录或绝对输出目录。
 */
export async function buildRegistry(root: string, output?: string): Promise<void> {
    const { manifest, items } = await createBuiltItems(root);
    const releases = path.join(root, releaseDirectory);
    for (const item of items) {
        const releaseFile = path.join(releases, item.url);
        if (!(await pathExists(releaseFile))) {
            throw new Error(
                `${item.name}@${item.version} 尚未写入不可变档案，请先运行 build --release。`,
            );
        }
        const released = await readJson(releaseFile);
        assertRegistryItem(released, { requireBuiltContent: true });
        if (JSON.stringify(released) !== JSON.stringify(item)) {
            throw new Error(`${item.name}@${item.version} 与不可变档案不一致，请提升条目版本。`);
        }
    }

    const target = await prepareOutputDirectory(root, output);
    for (const releaseFile of await collectReleaseFiles(releases)) {
        const released = await readJson(releaseFile);
        assertRegistryItem(released, { requireBuiltContent: true });
        const relative = toPosix(path.relative(releases, releaseFile));
        if (released.url !== relative) {
            throw new Error(`不可变 Registry 路径与条目 url 不一致：${relative}`);
        }
        await writeJson(path.join(target, relative), released);
    }

    await writeJson(path.join(target, 'index.json'), {
        ...manifest,
        $schema: './schema.json',
        items: items.map((item) => ({
            ...item,
            files: item.files.map(({ path: sourcePath, target: fileTarget }) => ({
                path: sourcePath,
                target: fileTarget,
            })),
        })),
    });
    const schema = await readFile(path.join(root, 'registry.schema.json'), 'utf8');
    await writeFile(path.join(target, 'schema.json'), schema, 'utf8');
    const configSchema = await readFile(path.join(root, 'uekit.schema.json'), 'utf8');
    await writeFile(path.join(target, 'config.schema.json'), configSchema, 'utf8');
}
