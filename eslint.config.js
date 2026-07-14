/**
 * UEKit Web 的 ESLint Flat Config。
 *
 * @remarks
 * 按浏览器、Node、测试和配置文件划分运行环境，并校验 TypeScript、Vue 与 TSDoc。
 */

import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tsdoc from 'eslint-plugin-tsdoc';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const browserFiles = [
    'registry/**/*.{js,jsx,ts,tsx,vue}',
    'apps/playground/src/**/*.{js,jsx,ts,tsx,vue}',
    'tests/fixtures/*/src/**/*.{js,jsx,ts,tsx,vue}',
];

const nodeFiles = [
    'packages/cli/**/*.{ts,js,mjs,cjs}',
    'scripts/**/*.{ts,js,mjs,cjs}',
    'tests/unit/**/*.ts',
    'tests/e2e/**/*.ts',
    '**/*.config.{ts,js,mjs,cjs}',
    '.*rc.{js,mjs,cjs}',
];

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/.uekit/**',
            '.husky/_/**',
            'apps/playground/src/components/pro/**',
            'apps/playground/src/components/ui/**',
            'apps/playground/src/layouts/**',
            'apps/playground/src/blocks/**',
            'apps/playground/src/integrations/**',
            'apps/playground/src/styles/uekit.css',
            'apps/registry-server/public/r/**',
            'apps/registry-server/public/web/**',
            'coverage/**',
            'playwright-report/**',
            'test-results/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.{ts,tsx,vue}'],
        plugins: {
            tsdoc,
        },
        rules: {
            'no-debugger': 'error',
            'prefer-const': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            'tsdoc/syntax': 'error',
        },
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.vue'],
                sourceType: 'module',
            },
        },
        rules: {
            'vue/component-name-in-template-casing': [
                'error',
                'PascalCase',
                {
                    registeredComponentsOnly: false,
                    ignores: ['component', 'router-view', 'router-link'],
                },
            ],
            'vue/multi-word-component-names': [
                'error',
                {
                    ignores: ['App', 'Avatar', 'Button', 'Icon'],
                },
            ],
            'vue/require-default-prop': 'off',
        },
    },
    {
        files: browserFiles,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2024,
            },
        },
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
    {
        files: nodeFiles,
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2024,
            },
        },
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['tests/unit/**/*.ts'],
        rules: {
            'vue/one-component-per-file': 'off',
            'vue/require-default-prop': 'off',
        },
    },
    prettier,
);
