import { readFileSync,existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const app=resolve(root,'app');
for(const file of ['index.html','src/main.tsx','public/app-config.js','vercel.json'])assert.ok(existsSync(resolve(app,file)),`Missing active app file: ${file}`);
new vm.Script(readFileSync(resolve(app,'public/app-config.js'),'utf8'));
JSON.parse(readFileSync(resolve(root,'database.rules.json'),'utf8'));
execFileSync(process.execPath,[resolve(app,'node_modules/typescript/bin/tsc'),'-b'],{cwd:app,stdio:'inherit'});
console.log('React TypeScript checks pass; active app files, public config and database rules JSON are valid.');
