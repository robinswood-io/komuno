#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const registry=JSON.parse(await readFile(resolve(root,'docs/maintained-docs.json'),'utf8'));
const now=new Date(); const errors=[];
for(const d of registry.documents){const file=resolve(root,d.path);try{await access(file)}catch{errors.push(`document absent: ${d.path}`);continue}const age=(now-new Date(d.reviewedAt))/86400000;if(age>Number(d.maxAgeDays))errors.push(`document périmé: ${d.path}`);const text=await readFile(file,'utf8');for(const m of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){const link=m[1].split('#')[0];if(!link||/^(https?:|mailto:)/.test(link))continue;try{await access(resolve(dirname(file),link))}catch{errors.push(`${d.path}: lien local absent ${link}`)}}}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('MAINTAINED_DOCS_OK');
