import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = readFileSync('public/index.html','utf8');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if(!m[1].includes('src=')) new vm.Script(m[2]);
}
new vm.Script(readFileSync('public/app-config.js','utf8'));
for(const m of html.matchAll(/(?:src|href)="(vendor\/[^"?#]+)"/g)) assert.ok(existsSync('public/'+m[1]),m[1]);
for(const old of ['nnnn-cbc34','586362300260','cdn.upanhlaylink.com','inlovegameonline.u636363663.workers.dev']) assert.ok(!html.includes(old),'Old owner reference: '+old);
JSON.parse(readFileSync('database.rules.json','utf8'));
console.log('Frontend JavaScript parses; static files exist; previous owner configuration removed; rules JSON valid.');
