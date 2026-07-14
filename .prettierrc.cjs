/**
 * UEKit Web 的 Prettier 格式化配置。
 *
 * @remarks
 * 使用 CJS 是为了保留规则说明，并确保配置可在当前 Node 和 Prettier 版本中直接加载。
 */

/** @type {import('prettier').Config} */
module.exports = {
    singleQuote: true,
    semi: true,
    tabWidth: 4,
    useTabs: false,
    printWidth: 100,
    quoteProps: 'as-needed',
    trailingComma: 'all',
    bracketSpacing: true,
    arrowParens: 'always',
    singleAttributePerLine: true,
    vueIndentScriptAndStyle: false,
    endOfLine: 'lf',
};
