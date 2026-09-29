import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1-20260929/centers');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],c=(name,pass)=>r.push({name,pass});
  const host=(id,az,pool='shared',cores=16)=>({id,azIndex:az,tenantPool:pool,componentKeys:['cn','dn'],roles:[],cnCount:0,spec:{cores,memoryGb:128,diskTb:10}});
  for(const environment of ['production','poc'])for(const azCount of [2,3,5]){
   const t={tenantId:'TID-probe',name:'probe',cnCores:8,cnMemoryGb:32,cnByAz:Array(azCount).fill(1),deploymentStrategy:'shared'};
   const config={tenantPlans:[t],azCount,maxCnPerServer:4,maxTenantCnPerServer:4,environment,cnTenantPlacement:'shared',reserveRatio:0};
   const missing=[host('A',0)];placeTenantCnRolesByPool(missing,config);
   c(environment+'-'+azCount+'-missing-no-fallback',missing[0].roles.length===1&&missing[0].roles[0].endsWith('-CN1'));
   c(environment+'-'+azCount+'-gap-audit',!getCnPlacementAudit(missing,[t],azCount).complete);
   const valid=Array.from({length:azCount},(_,i)=>host('S'+i,i));placeTenantCnRolesByPool(valid,config);
   c(environment+'-'+azCount+'-normal',valid.every((h,i)=>h.roles.length===1&&h.roles[0].endsWith('-CN'+(i+1))));
   const small=Array.from({length:azCount},(_,i)=>host('S'+i,i,'shared',i===1?4:16));placeTenantCnRolesByPool(small,config);
   c(environment+'-'+azCount+'-no-capacity-fallback',small[1].roles.length===0&&small.reduce((n,h)=>n+h.roles.length,0)===azCount-1);
  }
  const tenant={tenantId:'TID-ded',name:'dedicated',deploymentStrategy:'dedicated',cnCores:8,cnMemoryGb:32,cnByAz:[1,1]};
  const pool=getTenantResourcePoolKey(tenant),servers=[host('shared',0),host('ownB',1,pool)];
  placeTenantCnRolesByPool(servers,{tenantPlans:[tenant],azCount:2,maxCnPerServer:4,maxTenantCnPerServer:4,environment:'poc',cnTenantPlacement:'shared',reserveRatio:0});
  c('pool-and-center-required',servers[0].roles.length===0&&servers[1].roles.length===1&&servers[1].roles[0].endsWith('-CN2'));
  c('helper-missing-is-empty',getEligibleServers(servers,'cn',0,pool).length===0);
  c('component-required',getEligibleServers(servers,'gtm',1,pool).length===0);
  const normal=latestDesignData;
  c('normal-all-cn-in-own-az',getPlanServers(normal).every(h=>h.roles.filter(isCnRole).every(role=>{
   const tenant=normal.tenantPlans.find(t=>getTenantKey(t)===parseCnTenant(role));
   const n=Number(/-CN(\d+)$/.exec(role)[1]);let start=0;
   return tenant.cnByAz.some((count,i)=>{const yes=n>start&&n<=start+count&&h.azIndex===i;start+=count;return yes;});
  })));
  return r;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:errors.length===0});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(x=>!x.pass));console.log(`${results.filter(x=>x.pass).length}/${results.length}`);if(results.some(x=>!x.pass))process.exitCode=1;
