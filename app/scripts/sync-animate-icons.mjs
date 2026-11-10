// Vendor only the icon components used by the app, pinned to an upstream commit.
import { mkdir,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const mapping={moon:'moon-02',sun:'sun-03',home:'home-03',heart:'favourite',chat:'message-circle',users:'users-round',game:'target-01',sparkles:'sparkles',plus:'add-01',arrowRight:'arrow-right-01',arrowLeft:'arrow-left-01',settings:'settings-02',calendar:'calendar',bookmark:'bookmark',send:'sent',close:'cancel-01',check:'check',copy:'copy-01',link:'link-01',logout:'logout-01',upload:'upload-01',image:'gallery-horizontal',music:'music-3',volume:'volume-high',more:'more-horizontal',shield:'shield-check',wifi:'wifi-01',offline:'wifi-off-01',download:'download-01',menu:'menu-01',trash:'trash',edit:'pencil-edit-02',search:'search-01',star:'star',refresh:'refresh'};
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'noi-anh-trang-roi-icon-sync'}});if(!r.ok)throw Error(`${r.status} ${url}`);return r.text()}
const commit=process.argv[2]||JSON.parse(await get('https://api.github.com/repos/imskyleen/animate-ui/commits/main')).sha;
const base=`https://raw.githubusercontent.com/imskyleen/animate-ui/${commit}/`;
const folder=new URL('../src/components/animate-ui/hugeicons/',import.meta.url);
await mkdir(folder,{recursive:true});
await writeFile(new URL('../LICENSE.md',folder),await get(base+'LICENSE.md'));
const records=[];
const queue=[...new Set(Object.values(mapping))];
await Promise.all(Array.from({length:4},async()=>{
  for(let slug;slug=queue.shift();){
    const path=`apps/v2/registry/hugeicons/${slug}/index.tsx`;
    const source=await get(base+path);
    if(!source.includes("@animate-ui/react/icons"))throw Error('Unexpected component format: '+slug);
    const exported=source.match(/function\s+([A-Z][A-Za-z0-9]+)\(props:\s*[A-Za-z0-9]+Props\)/)?.[1];
    if(!exported)throw Error('Missing component export: '+slug);
    const header=`// Animate UI Hugeicons: ${slug}\n// Source: https://github.com/imskyleen/animate-ui/blob/${commit}/${path}\n// License: MIT + Commons Clause; see ../LICENSE.md\n`;
    await writeFile(new URL(slug+'.tsx',folder),header+source);
    records.push({slug,component:exported,url:base+path,sha256:createHash('sha256').update(source).digest('hex')});
  }
}));
records.sort((a,b)=>a.slug.localeCompare(b.slug));
const imports=records.map(r=>`import { ${r.component} } from './hugeicons/${r.slug}';`).join('\n');
const names=Object.entries(mapping).map(([alias,slug])=>`  ${alias}: ${records.find(r=>r.slug===slug).component},`).join('\n');
await writeFile(new URL('../registry.ts',folder),`// Only used components are imported; no import of the full icon catalogue.\n${imports}\n\nexport const animatedIcons = {\n${names}\n};\n`);
await writeFile(new URL('../manifest.json',folder),JSON.stringify({repository:'imskyleen/animate-ui',commit,license:'MIT + Commons Clause',mapping,icons:records},null,2)+'\n');
console.log(`Downloaded ${records.length} icon components pinned to ${commit.slice(0,12)}; preserved upstream license.`);
