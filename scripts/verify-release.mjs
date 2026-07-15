/**
 * 正式发布前的版本、Changeset、Changelog 与远端占用状态检查。
 *
 * @remarks
 * 该脚本只用于面向 main 的发布候选和版本 Tag，不属于日常 dev 质量检查。
 */

import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import semver from 'semver';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const allowCurrentTag = process.argv.includes('--allow-current-tag');

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('拒绝在 NODE_TLS_REJECT_UNAUTHORIZED=0 时验证发布候选。');
}

async function readJson(file) {
    return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

const cliPackage = await readJson('packages/cli/package.json');
const packageName = cliPackage.name;
const version = cliPackage.version;
if (packageName !== '@uekits/web' || !semver.valid(version) || semver.clean(version) !== version) {
    throw new Error('packages/cli/package.json 缺少有效的 @uekits/web SemVer 版本。');
}

const changesetFiles = (await readdir(path.join(root, '.changeset'))).filter(
    (file) => file.endsWith('.md') && file !== 'README.md',
);
if (changesetFiles.length > 0) {
    throw new Error(
        `发布候选仍包含未消费的 Changeset：${changesetFiles.join(', ')}；请先运行 pnpm version-packages。`,
    );
}

const [rootChangelog, readme] = await Promise.all([
    readFile(path.join(root, 'CHANGELOG.md'), 'utf8'),
    readFile(path.join(root, 'README.md'), 'utf8'),
]);
if (!rootChangelog.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md 缺少 ${version} 版本记录。`);
}
if (!readme.includes(`@uekits/web@${version}`)) {
    throw new Error(`README.md 没有同步当前 CLI 版本 ${version}。`);
}

const tag = `v${version}`;
const { stdout: existingTag } = await execFileAsync('git', ['tag', '--list', tag], { cwd: root });
if (existingTag.trim() && !allowCurrentTag) {
    throw new Error(`Git Tag ${tag} 已存在。`);
}

const packageUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
const response = await fetch(packageUrl, { signal: AbortSignal.timeout(15_000) });
if (!response.ok) {
    throw new Error(`无法读取 npm 包元数据：${response.status} ${response.statusText}`);
}
const packument = await response.json();
if (typeof packument !== 'object' || packument === null) {
    throw new Error('npm 返回了无效的包元数据。');
}
const versions = packument.versions;
const distTags = packument['dist-tags'];
if (
    typeof versions !== 'object' ||
    versions === null ||
    typeof distTags !== 'object' ||
    distTags === null
) {
    throw new Error('npm 包元数据缺少 versions 或 dist-tags。');
}
if (Object.hasOwn(versions, version)) {
    throw new Error(`${packageName}@${version} 已经发布，不能覆盖。`);
}

const latest = distTags.latest;
if (typeof latest === 'string' && semver.valid(latest) && !semver.gt(version, latest)) {
    throw new Error(`候选版本 ${version} 必须高于当前 latest ${latest}。`);
}
const prerelease = semver.prerelease(version) !== null;
const next = distTags.next;
if (prerelease && typeof next === 'string' && semver.valid(next) && !semver.gt(version, next)) {
    throw new Error(`预发布版本 ${version} 必须高于当前 next ${next}。`);
}

console.log(
    `发布元数据验证通过：${packageName}@${version} 将进入 ${prerelease ? 'next' : 'latest'}。`,
);
