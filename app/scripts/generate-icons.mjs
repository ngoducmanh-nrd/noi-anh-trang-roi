import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:5173/icons/moon-icon.svg');
  for(const [source,name,size] of [['moon-icon.svg','moon-192.png',192],['moon-icon.svg','moon-512.png',512],['maskable.svg','maskable-512.png',512]]){
    const data=await page.evaluate(async({source,size})=>{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='/icons/'+source});const canvas=document.createElementNS('http://www.w3.org/1999/xhtml','canvas');canvas.width=size;canvas.height=size;canvas.getContext('2d').drawImage(image,0,0,size,size);return canvas.toDataURL('image/png').split(',')[1]},{source,size});
    await writeFile(new URL('../public/icons/'+name,import.meta.url),Buffer.from(data,'base64'));
  }
  console.log('Generated192/512px PNG icons from code-native SVG icons.');
}finally{await browser.close()}
