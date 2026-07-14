/**
 * 已打包 CLI 在独立 Vue 消费项目中的端到端冒烟验证。
 *
 * @remarks
 * 临时项目会真实安装 tarball、运行 Registry 安装命令并构建，结束后默认删除全部临时文件。
 */

import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'uekit-package-smoke-'));
const consumer = path.join(temporary, 'consumer');
const packageDirectory = path.join(root, 'packages/cli');
const registry = path.join(root, 'apps/registry-server/dist/web/v1');
const managerIndex = process.argv.indexOf('--manager');
const manager = managerIndex >= 0 ? process.argv[managerIndex + 1] : 'pnpm';
if (!['npm', 'pnpm'].includes(manager)) {
    throw new Error('smoke-package --manager 只支持 pnpm 或 npm。');
}
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('拒绝在 NODE_TLS_REJECT_UNAUTHORIZED=0 时执行 npm tarball 消费验证。');
}
const environment = {
    ...process.env,
    CI: '1',
    PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`,
    npm_config_store_dir: path.join(temporary, 'pnpm-store'),
    pnpm_config_store_dir: path.join(temporary, 'pnpm-store'),
};
delete environment.npm_execpath;
delete environment.npm_config_user_agent;

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonRecord(source, label) {
    let value;
    try {
        value = JSON.parse(source);
    } catch (cause) {
        throw new Error(`${label} 不是有效 JSON。`, { cause });
    }
    if (!isRecord(value)) {
        throw new Error(`${label} 必须是 JSON 对象。`);
    }
    return value;
}

function parsePackedTarball(source) {
    let value;
    try {
        value = JSON.parse(source);
    } catch (cause) {
        throw new Error('npm pack 没有返回有效 JSON。', { cause });
    }
    const packed = Array.isArray(value) ? value[0] : undefined;
    if (
        !isRecord(packed) ||
        typeof packed.filename !== 'string' ||
        typeof packed.name !== 'string' ||
        typeof packed.version !== 'string'
    ) {
        throw new Error('npm pack 返回的数据结构不完整。');
    }
    return packed;
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, env: environment, encoding: 'utf8' });
    if (result.status !== 0) {
        process.stdout.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        throw new Error(`${command} ${args.join(' ')} 执行失败。`);
    }
    return result.stdout;
}

function runManager(args, cwd) {
    return run(manager, args, cwd);
}

function runCli(args, cwd) {
    return manager === 'pnpm'
        ? runManager(['exec', 'uekit-web', ...args], cwd)
        : runManager(['exec', '--', 'uekit-web', ...args], cwd);
}

try {
    const packOutput = run(
        'npm',
        ['pack', '--json', '--silent', '--ignore-scripts', '--pack-destination', temporary],
        packageDirectory,
    );
    const packed = parsePackedTarball(packOutput);
    const tarball = path.join(temporary, packed.filename);

    await cp(path.join(root, 'tests/fixtures/consumer'), consumer, { recursive: true });
    runManager(manager === 'pnpm' ? ['install', '--no-frozen-lockfile'] : ['install'], consumer);
    runManager(
        manager === 'pnpm' ? ['add', '--save-dev', tarball] : ['install', '--save-dev', tarball],
        consumer,
    );
    runCli(['init', '--cwd', consumer, '--registry', registry], consumer);
    runCli(
        [
            'add',
            'button',
            'avatar',
            'pro-table',
            'detail-drawer',
            '--cwd',
            consumer,
            '--registry',
            registry,
        ],
        consumer,
    );
    runManager(['run', 'build'], consumer);

    const config = parseJsonRecord(
        await readFile(path.join(consumer, 'uekit.json'), 'utf8'),
        'uekit.json',
    );
    const lock = parseJsonRecord(
        await readFile(path.join(consumer, 'uekit.lock.json'), 'utf8'),
        'uekit.lock.json',
    );
    const consumerPackage = parseJsonRecord(
        await readFile(path.join(consumer, 'package.json'), 'utf8'),
        'package.json',
    );
    const viteConfig = await readFile(path.join(consumer, 'vite.config.ts'), 'utf8');
    const themeCss = await readFile(path.join(consumer, 'src/styles/uekit.css'), 'utf8');
    const proTable = await readFile(
        path.join(consumer, 'src/components/pro/pro-table/ProTable.vue'),
        'utf8',
    );
    if (
        typeof config.registry !== 'string' ||
        !config.registry.includes('registry.uekit.com/web/v1')
    ) {
        throw new Error('init 生成的 Registry 地址不正确。');
    }
    if (
        JSON.stringify(config.tailwind) !==
        JSON.stringify({ enabled: true, version: 4, preflight: false })
    ) {
        throw new Error('init 生成的 Tailwind 策略不正确。');
    }
    const devDependencies = isRecord(consumerPackage.devDependencies)
        ? consumerPackage.devDependencies
        : {};
    for (const dependency of ['tailwindcss', '@tailwindcss/vite']) {
        if (!devDependencies[dependency]) {
            throw new Error(`消费项目缺少开发依赖：${dependency}`);
        }
    }
    if ((viteConfig.match(/@tailwindcss\/vite/g) ?? []).length !== 1) {
        throw new Error('Vite 配置没有且仅有一个 Tailwind 插件导入。');
    }
    if ((viteConfig.match(/tailwindcss\(\)/g) ?? []).length !== 1) {
        throw new Error('Vite 配置没有且仅有一个 Tailwind 插件实例。');
    }
    if (
        !themeCss.includes('tailwindcss/utilities.css') ||
        themeCss.includes('tailwindcss/preflight.css')
    ) {
        throw new Error('消费项目 Tailwind 样式入口或 Preflight 策略不正确。');
    }
    if (!proTable.includes('border-border') || !proTable.includes('bg-surface')) {
        throw new Error('Registry 组件没有使用 UEKit Tailwind 语义工具类。');
    }
    const lockedItems = isRecord(lock.items) ? lock.items : {};
    for (const item of ['theme', 'button', 'avatar', 'icon', 'pro-table', 'detail-drawer']) {
        if (!lockedItems[item]) {
            throw new Error(`消费项目缺少安装记录：${item}`);
        }
    }

    console.log(
        `${manager} tarball 消费验证通过：${packed.name}@${packed.version}（Node ${process.version}）。`,
    );
} finally {
    if (process.env.UEKIT_KEEP_SMOKE) {
        console.log(`临时消费项目：${temporary}`);
    } else {
        await rm(temporary, { recursive: true, force: true });
    }
}
