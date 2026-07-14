#!/usr/bin/env node
/**
 * UEKit Web Registry 命令行入口。
 *
 * @remarks
 * 负责命令编排和终端反馈；文件写入、协议校验与覆盖保护由专用模块完成。
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { buildRegistry, releaseRegistry } from './build-registry.js';
import {
    CONFIG_NAME,
    DEFAULT_REGISTRY,
    defaultConfig,
    hasFile,
    loadConfig,
    loadLock,
    writeDefaultConfig,
} from './config.js';
import { assertSafeProjectPath } from './fs-utils.js';
import { injectThemeImport, installItems } from './installer.js';
import { loadRegistryIndex, loadRegistryItem } from './registry.js';
import { configureTailwindVite } from './tailwind.js';
import { diffItem, updateItem } from './upgrade.js';

const program = new Command();
const cliPackage: unknown = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
if (
    typeof cliPackage !== 'object' ||
    cliPackage === null ||
    !('version' in cliPackage) ||
    typeof cliPackage.version !== 'string'
) {
    throw new Error('CLI package.json 缺少有效 version。');
}
program
    .name('uekit-web')
    .description('Install editable UEKit Web source from the Registry.')
    .version(cliPackage.version);

function registryOption(cwd: string, configRegistry: string, value?: string): string {
    const source = value ?? configRegistry;
    if (/^https?:\/\//i.test(source)) return source;
    const localSource = source.startsWith('file:') ? source.slice('file:'.length) : source;
    return path.resolve(cwd, localSource);
}

program
    .command('init')
    .description('Initialize UEKit Web in the current Vue project.')
    .option('--cwd <path>', 'project directory', process.cwd())
    .option('--registry <source>', 'Registry directory or URL')
    .option('--skip-install', 'do not install npm dependencies')
    .option('--dry-run', 'print the installation plan without changing files')
    .action(async (options) => {
        const cwd = path.resolve(options.cwd);
        if (!(await hasFile(path.join(cwd, 'package.json')))) {
            throw new Error('当前目录不是前端项目。缺少 package.json。');
        }
        const hasConfig = await hasFile(path.join(cwd, CONFIG_NAME));
        const config = hasConfig ? await loadConfig(cwd) : defaultConfig();
        const registry = registryOption(cwd, config.registry, options.registry);
        await installItems(['theme'], {
            cwd,
            config,
            registry,
            skipInstall: options.skipInstall,
            dryRun: options.dryRun,
        });
        if (!options.dryRun) {
            if (!hasConfig) await writeDefaultConfig(cwd);
            await configureTailwindVite(cwd);
            await injectThemeImport(cwd, config);
        }
        console.log(
            options.dryRun ? `UEKit Web 初始化计划完成：${cwd}` : `UEKit Web 已初始化：${cwd}`,
        );
    });

program
    .command('add')
    .description('Install one or more Registry items as local source.')
    .argument('<items...>')
    .option('--cwd <path>', 'project directory', process.cwd())
    .option('--registry <source>', 'Registry directory or URL')
    .option('--overwrite', 'overwrite installed files')
    .option('--skip-install', 'do not install npm dependencies')
    .option('--dry-run', 'print the installation plan without changing files')
    .action(async (items, options) => {
        const cwd = path.resolve(options.cwd);
        const config = await loadConfig(cwd);
        const registry = registryOption(cwd, config.registry, options.registry);
        const installed = await installItems(items, {
            cwd,
            config,
            registry,
            overwrite: options.overwrite,
            skipInstall: options.skipInstall,
            dryRun: options.dryRun,
        });
        if (!options.dryRun && installed.includes('theme')) {
            await configureTailwindVite(cwd);
            await injectThemeImport(cwd, config);
        }
        console.log(
            options.dryRun
                ? `安装计划完成：${installed.join(', ')}`
                : `已安装：${installed.join(', ')}`,
        );
    });

program
    .command('list')
    .description('List available Registry items.')
    .option('--cwd <path>', 'project directory', process.cwd())
    .option('--registry <source>', 'Registry directory or URL')
    .action(async (options) => {
        const cwd = path.resolve(options.cwd);
        const config = (await hasFile(path.join(cwd, CONFIG_NAME)))
            ? await loadConfig(cwd)
            : { registry: DEFAULT_REGISTRY };
        const index = await loadRegistryIndex(
            registryOption(cwd, config.registry, options.registry),
        );
        for (const item of index.items) {
            console.log(
                `${item.name.padEnd(22)} ${item.type.padEnd(22)} ${item.description ?? ''}`,
            );
        }
    });

program
    .command('view')
    .description('Inspect a Registry item.')
    .argument('<item>')
    .option('--cwd <path>', 'project directory', process.cwd())
    .option('--registry <source>', 'Registry directory or URL')
    .action(async (item, options) => {
        const cwd = path.resolve(options.cwd);
        const config = await loadConfig(cwd);
        console.log(
            JSON.stringify(
                await loadRegistryItem(
                    registryOption(cwd, config.registry, options.registry),
                    item,
                ),
                null,
                2,
            ),
        );
    });

program
    .command('info')
    .description('Show locally installed Registry items.')
    .option('--cwd <path>', 'project directory', process.cwd())
    .action(async (options) => {
        const cwd = path.resolve(options.cwd);
        const config = await loadConfig(cwd);
        const lock = await loadLock(cwd, config.registry);
        for (const [name, item] of Object.entries(lock.items)) {
            console.log(`${name.padEnd(22)} ${item.version}  ${item.files.length} files`);
        }
    });

program
    .command('diff')
    .description('Compare a local item with its installed base.')
    .argument('<item>')
    .option('--cwd <path>', 'project directory', process.cwd())
    .action(async (item, options) => {
        const cwd = path.resolve(options.cwd);
        const config = await loadConfig(cwd);
        await diffItem(cwd, item, config.registry);
    });

program
    .command('update')
    .description('Update an item without silently overwriting local edits.')
    .argument('<item>')
    .option('--cwd <path>', 'project directory', process.cwd())
    .option('--registry <source>', 'Registry directory or URL')
    .option('--merge', 'attempt a three-way merge')
    .option('--dry-run', 'print the update plan without changing files')
    .action(async (item, options) => {
        const cwd = path.resolve(options.cwd);
        const config = await loadConfig(cwd);
        await updateItem(
            cwd,
            config,
            item,
            registryOption(cwd, config.registry, options.registry),
            options.merge,
            options.dryRun,
        );
        if (!options.dryRun && item === 'theme') {
            await configureTailwindVite(cwd);
            await injectThemeImport(cwd, config);
        }
    });

program
    .command('build')
    .description('Build static Registry JSON from registry.json.')
    .option('--cwd <path>', 'uekit-web repository', process.cwd())
    .option('--output <path>', 'output directory')
    .option('--release', 'write new immutable item versions before building')
    .action(async (options) => {
        const cwd = path.resolve(options.cwd);
        if (options.release) {
            await releaseRegistry(cwd);
        }
        await buildRegistry(cwd, options.output);
        console.log('Registry 构建完成。');
    });

program
    .command('cat')
    .description('Print a locally installed file; useful for automation checks.')
    .argument('<file>')
    .option('--cwd <path>', 'project directory', process.cwd())
    .action(async (file, options) => {
        const cwd = path.resolve(options.cwd);
        const target = path.resolve(cwd, file);
        const relative = path.relative(cwd, target);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`读取路径越出项目目录：${file}`);
        }
        await assertSafeProjectPath(cwd, target, '读取路径');
        console.log(await readFile(target, 'utf8'));
    });

program.parseAsync().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
