/**
 * UEKit 文档入口、链接、锚点、命令和 Registry 示例一致性检查。
 *
 * @remarks
 * 除文件存在性外，还阻止旧 Registry URL、孤立文档、无效 CLI 版本和无法通过当前
 * Registry v1 约束的完整条目示例进入主分支。
 */

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ignoredDirectories = new Set([
    '.git',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
]);
const requiredDocuments = [
    'README.md',
    'docs/README.md',
    'docs/UEKit-Web技术白皮书.md',
    'docs/guides/快速开始.md',
    'docs/architecture/整体架构.md',
    'docs/reference/CLI命令参考.md',
    'docs/testing/发布前验收清单.md',
];
const supportedCliCommands = new Set([
    'init',
    'add',
    'list',
    'view',
    'info',
    'diff',
    'update',
    'build',
    'cat',
]);
const registryItemKeys = new Set([
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
]);
const registryFileKeys = new Set(['path', 'target', 'content', 'hash']);
const registryTypes = new Set([
    'registry:foundation',
    'registry:ui',
    'registry:pro',
    'registry:layout',
    'registry:block',
    'registry:integration',
]);

async function exists(file) {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

async function collectMarkdown(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...(await collectMarkdown(absolute)));
        else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute);
    }
    return files;
}

function normalizeLink(raw) {
    let target = raw.trim();
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    const titleSeparator = target.match(/\s+["'][^"']*["']$/);
    if (titleSeparator) target = target.slice(0, titleSeparator.index).trim();
    return target;
}

function headingSlug(value) {
    return value
        .toLowerCase()
        .replace(/[`*_~]/g, '')
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .trim()
        .replace(/\s+/g, '-');
}

function documentAnchors(source) {
    const anchors = new Set();
    const duplicates = new Map();
    for (const match of source.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
        const base = headingSlug(match[1]);
        const count = duplicates.get(base) ?? 0;
        duplicates.set(base, count + 1);
        anchors.add(count === 0 ? base : `${base}-${count}`);
    }
    return anchors;
}

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExplicitNpmSpec(value) {
    if (typeof value !== 'string') return false;
    const separator = value.lastIndexOf('@');
    return separator > 0 && separator < value.length - 1 && value.slice(separator + 1) !== '*';
}

function validateRegistryItemExample(value, label, errors) {
    if (!isRecord(value) || typeof value.type !== 'string' || !value.type.startsWith('registry:')) {
        return;
    }
    for (const key of Object.keys(value)) {
        if (!registryItemKeys.has(key))
            errors.push(`${label} 的 Registry 条目包含未知字段：${key}`);
    }
    for (const key of ['name', 'type', 'version', 'url', 'files']) {
        if (!(key in value)) errors.push(`${label} 的 Registry 条目缺少字段：${key}`);
    }
    if (typeof value.name !== 'string' || !/^[a-z0-9-]+$/.test(value.name)) {
        errors.push(`${label} 的 Registry 条目 name 不合法。`);
        return;
    }
    if (!registryTypes.has(value.type)) errors.push(`${label} 的 Registry 条目 type 不受支持。`);
    if (
        typeof value.version !== 'string' ||
        !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
            value.version,
        )
    ) {
        errors.push(`${label} 的 Registry 条目 version 不是标准 SemVer。`);
    }
    const expectedUrl = `items/${value.name}/${value.version}.json`;
    if (value.url !== expectedUrl)
        errors.push(`${label} 的 Registry 条目 url 必须是 ${expectedUrl}。`);
    for (const key of ['dependencies', 'devDependencies']) {
        if (value[key] !== undefined) {
            if (
                !Array.isArray(value[key]) ||
                value[key].some((entry) => !hasExplicitNpmSpec(entry))
            ) {
                errors.push(`${label} 的 ${key} 必须使用带明确版本或范围的 npm 包规格。`);
            }
        }
    }
    if (
        value.registryDependencies !== undefined &&
        (!Array.isArray(value.registryDependencies) ||
            value.registryDependencies.some(
                (entry) => typeof entry !== 'string' || !/^[a-z0-9-]+$/.test(entry),
            ))
    ) {
        errors.push(`${label} 的 registryDependencies 包含无效条目名称。`);
    }
    if (!Array.isArray(value.files) || value.files.length === 0) {
        errors.push(`${label} 的 Registry 条目 files 不能为空。`);
        return;
    }
    for (const [index, file] of value.files.entries()) {
        if (!isRecord(file)) {
            errors.push(`${label} 的 files[${index}] 必须是对象。`);
            continue;
        }
        for (const key of Object.keys(file)) {
            if (!registryFileKeys.has(key))
                errors.push(`${label} 的 files[${index}] 包含未知字段：${key}`);
        }
        if (typeof file.path !== 'string' || !file.path) {
            errors.push(`${label} 的 files[${index}].path 不能为空。`);
        }
        if (typeof file.target !== 'string' || !file.target) {
            errors.push(`${label} 的 files[${index}].target 不能为空。`);
        }
    }
}

function fencedCodeBlocks(source, languages) {
    const blocks = [];
    const pattern = /```([\w-]*)\s*\n([\s\S]*?)```/g;
    for (const match of source.matchAll(pattern)) {
        if (languages.has(match[1].toLowerCase())) {
            blocks.push({ content: match[2], index: match.index });
        }
    }
    return blocks;
}

const errors = [];
for (const required of requiredDocuments) {
    if (!(await exists(path.join(root, required)))) errors.push(`缺少必要文档：${required}`);
}

const cliPackage = JSON.parse(await readFile(path.join(root, 'packages/cli/package.json'), 'utf8'));
const cliVersion = cliPackage.version;
const markdownFiles = await collectMarkdown(root);
const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;
const incomingLinks = new Map(markdownFiles.map((file) => [path.resolve(file), 0]));
const sources = new Map();
for (const file of markdownFiles) sources.set(path.resolve(file), await readFile(file, 'utf8'));

for (const file of markdownFiles) {
    const source = sources.get(path.resolve(file));
    const relativeFile = path.relative(root, file);

    for (const match of source.matchAll(/\/web\/v1\/([^/\s`"']+\.json)/g)) {
        const controlResources = new Set(['index.json', 'schema.json', 'config.schema.json']);
        if (!controlResources.has(match[1])) {
            errors.push(`${relativeFile} 仍包含旧版可变 Registry 条目 URL：${match[0]}`);
        }
    }
    if (/apps\/registry-server\/dist\/web\/v1\/\*\.json/.test(source)) {
        errors.push(`${relativeFile} 使用了无法覆盖 items 子目录的旧构建产物表达。`);
    }
    if (/^\s*uekit\s+(?:init|add|list|view|info|diff|update|build|cat)\b/m.test(source)) {
        errors.push(`${relativeFile} 使用了不存在的 uekit 可执行命令。`);
    }

    for (const match of source.matchAll(/@uekits\/web@(\d+\.\d+\.\d+)/g)) {
        if (match[1] !== cliVersion) {
            errors.push(`${relativeFile} 使用 CLI ${match[1]}，当前文档基线是 ${cliVersion}。`);
        }
    }

    for (const block of fencedCodeBlocks(source, new Set(['json']))) {
        const trimmed = block.content.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) continue;
        const line = source.slice(0, block.index).split('\n').length;
        const label = `${relativeFile}:${line}`;
        let value;
        try {
            value = JSON.parse(block.content);
        } catch {
            errors.push(`${label} 的 JSON 代码块无法解析。`);
            continue;
        }
        validateRegistryItemExample(value, label, errors);
    }

    for (const block of fencedCodeBlocks(source, new Set(['bash', 'sh', 'shell']))) {
        for (const line of block.content.split('\n')) {
            const match = line.match(/pnpm\s+dlx\s+@uekits\/web@\S+\s+([^\s\\]+)/);
            if (!match) continue;
            const command = match[1];
            if (
                !command.startsWith('<') &&
                !command.startsWith('--') &&
                !supportedCliCommands.has(command)
            ) {
                errors.push(`${relativeFile} 使用了未知 CLI 命令：${command}`);
            }
        }
    }

    for (const match of source.matchAll(markdownLink)) {
        const target = normalizeLink(match[1]);
        if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
        const [rawPath, rawAnchor] = target.split('#', 2);
        const withoutQuery = rawPath.split('?', 1)[0];
        let decodedPath;
        let decodedAnchor;
        try {
            decodedPath = decodeURIComponent(withoutQuery);
            decodedAnchor = rawAnchor ? decodeURIComponent(rawAnchor) : undefined;
        } catch {
            errors.push(`${relativeFile} 包含无法解码的链接：${target}`);
            continue;
        }
        const resolved = decodedPath
            ? path.resolve(path.dirname(file), decodedPath)
            : path.resolve(file);
        if (!(await exists(resolved))) {
            errors.push(`${relativeFile} 存在失效链接：${target}`);
            continue;
        }
        if (incomingLinks.has(resolved))
            incomingLinks.set(resolved, incomingLinks.get(resolved) + 1);
        if (decodedAnchor && resolved.endsWith('.md')) {
            const linkedSource = sources.get(resolved) ?? (await readFile(resolved, 'utf8'));
            if (!documentAnchors(linkedSource).has(decodedAnchor.toLowerCase())) {
                errors.push(`${relativeFile} 存在失效锚点：${target}`);
            }
        }
    }
}

for (const [file, incoming] of incomingLinks) {
    const relative = path.relative(root, file);
    if (relative.startsWith(`docs${path.sep}`) && relative !== 'docs/README.md' && incoming === 0) {
        errors.push(`文档没有任何入口链接：${relative}`);
    }
}

if (errors.length) {
    console.error(`文档校验失败（${errors.length} 项）：`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
} else {
    console.log(
        `文档校验通过：已检查 ${markdownFiles.length} 个 Markdown 文件、链接锚点、CLI 命令和 Registry 示例。`,
    );
}
