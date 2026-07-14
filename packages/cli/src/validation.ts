/**
 * Registry 清单、条目和文件路径校验。
 *
 * @remarks
 * 该模块是远端输入与构建输入的共同信任边界，并阻止路径穿越、未知别名和循环依赖。
 */

import { access, lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import npa from 'npm-package-arg';
import semver from 'semver';
import { hashContent } from './fs-utils.js';
import type { RegistryFileSource, RegistryIndex, RegistryItem } from './types.js';

const itemNamePattern = /^[a-z0-9-]+$/;
const registryTypes = new Set([
    'registry:foundation',
    'registry:ui',
    'registry:pro',
    'registry:layout',
    'registry:block',
    'registry:integration',
]);
const knownAliases = new Set(['ui', 'pro', 'layouts', 'blocks', 'integrations', 'lib', 'styles']);
const maximumRegistryFiles = 100;
const maximumRegistryFileBytes = 1024 * 1024;

function fail(message: string): never {
    throw new Error(`Registry 校验失败：${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) {
        fail(`${label} 必须是非空字符串。`);
    }
}

function requireStringArray(value: unknown, label: string): asserts value is string[] {
    if (
        !Array.isArray(value) ||
        value.some((entry) => typeof entry !== 'string' || !entry.trim())
    ) {
        fail(`${label} 必须是字符串数组。`);
    }
}

function assertKnownKeys(value: Record<string, unknown>, keys: readonly string[], label: string) {
    const known = new Set(keys);
    for (const key of Object.keys(value)) {
        if (!known.has(key)) {
            fail(`${label} 包含未知字段：${key}`);
        }
    }
}

/** 校验可用于 Registry 请求和依赖解析的条目名称。 */
export function assertRegistryItemName(value: string, label = '条目名称'): void {
    if (!itemNamePattern.test(value)) {
        fail(`${label}不合法：${value}`);
    }
}

function assertNpmDependency(specification: string, label: string): void {
    let parsed;
    try {
        parsed = npa(specification);
    } catch {
        fail(`${label} 不是有效的 npm 依赖规格：${specification}`);
    }
    if (
        !parsed.name ||
        (parsed.type !== 'version' && parsed.type !== 'range') ||
        !parsed.rawSpec ||
        parsed.rawSpec === '*'
    ) {
        fail(`${label} 必须使用带明确版本或范围的 npm 包规格：${specification}`);
    }
}

function assertNpmDependencies(value: unknown, label: string): asserts value is string[] {
    requireStringArray(value, label);
    value.forEach((entry, index) => assertNpmDependency(entry, `${label}[${index}]`));
}

function assertSafeRelativePath(value: string, label: string): void {
    if (path.isAbsolute(value) || value.split(/[\\/]/).includes('..')) {
        fail(`${label} 不能是绝对路径或包含 ..：${value}`);
    }
}

function assertTarget(target: string, label: string): void {
    assertSafeRelativePath(target, label);
    for (const match of target.matchAll(/\{([^}]+)\}/g)) {
        const alias = match[1];
        if (!alias || !knownAliases.has(alias)) {
            fail(`${label} 使用了未知别名：${alias ?? ''}`);
        }
    }
    if (target.replace(/\{[a-z]+\}/g, 'root').includes('{')) {
        fail(`${label} 包含无效路径占位符：${target}`);
    }
}

function assertCompatibility(value: unknown, label: string, required = false): void {
    if (value === undefined) {
        if (required) fail(`${label} 为必填字段。`);
        return;
    }
    if (!isRecord(value)) {
        fail(`${label} 必须是对象。`);
    }
    for (const [name, range] of Object.entries(value)) {
        requireString(range, `${label}.${name}`);
        if (name !== 'node') {
            try {
                const parsed = npa(name);
                if (parsed.name !== name || parsed.raw !== name) {
                    fail(`${label} 包含无效 npm 包名：${name}`);
                }
            } catch {
                fail(`${label} 包含无效 npm 包名：${name}`);
            }
        }
        if (!semver.validRange(range)) {
            fail(`${label}.${name} 不是有效 SemVer 范围：${range}`);
        }
    }
}

function assertRegistryFile(
    value: unknown,
    label: string,
    requireBuiltContent: boolean,
): asserts value is RegistryFileSource {
    if (!isRecord(value)) {
        fail(`${label} 必须是对象。`);
    }
    assertKnownKeys(value, ['path', 'target', 'content', 'hash'], label);
    requireString(value.path, `${label}.path`);
    requireString(value.target, `${label}.target`);
    assertSafeRelativePath(value.path, `${label}.path`);
    assertTarget(value.target, `${label}.target`);
    if (requireBuiltContent) {
        if (typeof value.content !== 'string') {
            fail(`${label}.content 缺失。`);
        }
        if (Buffer.byteLength(value.content, 'utf8') > maximumRegistryFileBytes) {
            fail(`${label}.content 超过 1 MiB 限制。`);
        }
        requireString(value.hash, `${label}.hash`);
        if (hashContent(value.content) !== value.hash) {
            fail(`${label}.hash 与源码内容不一致。`);
        }
    }
}

/** 校验单个 Registry 条目及其文件声明。 */
export function assertRegistryItem(
    value: unknown,
    options: { requireBuiltContent?: boolean } = {},
): asserts value is RegistryItem {
    if (!isRecord(value)) {
        fail('Registry 条目必须是对象。');
    }
    assertKnownKeys(
        value,
        [
            'name',
            'type',
            'version',
            'url',
            'description',
            'dependencies',
            'devDependencies',
            'registryDependencies',
            'compatibility',
            'files',
        ],
        'Registry 条目',
    );
    requireString(value.name, 'item.name');
    assertRegistryItemName(value.name);
    requireString(value.type, `${value.name}.type`);
    if (!registryTypes.has(value.type)) {
        fail(`${value.name}.type 不在支持的 Registry 类型中。`);
    }
    requireString(value.version, `${value.name}.version`);
    if (semver.valid(value.version) !== value.version) {
        fail(`${value.name}.version 不是有效版本号。`);
    }
    requireString(value.url, `${value.name}.url`);
    const expectedUrl = `items/${value.name}/${value.version}.json`;
    if (value.url !== expectedUrl) {
        fail(`${value.name}.url 必须是 ${expectedUrl}。`);
    }
    if (value.description !== undefined)
        requireString(value.description, `${value.name}.description`);
    if (value.dependencies !== undefined)
        assertNpmDependencies(value.dependencies, `${value.name}.dependencies`);
    if (value.devDependencies !== undefined)
        assertNpmDependencies(value.devDependencies, `${value.name}.devDependencies`);
    if (value.registryDependencies !== undefined) {
        requireStringArray(value.registryDependencies, `${value.name}.registryDependencies`);
        value.registryDependencies.forEach((dependency, index) =>
            assertRegistryItemName(dependency, `${value.name}.registryDependencies[${index}]`),
        );
    }
    assertCompatibility(value.compatibility, `${value.name}.compatibility`);
    if (!Array.isArray(value.files) || !value.files.length) {
        fail(`${value.name}.files 不能为空。`);
    }
    if (value.files.length > maximumRegistryFiles) {
        fail(`${value.name}.files 超过 ${maximumRegistryFiles} 个文件限制。`);
    }
    value.files.forEach((file, index) =>
        assertRegistryFile(
            file,
            `${value.name}.files[${index}]`,
            options.requireBuiltContent ?? false,
        ),
    );
}

/** 校验 Registry 索引和其中的条目摘要。 */
export function assertRegistryIndex(value: unknown): asserts value is RegistryIndex {
    if (!isRecord(value)) fail('Registry index 必须是对象。');
    assertKnownKeys(
        value,
        ['$schema', 'schemaVersion', 'name', 'homepage', 'compatibility', 'items'],
        'Registry index',
    );
    if (value.schemaVersion !== 1) fail('schemaVersion 必须为 1。');
    requireString(value.name, 'name');
    if (value.homepage !== undefined) requireString(value.homepage, 'homepage');
    assertCompatibility(value.compatibility, 'compatibility', true);
    if (!Array.isArray(value.items) || !value.items.length) fail('items 不能为空。');
    value.items.forEach((item) => assertRegistryItem(item));
}

function assertNoDuplicates(values: string[], label: string): void {
    const seen = new Set<string>();
    for (const value of values) {
        if (seen.has(value)) fail(`${label} 存在重复项：${value}`);
        seen.add(value);
    }
}

function assertAcyclicDependencies(items: RegistryItem[]): void {
    const itemByName = new Map(items.map((item) => [item.name, item]));
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(name: string, chain: string[]): void {
        if (visited.has(name)) return;
        if (visiting.has(name)) fail(`Registry 依赖存在循环：${[...chain, name].join(' -> ')}`);
        visiting.add(name);
        for (const dependency of itemByName.get(name)?.registryDependencies ?? [])
            visit(dependency, [...chain, name]);
        visiting.delete(name);
        visited.add(name);
    }

    for (const item of items) visit(item.name, []);
}

/**
 * 校验源码清单的依赖、全局目标唯一性和源码可读性。
 *
 * @returns 通过校验、可安全用于构建的 Registry 索引。
 */
export async function validateRegistryManifest(
    root: string,
    value: unknown,
): Promise<RegistryIndex> {
    assertRegistryIndex(value);
    const manifest = value;
    const names = manifest.items.map((item) => item.name);
    const nameSet = new Set(names);
    assertNoDuplicates(names, '条目名称');
    assertAcyclicDependencies(manifest.items);

    const globalTargets: string[] = [];
    const realRoot = await realpath(root);
    for (const item of manifest.items) {
        assertNoDuplicates(item.dependencies ?? [], `${item.name}.dependencies`);
        assertNoDuplicates(item.devDependencies ?? [], `${item.name}.devDependencies`);
        assertNoDuplicates(item.registryDependencies ?? [], `${item.name}.registryDependencies`);
        assertNoDuplicates(
            item.files.map((file) => file.path),
            `${item.name}.files.path`,
        );
        assertNoDuplicates(
            item.files.map((file) => file.target),
            `${item.name}.files.target`,
        );
        for (const dependency of item.registryDependencies ?? []) {
            if (!nameSet.has(dependency)) fail(`${item.name} 引用了不存在的条目：${dependency}`);
            if (dependency === item.name) fail(`${item.name} 不能依赖自身。`);
        }
        for (const file of item.files) {
            const absolute = path.resolve(root, file.path);
            const relative = path.relative(root, absolute);
            if (relative.startsWith('..') || path.isAbsolute(relative))
                fail(`${item.name} 的源码文件越出仓库：${file.path}`);
            let stats: Awaited<ReturnType<typeof lstat>>;
            let realSource: string;
            try {
                await access(absolute);
                stats = await lstat(absolute);
                realSource = await realpath(absolute);
                await readFile(absolute, 'utf8');
            } catch {
                fail(`${item.name} 的源码文件不存在或不可读：${file.path}`);
            }
            if (stats.isSymbolicLink() || !stats.isFile()) {
                fail(`${item.name} 的源码必须是普通文件：${file.path}`);
            }
            const realRelative = path.relative(realRoot, realSource);
            if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
                fail(`${item.name} 的源码文件通过符号链接越出仓库：${file.path}`);
            }
            globalTargets.push(file.target);
        }
    }
    assertNoDuplicates(globalTargets, 'Registry 输出目标');
    return manifest;
}
