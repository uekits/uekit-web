/**
 * 发布和部署命令的 TLS 环境前置检查。
 *
 * @remarks
 * 禁止通过 Node 全局环境关闭证书验证；调用方必须修复环境或证书本身。
 */

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('拒绝继续：NODE_TLS_REJECT_UNAUTHORIZED=0 会关闭 TLS 证书校验。');
}

console.log('TLS 环境检查通过：未关闭证书校验。');
