/**
 * 提交前仓库敏感信息与环境安全检查。
 *
 * @remarks
 * 扫描高置信度密钥、个人绝对路径和内部网络地址，并拒绝关闭 TLS 证书校验的环境。
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ignoredDirectoryNames = new Set([
    '.git',
    'coverage',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
]);
const ignoredPrefixes = ['apps/registry-server/public/'];
const findings = [];

const patterns = [
    {
        label: '个人 Unix Home 绝对路径',
        pattern: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g,
    },
    {
        label: '个人 Windows Home 绝对路径',
        pattern: /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/g,
    },
    {
        label: '私钥内容',
        pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    },
    {
        label: 'npm Access Token',
        pattern: /\bnpm_[A-Za-z0-9]{30,}\b/g,
    },
    {
        label: '明文 npm 认证配置',
        pattern:
            /(?:^|\n)\s*(?:\/\/[^\s]+:_authToken|_authToken|NPM_TOKEN|NODE_AUTH_TOKEN)\s*=\s*(?!\$\{)[^\s#]+/g,
    },
    {
        label: 'GitHub Access Token',
        pattern: /\b(?:gh[oprsu]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
    },
    {
        label: 'AWS Access Key',
        pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    },
    {
        label: '带凭据的 URL',
        pattern: /https?:\/\/[^\s/:]+:[^\s/@]+@/g,
    },
    {
        label: '私有网络地址',
        pattern:
            /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g,
    },
    {
        label: '内部域名',
        pattern: /https?:\/\/[^\s/]+\.(?:internal|local)(?=[:/\s]|$)/g,
    },
];

function toPosix(file) {
    return file.split(path.sep).join('/');
}

function isIgnored(file) {
    const relative = toPosix(path.relative(root, file));
    return ignoredPrefixes.some((prefix) => relative.startsWith(prefix));
}

async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
            continue;
        }
        const file = path.join(directory, entry.name);
        if (isIgnored(file)) {
            continue;
        }
        if (entry.isDirectory()) {
            files.push(...(await collectFiles(file)));
        } else if (entry.isFile()) {
            files.push(file);
        }
    }
    return files;
}

function lineNumberAt(content, index) {
    return content.slice(0, index).split('\n').length;
}

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('安全检查失败：NODE_TLS_REJECT_UNAUTHORIZED=0 会关闭 TLS 证书校验。');
}

for (const file of await collectFiles(root)) {
    const buffer = await readFile(file);
    if (buffer.includes(0)) {
        continue;
    }
    const content = buffer.toString('utf8');
    const relative = toPosix(path.relative(root, file));
    if (relative.startsWith('.github/workflows/')) {
        for (const match of content.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
            const reference = match[1];
            if (reference.startsWith('./') || /@[a-f0-9]{40}$/.test(reference)) continue;
            findings.push({
                file: relative,
                label: 'GitHub Action 未固定完整 Commit SHA',
                line: lineNumberAt(content, match.index ?? 0),
            });
        }
    }
    for (const { label, pattern } of patterns) {
        pattern.lastIndex = 0;
        for (const match of content.matchAll(pattern)) {
            findings.push({
                file: relative,
                label,
                line: lineNumberAt(content, match.index ?? 0),
            });
        }
    }
}

if (findings.length > 0) {
    console.error(`仓库安全检查失败：发现 ${findings.length} 个高风险内容。`);
    for (const finding of findings) {
        console.error(`- ${finding.file}:${finding.line} ${finding.label}`);
    }
    process.exitCode = 1;
} else {
    console.log('仓库安全检查通过：未发现密钥、个人路径或内部地址。');
}
