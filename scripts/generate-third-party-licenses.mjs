/**
 * 从 pnpm 解析结果生成不包含本机路径的第三方许可证清单。
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = path.join(root, 'THIRD_PARTY_LICENSES.md');
const check = process.argv.includes('--check');
const secureEnvironment = { ...process.env };
delete secureEnvironment.NODE_TLS_REJECT_UNAUTHORIZED;
const raw = execFileSync('corepack', ['pnpm', 'licenses', 'list', '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: secureEnvironment,
});
const report = JSON.parse(raw);
const packages = [];
for (const [reportedLicense, entries] of Object.entries(report)) {
    for (const entry of entries) {
        const license = entry.name === 'spawndamnit' ? 'MIT*' : reportedLicense;
        packages.push({ name: entry.name, versions: entry.versions.join(', '), license });
    }
}
packages.sort((left, right) =>
    left.name === right.name
        ? left.versions.localeCompare(right.versions)
        : left.name.localeCompare(right.name),
);

const content = `${[
    '# 第三方许可证清单',
    '',
    '> 此文件由 `pnpm licenses list` 和 `scripts/generate-third-party-licenses.mjs` 生成；不得手工编辑。',
    '',
    `共复核 ${packages.length} 个直接或传递依赖项。依赖仍受各自许可证原文约束。`,
    '',
    '| Package | Version | License |',
    '| --- | --- | --- |',
    ...packages.map(
        ({ name, versions, license }) =>
            `| ${name.replaceAll('|', '\\|')} | ${versions.replaceAll('|', '\\|')} | ${license} |`,
    ),
    '',
    '\\* `spawndamnit@3.0.1` 的 package.json 使用 `SEE LICENSE IN LICENSE`，其随包 LICENSE 文本已人工复核为 MIT License。',
    '',
].join('\n')}\n`;

if (check) {
    const current = await readFile(outputFile, 'utf8').catch(() => '');
    if (current !== content) throw new Error('THIRD_PARTY_LICENSES.md 需要重新生成。');
    console.log(`第三方许可证清单验证通过：${packages.length} 项。`);
} else {
    await writeFile(outputFile, content, 'utf8');
    console.log(`第三方许可证清单已生成：${packages.length} 项。`);
}
