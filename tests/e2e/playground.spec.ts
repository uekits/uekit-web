/**
 * Playground 共享组件链的桌面端、暗色和移动端端到端验收。
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshots = path.resolve('test-results/screenshots');
test.beforeAll(() => mkdir(screenshots, { recursive: true }));

test('renders and operates the first shared component chain', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'UEKit Web Components' })).toBeVisible();
    await expect(page.getByText('First validated component chain')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
    await expect(page.getByText('linxiao', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(screenshots, 'playground-light.png'), fullPage: true });

    await page.getByRole('button', { name: 'Open detail' }).click();
    await expect(page.getByText('User detail', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(screenshots, 'playground-drawer.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByText('Maintain account and role information.')).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(screenshots, 'playground-dialog.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Toggle color theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(screenshots, 'playground-dark.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            ),
        )
        .toBe(true);
    await page.screenshot({
        path: path.join(screenshots, 'playground-mobile-dark.png'),
        fullPage: true,
    });
});
