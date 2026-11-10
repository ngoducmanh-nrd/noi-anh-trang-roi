// Vendor only the icon components used by the app, pinned to an upstream commit.
import { mkdir,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const mapping={moon:'moon-02',sun:'sun-03',home:'home-03',heart:'favourite',chat:'message-circle',users:'users-round',game:'target-01',sparkles:'sparkles',plus:'add-01',arrowRight:'arrow-right-01',arrowLeft:'arrow-left-01',settings:'settings-02',calendar:'calendar',bookmark:'bookmark',send:'sent',close:'cancel-01',check:'check',copy:'copy-01',link:'link-01',logout:'logout-01',upload:'upload-01',image:'gallery-horizontal',music:'music-3',volume:'volume-high',more:'more-horizontal',shield:'shield-check',wifi:'wifi-01',offline:'wifi-off-01',download:'download-01',menu:'menu-01',trash:'trash',edit:'pencil-edit-02',search:'search-01',star:'star',refresh:'refresh'};
// Animate UI Lucide icons (https://animate-ui.com/docs/icons/lucide-icons), used only where listed.
const lucideMapping={trash2:'trash-2'};
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'noi-anh-trang-roi-icon-sync'}});if(!r.ok)throw Error(`${r.status} ${url}`);return r.text()}
const commit=process.argv[2]||JSON.parse(await get('https://api.github.com/repos/imskyleen/animate-ui/commits/main')).sha;
const base=`https://raw.githubusercontent.com/imskyleen/animate-ui/${commit}/`;
const root=new URL('../src/components/animate-ui/',import.meta.url);
await mkdir(root,{recursive:true});
await writeFile(new URL('LICENSE.md',root),await get(base+'LICENSE.md'));

async function vendor({iconMapping,dir,label,sourcePath}){
  const folder=new URL(dir+'/',root);
  await mkdir(folder,{recursive:true});
  const records=[];
  const queue=[...new Set(Object.values(iconMapping))];
  await Promise.all(Array.from({length:4},async()=>{
    for(let slug;slug=queue.shift();){
      const path=sourcePath(slug);
      const source=await get(base+path);
      if(!source.includes("@animate-ui/react/icons"))throw Error('Unexpected component format: '+slug);
      const exported=source.match(/function\s+([A-Z][A-Za-z0-9]+)\(props:\s*[A-Za-z0-9]+Props\)/)?.[1];
      if(!exported)throw Error('Missing component export: '+slug);
      const header=`// Animate UI ${label}: ${slug}\n// Source: https://github.com/imskyleen/animate-ui/blob/${commit}/${path}\n// License: MIT + Commons Clause; see ../LICENSE.md\n`;
      await writeFile(new URL(slug+'.tsx',folder),header+source);
      records.push({slug,component:exported,url:base+path,sha256:createHash('sha256').update(source).digest('hex')});
    }
  }));
  records.sort((a,b)=>a.slug.localeCompare(b.slug));
  return records;
}

const records=await vendor({iconMapping:mapping,dir:'hugeicons',label:'Hugeicons',sourcePath:slug=>`apps/v2/registry/hugeicons/${slug}/index.tsx`});
const lucideRecords=await vendor({iconMapping:lucideMapping,dir:'lucide',label:'Lucide',sourcePath:slug=>`apps/v2/registry/icons/${slug}/index.tsx`});

const imports=records.map(r=>`import { ${r.component} } from './hugeicons/${r.slug}';`).join('\n');
const names=Object.entries(mapping).map(([alias,slug])=>`  ${alias}: ${records.find(r=>r.slug===slug).component},`).join('\n');
const lucideImports=lucideRecords.map(r=>`import { ${r.component} as Lucide${r.component} } from './lucide/${r.slug}';`).join('\n');
const lucideNames=Object.entries(lucideMapping).map(([alias,slug])=>`  ${alias}: Lucide${lucideRecords.find(r=>r.slug===slug).component},`).join('\n');
await writeFile(new URL('registry.ts',root),`// Only used components are imported; no import of the full icon catalogue.\n${imports}\n${lucideImports}\n\nexport const animatedIcons = {\n${names}\n};\n\n// Animate UI Lucide icons, looked up by Icon after animatedIcons.\nexport const lucideIcons = {\n${lucideNames}\n};\n`);
await writeFile(new URL('manifest.json',root),JSON.stringify({repository:'imskyleen/animate-ui',commit,license:'MIT + Commons Clause',mapping,icons:records,lucide:{mapping:lucideMapping,icons:lucideRecords}},null,2)+'\n');
console.log(`Downloaded ${records.length} Hugeicons and ${lucideRecords.length} Lucide icon components pinned to ${commit.slice(0,12)}; preserved upstream license.`);
