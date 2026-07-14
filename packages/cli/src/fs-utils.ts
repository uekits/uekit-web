/**
 * CLI 文件读写与内容摘要工具。
 *
 * @remarks
 * JSON 始终以 `unknown` 返回，由协议边界的调用方完成结构校验。
 */

import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** 计算 Registry 文件内容的 SHA-256 摘要。 */
export function hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * 读取 JSON 文件，但不对外部数据作未经验证的类型承诺。
 *
 * @throws 文件不可读或内容不是有效 JSON 时抛出带文件路径的错误。
 */
export async function readJson(file: string): Promise<unknown> {
    const content = await readFile(file, 'utf8');
    try {
        return JSON.parse(content);
    } catch (cause) {
        throw new Error(`${file} 不是有效的 JSON 文件。`, { cause });
    }
}

/** 将值以稳定缩进写入 JSON 文件。 */
export async function writeJson(file: string, value: unknown): Promise<void> {
    await writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** 通过同目录临时文件和 rename 原子替换文件。 */
export async function writeBuffer(file: string, content: string | Uint8Array): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
    try {
        await writeFile(temporary, content, { flag: 'wx' });
        await rename(temporary, file);
    } finally {
        await rm(temporary, { force: true });
    }
}

/** 原子写入文本并自动创建父目录。 */
export async function writeText(file: string, content: string): Promise<void> {
    await writeBuffer(file, content);
}

/**
 * 确认目标位于可信根目录内，且现有路径段不包含符号链接。
 *
 * @remarks
 * 安装器在真正读写消费项目之前调用本检查，避免 Registry 借助项目内符号链接写到仓库外。
 */
export async function assertSafeProjectPath(
    root: string,
    target: string,
    label = '目标路径',
): Promise<void> {
    const absoluteRoot = path.resolve(root);
    const absoluteTarget = path.resolve(target);
    const relative = path.relative(absoluteRoot, absoluteTarget);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`${label}越出项目目录：${target}`);
    }

    let current = absoluteRoot;
    for (const segment of relative.split(path.sep).filter(Boolean)) {
        current = path.join(current, segment);
        try {
            const stats = await lstat(current);
            if (stats.isSymbolicLink()) {
                throw new Error(`${label}包含符号链接，拒绝访问：${current}`);
            }
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'ENOENT'
            ) {
                return;
            }
            throw error;
        }
    }
}

/** 将当前平台路径分隔符转换为 Registry 使用的 POSIX 格式。 */
export function toPosix(value: string): string {
    return value.split(path.sep).join('/');
}
