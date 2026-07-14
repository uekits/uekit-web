/**
 * CLI 使用的 UEKit 配置、Registry 与 Lock 协议类型。
 *
 * @remarks
 * 这些类型描述可信数据形状；磁盘和网络输入必须先通过相应运行时校验。
 */

/** Registry 目标占位符与消费项目目录的映射。 */
export interface UeKitAliases {
    ui: string;
    pro: string;
    layouts: string;
    blocks: string;
    integrations: string;
    lib: string;
    styles: string;
}

/** UEKit 消费项目配置。 */
export interface UeKitConfig {
    $schema: string;
    style: 'default';
    typescript: true;
    registry: string;
    aliases: UeKitAliases;
    theme: { css: string };
    /** 固定使用 Tailwind v4 utilities，且不注入 preflight。 */
    tailwind: { enabled: true; version: 4; preflight: false };
}

/** Registry 条目中的单个源码文件声明。 */
export interface RegistryFileSource {
    /** 相对 UEKit 仓库根目录的源码路径。 */
    path: string;
    /** 可包含公开别名占位符的消费项目目标路径。 */
    target: string;
    /** 仅构建后的 Registry 条目包含源码内容。 */
    content?: string;
    /** `content` 的 SHA-256 摘要。 */
    hash?: string;
}

/** 可由 CLI 安装的 Registry 条目。 */
export interface RegistryItem {
    name: string;
    type: string;
    version: string;
    /** 相对 Registry 根目录的不可变版本化资源路径。 */
    url: string;
    description?: string;
    dependencies?: string[];
    devDependencies?: string[];
    registryDependencies?: string[];
    compatibility?: Record<string, string>;
    files: RegistryFileSource[];
}

/** Registry 索引及其条目摘要。 */
export interface RegistryIndex {
    $schema?: string;
    schemaVersion: 1;
    name: string;
    homepage?: string;
    compatibility: Record<string, string>;
    items: RegistryItem[];
}

/** Lock 中记录的已安装文件及其基线摘要。 */
export interface LockedFile {
    path: string;
    hash: string;
    baseHash: string;
}

/** Lock 中记录的已安装 Registry 条目。 */
export interface LockedItem {
    version: string;
    source: string;
    dependencies: string[];
    devDependencies: string[];
    installedAt: string;
    files: LockedFile[];
}

/** UEKit 消费项目的安装状态文件。 */
export interface UeKitLock {
    lockfileVersion: 1;
    registry: string;
    items: Record<string, LockedItem>;
}
