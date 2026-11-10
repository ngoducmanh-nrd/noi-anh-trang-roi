import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const config = {
  firebase: { apiKey: 'demo-api-key', authDomain: 'demo-inlove-owned.firebaseapp.com', databaseURL: 'https://demo-inlove-owned-default-rtdb.firebaseio.com', projectId: 'demo-inlove-owned', appId: '1:123:web:demo' },
  emulators: true, site: {},
};

async function prepare(context: BrowserContext, name: string) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (/(googleapis\.com|firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname)) return route.abort('blockedbyclient');
    if (url.pathname === '/app-config.js') return route.fulfill({ contentType: 'application/javascript', body: 'window.APP_CONFIG=' + JSON.stringify(config) });
    return route.continue();
  });
  await context.addInitScript(name => {
    const key = 'moonlight:demo-inlove-owned:profile';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ name, bio: '', avatar: { kind: 'emoji', value: '🌙' } }));
  }, name);
  const page = await context.newPage();
  await page.goto('/room');
  await expect(page.getByRole('button', { name: 'Tạo phòng mới', exact: true })).toBeEnabled();
  return page;
}

async function leave(page: Page) {
  await page.getByRole('button', { name: 'Rời phòng', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rời phòng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạo phòng mới', exact: true })).toBeVisible();
}

const card = (page: Page, name: string) => page.locator('.open-room-card').filter({ has: page.getByRole('heading', { name: 'Phòng của ' + name, exact: true }) });

test('listed locked room uses a custom password, survives reload and disappears when host leaves or disconnects', async ({ browser, request }) => {
  test.setTimeout(90000);
  const ca = await browser.newContext(), cb = await browser.newContext();
  const errors: string[] = [];
  try {
    const a = await prepare(ca, 'Chủ phòng Mây'), b = await prepare(cb, 'Bạn của Mây');
    for (const page of [a, b]) page.on('pageerror', error => errors.push(error.message));
    await a.getByLabel('Mật khẩu bạn đặt', { exact: true }).fill('TrangDem2026!');
    await a.getByRole('button', { name: 'Tạo phòng mới', exact: true }).click();
    await expect(a.locator('.room-code')).toBeVisible();
    const code = (await a.locator('.room-code').innerText()).trim();
    const row = card(b, 'Chủ phòng Mây');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Có mật khẩu');
    await expect(row).toContainText(code);
    // Inspect only the local emulator to ensure public metadata never contains the password.
    const lobby = await request.get('http://127.0.0.1:9000/roomLobby.json?ns=demo-inlove-owned-default-rtdb', { headers: { Authorization: 'Bearer owner' } });
    expect(await lobby.text()).not.toContain('TrangDem2026!');
    const stored = await request.get(`http://127.0.0.1:9000/roomPasswords/${code}.json?ns=demo-inlove-owned-default-rtdb`, { headers: { Authorization: 'Bearer owner' } });
    expect(await stored.json()).toMatch(/^[a-f0-9]{64}$/);
    await a.reload();
    await a.getByText('Xem mật khẩu & lời mời', { exact: true }).click();
    await expect(a.locator('.room-password code')).toHaveText('TrangDem2026!');
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Vào phòng của Chủ phòng Mây', exact: true }).click();
    const dialog = b.getByRole('dialog');
    await dialog.getByLabel('Mật khẩu phòng', { exact: true }).fill('SaiMatKhau');
    await dialog.getByRole('button', { name: 'Vào phòng', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(b.locator('.room-code')).toHaveCount(0);
    await dialog.getByLabel('Mật khẩu phòng', { exact: true }).fill('TrangDem2026!');
    await dialog.getByRole('button', { name: 'Vào phòng', exact: true }).click();
    await expect(b.locator('.room-code')).toContainText(code);
    await a.getByLabel('Tin nhắn riêng', { exact: true }).fill('Một lời chào trong phòng có khóa.');
    await a.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(b.locator('.chat-feed')).toContainText('Một lời chào trong phòng có khóa.');
    await leave(b);
    await expect(row).toBeVisible(); // a guest leaving must not remove the host's listing
    await leave(a);
    await expect(row).toHaveCount(0);
    await a.getByLabel('Mã phòng', { exact: true }).fill(code);
    await a.getByLabel('Mật khẩu phòng', { exact: true }).fill('TrangDem2026!');
    await a.getByRole('button', { name: 'Mở cửa căn phòng', exact: true }).click();
    await expect(row).toBeVisible();
    await ca.close();
    await expect(row).toHaveCount(0, { timeout: 20000 });
    expect(errors).toEqual([]);
  } finally { await Promise.all([ca.close(), cb.close()]); }
});

test('password-free listing joins directly, manual code works, and lobby fits both themes at phone/tablet/desktop sizes', async ({ browser }) => {
  test.setTimeout(90000);
  const ca = await browser.newContext(), cb = await browser.newContext();
  const errors: string[] = [];
  try {
    const a = await prepare(ca, 'Chủ phòng Trăng'), b = await prepare(cb, 'Bạn của Trăng');
    for (const page of [a, b]) page.on('pageerror', error => errors.push(error.message));
    await a.getByRole('switch', { name: 'Bảo vệ bằng mật khẩu', exact: true }).uncheck();
    await expect(a.getByLabel('Mật khẩu bạn đặt', { exact: true })).toHaveCount(0);
    await a.getByRole('button', { name: 'Tạo phòng mới', exact: true }).click();
    await expect(a.locator('.room-code')).toBeVisible();
    const code = (await a.locator('.room-code').innerText()).trim();
    await expect(a.locator('.room-summary')).toContainText('Không cần mật khẩu');
    const row = card(b, 'Chủ phòng Trăng');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Không mật khẩu');
    for (const theme of ['night', 'day']) {
      await b.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }, { width: 844, height: 390 }]) {
        await b.setViewportSize(viewport);
        expect(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${viewport.width}`).toBe(true);
        expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        expect((await row.getByRole('button').boundingBox())!.height).toBeGreaterThanOrEqual(44);
        for (const label of await b.locator('.room-option').all()) expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        if ([390, 1440].includes(viewport.width)) await b.screenshot({ path: `artifacts/rooms-${theme}-${viewport.width}.png`, fullPage: true });
      }
    }
    await b.setViewportSize({ width: 390, height: 844 });
    await row.getByRole('button', { name: 'Vào phòng của Chủ phòng Trăng', exact: true }).click();
    await expect(b.getByRole('dialog')).toHaveCount(0);
    await expect(b.locator('.room-code')).toContainText(code);
    await b.getByLabel('Tin nhắn riêng', { exact: true }).fill('Chào căn phòng không mật khẩu.');
    await b.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(a.locator('.chat-feed')).toContainText('Chào căn phòng không mật khẩu.');
    await leave(b);
    await b.getByLabel('Mã phòng', { exact: true }).fill(code);
    await b.getByRole('button', { name: 'Mở cửa căn phòng', exact: true }).click();
    await expect(b.locator('.room-code')).toContainText(code);
    expect(errors).toEqual([]);
  } finally { await Promise.all([ca.close(), cb.close()]); }
});

test('unlisted room stays out of the directory but still supports code/password entry', async ({ browser }) => {
  const ca = await browser.newContext(), cb = await browser.newContext();
  try {
    const a = await prepare(ca, 'Chủ phòng Kín'), b = await prepare(cb, 'Bạn được mời');
    await a.getByRole('switch', { name: 'Hiện trong danh sách phòng', exact: true }).uncheck();
    await a.getByLabel('Mật khẩu bạn đặt', { exact: true }).fill('KhoangTroiRieng');
    await a.getByRole('button', { name: 'Tạo phòng mới', exact: true }).click();
    await expect(a.locator('.room-code')).toBeVisible();
    const code = (await a.locator('.room-code').innerText()).trim();
    await expect(a.locator('.room-summary')).toContainText('Không hiện trong danh sách');
    await expect(card(b, 'Chủ phòng Kín')).toHaveCount(0);
    await b.getByLabel('Mã phòng', { exact: true }).fill(code);
    await b.getByLabel('Mật khẩu phòng', { exact: true }).fill('KhoangTroiRieng');
    await b.getByRole('button', { name: 'Mở cửa căn phòng', exact: true }).click();
    await expect(b.locator('.room-code')).toContainText(code);
  } finally { await Promise.all([ca.close(), cb.close()]); }
});

test('new password remains visible if password storage is full and never recovers a digest as clear text', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await prepare(context, 'Mây lưu tạm');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.includes(':password:')) throw new DOMException('Full', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await page.getByLabel('Mật khẩu bạn đặt', { exact: true }).fill('MatKhauCuaMay');
    await page.getByRole('button', { name: 'Tạo phòng mới', exact: true }).click();
    await expect(page.locator('.room-code')).toBeVisible();
    await page.getByText('Xem mật khẩu & lời mời', { exact: true }).click();
    await expect(page.locator('.room-password code')).toHaveText('MatKhauCuaMay');
    await page.reload();
    await page.getByText('Chia sẻ lời mời', { exact: true }).click();
    await expect(page.locator('.room-password code')).toHaveCount(0);
    await expect(page.locator('.room-password')).toContainText('không thể xem lại');
  } finally { await context.close(); }
});
