/**
 * 在 CLI 编译前清理固定的 dist 目录，防止旧声明或 Source Map 混入 npm 包。
 */

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = path.join(root, 'packages/cli');
const target = path.join(packageDirectory, 'dist');
if (path.dirname(target) !== packageDirectory || path.basename(target) !== 'dist') {
    throw new Error(`拒绝清理非 CLI dist 目录：${target}`);
}
await rm(target, { recursive: true, force: true });
