/**
 * 高德地图加载器约定的全局安全配置声明。
 */

export {};

declare global {
    var _AMapSecurityConfig: { securityJsCode: string } | undefined;
}
