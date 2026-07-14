/**
 * UEKit Web 工作区发布边界和 Registry 依赖约束测试。
 */

import { describe, expect, it } from 'vitest';
import registry from '../../registry.json';
import cliPackage from '../../packages/cli/package.json';

describe('UEKit Web workspace', () => {
    it('publishes only the CLI and distributes UI through the Registry', () => {
        expect(registry.name).toBe('uekit-web');
        expect(registry.schemaVersion).toBe(1);
        expect(registry.compatibility['element-plus']).toBe('>=2.14.0 <3');
        expect(registry.items.map((item) => item.name)).toContain('theme');
        expect(registry.items.map((item) => item.name)).toContain('pro-table');
    });

    it('keeps every Registry dependency resolvable', () => {
        const names = new Set(registry.items.map((item) => item.name));
        const dependencies = registry.items.flatMap((item) => item.registryDependencies ?? []);
        expect(dependencies.every((name) => names.has(name))).toBe(true);
    });

    it('ships Tailwind through the theme and makes styled items depend on it', () => {
        const theme = registry.items.find((item) => item.name === 'theme');
        expect(theme?.devDependencies).toContain('tailwindcss@^4.3.0');
        expect(theme?.devDependencies).toContain('@tailwindcss/vite@^4.3.0');
        for (const name of [
            'icon',
            'button',
            'avatar',
            'pro-table',
            'map-amap',
            'charts-echarts',
        ]) {
            const item = registry.items.find((entry) => entry.name === name);
            expect(item?.registryDependencies).toContain('theme');
        }
    });

    it('publishes the CLI from the public npm scope with repository metadata', () => {
        expect(cliPackage.name).toBe('@uekits/web');
        expect('private' in cliPackage).toBe(false);
        expect(cliPackage.repository.url).toBe('git+https://github.com/uekits/uekit-web.git');
    });
});
