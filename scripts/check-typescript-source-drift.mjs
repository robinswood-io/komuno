#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
const root=resolve(import.meta.dirname,"..");
const registry=JSON.parse(await readFile(resolve(root,"docs/typescript-compatibility-artifacts.json"),"utf8"));
const declared=new Map(registry.artifacts.map(x=>[`${x.source}|${x.artifact}`,x]));
const observed=[];const skip=new Set(["node_modules",".next","dist","coverage",".git"]);
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=resolve(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name.endsWith(".ts")&&!e.name.endsWith(".d.ts")){const js=p.slice(0,-3)+".js";try{await readFile(js);observed.push(`${relative(root,p)}|${relative(root,js)}`)}catch{}}}}
await walk(root);const errors=[];
for(const key of observed){const entry=declared.get(key);if(!entry){errors.push(`paire non déclarée: ${key}`);continue}for(const field of ["source","artifact"]){const bytes=await readFile(resolve(root,entry[field]));const hash=createHash("sha256").update(bytes).digest("hex");if(hash!==entry[`${field}Sha256`])errors.push(`dérive ${entry[field]}`)}}
for(const key of declared.keys())if(!observed.includes(key))errors.push(`artefact déclaré absent: ${key}`);
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("TYPESCRIPT_SOURCE_DRIFT_OK");
