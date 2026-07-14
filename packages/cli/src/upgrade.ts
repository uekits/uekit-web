/**
 * 已安装 Registry 条目的差异检查与安全升级。
 *
 * @remarks
 * 本地修改默认不会被覆盖；三方合并冲突写入旁路文件，并保证临时目录最终清理。
 */

import { execFileSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLockedItem, hasFile, loadLock, registrySourceForLock } from './config.js';
import { commitFileTransaction, type FileMutation } from './file-transaction.js';
import { assertSafeProjectPath, hashContent, writeText } from './fs-utils.js';
import {
    installItemDependencies,
    installItems,
    resolveInstallTarget,
    rewriteInstallAliases,
} from './installer.js';
import { loadRegistryItem, resolveRegistryItemSource } from './registry.js';
import type { LockedFile, UeKitConfig } from './types.js';
import { assertRegistryItemName } from './validation.js';

interface UpdateFilePlan {
    relative: string;
    target: string;
    oldBase: string;
    newBase: string;
    incomingContent: string;
    incomingHash: string;
    locallyModified: boolean;
}

function commandOutput(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('stdout' in error)) {
        return undefined;
    }
    const stdout = error.stdout;
    if (typeof stdout === 'string') {
        return stdout;
    }
    return stdout instanceof Uint8Array ? Buffer.from(stdout).toString('utf8') : undefined;
}

/**
 * 比较已安装文件与对应 Base 内容。
 *
 * @returns 至少存在一个本地修改时返回 `true`。
 */
export async function diffItem(cwd: string, name: string, registry: string): Promise<boolean> {
    assertRegistryItemName(name, '差异条目名称');
    const lock = await loadLock(cwd, registry);
    const item = lock.items[name];
    if (!item) {
        throw new Error(`${name} 尚未安装。`);
    }
    let changed = false;
    for (const file of item.files) {
        const absolute = path.join(cwd, file.path);
        await assertSafeProjectPath(cwd, absolute, '已安装文件路径');
        const current = (await hasFile(absolute)) ? await readFile(absolute, 'utf8') : '';
        const base = path.join(cwd, '.uekit/bases', name, item.version, file.path);
        await assertSafeProjectPath(cwd, base, 'Registry Base 路径');
        const original = (await hasFile(base)) ? await readFile(base, 'utf8') : '';
        if (current === original) {
            continue;
        }
        changed = true;
        console.log(`\n--- ${name}:${file.path}（本地已修改）`);
        try {
            console.log(
                execFileSync('git', ['diff', '--no-index', '--', base, absolute], {
                    encoding: 'utf8',
                }),
            );
        } catch (error) {
            const output = commandOutput(error);
            if (output) {
                console.log(output);
            }
        }
    }
    if (!changed) {
        console.log(`${name} 与安装基线一致。`);
    }
    return changed;
}

/**
 * 更新已安装条目；存在本地修改时默认保留，`merge` 模式尝试三方合并。
 *
 * @remarks
 * 冲突不会覆盖当前文件，而是生成 `.uekit-merge` 供人工处理。
 */
export async function updateItem(
    cwd: string,
    config: UeKitConfig,
    name: string,
    registry: string,
    merge: boolean,
    dryRun = false,
): Promise<void> {
    assertRegistryItemName(name, '更新条目名称');
    let lock = await loadLock(cwd, registry);
    const previous = lock.items[name];
    if (!previous) {
        throw new Error(`${name} 尚未安装。`);
    }
    const incoming = await loadRegistryItem(registry, name);
    const modified: string[] = [];
    for (const file of previous.files) {
        const absolute = path.join(cwd, file.path);
        await assertSafeProjectPath(cwd, absolute, '已安装文件路径');
        if (!(await hasFile(absolute))) {
            continue;
        }
        const current = await readFile(absolute, 'utf8');
        if (hashContent(current) !== file.hash) {
            modified.push(file.path);
        }
    }
    if (!modified.length) {
        await installItems([name], { cwd, config, registry, overwrite: true, dryRun });
        return;
    }
    if (!merge) {
        console.log(
            `${name} 有本地修改，未覆盖：\n${modified.map((file) => `- ${file}`).join('\n')}`,
        );
        return;
    }

    const previousByPath = new Map(previous.files.map((file) => [file.path, file]));
    const plans: UpdateFilePlan[] = [];
    for (const file of incoming.files) {
        if (typeof file.content !== 'string') {
            throw new Error(`${incoming.name}/${file.path} 缺少 content。`);
        }
        const target = resolveInstallTarget(cwd, config, file.target);
        await assertSafeProjectPath(cwd, target, 'Registry 更新路径');
        const relative = path.relative(cwd, target).split(path.sep).join('/');
        const previousFile = previousByPath.get(relative);
        if ((await hasFile(target)) && !previousFile) {
            throw new Error(`${relative} 已存在但不属于 ${name} 的安装记录，升级未覆盖。`);
        }
        const incomingContent = rewriteInstallAliases(file.content, config);
        const oldBase = path.join(cwd, '.uekit/bases', name, previous.version, relative);
        const newBase = path.join(cwd, '.uekit/bases', name, incoming.version, relative);
        await assertSafeProjectPath(cwd, oldBase, '旧 Registry Base 路径');
        await assertSafeProjectPath(cwd, newBase, '新 Registry Base 路径');
        plans.push({
            relative,
            target,
            oldBase,
            newBase,
            incomingContent,
            incomingHash: hashContent(incomingContent),
            locallyModified: modified.includes(relative),
        });
    }

    for (const plan of plans) {
        const mergeFile = `${plan.target}.uekit-merge`;
        await assertSafeProjectPath(cwd, mergeFile, 'Registry 合并文件路径');
        if (await hasFile(mergeFile)) {
            throw new Error(`${mergeFile} 已存在；请先处理或移走现有合并结果。`);
        }
    }

    if (dryRun) {
        if (incoming.registryDependencies?.length) {
            await installItems(incoming.registryDependencies, { cwd, config, registry, dryRun });
        }
        console.log(`更新计划：${name}@${previous.version} -> ${incoming.version}`);
        for (const plan of plans) {
            console.log(`- ${plan.locallyModified ? '三方合并' : '更新'} ${plan.relative}`);
        }
        return;
    }

    if (incoming.registryDependencies?.length) {
        await installItems(incoming.registryDependencies, { cwd, config, registry });
        lock = await loadLock(cwd, registry);
    }

    const temporary = path.join(os.tmpdir(), `uekit-${process.pid}-${name}`);
    await rm(temporary, { recursive: true, force: true });
    const lockedFiles = new Map(previous.files.map((file) => [file.path, file]));
    const mutations: FileMutation[] = [];
    try {
        for (const plan of plans) {
            const mergeFile = `${plan.target}.uekit-merge`;
            if (!plan.locallyModified) {
                mutations.push({ path: plan.target, content: plan.incomingContent });
            } else if (!(await hasFile(plan.oldBase))) {
                mutations.push({ path: mergeFile, content: plan.incomingContent });
                console.log(`${plan.relative} 缺少旧 Base，已保留本地文件并生成 .uekit-merge。`);
            } else {
                const incomingFile = path.join(temporary, plan.relative);
                await writeText(incomingFile, plan.incomingContent);
                try {
                    const merged = execFileSync(
                        'git',
                        ['merge-file', '-p', plan.target, plan.oldBase, incomingFile],
                        { encoding: 'utf8' },
                    );
                    mutations.push({ path: plan.target, content: merged });
                } catch (error) {
                    const candidate = commandOutput(error) ?? plan.incomingContent;
                    mutations.push({ path: mergeFile, content: candidate });
                    console.log(`${plan.relative} 存在冲突，已保留本地文件并生成 .uekit-merge。`);
                }
            }
            mutations.push({ path: plan.newBase, content: plan.incomingContent });
            const lockedFile: LockedFile = {
                path: plan.relative,
                hash: plan.incomingHash,
                baseHash: plan.incomingHash,
            };
            lockedFiles.set(plan.relative, lockedFile);
        }
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }

    for (const file of previous.files) {
        if (
            plans.some((plan) => plan.relative === file.path) ||
            previous.version === incoming.version
        ) {
            continue;
        }
        const oldBase = path.join(cwd, '.uekit/bases', name, previous.version, file.path);
        await assertSafeProjectPath(cwd, oldBase, '旧 Registry Base 路径');
        if (await hasFile(oldBase)) {
            const newBase = path.join(cwd, '.uekit/bases', name, incoming.version, file.path);
            await assertSafeProjectPath(cwd, newBase, '新 Registry Base 路径');
            mutations.push({ path: newBase, content: await readFile(oldBase) });
        }
    }

    const lockSource = registrySourceForLock(cwd, registry);
    lock.registry = lockSource;
    lock.items[name] = createLockedItem(previous, {
        version: incoming.version,
        source: registrySourceForLock(cwd, resolveRegistryItemSource(registry, incoming)),
        dependencies: incoming.dependencies ?? [],
        devDependencies: incoming.devDependencies ?? [],
        files: [...lockedFiles.values()],
    });
    const lockFile = path.join(cwd, 'uekit.lock.json');
    await assertSafeProjectPath(cwd, lockFile, 'Registry Lock 路径');
    await installItemDependencies(cwd, incoming);
    mutations.push({ path: lockFile, content: `${JSON.stringify(lock, null, 2)}\n` });
    await commitFileTransaction(cwd, mutations);
}
