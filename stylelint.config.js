/**
 * UEKit Web 的 Stylelint 配置。
 *
 * @remarks
 * 校验 CSS、SCSS 和 Vue style 块，并精确兼容 Tailwind v4 指令、UEKit Token 与 Vue 深度选择器。
 */

export default {
    extends: ['stylelint-config-standard-scss'],
    ignoreFiles: [
        '**/dist/**',
        '**/node_modules/**',
        '**/.uekit/**',
        'apps/playground/src/components/pro/**',
        'apps/playground/src/components/ui/**',
        'apps/playground/src/layouts/**',
        'apps/playground/src/blocks/**',
        'apps/playground/src/integrations/**',
        'apps/playground/src/styles/uekit.css',
    ],
    overrides: [{ files: ['**/*.vue'], customSyntax: 'postcss-html' }],
    rules: {
        'custom-property-empty-line-before': null,
        'custom-property-pattern':
            '^(?:(?:ue|el|color|font|text|leading|radius|shadow)-[a-z0-9-]+|spacing)$',
        'at-rule-no-unknown': [true, { ignoreAtRules: ['custom-variant', 'theme'] }],
        'scss/at-rule-no-unknown': [true, { ignoreAtRules: ['custom-variant', 'theme'] }],
        'selector-class-pattern': null,
        'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep'] }],
        'value-keyword-case': null,
    },
};
