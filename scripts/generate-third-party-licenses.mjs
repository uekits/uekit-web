/**
 * 根据 pnpm 锁文件和已审计的许可证元数据生成第三方许可证清单。
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockFile = path.join(root, 'pnpm-lock.yaml');
const metadataFile = path.join(root, 'scripts/third-party-license-metadata.json');
const outputFile = path.join(root, 'THIRD_PARTY_LICENSES.md');
const check = process.argv.includes('--check');
const registryBaseUrl = 'https://registry.npmjs.org';
const fetchConcurrency = 12;

/**
 * 从 pnpm v9 锁文件的 packages 区段提取全部不可变 package/version。
 *
 * @param {string} source 锁文件内容。
 * @returns {{ key: string; name: string; version: string }[]} 排序后的依赖列表。
 */
function parseLockPackages(source) {
    const sectionStart = source.indexOf('\npackages:\n');
    const sectionEnd = source.indexOf('\nsnapshots:\n');
    if (sectionStart < 0 || sectionEnd < 0 || sectionEnd <= sectionStart) {
        throw new Error('无法解析 pnpm-lock.yaml：缺少 packages 或 snapshots 区段。');
    }

    const packages = [];
    const section = source.slice(sectionStart + '\npackages:\n'.length, sectionEnd);
    for (const line of section.split('\n')) {
        if (!line.startsWith('  ') || line.startsWith('    ') || !line.endsWith(':')) continue;

        let key = line.slice(2, -1);
        if (key.startsWith("'") && key.endsWith("'")) {
            key = key.slice(1, -1).replaceAll("''", "'");
        }

        const separator = key.lastIndexOf('@');
        if (separator <= 0 || separator === key.length - 1) {
            throw new Error(`无法解析锁文件依赖标识：${key}`);
        }

        packages.push({
            key,
            name: key.slice(0, separator),
            version: key.slice(separator + 1),
        });
    }

    return packages.sort((left, right) => left.key.localeCompare(right.key));
}

/**
 * 标准化 npm Registry 返回的许可证字段。
 *
 * @param {unknown} value Registry 中的 license/licenses 字段。
 * @returns {string} 可展示的许可证标识。
 */
function normalizeLicense(value) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
        const licenses = value.map(normalizeLicense).filter((license) => license !== 'UNKNOWN');
        return [...new Set(licenses)].join(' OR ') || 'UNKNOWN';
    }
    if (value && typeof value === 'object' && 'type' in value) {
        return normalizeLicense(value.type);
    }
    return 'UNKNOWN';
}

/**
 * 读取当前平台已经安装的依赖许可证，减少 Registry 请求数量。
 *
 * @returns {Map<string, string>} package/version 到许可证的映射。
 */
function readInstalledLicenses() {
    const secureEnvironment = { ...process.env };
    delete secureEnvironment.NODE_TLS_REJECT_UNAUTHORIZED;
    const raw = execFileSync('corepack', ['pnpm', 'licenses', 'list', '--json'], {
        cwd: root,
        encoding: 'utf8',
        env: secureEnvironment,
    });
    const report = JSON.parse(raw);
    const licenses = new Map();

    for (const [reportedLicense, entries] of Object.entries(report)) {
        for (const entry of entries) {
            for (const version of entry.versions) {
                licenses.set(`${entry.name}@${version}`, reportedLicense);
            }
        }
    }

    return licenses;
}

/**
 * 从 npm Registry 获取指定版本的许可证元数据。
 *
 * @param {{ key: string; name: string; version: string }} dependency 依赖信息。
 * @returns {Promise<string>} 标准化后的许可证。
 */
async function fetchLicense(dependency) {
    const packagePath = dependency.name.startsWith('@')
        ? dependency.name.replace('/', '%2F')
        : dependency.name;
    const response = await fetch(
        `${registryBaseUrl}/${packagePath}/${encodeURIComponent(dependency.version)}`,
        { headers: { accept: 'application/json' } },
    );
    if (!response.ok) {
        throw new Error(`无法获取 ${dependency.key} 的许可证元数据：HTTP ${response.status}`);
    }

    const body = await response.json();
    return normalizeLicense(body.license ?? body.licenses);
}

/**
 * 使用固定并发数执行异步任务。
 *
 * @template T
 * @param {T[]} items 待处理项目。
 * @param {(item: T) => Promise<void>} worker 单项任务。
 * @returns {Promise<void>} 全部任务完成时解决。
 */
async function runConcurrent(items, worker) {
    let cursor = 0;
    await Promise.all(
        Array.from({ length: Math.min(fetchConcurrency, items.length) }, async () => {
            while (cursor < items.length) {
                const item = items[cursor];
                cursor += 1;
                await worker(item);
            }
        }),
    );
}

const lockSource = await readFile(lockFile, 'utf8');
const dependencies = parseLockPackages(lockSource);
const currentMetadata = JSON.parse(await readFile(metadataFile, 'utf8').catch(() => '{}'));
const metadata = new Map(Object.entries(currentMetadata));

if (!check) {
    const installedLicenses = readInstalledLicenses();
    for (const dependency of dependencies) {
        const installedLicense = installedLicenses.get(dependency.key);
        if (installedLicense) metadata.set(dependency.key, installedLicense);
    }

    const missing = dependencies.filter((dependency) => !metadata.has(dependency.key));
    await runConcurrent(missing, async (dependency) => {
        metadata.set(dependency.key, await fetchLicense(dependency));
    });
}

const missing = dependencies.filter((dependency) => !metadata.has(dependency.key));
if (missing.length > 0) {
    throw new Error(
        `许可证元数据缺失：${missing.map((dependency) => dependency.key).join(', ')}。请运行 pnpm licenses:generate。`,
    );
}

const expectedKeys = new Set(dependencies.map((dependency) => dependency.key));
const staleKeys = [...metadata.keys()].filter((key) => !expectedKeys.has(key));
if (check && staleKeys.length > 0) {
    throw new Error(
        `许可证元数据包含过期依赖：${staleKeys.join(', ')}。请运行 pnpm licenses:generate。`,
    );
}

const normalizedMetadata = Object.fromEntries(
    dependencies.map((dependency) => {
        const license = dependency.name === 'spawndamnit' ? 'MIT*' : metadata.get(dependency.key);
        return [dependency.key, license];
    }),
);

const groupedPackages = new Map();
for (const dependency of dependencies) {
    const license = normalizedMetadata[dependency.key];
    const groupKey = `${dependency.name}\0${license}`;
    const group = groupedPackages.get(groupKey) ?? {
        name: dependency.name,
        versions: [],
        license,
    };
    group.versions.push(dependency.version);
    groupedPackages.set(groupKey, group);
}

const packages = [...groupedPackages.values()].sort((left, right) =>
    left.name === right.name
        ? left.versions.join(', ').localeCompare(right.versions.join(', '))
        : left.name.localeCompare(right.name),
);
const unknownPackages = packages.filter(({ license }) => license === 'UNKNOWN');
if (unknownPackages.length > 0) {
    throw new Error(
        `存在未确认的许可证：${unknownPackages.map(({ name }) => name).join(', ')}。请人工复核后补充元数据。`,
    );
}

const content = `${[
    '# 第三方许可证清单',
    '',
    '> 此文件由 `pnpm-lock.yaml`、`scripts/third-party-license-metadata.json` 和 `scripts/generate-third-party-licenses.mjs` 生成；不得手工编辑。',
    '',
    `共复核 ${dependencies.length} 个 package/version，汇总为 ${packages.length} 条许可证记录。依赖仍受各自许可证原文约束。`,
    '',
    '| Package | Version | License |',
    '| --- | --- | --- |',
    ...packages.map(
        ({ name, versions, license }) =>
            `| ${name.replaceAll('|', '\\|')} | ${versions.join(', ').replaceAll('|', '\\|')} | ${license.replaceAll('|', '\\|')} |`,
    ),
    '',
    '\\* `spawndamnit@3.0.1` 的 package.json 使用 `SEE LICENSE IN LICENSE`，其随包 LICENSE 文本已人工复核为 MIT License。',
    '',
].join('\n')}\n`;

if (check) {
    const expectedMetadata = `${JSON.stringify(normalizedMetadata, null, 4)}\n`;
    const currentMetadataSource = await readFile(metadataFile, 'utf8').catch(() => '');
    if (currentMetadataSource !== expectedMetadata) {
        throw new Error('third-party-license-metadata.json 需要重新生成。');
    }

    const current = await readFile(outputFile, 'utf8').catch(() => '');
    if (current !== content) throw new Error('THIRD_PARTY_LICENSES.md 需要重新生成。');
    console.log(`第三方许可证清单验证通过：${dependencies.length} 个 package/version。`);
} else {
    await writeFile(metadataFile, `${JSON.stringify(normalizedMetadata, null, 4)}\n`, 'utf8');
    await writeFile(outputFile, content, 'utf8');
    console.log(`第三方许可证清单已生成：${dependencies.length} 个 package/version。`);
}
