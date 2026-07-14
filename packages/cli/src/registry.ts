/**
 * 本地与远端 Registry 读取入口。
 *
 * @remarks
 * 网络响应和磁盘 JSON 都必须通过协议校验后才能返回给安装流程。
 */

import path from 'node:path';
import { hasFile } from './config.js';
import { assertSafeProjectPath, readJson } from './fs-utils.js';
import type { RegistryIndex, RegistryItem } from './types.js';
import { assertRegistryIndex, assertRegistryItem, assertRegistryItemName } from './validation.js';

const maximumRegistryResponseBytes = 5 * 1024 * 1024;
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function registryUrl(value: string): URL | undefined {
    if (!/^https?:\/\//i.test(value)) return undefined;
    const url = new URL(value);
    if (url.username || url.password) {
        throw new Error('Registry URL 不能包含用户名或密码。');
    }
    if (
        url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && loopbackHosts.has(url.hostname))
    ) {
        throw new Error('远端 Registry 必须使用 HTTPS；仅本机回环地址允许 HTTP。');
    }
    return url;
}

function assertRegistryRoot(source: string): void {
    if (source.includes('{name}')) {
        throw new Error('Registry v1 必须配置根地址，不再支持 {name} URL 模板。');
    }
}

function remoteResourceUrl(source: string, relative: string): string {
    const base = registryUrl(source);
    if (!base) {
        throw new Error(`不是远端 Registry：${source}`);
    }
    return new URL(relative, `${base.toString().replace(/\/$/, '')}/`).toString();
}

async function readResponseJson(response: Response, url: string): Promise<unknown> {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maximumRegistryResponseBytes) {
        throw new Error(`Registry 响应超过 5 MiB 限制：${url}`);
    }
    if (!response.body) {
        throw new Error(`Registry 响应没有内容：${url}`);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maximumRegistryResponseBytes) {
            await reader.cancel();
            throw new Error(`Registry 响应超过 5 MiB 限制：${url}`);
        }
        chunks.push(value);
    }

    const content = Buffer.concat(chunks).toString('utf8');
    try {
        return JSON.parse(content);
    } catch (cause) {
        throw new Error(`Registry 响应不是有效 JSON：${url}`, { cause });
    }
}

function assertSecureFinalUrl(response: Response): void {
    if (!response.url) return;
    if (!registryUrl(response.url)) {
        throw new Error(`Registry 重定向到了不支持的协议：${response.url}`);
    }
}

async function readRegistryResource(source: string, relative: string): Promise<unknown> {
    const remote = registryUrl(source);
    if (remote) {
        const url = remoteResourceUrl(source, relative);
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        assertSecureFinalUrl(response);
        if (!response.ok) {
            throw new Error(`Registry 请求失败：${response.status} ${url}`);
        }
        return readResponseJson(response, url);
    }

    const root = path.resolve(source);
    const file = path.resolve(root, relative);
    await assertSafeProjectPath(root, file, 'Registry 资源路径');
    if (!(await hasFile(file))) {
        throw new Error(`Registry 资源不存在：${relative}`);
    }
    return readJson(file);
}

/** 将条目的相对 URL 解析为实际获取来源，供 Lock 精确记录。 */
export function resolveRegistryItemSource(source: string, item: RegistryItem): string {
    return registryUrl(source)
        ? remoteResourceUrl(source, item.url)
        : path.resolve(source, item.url);
}

/** 加载并校验 Registry 索引。 */
export async function loadRegistryIndex(source: string): Promise<RegistryIndex> {
    assertRegistryRoot(source);
    const value = await readRegistryResource(source, 'index.json');
    assertRegistryIndex(value);
    return value;
}

/** 加载并校验包含源码内容的 Registry 条目。 */
export async function loadRegistryItem(source: string, name: string): Promise<RegistryItem> {
    assertRegistryItemName(name, '请求条目名称');
    const index = await loadRegistryIndex(source);
    const summary = index.items.find((item) => item.name === name);
    if (!summary) {
        throw new Error(`Registry 条目不存在：${name}`);
    }
    const value = await readRegistryResource(source, summary.url);
    assertRegistryItem(value, { requireBuiltContent: true });
    if (value.name !== name || value.version !== summary.version || value.url !== summary.url) {
        throw new Error(`Registry 响应与 index 不一致：${name}。`);
    }
    return value;
}
