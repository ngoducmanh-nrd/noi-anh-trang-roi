import { test, expect, type BrowserContext, type Page } from '@playwright/test';
const config={firebase:{apiKey:'demo-api-key',authDomain:'demo-inlove-owned.firebaseapp.com',databaseURL:'https://demo-inlove-owned-default-rtdb.firebaseio.com',projectId:'demo-inlove-owned',appId:'1:123:web:demo'},emulators:true,site:{MINIGAMES:[],CONTACTS:{},DONATE_QR_IMAGE:'',MUSIC_URL:''}};
async function prepare(context:BrowserContext,name:string){
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname.endsWith('firebaseio.com')||url.hostname.endsWith('firebasedatabase.app')||url.hostname.endsWith('googleapis.com'))return route.abort('blockedbyclient');if(url.pathname==='/app-config.js')return route.fulfill({contentType:'application/javascript',body:'window.APP_CONFIG='+JSON.stringify(config)});return route.continue()});
  const page=await context.newPage();await page.goto('/');
  await page.getByLabel(/Tên hiển thị/).fill(name);
  await page.getByRole('button',{name:'Bước vào không gian của mình'}).click();
  await expect(page.locator('.connection-online')).toBeVisible();
  return page;
}
test('two users: rooms, chat, games, memories and matched room',async({browser})=>{
  const ca=await browser.newContext(),cb=await browser.newContext();
  const errors:string[]=[];
  try{
    const a=await prepare(ca,'Trăng UI Alice'),b=await prepare(cb,'Trăng UI Bobby');
    for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
    await a.screenshot({path:'artifacts/home-desktop.png',fullPage:true});
    await a.getByRole('link',{name:'Phòng của hai ta',exact:true}).click();
    await a.getByRole('button',{name:'Tạo phòng mới',exact:true}).click();
    await expect(a.locator('.room-code')).toBeVisible();
    const code=(await a.locator('.room-code').innerText()).trim();
    await a.getByText('Xem mật khẩu & lời mời',{exact:true}).click();
    const password=(await a.locator('.room-password code').innerText()).trim();
    await b.getByRole('link',{name:'Phòng của hai ta',exact:true}).click();
    await b.getByLabel('Mã phòng',{exact:true}).fill(code);await b.getByLabel('Mật khẩu phòng',{exact:true}).fill('WRONGPASSWORD1234');
    await b.getByRole('button',{name:'Mở cửa căn phòng',exact:true}).click();await expect(b.getByRole('alert')).toBeVisible();
    await b.getByLabel('Mật khẩu phòng',{exact:true}).fill(password);await b.getByRole('button',{name:'Mở cửa căn phòng',exact:true}).click();
    await expect(b.locator('.room-code')).toContainText(code);
    await a.getByLabel('Tin nhắn riêng',{exact:true}).fill('Mình hẹn nhau dưới trăng.');await a.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
    await expect(b.locator('.chat-feed')).toContainText('Mình hẹn nhau dưới trăng.');
    await b.getByLabel('Tin nhắn riêng',{exact:true}).fill('Mình nghe đây.');await b.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
    await expect(a.locator('.chat-feed')).toContainText('Mình nghe đây.');
    await a.getByRole('button',{name:'Mở bộ sticker'}).click();await a.getByLabel('Emoji để tạo sticker').fill('🌙');await a.getByRole('button',{name:'Tạo',exact:true}).click();
    await a.getByRole('button',{name:'Gửi sticker',exact:true}).click();await expect(b.locator('.sticker-message img')).toBeVisible();
    for(const p of [a,b])await p.getByRole('tab',{name:'Chơi cùng nhau'}).click();
    await a.getByRole('button',{name:/Tham gia bàn chơi/}).click();await b.getByRole('button',{name:/Tham gia bàn chơi/}).click();
    await expect(a.getByRole('button',{name:'Rút lá bài của mình'})).toBeVisible();
    await a.getByRole('button',{name:'Đề nghị kết thúc',exact:true}).click();
    await b.getByRole('button',{name:'Đồng ý kết thúc',exact:true}).click();
    await expect(a.getByRole('button',{name:/Bắt đầu phiên mới/})).toBeVisible();
    for(const p of [a,b])await p.getByRole('tab',{name:/Cờ XO/}).click();
    await a.getByRole('button',{name:'Tôi chọn X',exact:true}).click();await b.getByRole('button',{name:'Tôi chọn O',exact:true}).click();
    await expect(a.getByRole('button',{name:'Hàng 1, cột 1: trống',exact:true})).toBeEnabled();
    await a.getByRole('button',{name:'Hàng 1, cột 1: trống',exact:true}).click();
    await expect(b.getByRole('button',{name:'Hàng 1, cột 1: X',exact:true})).toBeVisible();
    await a.setViewportSize({width:390,height:960});
    expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'XO board must scroll inside its panel').toBe(true);
    await a.locator('.shell-header').click();
    await a.screenshot({path:'artifacts/games-mobile.png',fullPage:true});
    await a.setViewportSize({width:1440,height:1000});
    await a.getByRole('link',{name:'Điều muốn giữ',exact:true}).click();
    await a.getByRole('button',{name:'Giữ một kỷ niệm',exact:true}).click();await a.getByLabel('Đặt tên cho kỷ niệm').fill('Đêm trăng đầu tiên');await a.getByLabel('Kể lại một chút nhé').fill('Mình đã tìm thấy một khoảng trời riêng.');
    await a.getByRole('button',{name:'Giữ lại kỷ niệm',exact:true}).click();await expect(a.getByRole('heading',{name:'Đêm trăng đầu tiên'})).toBeVisible();
    await a.reload();await expect(a.getByRole('heading',{name:'Đêm trăng đầu tiên'})).toBeVisible();
    await a.getByRole('button',{name:'Mở chat chung',exact:true}).click();await a.getByLabel('Tin nhắn chat chung',{exact:true}).fill('Chào cả khoảng trời.');await a.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await expect(a.getByRole('dialog').locator('.chat-feed')).toContainText('Chào cả khoảng trời.');await a.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
    await expect(b.locator('.chat-unread')).toBeVisible();
    await b.getByRole('button',{name:'Mở chat chung',exact:true}).click();await expect(b.getByRole('dialog').locator('.chat-feed')).toContainText('Chào cả khoảng trời.');await expect(b.locator('.chat-unread')).toHaveCount(0);await b.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
    for(const p of [a,b]){await p.getByRole('link',{name:'Tìm một người',exact:true}).click();await p.getByRole('button',{name:/Bật tìm đôi/}).click()}
    await a.locator('.person-card').filter({has:a.getByRole('heading',{name:'Trăng UI Bobby',exact:true})}).getByRole('button',{name:'Gửi lời mời',exact:true}).click();
    await a.getByRole('dialog').getByRole('button',{name:'Gửi lời mời',exact:true}).click();
    await b.locator('.invite-banner').getByRole('button',{name:'Đồng ý',exact:true}).click();
    await expect(a).toHaveURL(/\/room$/);await expect(b).toHaveURL(/\/room$/);
    const matched=(await a.locator('.room-code').innerText()).trim();await expect(b.locator('.room-code')).toContainText(matched);
    await a.getByRole('button',{name:'Rời phòng',exact:true}).click();await a.getByRole('dialog').getByRole('button',{name:'Rời phòng',exact:true}).click();
    await a.reload();await expect(a.getByRole('button',{name:'Tạo phòng mới',exact:true})).toBeVisible();await expect(a.locator('.room-code')).toHaveCount(0);
    expect(errors).toEqual([]);
  }finally{await ca.close();await cb.close()}
});
test('responsive routes, deep links and browser back',async({browser})=>{
  const context=await browser.newContext();
  try{const page=await prepare(context,'Trăng Responsive');
    for(const width of [360,390,768,1440]){
      await page.setViewportSize({width,height:960});
      for(const path of ['/','/room','/discover','/memories','/profile','/little-things']){
        await page.goto(path);await expect(page.locator('#main-content')).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow at ${width}`).toBe(true);
      }
      await page.goto('/');await page.screenshot({path:`artifacts/home-${width}.png`,fullPage:true});
    }
    await page.goto('/memories');await page.goto('/profile');await page.goBack();await expect(page).toHaveURL(/\/memories$/);
  }finally{await context.close()}
});
test('legacy local profile and memories migrate without deleting original keys',async({browser})=>{
  const context=await browser.newContext();
  try{await context.route('**/app-config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.APP_CONFIG='+JSON.stringify(config)}));
    await context.addInitScript(()=>localStorage.setItem('inlove_owned_v1_demo-inlove-owned',JSON.stringify({profile:{name:'Người cũ dưới trăng',avatar:{kind:'emoji',value:'🌙'},bio:'Kỷ niệm vẫn ở đây'},notes:[{title:'Kỷ niệm từ bản cũ',content:'Nội dung cũ',at:Date.now()}],anniversary:'2025-01-01'})));
    const page=await context.newPage();await page.goto('/memories');await expect(page.getByRole('heading',{name:'Kỷ niệm từ bản cũ'})).toBeVisible();
    expect(await page.evaluate(()=>!!localStorage.getItem('inlove_owned_v1_demo-inlove-owned'))).toBe(true);
  }finally{await context.close()}
});
