import { test, expect, type BrowserContext, type Page, type APIRequestContext } from '@playwright/test';

const config = { firebase: { apiKey: 'demo-api-key', authDomain: 'demo-inlove-owned.firebaseapp.com', databaseURL: 'https://demo-inlove-owned-default-rtdb.firebaseio.com', projectId: 'demo-inlove-owned', appId: '1:123:web:demo' }, emulators: true, site: {} };
async function prepare(context: BrowserContext, name: string, path = '/support') {
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
  await page.goto(path);
  const uid = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this module in the browser.
    const service = await import('/src/lib/firebase.ts');
    await service.initializeConnection();
    return service.getUid() as string;
  });
  await expect(page.locator('.connection-online')).toBeAttached();
  return { page, uid };
}
async function grant(request: APIRequestContext, uid: string, enabled: boolean) {
  const url = `http://127.0.0.1:9000/supportAdmins/${uid}.json?ns=demo-inlove-owned-default-rtdb`;
  const response = enabled ? await request.put(url, { headers: { Authorization: 'Bearer owner' }, data: true }) : await request.delete(url, { headers: { Authorization: 'Bearer owner' } });
  expect(response.ok()).toBe(true);
}
const log = (page: Page) => page.getByRole('log', { name: 'Tin nhắn hỗ trợ' });
async function send(page: Page, text: string, admin = false) {
  await page.getByLabel('Nội dung tin nhắn', { exact: true }).fill(text);
  await page.getByRole('button', { name: admin ? 'Gửi phản hồi' : 'Gửi hỗ trợ', exact: true }).click();
  await expect(log(page)).toContainText(text);
  await expect(page.getByLabel('Nội dung tin nhắn', { exact: true })).toHaveValue('');
}

test('website support has private threads, real admin replies, persisted history and revocable inbox access', async ({ browser, request }) => {
  test.setTimeout(90000);
  const ca = await browser.newContext(), cb = await browser.newContext(), cc = await browser.newContext();
  const errors: string[] = [];
  try {
    const a = await prepare(ca, 'Mây cần hỗ trợ'), b = await prepare(cb, 'Một người khác'), owner = await prepare(cc, 'Chủ website', '/support/inbox');
    for (const page of [a.page, b.page, owner.page]) page.on('pageerror', error => errors.push(error.message));
    await a.page.locator('.support-topics label').filter({ hasText: 'Báo lỗi' }).click();
        await expect(a.page.getByRole('radio', { name: 'Báo lỗi', exact: true })).toBeChecked();
    await send(a.page, 'Mình cần hỗ trợ về căn phòng đôi.');
    await expect(log(a.page)).toContainText('Báo lỗi');
    await expect(log(b.page)).not.toContainText('Mình cần hỗ trợ về căn phòng đôi.');
    await expect(owner.page.getByRole('heading', { name: 'Hộp thư này dành cho người quản trị', exact: true })).toBeVisible();
    await owner.page.getByText('Thiết lập dành cho chủ website', { exact: true }).click();
    await expect(owner.page.locator('.support-setup code')).toHaveText(owner.uid);
    await grant(request, owner.uid, true);
    const thread = owner.page.locator(`a.support-thread[href="/support/inbox/${a.uid}"]`);
        await expect(thread).toHaveAccessibleName('Mở cuộc trò chuyện với Mây cần hỗ trợ');
    await expect(thread).toBeVisible();
    await thread.click();
    await expect(log(owner.page)).toContainText('Mình cần hỗ trợ về căn phòng đôi.');
    await send(owner.page, 'Mình đã nhận báo lỗi, cùng kiểm tra nhé.', true);
    await expect(log(a.page)).toContainText('Mình đã nhận báo lỗi, cùng kiểm tra nhé.');
    await expect(log(a.page)).toContainText('Quản trị');
    await a.page.locator('.support-topics label').filter({ hasText: 'Góp ý tính năng' }).click();
        await expect(a.page.getByRole('radio', { name: 'Góp ý tính năng', exact: true })).toBeChecked();
    const literal = '<img src=x onerror=alert(1)> Mình muốn thêm tính năng.';
    await send(a.page, literal);
    await expect(log(owner.page)).toContainText(literal);
    await expect(log(a.page).locator('img')).toHaveCount(0);
    await send(a.page, 'Mình muốn có thêm lựa chọn thông báo trong phòng.');
    await a.page.reload();
    await expect(log(a.page)).toContainText(literal);
    await expect(log(a.page)).toContainText('Mình đã nhận báo lỗi, cùng kiểm tra nhé.');
    await b.page.goto('/support/inbox/' + a.uid);
    await expect(b.page.getByRole('heading', { name: 'Hộp thư này dành cho người quản trị', exact: true })).toBeVisible();
    await expect(b.page.getByText('Mình cần hỗ trợ về căn phòng đôi.', { exact: true })).toHaveCount(0);
    await grant(request, owner.uid, false);
    await expect(owner.page.getByRole('heading', { name: 'Hộp thư này dành cho người quản trị', exact: true })).toBeVisible();
    await expect(log(owner.page)).toHaveCount(0);
    const cannotReply = await owner.page.evaluate(async target => {
      // @ts-expect-error Browser-only Vite module.
      const service = await import('/src/lib/firebase.ts');
      try { await service.sendSupportMessage(target, { name: 'Chủ website', bio: '', avatar: { kind: 'emoji', value: '🌙' } }, 'Không được phép', 'help', true); return false; } catch { return true; }
    }, a.uid);
    expect(cannotReply).toBe(true);
    expect(errors).toEqual([]);
  } finally { await Promise.all([ca.close(), cb.close(), cc.close()]); }
});

test('support routes and utility menus fit both themes and keep five mobile tabs', async ({ browser, request }) => {
  test.setTimeout(120000);
  const ca = await browser.newContext({ reducedMotion: 'reduce' }), cb = await browser.newContext({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  try {
    const a = await prepare(ca, 'Bạn của trăng', '/profile'), owner = await prepare(cb, 'Quản trị giao diện', '/support/inbox');
    for (const page of [a.page, owner.page]) page.on('pageerror', error => errors.push(error.message));
    await a.page.setViewportSize({ width: 390, height: 844 });
    await expect(a.page.locator('.mobile-nav').getByRole('link')).toHaveCount(5);
    await a.page.locator('.app-menu').getByRole('link', { name: /Hỗ trợ & góp ý/ }).click();
    await expect(a.page).toHaveURL(/\/support$/);
    await expect(a.page.locator('.mobile-nav')).toBeHidden();
    await expect(a.page.locator('.global-chat-fab')).toHaveCount(0);
    await send(a.page, 'Mình có một góp ý nhỏ cho website.');
    await grant(request, owner.uid, true);
    await owner.page.locator(`a.support-thread[href="/support/inbox/${a.uid}"]`).click();
    await send(owner.page, 'Cảm ơn bạn, mình đang lắng nghe.', true);
    await expect(log(a.page)).toContainText('Cảm ơn bạn, mình đang lắng nghe.');
    for (const theme of ['night', 'day']) {
      for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }, { width: 844, height: 390 }]) {
        for (const [page, path, label] of [[a.page, '/support', 'user'], [owner.page, '/support/inbox', 'inbox'], [owner.page, '/support/inbox/' + a.uid, 'reply']] as const) {
          await page.setViewportSize(viewport); await page.goto(path);
          await expect(page.locator('#main-content h1')).toBeVisible();
          const currentTheme = await page.locator('html').getAttribute('data-theme');
          if ((currentTheme === 'day') !== (theme === 'day')) await page.getByRole('button', { name: 'Giao diện sáng', exact: true }).click();
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'day' ? 'day' : '');
          if (label !== 'inbox') await expect(log(page)).toContainText('Cảm ơn bạn, mình đang lắng nghe.');
          else await expect(page.locator(`a.support-thread[href="/support/inbox/${a.uid}"]`)).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme}/${viewport.width}/${label}`).toBe(true);
          if (label !== 'inbox') {
            const button = page.getByRole('button', { name: label === 'reply' ? 'Gửi phản hồi' : 'Gửi hỗ trợ', exact: true });
            expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
            if (viewport.height >= 800) await expect(button).toBeInViewport({ ratio: 1 });
          }
          if ([390, 1440].includes(viewport.width)) await page.screenshot({ path: `artifacts/support-${theme}-${viewport.width}-${label}.png`, fullPage: true });
        }
      }
    }
    await a.page.setViewportSize({ width: 390, height: 844 });
    await a.page.goto('/support');
    await a.page.getByRole('link', { name: 'Quay lại', exact: true }).click();
    await expect(a.page).toHaveURL(/\/profile$/);
    await owner.page.setViewportSize({ width: 390, height: 844 });
    await owner.page.getByRole('link', { name: 'Quay lại', exact: true }).click();
    await expect(owner.page).toHaveURL(/\/support\/inbox$/);
    await a.page.goto('/support');
    await a.page.getByLabel('Nội dung tin nhắn', { exact: true }).fill('Nội dung chưa gửi khi ngoại tuyến.');
    await ca.setOffline(true);
    await expect(a.page.getByRole('button', { name: 'Gửi hỗ trợ', exact: true })).toBeDisabled();
    await expect(a.page.getByLabel('Nội dung tin nhắn', { exact: true })).toHaveValue('Nội dung chưa gửi khi ngoại tuyến.');
    expect(errors).toEqual([]);
  } finally { await Promise.all([ca.close(), cb.close()]); }
});

test('empty support chat never clips its composer on short or zoom-equivalent screens', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const { page } = await prepare(context, 'Kiểm tra khung chat');
    await expect(page.getByRole('heading', { name: 'Có điều gì bạn muốn chia sẻ?', exact: true })).toBeVisible();
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1100, height: 650 }, { width: 1024, height: 600 }, { width: 844, height: 390 }, { width: 768, height: 640 }, { width: 390, height: 640 }, { width: 360, height: 600 }]) {
      await page.setViewportSize(viewport);
      const button = page.getByRole('button', { name: 'Gửi hỗ trợ', exact: true });
      await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight])).toEqual([viewport.width, viewport.height]);
      const bounds = await page.evaluate(() => {
        const button = document.querySelector<HTMLElement>('.support-send-row button')!.getBoundingClientRect();
        const card = document.querySelector<HTMLElement>('.support-conversation')!.getBoundingClientRect();
        return { buttonBottom: button.bottom, cardBottom: card.bottom };
      });
      expect(bounds.buttonBottom, `${viewport.width}×${viewport.height} composer must fit card`).toBeLessThanOrEqual(bounds.cardBottom - 1);
      if (viewport.width === 1280) await page.screenshot({ path: 'artifacts/support-short-after.png', fullPage: true });
      expect(await log(page).evaluate(el => el.scrollTop), 'an empty feed must not scroll its introduction off the top').toBe(0);
      await button.scrollIntoViewIfNeeded();

      await expect(button, `${viewport.width}×${viewport.height} button visible after scrolling`).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally { await context.close(); }
});

test('admin inbox entry is hidden from users and follows granted or revoked admin rights', async ({ browser, request }) => {
  const context = await browser.newContext();
  try {
    const { page, uid } = await prepare(context, 'Chưa có quyền hộp thư');
    const entry = page.getByRole('link', { name: /hộp thư quản trị/i });
    await expect(entry).toHaveCount(0);
    await page.goto('/support/inbox');
    await expect(page.getByRole('heading', { name: 'Hộp thư này dành cho người quản trị', exact: true })).toBeVisible();
    await page.getByText('Thiết lập dành cho chủ website', { exact: true }).click();
    await expect(page.locator('.support-setup code')).toHaveText(uid);
    await expect(page.locator('.support-setup')).toContainText('supportAdmins/' + uid);
    await expect(page.locator('.support-thread')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Gửi phản hồi', exact: true })).toHaveCount(0);
    await page.goto('/support');
    await grant(request, uid, true);
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/\/support\/inbox$/);
    await expect(page.locator('.support-thread-list')).toBeVisible();
    await grant(request, uid, false);
    await expect(page.getByRole('heading', { name: 'Hộp thư này dành cho người quản trị', exact: true })).toBeVisible();
    await page.goto('/support');
    await expect(entry).toHaveCount(0);
  } finally { await context.close(); }
});
