/**
 * UEKit 消费项目配置与 Lock 文件加载。
 *
 * @remarks
 * 所有磁盘输入在进入安装流程前完成结构校验，避免用类型断言信任用户文件。
 */

import { access } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeProjectPath, readJson, writeJson } from './fs-utils.js';
import type { LockedFile, LockedItem, UeKitAliases, UeKitConfig, UeKitLock } from './types.js';
import { assertRegistryItemName } from './validation.js';

/** UEKit 消费配置的固定文件名。 */
export const CONFIG_NAME = 'uekit.json';
/** UEKit 安装状态的固定文件名。 */
export const LOCK_NAME = 'uekit.lock.json';
/** 未显式配置时使用的官方 Registry 根地址。 */
export const DEFAULT_REGISTRY = 'https://registry.uekit.com/web/v1';

type ConfigOverrides = Partial<Omit<UeKitConfig, 'aliases' | 'theme' | 'tailwind'>> & {
    aliases?: Partial<UeKitAliases>;
    theme?: Partial<UeKitConfig['theme']>;
};

const aliasNames = ['ui', 'pro', 'layouts', 'blocks', 'integrations', 'lib', 'styles'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
    if (!isRecord(value)) {
        throw new Error(`${label} 必须是对象。`);
    }
    return value;
}

function assertKnownKeys(
    value: Record<string, unknown>,
    keys: readonly string[],
    label: string,
): void {
    const known = new Set(keys);
    for (const key of Object.keys(value)) {
        if (!known.has(key)) {
            throw new Error(`${label} 包含未知字段：${key}。`);
        }
    }
}

function optionalString(
    value: Record<string, unknown>,
    key: string,
    label: string,
): string | undefined {
    const candidate = value[key];
    if (candidate === undefined) {
        return undefined;
    }
    if (typeof candidate !== 'string' || !candidate.trim()) {
        throw new Error(`${label} 必须是非空字符串。`);
    }
    return candidate;
}

function parseConfig(value: unknown): ConfigOverrides {
    const input = requireRecord(value, CONFIG_NAME);
    assertKnownKeys(
        input,
        ['$schema', 'style', 'typescript', 'registry', 'aliases', 'theme', 'tailwind'],
        CONFIG_NAME,
    );
    const aliasesInput =
        input.aliases === undefined ? undefined : requireRecord(input.aliases, 'aliases');
    if (aliasesInput) {
        assertKnownKeys(aliasesInput, aliasNames, 'aliases');
    }
    const aliases: Partial<UeKitAliases> = {};
    for (const name of aliasNames) {
        const alias = aliasesInput
            ? optionalString(aliasesInput, name, `aliases.${name}`)
            : undefined;
        if (alias !== undefined) {
            aliases[name] = alias;
        }
    }

    const themeInput = input.theme === undefined ? undefined : requireRecord(input.theme, 'theme');
    if (themeInput) {
        assertKnownKeys(themeInput, ['css'], 'theme');
    }
    const css = themeInput ? optionalString(themeInput, 'css', 'theme.css') : undefined;
    const typescript = input.typescript;
    if (typescript !== undefined && typescript !== true) {
        throw new Error('typescript 当前只支持 true。');
    }

    if (input.tailwind !== undefined) {
        const tailwind = requireRecord(input.tailwind, 'tailwind');
        assertKnownKeys(tailwind, ['enabled', 'version', 'preflight'], 'tailwind');
        if (tailwind.enabled !== true || tailwind.version !== 4 || tailwind.preflight !== false) {
            throw new Error('tailwind 必须使用 enabled=true、version=4、preflight=false。');
        }
    }

    const parsed: ConfigOverrides = {};
    const schema = optionalString(input, '$schema', '$schema');
    const style = optionalString(input, 'style', 'style');
    if (style !== undefined && style !== 'default') {
        throw new Error('style 当前只支持 default。');
    }
    const registry = optionalString(input, 'registry', 'registry');
    if (schema !== undefined) parsed.$schema = schema;
    if (style !== undefined) parsed.style = style;
    if (typescript !== undefined) parsed.typescript = typescript;
    if (registry !== undefined) parsed.registry = registry;
    if (aliasesInput) parsed.aliases = aliases;
    if (themeInput) parsed.theme = css === undefined ? {} : { css };
    return parsed;
}

function requireString(value: unknown, label: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${label} 必须是非空字符串。`);
    }
    return value;
}

function parseLockedFile(value: unknown, label: string): LockedFile {
    const file = requireRecord(value, label);
    const filePath = requireString(file.path, `${label}.path`);
    if (path.isAbsolute(filePath) || filePath.split(/[\\/]/).includes('..')) {
        throw new Error(`${label}.path 不能是绝对路径或包含 ..。`);
    }
    const hash = requireString(file.hash, `${label}.hash`);
    const baseHash = requireString(file.baseHash, `${label}.baseHash`);
    if (!/^[a-f0-9]{64}$/.test(hash) || !/^[a-f0-9]{64}$/.test(baseHash)) {
        throw new Error(`${label} 的 hash 和 baseHash 必须是 SHA-256。`);
    }
    return {
        path: filePath,
        hash,
        baseHash,
    };
}

function parseLockedItem(value: unknown, label: string): LockedItem {
    const item = requireRecord(value, label);
    if (!Array.isArray(item.dependencies) || !Array.isArray(item.devDependencies)) {
        throw new Error(`${label} 的依赖字段必须是数组。`);
    }
    if (!Array.isArray(item.files)) {
        throw new Error(`${label}.files 必须是数组。`);
    }
    const dependencies = item.dependencies.map((entry, index) =>
        requireString(entry, `${label}.dependencies[${index}]`),
    );
    const devDependencies = item.devDependencies.map((entry, index) =>
        requireString(entry, `${label}.devDependencies[${index}]`),
    );
    return {
        version: requireString(item.version, `${label}.version`),
        source: requireString(item.source, `${label}.source`),
        dependencies,
        devDependencies,
        installedAt: requireString(item.installedAt, `${label}.installedAt`),
        files: item.files.map((file, index) => parseLockedFile(file, `${label}.files[${index}]`)),
    };
}

function parseLock(value: unknown): UeKitLock {
    const lock = requireRecord(value, LOCK_NAME);
    if (lock.lockfileVersion !== 1) {
        throw new Error(`${LOCK_NAME}.lockfileVersion 必须为 1。`);
    }
    const itemsInput = requireRecord(lock.items, `${LOCK_NAME}.items`);
    const items: Record<string, LockedItem> = {};
    for (const [name, item] of Object.entries(itemsInput)) {
        assertRegistryItemName(name, 'Lock 条目名称');
        items[name] = parseLockedItem(item, `${LOCK_NAME}.items.${name}`);
    }
    return {
        lockfileVersion: 1,
        registry: requireString(lock.registry, `${LOCK_NAME}.registry`),
        items,
    };
}

/** 将本地 Registry 规范化为相对消费项目的可移植 Lock 来源。 */
export function registrySourceForLock(cwd: string, source: string): string {
    if (/^https?:\/\//i.test(source)) return source;
    const relative = path.relative(path.resolve(cwd), path.resolve(source));
    const portable = relative ? relative.split(path.sep).join('/') : '.';
    return `file:${portable.startsWith('.') ? portable : `./${portable}`}`;
}

/**
 * 创建 Lock 条目；安装状态未变化时保留原安装时间，避免无意义的版本库漂移。
 */
export function createLockedItem(
    previous: LockedItem | undefined,
    value: Omit<LockedItem, 'installedAt'>,
): LockedItem {
    const unchanged =
        previous !== undefined &&
        previous.version === value.version &&
        previous.source === value.source &&
        JSON.stringify(previous.dependencies) === JSON.stringify(value.dependencies) &&
        JSON.stringify(previous.devDependencies) === JSON.stringify(value.devDependencies) &&
        JSON.stringify(previous.files) === JSON.stringify(value.files);
    return {
        ...value,
        installedAt: unchanged ? previous.installedAt : new Date().toISOString(),
    };
}

/** 创建符合当前 UEKit 架构约束的完整默认配置。 */
export function defaultConfig(): UeKitConfig {
    return {
        $schema: 'https://registry.uekit.com/web/v1/config.schema.json',
        style: 'default',
        typescript: true,
        registry: DEFAULT_REGISTRY,
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
    };
}

/**
 * 判断路径是否存在。
 *
 * @remarks
 * 仅将不存在视为 `false`；权限和其他 I/O 错误继续向上传递，避免被误报为缺少文件。
 */
export async function hasFile(file: string): Promise<boolean> {
    try {
        await access(file);
        return true;
    } catch (error) {
        if (isRecord(error) && error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

/** 加载并校验消费项目配置，再用固定默认值补齐可选字段。 */
export async function loadConfig(cwd: string): Promise<UeKitConfig> {
    const file = path.join(cwd, CONFIG_NAME);
    if (!(await hasFile(file))) {
        throw new Error(`未找到 ${CONFIG_NAME}，请先运行 init。`);
    }
    const defaults = defaultConfig();
    const value = parseConfig(await readJson(file));
    return {
        ...defaults,
        ...value,
        aliases: { ...defaults.aliases, ...value.aliases },
        theme: { ...defaults.theme, ...value.theme },
        tailwind: defaults.tailwind,
    };
}

/** 创建默认消费配置。 */
export async function writeDefaultConfig(cwd: string): Promise<UeKitConfig> {
    const config = defaultConfig();
    const file = path.join(cwd, CONFIG_NAME);
    await assertSafeProjectPath(cwd, file, 'UEKit 配置路径');
    await writeJson(file, config);
    return config;
}

/** 加载并校验 Lock；文件不存在时返回空 Lock。 */
export async function loadLock(cwd: string, registry: string): Promise<UeKitLock> {
    const file = path.join(cwd, LOCK_NAME);
    if (!(await hasFile(file))) {
        return { lockfileVersion: 1, registry, items: {} };
    }
    return parseLock(await readJson(file));
}
