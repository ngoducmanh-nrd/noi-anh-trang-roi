// Extract the approved 4×4 contact sheet without repainting its artwork.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const source=process.argv[2];
if(!source)throw Error('Pass the approved contact sheet PNG path.');
const folder=new URL('../src/assets/avatars/',import.meta.url);
await mkdir(folder,{recursive:true});
const sheet=await readFile(source);
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage();
  const images=await page.evaluate(async data=>{
    const image=new Image();image.src=data;await image.decode();
    return Array.from({length:16},(_,index)=>{
      const col=index%4,row=Math.floor(index/4);
      const cell=image.width/4,cellY=image.height/4;
      const canvas=document.createElement('canvas');canvas.width=288;canvas.height=288;
      canvas.getContext('2d').drawImage(image,col*cell+11,row*cellY+11,cell-22,cellY-22,0,0,288,288);
      return canvas.toDataURL('image/webp',.88).split(',')[1];
    });
  },'data:image/png;base64,'+sheet.toString('base64'));
  for(const [i,data] of images.entries())await writeFile(new URL(`moon-${String(i+1).padStart(2,'0')}.webp`,folder),Buffer.from(data,'base64'));
  console.log(`Extracted ${images.length} approved avatars, 288×288 WebP.`);
}finally{await browser.close()}
