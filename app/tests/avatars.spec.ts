import { test,expect } from '@playwright/test';

test('painted avatars load, preserve old avatars and persist a new selection',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  try{
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname==='/app-config.js')return route.fulfill({contentType:'application/javascript',body:'window.APP_CONFIG={firebase:{projectId:"avatars-review"},site:{}}'});if(/(googleapis\.com|firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))return route.abort();return route.continue()});
    await context.addInitScript(()=>{if(!localStorage.getItem('moonlight:avatars-review:profile'))localStorage.setItem('moonlight:avatars-review:profile',JSON.stringify({name:'Bạn của trăng',avatar:{kind:'emoji',value:'🐰'},bio:''}))});
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/profile/edit');await expect(page.locator('.profile-avatar-editor .avatar')).toHaveText('🐰');
    const choices=page.locator('.avatar-preset');await expect(choices).toHaveCount(16);
    await expect.poll(()=>choices.locator('img').evaluateAll(es=>es.every(e=>(e as HTMLImageElement).complete&&(e as HTMLImageElement).naturalWidth===288))).toBe(true);
    const values=await choices.locator('img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));expect(new Set(values).size).toBe(16);
    await choices.nth(11).click();await expect(choices.nth(11)).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.profile-avatar-editor img')).toHaveAttribute('src',values[11]!);
    await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();
    await page.reload();await page.goto('/profile/edit');await expect(choices.nth(11)).toHaveAttribute('aria-pressed','true');
    for(const theme of ['night','day']){
      if(theme==='day')await page.getByRole('button',{name:'Giao diện sáng',exact:true}).click();
      for(const width of [360,390,768,1440]){
        await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
        if(width===390||width===1440)await page.screenshot({path:`artifacts/avatars-${theme}-${width}.png`,fullPage:true});
      }
    }
    // Upload remains available and uses the same preview and storage format.
    await page.locator('.avatar-upload input').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64')});
    await expect(page.locator('.profile-avatar-editor img')).toHaveAttribute('src',/^data:image\/jpeg;base64,/);
    expect(errors).toEqual([]);
  }finally{await context.close()}
});
