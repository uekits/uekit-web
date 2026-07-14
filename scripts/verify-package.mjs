/**
 * npm 发布包文件边界与包名校验。
 *
 * @remarks
 * 使用 `npm pack --dry-run` 检查实际发布清单，防止源码或工作区文件被意外带入。
 */

import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = path.join(root, 'packages/cli');
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('拒绝在 NODE_TLS_REJECT_UNAUTHORIZED=0 时验证 npm 发布包。');
}
const environment = { ...process.env };
const packageManifest = JSON.parse(
    await readFile(path.join(packageDirectory, 'package.json'), 'utf8'),
);
if (packageManifest.exports !== undefined) {
    throw new Error('纯 CLI 包不得声明程序化 exports。');
}

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePackResult(source) {
    let value;
    try {
        value = JSON.parse(source);
    } catch (cause) {
        throw new Error('npm pack 没有返回有效 JSON。', { cause });
    }
    const packed = Array.isArray(value) ? value[0] : undefined;
    if (!isRecord(packed) || !Array.isArray(packed.files)) {
        throw new Error('npm pack 返回的数据结构不完整。');
    }
    return packed;
}

const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--silent', '--ignore-scripts'], {
    cwd: packageDirectory,
    encoding: 'utf8',
    env: environment,
});
if (result.status !== 0) {
    throw new Error(result.stderr || 'npm pack --dry-run 失败。');
}

const packed = parsePackResult(result.stdout);
const paths = packed.files.map((file) => {
    if (!isRecord(file) || typeof file.path !== 'string') {
        throw new Error('npm pack 文件清单包含无效条目。');
    }
    return file.path;
});
const required = ['package.json', 'README.md', 'LICENSE', 'dist/index.js'];
for (const file of required) {
    if (!paths.includes(file)) {
        throw new Error(`npm 包缺少必要文件：${file}`);
    }
}
for (const file of paths) {
    if (!['package.json', 'README.md', 'LICENSE'].includes(file) && !file.startsWith('dist/')) {
        throw new Error(`npm 包包含非预期文件：${file}`);
    }
    if (file.endsWith('.d.ts') || file.endsWith('.d.ts.map') || file.endsWith('.js.map')) {
        throw new Error(`纯 CLI 包包含无意义的声明或 Source Map：${file}`);
    }
}
if (packed.name !== '@uekits/web') {
    throw new Error(`npm 包名错误：${String(packed.name)}`);
}

console.log(
    `npm 包验证通过：${packed.name}@${packed.version}，${packed.entryCount} 个文件，${packed.size} bytes。`,
);
