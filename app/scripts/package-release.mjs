import { readFile,writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
config.framework=null;config.buildCommand='';config.installCommand='';delete config.outputDirectory;
await writeFile(new URL('../dist/vercel.json',import.meta.url),JSON.stringify(config,null,2));
// Python's standard zipfile preserves Unicode filenames without an extra archive dependency.
const script="from pathlib import Path; import zipfile; p=Path('dist'); out=Path('..')/'Nơi Ánh Trăng Rơi - React PWA.zip'; z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED); [z.write(f,f.relative_to(p)) for f in sorted(p.rglob('*')) if f.is_file()]; z.close(); z=zipfile.ZipFile(out); assert z.testzip() is None; assert 'index.html' in z.namelist(); assert not any(x.endswith('.map') for x in z.namelist()); print('Release ZIP verified:',len(z.namelist()),'files')";
console.log(execFileSync('python',['-c',script],{cwd:app,encoding:'utf8'}).trim());
