/**
 * 已构建 CLI 的 diff、update 与三方合并全链路验证。
 *
 * @remarks
 * 使用临时 Registry 和消费项目验证 Commander 命令入口、Lock/Base 更新、冲突保留与退出码。
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'packages/cli/dist/index.js');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'uekit-upgrade-smoke-'));
const project = path.join(temporary, 'consumer');
const registry = path.join(temporary, 'registry');
const source = path.join(project, 'src/components/ui/sample.ts');
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('拒绝在 NODE_TLS_REJECT_UNAUTHORIZED=0 时执行 CLI 发布候选验证。');
}
const environment = { ...process.env };

function hash(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function writeJson(file, value) {
    await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeRegistryItem(version, content) {
    const item = {
        name: 'sample',
        type: 'registry:ui',
        version,
        url: `items/sample/${version}.json`,
        dependencies: [],
        devDependencies: [],
        registryDependencies: [],
        compatibility: { node: '>=20.19.0' },
        files: [
            {
                path: 'registry/sample.ts',
                target: '{ui}/sample.ts',
                content,
                hash: hash(content),
            },
        ],
    };
    await mkdir(path.join(registry, 'items/sample'), { recursive: true });
    await writeJson(path.join(registry, item.url), item);
    await writeJson(path.join(registry, 'index.json'), {
        schemaVersion: 1,
        name: 'upgrade-test',
        compatibility: { node: '>=20.19.0' },
        items: [
            {
                ...item,
                files: item.files.map(({ path: sourcePath, target }) => ({
                    path: sourcePath,
                    target,
                })),
            },
        ],
    });
}

function run(argumentsList) {
    const result = spawnSync(process.execPath, [cli, ...argumentsList], {
        cwd: root,
        encoding: 'utf8',
        env: environment,
    });
    if (result.status !== 0) {
        process.stdout.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        throw new Error(`uekit-web ${argumentsList.join(' ')} 执行失败。`);
    }
    return result.stdout;
}

function requireText(content, expected, label) {
    if (!content.includes(expected)) {
        throw new Error(`${label} 缺少预期内容：${expected}`);
    }
}

try {
    await Promise.all([mkdir(project, { recursive: true }), mkdir(registry, { recursive: true })]);
    await writeJson(path.join(project, 'package.json'), { name: 'consumer', private: true });
    await writeJson(path.join(project, 'uekit.json'), {
        $schema: 'https://registry.uekit.com/web/v1/config.schema.json',
        style: 'default',
        typescript: true,
        registry,
        aliases: {
            ui: 'src/components/ui',
            pro: 'src/components/pro',
            layouts: 'src/layouts',
            blocks: 'src/blocks',
            integrations: 'src/integrations',
            lib: 'src/lib/uekit',
            styles: 'src/styles',
        },
        theme: { css: 'src/styles/uekit.css' },
        tailwind: { enabled: true, version: 4, preflight: false },
    });

    const versionOne =
        "export const upstream = 'v1';\nexport const stableOne = 1;\nexport const stableTwo = 2;\nexport const stableThree = 3;\nexport const local = 'base';\n";
    await writeRegistryItem('0.1.0', versionOne);
    run(['add', 'sample', '--cwd', project, '--registry', registry, '--skip-install']);
    requireText(run(['diff', 'sample', '--cwd', project]), '与安装基线一致', '初始 diff');

    const localVersion = versionOne.replace("local = 'base'", "local = 'custom'");
    await writeFile(source, localVersion, 'utf8');
    requireText(run(['diff', 'sample', '--cwd', project]), '本地已修改', '修改后 diff');

    const versionTwo = versionOne.replace("upstream = 'v1'", "upstream = 'v2'");
    await writeRegistryItem('0.2.0', versionTwo);
    requireText(
        run(['update', 'sample', '--cwd', project, '--registry', registry]),
        '有本地修改，未覆盖',
        '无 merge 更新',
    );
    if ((await readFile(source, 'utf8')) !== localVersion) {
        throw new Error('无 merge 更新覆盖了本地修改。');
    }

    run(['update', 'sample', '--cwd', project, '--registry', registry, '--merge']);
    const merged = await readFile(source, 'utf8');
    requireText(merged, "upstream = 'v2'", '无冲突合并');
    requireText(merged, "local = 'custom'", '无冲突合并');
    const lockAfterMerge = JSON.parse(
        await readFile(path.join(project, 'uekit.lock.json'), 'utf8'),
    );
    if (lockAfterMerge.items.sample.version !== '0.2.0') {
        throw new Error('无冲突合并没有更新 Lock 版本。');
    }
    const baseTwo = await readFile(
        path.join(project, '.uekit/bases/sample/0.2.0/src/components/ui/sample.ts'),
        'utf8',
    );
    if (baseTwo !== versionTwo) {
        throw new Error('无冲突合并没有更新 Base。');
    }

    const versionThree = versionTwo
        .replace("upstream = 'v2'", "upstream = 'v3'")
        .replace("local = 'base'", "local = 'upstream'");
    await writeRegistryItem('0.3.0', versionThree);
    requireText(
        run(['update', 'sample', '--cwd', project, '--registry', registry, '--merge']),
        '存在冲突',
        '冲突更新',
    );
    if ((await readFile(source, 'utf8')) !== merged) {
        throw new Error('冲突更新覆盖了本地正式文件。');
    }
    const conflict = await readFile(`${source}.uekit-merge`, 'utf8');
    requireText(conflict, '<<<<<<<', '冲突旁路文件');
    requireText(conflict, "local = 'custom'", '冲突旁路文件');
    requireText(conflict, "local = 'upstream'", '冲突旁路文件');
    const lockAfterConflict = JSON.parse(
        await readFile(path.join(project, 'uekit.lock.json'), 'utf8'),
    );
    if (lockAfterConflict.items.sample.version !== '0.3.0') {
        throw new Error('冲突更新没有记录新的上游基线版本。');
    }
    requireText(run(['diff', 'sample', '--cwd', project]), '本地已修改', '冲突后 diff');

    console.log('CLI diff、update 与 --merge 验证通过。');
} finally {
    await rm(temporary, { recursive: true, force: true });
}
