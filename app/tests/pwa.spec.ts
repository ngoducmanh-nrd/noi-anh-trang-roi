import { test, expect } from '@playwright/test';
test.use({baseURL:'http://127.0.0.1:4173'});
test('production PWA: manifest, service worker and memories after offline reload',async({browser})=>{
  const context=await browser.newContext({serviceWorkers:'allow'});
  try{
    await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return host.endsWith('googleapis.com')||host.endsWith('firebaseio.com')||host.endsWith('firebasedatabase.app')?route.abort('blockedbyclient'):route.continue()});
    const page=await context.newPage();await page.goto('/');
    await page.getByLabel(/Tên hiển thị/).fill('Trăng ngoại tuyến');await page.getByRole('button',{name:'Bước vào không gian của mình'}).click();
    await expect(page.locator('.connection-online')).toBeVisible();
    const manifest=await page.evaluate(async()=>await (await fetch('/manifest.webmanifest')).json());
    expect(manifest.name).toBe('Nơi Ánh Trăng Rơi');expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((i:{sizes:string})=>i.sizes==='192x192')).toBe(true);expect(manifest.icons.some((i:{sizes:string})=>i.sizes==='512x512')).toBe(true);
    await page.evaluate(async()=>{await navigator.serviceWorker.ready});
    await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.waitForFunction(async()=>{const keys=await caches.keys();for(const key of keys){const c=await caches.open(key);if(await c.match('/app-config.js'))return true}return false});
    await page.getByRole('link',{name:'Điều muốn giữ',exact:true}).click();
    await page.getByRole('button',{name:'Giữ một kỷ niệm',exact:true}).click();
    await page.getByLabel('Đặt tên cho kỷ niệm').fill('Mảnh trăng ngoại tuyến');await page.getByLabel('Kể lại một chút nhé').fill('Mất mạng vẫn giữ được kỷ niệm.');await page.getByRole('button',{name:'Giữ lại kỷ niệm',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Mảnh trăng ngoại tuyến'})).toBeVisible();
    await context.setOffline(true);await page.reload();
    await expect(page.getByRole('heading',{name:'Mảnh trăng ngoại tuyến'})).toBeVisible();
    await expect(page.getByText('Bạn đang ngoại tuyến.',{exact:false})).toBeVisible();
    await expect(page.locator('.connection-offline')).toBeVisible();
    await page.screenshot({path:'artifacts/pwa-offline.png',fullPage:true});
  }finally{await context.close()}
});
