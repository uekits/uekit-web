/**
 * Registry 构建、安装保护和消费项目配置的 CLI 单元测试。
 *
 * @remarks
 * 使用临时目录验证真实文件副作用，不访问远端 Registry，也不安装业务依赖。
 */

import { writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import registryManifest from '../../../registry.json';
import { buildRegistry, releaseRegistry } from '../src/build-registry.js';
import { defaultConfig, loadConfig, loadLock, writeDefaultConfig } from '../src/config.js';
import { hashContent, writeJson } from '../src/fs-utils.js';
import { installItemDependencies, installItems, resolveInstallTarget } from '../src/installer.js';
import { loadRegistryIndex, loadRegistryItem } from '../src/registry.js';
import { configureTailwindVite } from '../src/tailwind.js';
import { diffItem, updateItem } from '../src/upgrade.js';
import { assertRegistryItem, validateRegistryManifest } from '../src/validation.js';

const temporaryDirectories: string[] = [];

async function createRegistryOutput(root: string): Promise<string> {
    await mkdir(path.join(root, 'test-results'), { recursive: true });
    const parent = await mkdtemp(path.join(root, 'test-results/uekit-registry-'));
    temporaryDirectories.push(parent);
    return path.join(parent, 'output');
}

async function writeUpgradeRegistry(
    registry: string,
    version: string,
    content: string,
): Promise<void> {
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
                hash: hashContent(content),
            },
        ],
    };
    await writeJson(path.join(registry, item.url), item);
    await writeJson(path.join(registry, 'index.json'), {
        schemaVersion: 1,
        name: 'test-registry',
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

afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    const { rm } = await import('node:fs/promises');
    await Promise.all(
        temporaryDirectories
            .splice(0)
            .map((directory) => rm(directory, { recursive: true, force: true })),
    );
});

describe('UEKit Web Registry', () => {
    it('builds a static index with source content', async () => {
        const root = path.resolve(import.meta.dirname, '../../..');
        const output = await createRegistryOutput(root);
        await buildRegistry(root, output);
        const index = await loadRegistryIndex(output);
        expect(index.items.some((item) => item.name === 'pro-table')).toBe(true);
        const item: unknown = JSON.parse(
            await readFile(path.join(output, 'items/pro-table/0.1.0.json'), 'utf8'),
        );
        assertRegistryItem(item, { requireBuiltContent: true });
        expect(item.files[0].content).toContain('ue-pro-table');
        expect(item.files[0].hash).toMatch(/^[a-f0-9]{64}$/);
        expect(await readFile(path.join(output, 'schema.json'), 'utf8')).toContain(
            'UEKit Web Registry',
        );
        expect(await readFile(path.join(output, 'config.schema.json'), 'utf8')).toContain(
            'consumer configuration',
        );
        const theme: unknown = JSON.parse(
            await readFile(path.join(output, 'items/theme/0.1.0.json'), 'utf8'),
        );
        assertRegistryItem(theme, { requireBuiltContent: true });
        expect(theme.devDependencies).toContain('tailwindcss@^4.3.0');
        expect(theme.files[0].content).toContain("@import 'tailwindcss/utilities.css'");
        expect(theme.files[0].content).not.toContain('tailwindcss/preflight.css');
    });

    it('configures the Tailwind Vite plugin exactly once', async () => {
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-tailwind-'));
        temporaryDirectories.push(project);
        const viteConfig = path.join(project, 'vite.config.ts');
        await writeFile(
            viteConfig,
            'import vue from "@vitejs/plugin-vue";\nimport { defineConfig } from "vite";\n\nexport default defineConfig({\n  plugins: [vue()],\n});\n',
        );

        await configureTailwindVite(project);
        await configureTailwindVite(project);

        const content = await readFile(viteConfig, 'utf8');
        expect(content.match(/@tailwindcss\/vite/g)).toHaveLength(1);
        expect(content.match(/tailwindcss\(\)/g)).toHaveLength(1);
        expect(content).toContain('plugins: [vue(), tailwindcss()]');
    });

    it('installs dependencies and local source without overwriting edits', async () => {
        const root = path.resolve(import.meta.dirname, '../../..');
        const registry = await createRegistryOutput(root);
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-consumer-'));
        temporaryDirectories.push(project);
        await buildRegistry(root, registry);
        await writeFile(path.join(project, 'package.json'), '{"name":"consumer","private":true}\n');
        const config = defaultConfig();
        await installItems(['avatar', 'pro-table'], {
            cwd: project,
            config,
            registry,
            skipInstall: true,
        });
        const avatar = path.join(project, 'src/components/ui/avatar/Avatar.vue');
        expect(await readFile(avatar, 'utf8')).toContain('ElAvatar');
        await writeFile(avatar, `${await readFile(avatar, 'utf8')}\n<!-- local change -->\n`);
        await installItems(['avatar'], { cwd: project, config, registry, skipInstall: true });
        expect(await readFile(avatar, 'utf8')).toContain('local change');

        const table = path.join(project, 'src/components/pro/pro-table/ProTable.vue');
        await writeFile(table, `${await readFile(table, 'utf8')}\n<!-- local change -->\n`);
        await installItems(['pro-table'], { cwd: project, config, registry, skipInstall: true });
        const lock = await loadLock(project, registry);
        expect(lock.registry).toMatch(/^file:/);
        expect(lock.registry).not.toContain(project);
        expect(lock.items['pro-table']?.files.map((file) => file.path)).toEqual(
            expect.arrayContaining([
                'src/components/pro/pro-table/ProTable.vue',
                'src/components/pro/pro-table/table-types.ts',
            ]),
        );

        const installedAt = lock.items.avatar?.installedAt;
        await installItems(['avatar'], { cwd: project, config, registry, skipInstall: true });
        expect((await loadLock(project, registry)).items.avatar?.installedAt).toBe(installedAt);
    });

    it('prints a side-effect-free dry-run and rolls back package state on install failure', async () => {
        const root = path.resolve(import.meta.dirname, '../../..');
        const registry = await createRegistryOutput(root);
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-plan-'));
        temporaryDirectories.push(project);
        await buildRegistry(root, registry);
        const packageFile = path.join(project, 'package.json');
        const originalPackage = '{"name":"consumer","private":true}\n';
        await writeFile(packageFile, originalPackage);
        const config = defaultConfig();
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        await installItems(['button'], {
            cwd: project,
            config,
            registry,
            skipInstall: true,
            dryRun: true,
        });
        expect(log.mock.calls.flat().join('\n')).toContain('安装计划');
        await expect(readFile(path.join(project, 'uekit.lock.json'))).rejects.toThrow();
        await expect(
            readFile(path.join(project, 'src/components/ui/button/Button.vue')),
        ).rejects.toThrow();

        await expect(
            installItems(['button'], {
                cwd: project,
                config,
                registry,
                packageManagerRunner: (_command, _argumentsList, cwd) => {
                    writeFileSync(
                        path.join(cwd, 'package.json'),
                        '{"name":"consumer","dependencies":{"partial":"1.0.0"}}\n',
                    );
                    throw new Error('simulated package manager failure');
                },
            }),
        ).rejects.toThrow('simulated package manager failure');
        expect(await readFile(packageFile, 'utf8')).toBe(originalPackage);
        await expect(readFile(path.join(project, 'uekit.lock.json'))).rejects.toThrow();
        await expect(
            readFile(path.join(project, 'src/components/ui/button/Button.vue')),
        ).rejects.toThrow();
    });

    it('refuses unsafe Registry output directories and unmarked deletion targets', async () => {
        const root = path.resolve(import.meta.dirname, '../../..');
        const outside = await mkdtemp(path.join(os.tmpdir(), 'uekit-outside-'));
        const parent = await mkdtemp(path.join(root, 'test-results/uekit-unmarked-'));
        temporaryDirectories.push(outside, parent);
        await mkdir(path.join(parent, 'output'));

        await expect(buildRegistry(root, root)).rejects.toThrow('危险目录');
        await expect(buildRegistry(root, os.homedir())).rejects.toThrow('必须位于仓库内部');
        await expect(buildRegistry(root, outside)).rejects.toThrow('必须位于仓库内部');
        await expect(buildRegistry(root, path.join(parent, 'output'))).rejects.toThrow(
            '缺少安全标记',
        );
    });

    it('creates immutable versioned Registry releases and rejects same-version changes', async () => {
        const repository = path.resolve(import.meta.dirname, '../../..');
        await mkdir(path.join(repository, 'test-results'), { recursive: true });
        const root = await mkdtemp(path.join(repository, 'test-results/uekit-release-'));
        temporaryDirectories.push(root);
        await mkdir(path.join(root, 'registry'), { recursive: true });
        const source = path.join(root, 'registry/sample.ts');
        await writeFile(source, "export const value = 'v1';\n");
        await writeJson(path.join(root, 'registry.json'), {
            schemaVersion: 1,
            name: 'release-test',
            compatibility: { node: '>=20.19.0' },
            items: [
                {
                    name: 'sample',
                    type: 'registry:ui',
                    version: '0.1.0',
                    url: 'items/sample/0.1.0.json',
                    files: [{ path: 'registry/sample.ts', target: '{ui}/sample.ts' }],
                },
            ],
        });

        await releaseRegistry(root);
        expect(
            await readFile(path.join(root, 'registry-releases/items/sample/0.1.0.json'), 'utf8'),
        ).toContain("export const value = 'v1';");
        await writeFile(source, "export const value = 'changed';\n");
        await expect(releaseRegistry(root)).rejects.toThrow('禁止覆盖已发布资源');
    });

    it('rejects traversal, mismatched names, insecure remotes and symlink targets', async () => {
        const registry = await mkdtemp(path.join(os.tmpdir(), 'uekit-security-registry-'));
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-security-project-'));
        const outside = await mkdtemp(path.join(os.tmpdir(), 'uekit-security-outside-'));
        temporaryDirectories.push(registry, project, outside);
        await writeUpgradeRegistry(registry, '0.1.0', "export const value = 'safe';\n");

        await expect(loadRegistryItem(registry, '../sample')).rejects.toThrow('请求条目名称不合法');
        const index = JSON.parse(await readFile(path.join(registry, 'index.json'), 'utf8'));
        index.items.push({
            ...index.items[0],
            name: 'wrong',
            url: 'items/wrong/0.1.0.json',
        });
        await writeJson(path.join(registry, 'index.json'), index);
        await mkdir(path.join(registry, 'items/wrong'), { recursive: true });
        await writeFile(
            path.join(registry, 'items/wrong/0.1.0.json'),
            await readFile(path.join(registry, 'items/sample/0.1.0.json'), 'utf8'),
        );
        await expect(loadRegistryItem(registry, 'wrong')).rejects.toThrow('index 不一致');
        await expect(loadRegistryIndex('http://example.com/registry')).rejects.toThrow(
            '必须使用 HTTPS',
        );

        await mkdir(path.join(project, 'src/components'), { recursive: true });
        await symlink(outside, path.join(project, 'src/components/ui'));
        const config = defaultConfig();
        const target = resolveInstallTarget(project, config, '{ui}/sample.ts');
        expect(target).toContain('src/components/ui/sample.ts');
        await expect(
            installItems(['sample'], { cwd: project, config, registry, skipInstall: true }),
        ).rejects.toThrow('包含符号链接');

        const configTarget = path.join(outside, 'uekit.json');
        await writeFile(configTarget, '{"outside":true}\n');
        await symlink(configTarget, path.join(project, 'uekit.json'));
        await expect(writeDefaultConfig(project)).rejects.toThrow('包含符号链接');
        expect(await readFile(configTarget, 'utf8')).toBe('{"outside":true}\n');

        const packageProject = await mkdtemp(path.join(os.tmpdir(), 'uekit-package-symlink-'));
        temporaryDirectories.push(packageProject);
        const packageTarget = path.join(outside, 'package.json');
        await writeFile(packageTarget, '{"name":"outside"}\n');
        await symlink(packageTarget, path.join(packageProject, 'package.json'));
        await expect(
            installItemDependencies(packageProject, {
                name: 'sample',
                type: 'registry:ui',
                version: '0.1.0',
                url: 'items/sample/0.1.0.json',
                dependencies: ['element-plus@^2.14.0'],
                files: [],
            }),
        ).rejects.toThrow('包含符号链接');
    });

    it('rejects invalid npm dependency specifications and oversized source files', () => {
        expect(() =>
            assertRegistryItem({
                name: 'unsafe',
                type: 'registry:ui',
                version: '0.1.0',
                url: 'items/unsafe/0.1.0.json',
                dependencies: ['--ignore-scripts'],
                files: [{ path: 'unsafe.ts', target: '{ui}/unsafe.ts' }],
            }),
        ).toThrow('明确版本或范围');
        expect(() =>
            assertRegistryItem({
                name: 'legacy-version',
                type: 'registry:ui',
                version: '01.0.0',
                url: 'items/legacy-version/01.0.0.json',
                files: [{ path: 'legacy.ts', target: '{ui}/legacy.ts' }],
            }),
        ).toThrow('不是有效版本号');
        expect(() =>
            assertRegistryItem({
                name: 'unknown-field',
                type: 'registry:ui',
                version: '1.0.0',
                url: 'items/unknown-field/1.0.0.json',
                envVars: ['SECRET'],
                files: [{ path: 'unknown.ts', target: '{ui}/unknown.ts' }],
            }),
        ).toThrow('包含未知字段：envVars');
        expect(() =>
            assertRegistryItem(
                {
                    name: 'large',
                    type: 'registry:ui',
                    version: '0.1.0',
                    url: 'items/large/0.1.0.json',
                    files: [
                        {
                            path: 'large.ts',
                            target: '{ui}/large.ts',
                            content: 'x'.repeat(1024 * 1024 + 1),
                            hash: hashContent('x'.repeat(1024 * 1024 + 1)),
                        },
                    ],
                },
                { requireBuiltContent: true },
            ),
        ).toThrow('超过 1 MiB');
    });

    it('limits the actual size of remote Registry responses', async () => {
        const response = new Response('x'.repeat(5 * 1024 * 1024 + 1));
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => response),
        );

        await expect(loadRegistryIndex('https://registry.example.com/web/v1')).rejects.toThrow(
            '响应超过 5 MiB',
        );
    });

    it('rejects a secure Registry that redirects to non-loopback HTTP', async () => {
        const response = new Response('{}');
        Object.defineProperty(response, 'url', { value: 'http://example.com/index.json' });
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => response),
        );

        await expect(loadRegistryIndex('https://registry.example.com/web/v1')).rejects.toThrow(
            '必须使用 HTTPS',
        );
    });

    it('rejects invalid consumer configuration instead of trusting JSON shape', async () => {
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-config-'));
        temporaryDirectories.push(project);
        await writeFile(path.join(project, 'uekit.json'), '{"typescript":"yes"}\n');
        await expect(loadConfig(project)).rejects.toThrow('typescript 当前只支持 true');
    });

    it('enforces global compatibility ranges before producing an install plan', async () => {
        const root = path.resolve(import.meta.dirname, '../../..');
        const registry = await createRegistryOutput(root);
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-incompatible-'));
        temporaryDirectories.push(project);
        await buildRegistry(root, registry);
        await writeFile(
            path.join(project, 'package.json'),
            '{"name":"consumer","private":true,"dependencies":{"vue":"^2.7.0"}}\n',
        );

        await expect(
            installItems(['button'], {
                cwd: project,
                config: defaultConfig(),
                registry,
                skipInstall: true,
                dryRun: true,
            }),
        ).rejects.toThrow('要求 vue >=3.5.0');
        await expect(loadLock(project, registry)).resolves.toMatchObject({ items: {} });
    });

    it('rejects missing Registry dependencies before producing output', async () => {
        const root = path.resolve(import.meta.dirname, '../../..');
        const manifest = structuredClone(registryManifest);
        manifest.items[0].registryDependencies = ['missing-item'];
        await expect(validateRegistryManifest(root, manifest)).rejects.toThrow(
            '引用了不存在的条目',
        );
    });

    it('tracks diff and updates an unmodified item with a new baseline', async () => {
        const registry = await mkdtemp(path.join(os.tmpdir(), 'uekit-upgrade-registry-'));
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-upgrade-project-'));
        temporaryDirectories.push(registry, project);
        await writeFile(path.join(project, 'package.json'), '{"name":"consumer","private":true}\n');
        const config = defaultConfig();
        const source = path.join(project, 'src/components/ui/sample.ts');
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        await writeUpgradeRegistry(registry, '0.1.0', "export const value = 'v1';\n");
        await installItems(['sample'], { cwd: project, config, registry, skipInstall: true });
        expect(await diffItem(project, 'sample', registry)).toBe(false);

        await writeUpgradeRegistry(registry, '0.2.0', "export const value = 'v2';\n");
        await updateItem(project, config, 'sample', registry, false);
        expect(await readFile(source, 'utf8')).toContain("'v2'");
        expect((await loadLock(project, registry)).items.sample?.version).toBe('0.2.0');
        expect(await diffItem(project, 'sample', registry)).toBe(false);

        await writeFile(source, "export const value = 'local';\n");
        await writeUpgradeRegistry(registry, '0.3.0', "export const value = 'v3';\n");
        await updateItem(project, config, 'sample', registry, false);
        expect(await readFile(source, 'utf8')).toContain("'local'");
        expect((await loadLock(project, registry)).items.sample?.version).toBe('0.2.0');
        expect(await diffItem(project, 'sample', registry)).toBe(true);

        log.mockRestore();
    });

    it('updates Lock/Base after a clean merge and preserves conflicts beside the source', async () => {
        const registry = await mkdtemp(path.join(os.tmpdir(), 'uekit-merge-registry-'));
        const project = await mkdtemp(path.join(os.tmpdir(), 'uekit-merge-project-'));
        temporaryDirectories.push(registry, project);
        await writeFile(path.join(project, 'package.json'), '{"name":"consumer","private":true}\n');
        const config = defaultConfig();
        const source = path.join(project, 'src/components/ui/sample.ts');
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        await writeUpgradeRegistry(
            registry,
            '0.1.0',
            "export const upstream = 'v1';\nexport const stableOne = 1;\nexport const stableTwo = 2;\nexport const stableThree = 3;\nexport const local = 'base';\n",
        );
        await installItems(['sample'], { cwd: project, config, registry, skipInstall: true });
        await writeFile(
            source,
            "export const upstream = 'v1';\nexport const stableOne = 1;\nexport const stableTwo = 2;\nexport const stableThree = 3;\nexport const local = 'custom';\n",
        );

        const versionTwo =
            "export const upstream = 'v2';\nexport const stableOne = 1;\nexport const stableTwo = 2;\nexport const stableThree = 3;\nexport const local = 'base';\n";
        await writeUpgradeRegistry(registry, '0.2.0', versionTwo);
        await updateItem(project, config, 'sample', registry, true);
        const merged = await readFile(source, 'utf8');
        expect(merged).toContain("upstream = 'v2'");
        expect(merged).toContain("local = 'custom'");
        const lockAfterMerge = await loadLock(project, registry);
        expect(lockAfterMerge.items.sample?.version).toBe('0.2.0');
        expect(
            await readFile(
                path.join(project, '.uekit/bases/sample/0.2.0/src/components/ui/sample.ts'),
                'utf8',
            ),
        ).toBe(versionTwo);
        await expect(readFile(`${source}.uekit-merge`, 'utf8')).rejects.toThrow();

        const versionThree =
            "export const upstream = 'v3';\nexport const stableOne = 1;\nexport const stableTwo = 2;\nexport const stableThree = 3;\nexport const local = 'upstream';\n";
        await writeUpgradeRegistry(registry, '0.3.0', versionThree);
        await writeFile(`${source}.uekit-merge`, 'existing merge result\n');
        await expect(updateItem(project, config, 'sample', registry, true)).rejects.toThrow(
            '已存在',
        );
        expect(await readFile(`${source}.uekit-merge`, 'utf8')).toBe('existing merge result\n');
        await rm(`${source}.uekit-merge`);
        await updateItem(project, config, 'sample', registry, true);
        expect(await readFile(source, 'utf8')).toBe(merged);
        const conflict = await readFile(`${source}.uekit-merge`, 'utf8');
        expect(conflict).toContain('<<<<<<<');
        expect(conflict).toContain("local = 'custom'");
        expect(conflict).toContain("local = 'upstream'");
        expect((await loadLock(project, registry)).items.sample?.version).toBe('0.3.0');
        expect(await diffItem(project, 'sample', registry)).toBe(true);

        log.mockRestore();
    });
});
