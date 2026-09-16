import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve('outputs/goldendb-spec-remediation-20260915');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[];
  for(const tier of [8,16,32,64,96,128,256]) {
   const s=recommendCnNodeSpec({tenantTxnTps:tier*35*2,cnPerAz:2,singleCoreTps:50,cpuLimit:.7,maxCores:256});
   r.push({name:`tier-${tier}`,pass:s.cores===tier&&s.memoryGb===tier*4});
  }
  r.push({name:'memory-fit',pass:getCnFittingCores({cores:256,memoryGb:256},.5,256)===32});
  const s=recommendCnNodeSpec({tenantTxnTps:280,cnPerAz:2,singleCoreTps:50,cpuLimit:.7,maxCores:64});
  r.push({name:'280-per-AZ',pass:s.cores===8&&s.memoryGb===32&&s.safeTps===280&&s.reason.includes('不按 AZ 数均摊')});
  return r;
 }));
 for(const mode of ['local2az','twoSiteThreeDc','threeSiteFiveDc'])for(const env of ['production','poc']) {
  results.push(await page.evaluate(({mode,env})=>{
   resetForm();$('deploymentMode').value=mode;$('environmentType').value=env;
   businessTenantSpecs=Array.from({length:4},(_,i)=>({...defaultBusinessTenants[0],tenantId:createTenantIdentity(),name:`测试${i}`,qps:5600*(i+1)}));
   render();const d=latestDesignData;
   return {name:`four-tenants-${mode}-${env}`,pass:!!d&&d.tenantPlans.every((t,i)=>t.cnTargetTps===280*(i+1)&&t.cnMemoryGb===4*t.cnCores&&t.cnByAz[0]===t.cnByAz[1]&&t.cnSafeTpsPerAz>=t.cnTargetTps),redlines:d?getResourceReductionRedlines(d):[]};
  },{mode,env}));
 }
 results.push(await page.evaluate(()=>{
  resetForm();const t=businessTenantSpecs[0];Object.assign(t,{cnSizingMode:'manual',cnCores:8,cnMemoryGb:19,dnSizingMode:'manual',dnCores:16,dnMemoryGb:67});render();
  const p=latestDesignData.tenantPlans[0];
  return {name:'manual-preserved',pass:p.cnMemoryGb===19&&p.dnMemoryGb===67&&p.cnCores===8};
 }));
 results.push(await page.evaluate(()=>{
  resetForm();const t=createBusinessTenantSpec(3);renderWorkloadEditor(t,2);
  return {name:'new-tenant-manual-defaults',pass:t.cnCores===8&&t.cnMemoryGb===32&&t.dnCores===16&&t.dnMemoryGb===64};
 }));
 await page.evaluate(()=>{resetForm();businessTenantSpecs[0].cnSizingMode='manual';render();});
 for(const width of [390,875,1600]) {
  await page.setViewportSize({width,height:1000});await page.locator('.workload-settings').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`spec-${width}.png`)});
  results.push({name:`layout-${width}`,pass:await page.locator('.workload-settings').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1)});
 }
 results.push({name:'browser-errors',pass:!errors.length,errors});
} finally {await browser.close();fs.writeFileSync(path.join(out,'s01-results.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass)}));
if(results.some(r=>!r.pass))process.exitCode=1;
