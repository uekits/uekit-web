/**
 * CLI 多文件变更的快照、原子替换与失败回滚。
 *
 * @remarks
 * 单文件通过同目录 rename 原子提交；多文件发生错误时按相反顺序恢复原始内容。
 */

import { readFile, rm } from 'node:fs/promises';
import { hasFile } from './config.js';
import { assertSafeProjectPath, writeBuffer } from './fs-utils.js';

/** 事务中准备写入的文件。 */
export interface FileMutation {
    path: string;
    content: string | Uint8Array;
}

/** 文件提交前的可恢复快照。 */
export interface FileSnapshot {
    path: string;
    content?: Uint8Array;
}

/** 捕获一组项目内文件的当前内容。 */
export async function captureFileSnapshots(root: string, files: string[]): Promise<FileSnapshot[]> {
    const snapshots: FileSnapshot[] = [];
    for (const file of [...new Set(files)]) {
        await assertSafeProjectPath(root, file, '事务文件路径');
        snapshots.push({
            path: file,
            content: (await hasFile(file)) ? await readFile(file) : undefined,
        });
    }
    return snapshots;
}

/** 恢复文件快照；原先不存在的文件会被删除。 */
export async function restoreFileSnapshots(root: string, snapshots: FileSnapshot[]): Promise<void> {
    for (const snapshot of [...snapshots].reverse()) {
        await assertSafeProjectPath(root, snapshot.path, '事务回滚路径');
        if (snapshot.content === undefined) {
            await rm(snapshot.path, { force: true });
        } else {
            await writeBuffer(snapshot.path, snapshot.content);
        }
    }
}

/** 原子提交多文件变更，并在任意写入失败时恢复全部已触及文件。 */
export async function commitFileTransaction(
    root: string,
    mutations: FileMutation[],
): Promise<void> {
    const paths = mutations.map((mutation) => mutation.path);
    if (new Set(paths).size !== paths.length) {
        throw new Error('文件事务包含重复目标路径。');
    }
    const snapshots = await captureFileSnapshots(root, paths);
    try {
        for (const mutation of mutations) {
            await writeBuffer(mutation.path, mutation.content);
        }
    } catch (cause) {
        try {
            await restoreFileSnapshots(root, snapshots);
        } catch (rollbackCause) {
            throw new AggregateError([cause, rollbackCause], '文件事务失败且回滚不完整。', {
                cause: rollbackCause,
            });
        }
        throw cause;
    }
}
