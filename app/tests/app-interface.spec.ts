import {test,expect,type BrowserContext} from '@playwright/test';

async function prepare(context:BrowserContext){
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname==='/app-config.js')return route.fulfill({contentType:'application/javascript',body:'window.APP_CONFIG={firebase:{projectId:"interface-review"},site:{}}'});if(/(googleapis\.com|firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))return route.abort();return route.continue()});
  await context.addInitScript(()=>{if(!localStorage.getItem('moonlight:interface-review:profile'))localStorage.setItem('moonlight:interface-review:profile',JSON.stringify({name:'Bạn của trăng',avatar:{kind:'emoji',value:'🌙'},bio:'Một chút dịu dàng dưới trăng.',relationship:'secret'}))});
  const page=await context.newPage();return page;
}
test('app screens fit both themes, small phones, tablets and landscape',async({browser})=>{
  test.setTimeout(120000);
  const context=await browser.newContext({reducedMotion:'reduce'});
  try{
    const page=await prepare(context);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    for(const theme of ['night','day']){
      await page.goto('/');if(theme==='day'){await page.getByRole('button',{name:'Giao diện sáng',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','day')}
      for(const viewport of [{width:360,height:800},{width:375,height:812},{width:390,height:844},{width:768,height:1024},{width:1440,height:1000},{width:844,height:390}]){
        await page.setViewportSize(viewport);
        for(const path of ['/','/profile','/profile/edit','/chat','/room','/discover','/memories','/little-things']){
          await page.goto(path);await expect(page.locator('#main-content h1')).toBeAttached();await expect(page.locator('.loading')).toHaveCount(0);
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme} ${viewport.width} ${path}`).toBe(true);
          if(path==='/chat'){
            await expect(page.locator('.composer')).toBeInViewport();
            if(viewport.width<=760)await expect(page.locator('.mobile-nav')).toBeHidden();
            await expect(page.getByRole('link',{name:'Quay lại',exact:true})).toBeVisible();
          }
          if(viewport.width===390&&path==='/'){
            const bounds=await page.locator('.connect-grid').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThan(viewport.height-76);
          }
          if([390,1440].includes(viewport.width)&&['/','/profile','/profile/edit','/chat'].includes(path))await page.screenshot({path:`artifacts/app-${theme}-${viewport.width}-${path==='/'?'home':path.slice(1).replace('/','-')}.png`,fullPage:true});
        }
      }
    }
    expect(errors).toEqual([]);
  }finally{await context.close()}
});

test('profile editing and chat have real routes, back controls and preserved avatar',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  try{
    const page=await prepare(context);await page.goto('/profile');await expect(page.locator('#profile-name')).toHaveCount(0);
    await page.locator('.profile-edit-action').tap();await expect(page).toHaveURL(/\/profile\/edit$/);
    await page.getByLabel('Tên hiển thị').fill('Ánh Trăng');await page.locator('.avatar-preset').nth(3).tap();
    await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).tap();await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading',{name:'Ánh Trăng',exact:true})).toBeVisible();await page.reload();await expect(page.locator('.profile-identity img')).toBeVisible();
    await page.locator('.profile-edit-action').tap();await page.getByRole('link',{name:'Quay lại',exact:true}).tap();await expect(page).toHaveURL(/\/profile$/);
    await page.goto('/');await page.getByRole('link',{name:/Chuyện dưới trăng/}).first().tap();await expect(page).toHaveURL(/\/chat$/);
    await page.getByRole('button',{name:'Mở bộ sticker'}).tap();await expect(page.getByText('Những chiếc sticker của bạn')).toBeVisible();
    await page.getByRole('button',{name:'Đóng sticker'}).tap();await expect(page.getByText('Những chiếc sticker của bạn')).toHaveCount(0);
    await page.goBack();await expect(page).toHaveURL(/\/$/);
    await page.goto('/chat');await page.keyboard.press('Escape');await expect(page).toHaveURL(/\/$/);
    await page.goto('/profile/edit');await page.getByLabel('Tên hiển thị').focus();expect(await page.getByLabel('Tên hiển thị').evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
  }finally{await context.close()}
});
