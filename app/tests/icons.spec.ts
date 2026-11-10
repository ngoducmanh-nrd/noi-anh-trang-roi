import { test,expect,type BrowserContext } from '@playwright/test';

async function prepare(context:BrowserContext){
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname==='/app-config.js')return route.fulfill({contentType:'application/javascript',body:'window.APP_CONFIG={firebase:{projectId:"icons-review"},site:{}}'});if(/(googleapis\.com|firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))return route.abort('blockedbyclient');return route.continue()});
  await context.addInitScript(()=>{if(!localStorage.getItem('moonlight:icons-review:profile'))localStorage.setItem('moonlight:icons-review:profile',JSON.stringify({name:'Bạn của trăng',avatar:{kind:'emoji',value:'🌙'},bio:''}))});
  const page=await context.newPage();await page.goto('/');return page;
}
test('Hugeicons render in both themes and navigation animates from the whole target',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'no-preference',viewport:{width:1440,height:1000}});
  try{
    const page=await prepare(context);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const nav=page.locator('.desktop-nav').getByRole('link',{name:'Khoảng trời',exact:true});
    await expect(nav).toHaveClass(/nav-item active/);
    await expect(nav).toHaveCSS('display','flex');
    const group=nav.locator('svg[data-icon="home"] g').first();
    const initial=await group.evaluate(e=>getComputedStyle(e).transform);
    const box=await nav.boundingBox();await nav.hover({position:{x:box!.width-16,y:box!.height/2}});
    await expect.poll(()=>group.evaluate(e=>getComputedStyle(e).transform),{timeout:1500,intervals:[16,30,50]}).not.toBe(initial);
    await page.mouse.move(800,25);
    for(const theme of ['night','day']){
      if(theme==='day')await page.getByRole('button',{name:'Giao diện sáng',exact:true}).click();
      for(const path of ['/','/room','/discover','/memories','/profile','/little-things']){
        await page.goto(path);await expect(page.locator('#main-content')).toBeVisible();
        expect(await page.locator('svg.icon:not([data-icon-library="animate-ui-hugeicons"])').count()).toBe(0);
        expect(await page.locator('svg.icon').evaluateAll(es=>es.every(e=>e.getAttribute('aria-hidden')==='true'&&e.getAttribute('focusable')==='false'))).toBe(true);
        expect(await page.locator('svg.icon:visible').evaluateAll(es=>es.length>0&&es.every(e=>e.getBoundingClientRect().width>0))).toBe(true);
      }
      await page.goto('/');await page.locator('.shell-header').click();await page.screenshot({path:`artifacts/hugeicons-${theme}-desktop.png`,fullPage:true});
      await page.setViewportSize({width:390,height:960});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await expect(page.locator('.mobile-nav').getByRole('link',{name:'Trang chủ',exact:true})).toHaveClass(/mobile-nav-item active/);
      await page.screenshot({path:`artifacts/hugeicons-${theme}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
      for(const width of [360,768]){await page.setViewportSize({width,height:960});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
      await page.setViewportSize({width:1440,height:1000});
    }
    expect(errors).toEqual([]);
  }finally{await context.close()}
});
test('reduced motion keeps animated navigation icons still',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce'});
  try{const page=await prepare(context);const nav=page.locator('.desktop-nav').getByRole('link',{name:'Khoảng trời',exact:true});const group=nav.locator('svg[data-icon="home"] g').first();const initial=await group.evaluate(e=>getComputedStyle(e).transform);await nav.hover();await page.waitForTimeout(250);expect(await group.evaluate(e=>getComputedStyle(e).transform)).toBe(initial);
  }finally{await context.close()}
});
test('touch navigation preserves activation and theme choice',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:960},hasTouch:true,isMobile:true});
  try{const page=await prepare(context);await page.locator('.mobile-nav').getByRole('link',{name:'Kỷ niệm',exact:true}).tap();await expect(page).toHaveURL(/\/memories$/);await expect(page.getByRole('heading',{name:'Ngăn kỷ niệm',exact:true})).toBeVisible();await page.getByRole('button',{name:'Giao diện sáng',exact:true}).tap();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','day');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }finally{await context.close()}
});
