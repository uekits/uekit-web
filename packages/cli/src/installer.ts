/**
 * Registry 条目安装流程。
 *
 * @remarks
 * 负责依赖排序、目标路径保护、源码写入和 Lock/Base 更新；不会覆盖未授权的本地修改。
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { createLockedItem, hasFile, loadLock, registrySourceForLock } from './config.js';
import {
    captureFileSnapshots,
    commitFileTransaction,
    restoreFileSnapshots,
    type FileMutation,
} from './file-transaction.js';
import { assertSafeProjectPath, hashContent, readJson, toPosix } from './fs-utils.js';
import { loadRegistryIndex, loadRegistryItem, resolveRegistryItemSource } from './registry.js';
import type { RegistryItem, UeKitConfig, UeKitLock } from './types.js';

/** Registry 条目安装选项。 */
export interface InstallOptions {
    /** 消费项目根目录。 */
    cwd: string;
    /** 已校验的 UEKit 配置。 */
    config: UeKitConfig;
    /** 本地目录、URL 或带 `{name}` 的 Registry 模板。 */
    registry: string;
    /** 是否允许覆盖已存在的文件。 */
    overwrite?: boolean;
    /** 是否跳过包管理器依赖安装。 */
    skipInstall?: boolean;
    /** 只输出安装计划，不修改文件或依赖。 */
    dryRun?: boolean;
    /** @internal 测试或嵌入环境提供的包管理器执行器。 */
    packageManagerRunner?: (command: string, argumentsList: string[], cwd: string) => void;
}

/** 安装计划中的单个源码决策。 */
export interface InstallFilePlan {
    item: string;
    path: string;
    action: 'write' | 'preserve';
}

/** 在产生任何副作用前计算出的完整安装计划。 */
export interface InstallPlan {
    items: RegistryItem[];
    files: InstallFilePlan[];
    dependencies: string[];
    devDependencies: string[];
    lock: UeKitLock;
    mutations: FileMutation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAliasName(value: string): value is keyof UeKitConfig['aliases'] {
    return ['ui', 'pro', 'layouts', 'blocks', 'integrations', 'lib', 'styles'].includes(value);
}

/**
 * 将 Registry 目标解析到消费项目内。
 *
 * @internal
 * @throws 当别名未知或目标越出项目根目录时抛出错误。
 */
export function resolveInstallTarget(cwd: string, config: UeKitConfig, target: string): string {
    const expanded = target.replace(/\{([a-z]+)\}/g, (_, key: string) => {
        if (!isAliasName(key)) {
            throw new Error(`未知路径别名：${key}`);
        }
        return config.aliases[key];
    });
    const resolved = path.resolve(cwd, expanded);
    const relative = path.relative(cwd, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Registry 输出路径越出项目目录：${target}`);
    }
    return resolved;
}

function sourceAlias(relative: string): string {
    return relative.startsWith('src/') ? `@/${relative.slice(4)}` : relative;
}

/** 按消费项目配置重写 Registry 源码中的 UEKit 标准别名。 @internal */
export function rewriteInstallAliases(content: string, config: UeKitConfig): string {
    return content
        .replaceAll('@/components/ui', sourceAlias(config.aliases.ui))
        .replaceAll('@/components/pro', sourceAlias(config.aliases.pro))
        .replaceAll('@/layouts', sourceAlias(config.aliases.layouts))
        .replaceAll('@/blocks', sourceAlias(config.aliases.blocks))
        .replaceAll('@/integrations', sourceAlias(config.aliases.integrations));
}

interface PackageManagerContext {
    manager: 'pnpm' | 'npm' | 'yarn' | 'bun';
    root: string;
}

function findLockRoot(cwd: string, lockfiles: string[]): string | undefined {
    let current = path.resolve(cwd);
    while (true) {
        if (lockfiles.some((file) => existsSync(path.join(current, file)))) return current;
        const parent = path.dirname(current);
        if (parent === current) return undefined;
        current = parent;
    }
}

function detectPackageManager(cwd: string): PackageManagerContext {
    const requestedManager = process.env.npm_config_user_agent?.split('/')[0];
    const candidates: Array<{
        manager: PackageManagerContext['manager'];
        lockfiles: string[];
    }> = [
        { manager: 'pnpm', lockfiles: ['pnpm-lock.yaml'] },
        { manager: 'yarn', lockfiles: ['yarn.lock'] },
        { manager: 'bun', lockfiles: ['bun.lock', 'bun.lockb'] },
        { manager: 'npm', lockfiles: ['package-lock.json', 'npm-shrinkwrap.json'] },
    ];
    const ordered = requestedManager
        ? [
              ...candidates.filter(({ manager }) => manager === requestedManager),
              ...candidates.filter(({ manager }) => manager !== requestedManager),
          ]
        : candidates;
    for (const candidate of ordered) {
        const root = findLockRoot(cwd, candidate.lockfiles);
        if (root) return { manager: candidate.manager, root };
    }
    return { manager: requestedManager === 'pnpm' ? 'pnpm' : 'npm', root: path.resolve(cwd) };
}

async function missingDependencies(cwd: string, dependencies: string[]): Promise<string[]> {
    const packageFile = path.join(cwd, 'package.json');
    if (!(await hasFile(packageFile))) return dependencies;
    await assertSafeProjectPath(cwd, packageFile, 'package.json 路径');
    const packageValue = await readJson(packageFile);
    if (!isRecord(packageValue)) {
        throw new Error(`${packageFile} 必须是 JSON 对象。`);
    }
    const dependenciesValue = packageValue.dependencies;
    const devDependenciesValue = packageValue.devDependencies;
    const packageDependencies = isRecord(dependenciesValue) ? dependenciesValue : {};
    const packageDevDependencies = isRecord(devDependenciesValue) ? devDependenciesValue : {};
    return dependencies.filter((specification) => {
        const separator = specification.startsWith('@')
            ? specification.lastIndexOf('@')
            : specification.indexOf('@');
        const name = separator > 0 ? specification.slice(0, separator) : specification;
        return !(name in packageDependencies) && !(name in packageDevDependencies);
    });
}

async function assertCompatibility(
    cwd: string,
    compatibility: Record<string, string>,
    label: string,
): Promise<void> {
    const nodeRange = compatibility.node;
    if (nodeRange && !semver.satisfies(process.version, nodeRange, { includePrerelease: true })) {
        throw new Error(`${label} 要求 Node ${nodeRange}，当前为 ${process.version}。`);
    }

    const packageFile = path.join(cwd, 'package.json');
    if (!(await hasFile(packageFile))) return;
    const packageValue = await readJson(packageFile);
    if (!isRecord(packageValue)) {
        throw new Error(`${packageFile} 必须是 JSON 对象。`);
    }
    const declared = {
        ...(isRecord(packageValue.dependencies) ? packageValue.dependencies : {}),
        ...(isRecord(packageValue.devDependencies) ? packageValue.devDependencies : {}),
        ...(isRecord(packageValue.peerDependencies) ? packageValue.peerDependencies : {}),
    };
    for (const [name, requiredRange] of Object.entries(compatibility)) {
        if (name === 'node' || typeof declared[name] !== 'string') continue;
        const declaredRange = semver.validRange(declared[name]);
        if (declaredRange && !semver.intersects(declaredRange, requiredRange)) {
            throw new Error(
                `${label} 要求 ${name} ${requiredRange}，项目声明为 ${declared[name]}。`,
            );
        }
    }
}

async function assertPackageManagerPaths(cwd: string, managerRoot: string): Promise<void> {
    for (const candidate of [
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lock',
        'bun.lockb',
        'node_modules',
    ]) {
        const root = candidate === 'package.json' ? cwd : managerRoot;
        const target = path.join(root, candidate);
        if (await hasFile(target)) {
            await assertSafeProjectPath(root, target, `包管理器路径 ${candidate}`);
        }
    }
}

function packageStateFiles(cwd: string): string[] {
    const { root } = detectPackageManager(cwd);
    return Array.from(
        new Set([
            path.join(cwd, 'package.json'),
            ...[
                'package-lock.json',
                'npm-shrinkwrap.json',
                'pnpm-lock.yaml',
                'yarn.lock',
                'bun.lock',
                'bun.lockb',
            ].map((file) => path.join(root, file)),
        ]),
    );
}

async function installDependencies(
    cwd: string,
    dependencies: string[],
    development = false,
    runner?: InstallOptions['packageManagerRunner'],
): Promise<void> {
    if (!dependencies.length) return;
    const { manager, root } = detectPackageManager(cwd);
    await assertPackageManagerPaths(cwd, root);
    const developmentFlag = development
        ? manager === 'npm' || manager === 'pnpm'
            ? '--save-dev'
            : '--dev'
        : '';
    const args = [manager === 'npm' ? 'install' : 'add'];
    if (developmentFlag) args.push(developmentFlag);
    args.push(...dependencies);
    const currentManager = process.env.npm_execpath;
    if (runner) {
        runner(manager, args, cwd);
        return;
    }
    if (
        manager !== 'bun' &&
        currentManager &&
        currentManager.toLowerCase().includes(manager.toLowerCase())
    ) {
        execFileSync(process.execPath, [currentManager, ...args], { cwd, stdio: 'inherit' });
        return;
    }
    execFileSync(manager, args, { cwd, stdio: 'inherit' });
}

/** 安装单个 Registry 条目新增且尚未声明的 npm 依赖。 @internal */
export async function installItemDependencies(cwd: string, item: RegistryItem): Promise<void> {
    const snapshotRoot = detectPackageManager(cwd).root;
    const snapshots = await captureFileSnapshots(snapshotRoot, packageStateFiles(cwd));
    try {
        await installDependencies(cwd, await missingDependencies(cwd, item.dependencies ?? []));
        await installDependencies(
            cwd,
            await missingDependencies(cwd, item.devDependencies ?? []),
            true,
        );
    } catch (cause) {
        try {
            await restoreFileSnapshots(snapshotRoot, snapshots);
        } catch (rollbackCause) {
            throw new AggregateError(
                [cause, rollbackCause],
                '依赖安装失败且包管理器状态回滚不完整。',
                { cause: rollbackCause },
            );
        }
        throw cause;
    }
}

async function resolveItems(registry: string, names: string[]): Promise<RegistryItem[]> {
    const ordered: RegistryItem[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    async function visit(name: string): Promise<void> {
        if (visited.has(name)) return;
        if (visiting.has(name)) throw new Error(`Registry 依赖存在循环：${name}`);
        visiting.add(name);
        const item = await loadRegistryItem(registry, name);
        for (const dependency of item.registryDependencies ?? []) await visit(dependency);
        visiting.delete(name);
        visited.add(name);
        ordered.push(item);
    }
    for (const name of names) await visit(name);
    return ordered;
}

/** 计算安装的文件、依赖和最终 Lock，不产生磁盘副作用。 */
export async function createInstallPlan(
    names: string[],
    options: InstallOptions,
): Promise<InstallPlan> {
    const index = await loadRegistryIndex(options.registry);
    await assertCompatibility(options.cwd, index.compatibility, `Registry ${index.name}`);
    const items = await resolveItems(options.registry, names);
    const lock = structuredClone(await loadLock(options.cwd, options.registry));
    const lockSource = registrySourceForLock(options.cwd, options.registry);
    const npmDependencies = new Set<string>();
    const npmDevDependencies = new Set<string>();
    const files: InstallFilePlan[] = [];
    const mutations: FileMutation[] = [];

    for (const item of items) {
        await assertCompatibility(options.cwd, item.compatibility ?? {}, item.name);
        const previousItem = lock.items[item.name];
        const lockedFiles = new Map((previousItem?.files ?? []).map((file) => [file.path, file]));
        for (const file of item.files) {
            if (typeof file.content !== 'string') {
                throw new Error(`${item.name}/${file.path} 缺少 content。`);
            }
            const target = resolveInstallTarget(options.cwd, options.config, file.target);
            await assertSafeProjectPath(options.cwd, target, 'Registry 输出路径');
            const relative = toPosix(path.relative(options.cwd, target));
            const previousFile = previousItem?.files.find((entry) => entry.path === relative);
            const exists = await hasFile(target);
            if (exists && !options.overwrite && !previousFile) {
                throw new Error(`${relative} 已存在；使用 --overwrite 才能覆盖。`);
            }
            if (exists && !options.overwrite && previousFile) {
                const current = await readFile(target, 'utf8');
                if (hashContent(current) !== previousFile.hash) {
                    if (previousItem?.version !== item.version) {
                        throw new Error(`${relative} 有本地修改；请使用 update --merge 升级。`);
                    }
                    files.push({ item: item.name, path: relative, action: 'preserve' });
                    continue;
                }
            }

            const content = rewriteInstallAliases(file.content, options.config);
            const base = path.join(options.cwd, '.uekit/bases', item.name, item.version, relative);
            await assertSafeProjectPath(options.cwd, base, 'Registry Base 路径');
            const hash = hashContent(content);
            mutations.push({ path: target, content }, { path: base, content });
            lockedFiles.set(relative, { path: relative, hash, baseHash: hash });
            files.push({ item: item.name, path: relative, action: 'write' });
        }
        for (const dependency of item.dependencies ?? []) npmDependencies.add(dependency);
        for (const dependency of item.devDependencies ?? []) npmDevDependencies.add(dependency);
        lock.items[item.name] = createLockedItem(previousItem, {
            version: item.version,
            source: registrySourceForLock(
                options.cwd,
                resolveRegistryItemSource(options.registry, item),
            ),
            dependencies: item.dependencies ?? [],
            devDependencies: item.devDependencies ?? [],
            files: [...lockedFiles.values()],
        });
    }

    lock.registry = lockSource;
    const lockFile = path.join(options.cwd, 'uekit.lock.json');
    await assertSafeProjectPath(options.cwd, lockFile, 'Registry Lock 路径');
    mutations.push({ path: lockFile, content: `${JSON.stringify(lock, null, 2)}\n` });
    return {
        items,
        files,
        dependencies: await missingDependencies(options.cwd, [...npmDependencies]),
        devDependencies: await missingDependencies(options.cwd, [...npmDevDependencies]),
        lock,
        mutations,
    };
}

/** 将安装计划格式化为稳定、可审查的终端输出。 */
export function formatInstallPlan(plan: InstallPlan): string {
    const lines = [
        `安装计划：${plan.items.map((item) => `${item.name}@${item.version}`).join(', ')}`,
    ];
    for (const file of plan.files) {
        lines.push(`- ${file.action === 'write' ? '写入' : '保留'} ${file.path}`);
    }
    if (plan.dependencies.length) lines.push(`- 运行时依赖：${plan.dependencies.join(', ')}`);
    if (plan.devDependencies.length) lines.push(`- 开发依赖：${plan.devDependencies.join(', ')}`);
    return lines.join('\n');
}

/**
 * 安装条目及其 Registry 依赖，并维护可用于差异比较的 Lock/Base。
 *
 * @returns 按依赖顺序处理的条目名称。
 */
export async function installItems(names: string[], options: InstallOptions): Promise<string[]> {
    const plan = await createInstallPlan(names, options);
    if (options.dryRun) {
        console.log(formatInstallPlan(plan));
        return plan.items.map((item) => item.name);
    }

    const packageSnapshotRoot = detectPackageManager(options.cwd).root;
    const packageSnapshots = options.skipInstall
        ? []
        : await captureFileSnapshots(packageSnapshotRoot, packageStateFiles(options.cwd));
    try {
        if (!options.skipInstall) {
            await installDependencies(
                options.cwd,
                plan.dependencies,
                false,
                options.packageManagerRunner,
            );
            await installDependencies(
                options.cwd,
                plan.devDependencies,
                true,
                options.packageManagerRunner,
            );
        }
        await commitFileTransaction(options.cwd, plan.mutations);
    } catch (cause) {
        if (packageSnapshots.length) {
            try {
                await restoreFileSnapshots(packageSnapshotRoot, packageSnapshots);
            } catch (rollbackCause) {
                throw new AggregateError(
                    [cause, rollbackCause],
                    '安装失败且包管理器状态回滚不完整。',
                    { cause: rollbackCause },
                );
            }
        }
        throw cause;
    }
    return plan.items.map((item) => item.name);
}

/** 将主题样式导入写入消费项目入口，已存在时保持幂等。 */
export async function injectThemeImport(cwd: string, config: UeKitConfig): Promise<void> {
    const candidates = ['src/main.ts', 'src/main.js'];
    const importPath = sourceAlias(config.theme.css);
    for (const candidate of candidates) {
        const file = path.join(cwd, candidate);
        if (!(await hasFile(file))) continue;
        await assertSafeProjectPath(cwd, file, '应用入口路径');
        const content = await readFile(file, 'utf8');
        const statement = `import '${importPath}';`;
        if (!content.includes(importPath)) {
            await writeFile(file, `${statement}\n${content}`, 'utf8');
        }
        return;
    }
}
