import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const appUrl = process.env.TEST_APP_URL || 'http://localhost:5173', apiUrl = process.env.TEST_API_URL || 'http://localhost:3001';
const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
const res = await fetch(`${apiUrl}/api/boards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Integration Test' }) }); const b = await res.json();
const url = `${appUrl}/?board=${b.id}`;
try {
    page.setDefaultTimeout(12000);
    await page.goto(url); await page.getByText('所有更改已保存').waitFor();
    const peer = await context.newPage(); await peer.goto(url); await peer.getByText('所有更改已保存').waitFor();
    await page.getByRole('button', { name: '便签 N', exact: true }).click(); await page.locator('.canvas').click({ position: { x: 300, y: 250 } });
    await peer.locator('.world .object.sticky').waitFor(); assert.equal(await peer.locator('.world .object.sticky').count(), 1);
    await page.locator('.world .object.sticky').dblclick(); await page.locator('.world .object.sticky textarea').fill('协作测试：中文想法'); await page.locator('.world .object.sticky textarea').press('Meta+Enter');
    await peer.locator('.world').getByText('协作测试：中文想法', { exact: true }).waitFor();
    const note = page.locator('.world .object.sticky'); const box = await note.boundingBox(); await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 80); await page.mouse.up();
    await page.locator('.object-toolbar').getByRole('button', { name: '评论', exact: true }).click(); await page.getByPlaceholder('分享你的想法…').fill('这条想法值得进一步探索'); await page.getByRole('button', { name: '发送评论' }).click(); await page.getByText('这条想法值得进一步探索').waitFor();
    await page.getByRole('button', { name: '标为已解决' }).click(); await page.getByText('已解决 · 重新打开').waitFor();
    await page.reload(); await page.locator('.world').getByText('协作测试：中文想法', { exact: true }).waitFor();
    await page.getByRole('button', { name: '从模板开始' }).click(); await page.getByRole('button', { name: 'Flowchart 让复杂流程一目了然' }).click(); await page.locator('.world .object.rect').first().waitFor();
    await page.getByRole('button', { name: '导出', exact: true }).click(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出 PDF 完整画布 · 中文与图片 · 单页' }).click(); const file = await download; await file.saveAs('../../work/test-export.pdf'); assert.ok(fs.statSync('../../work/test-export.pdf').size > 3000); await page.keyboard.press('Escape');
    await page.goto(`${appUrl}/`); await page.locator('.world .object.sticky').first().waitFor(); await page.screenshot({ path: '../../work/idea-room-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: '../../work/idea-room-mobile.png' });
    assert.deepEqual(errors, []); console.log('PASS: two-client sync, Chinese text editing, drag, comment resolution, reload persistence, template, PDF download, desktop/mobile render');
} finally { await browser.close() }
