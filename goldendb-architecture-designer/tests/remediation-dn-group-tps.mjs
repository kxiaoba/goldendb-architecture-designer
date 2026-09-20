import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260920/group-tps');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const checks=[],check=(name,pass)=>checks.push({name,pass});
  const d=structuredClone(latestDesignData),t=d.tenantPlans[0];
  Object.assign(t,{plannedTxnTps:4000,shardCount:4,dnCores:16,dnMemoryGb:64,futureDataTb:4,dnHotspotFactor:10});
  Object.assign(d,{dnReferenceTps:2000,dnReferenceCores:16,dnReferenceMemoryGb:64,maxShardTb:2});
  check('empty-default',parseDnGroupTps('',t)===null);
  t.dnGroupTps=parseDnGroupTps('[3000,500,500,0]',t);
  const before=JSON.stringify(d),r=getDnTakeoverCapacity(d)[0];
  check('max-group-no-growth-or-factor',r.target===3000&&!r.performanceEnough&&r.error);
  check('read-only',JSON.stringify(d)===before);
  check('scope-warning',r.text.includes('跨分片事务不能直接按此拆分'));
  check('excel-linked',JSON.stringify(buildExcelSheets(d)).includes(r.text));
  const key=getTenantKey(t),host=d.serverSizing.serverPlan.find(h=>h.roles.some(isDnRole));
  host.roles=[`${key}-DN-G1-Master`,`${key}-DN-G2-Master`];
  host.resourceAudit={used:{cpu:32},usable:{cpu:36},withinWatermark:true};d.serverSizing.serverPlan=[host];
  let p=getDnHostPressure(d)[0];
  check('host-corresponding-group',p.details.map(x=>x.requiredCpu).join(',')==='24,4'&&p.pressureCpu===40&&p.error);
  host.roles=[`${key}-DN-G3-Master`,`${key}-DN-G4-Master`];p=getDnHostPressure(d)[0];
  check('zero-keeps-configured-capacity',p.details[1].requiredCpu===0&&p.pressureCpu===32&&!p.error);
  const other={...t,tenantId:createTenantIdentity(),dnGroupTps:[2000,1000,1000,0]};d.tenantPlans.push(other);
  host.roles=[`${key}-DN-G1-Master`,`${getTenantKey(other)}-DN-G1-Master`];p=getDnHostPressure(d)[0];
  check('tenant-separated',p.details.map(x=>x.requiredCpu).join(',')==='24,16');
  for(const raw of ['[]','{}','[4000]','[1,1,1,1]','[4000,0,0,-1]','["4000",0,0,0]','[1e999,0,0,0]','[null,0,0,4000]','bad']){
   let rejected=false;try{parseDnGroupTps(raw,t);}catch(e){rejected=e instanceof PlanningInputError;}check('reject-'+raw,rejected);
  }
  check('decimal',parseDnGroupTps('[1000.5,999.5,1000,1000]',t)[0]===1000.5);
  return checks;
 }));
 const input=page.locator('[data-key="dnGroupTpsInput"]').first();
 const base=await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan));
 const values=await page.evaluate(()=>{const t=latestDesignData.tenantPlans[0];return Array.from({length:t.shardCount},()=>t.plannedTxnTps/t.shardCount);});
 await input.fill(JSON.stringify(values));await input.dispatchEvent('change');
 results.push({name:'ui-linked',pass:await page.evaluate(()=>Array.isArray(latestDesignData.tenantPlans[0].dnGroupTps))});
 results.push({name:'no-placement-change',pass:base===await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan))});
 await input.fill('[0]');await input.dispatchEvent('change');results.push({name:'invalid-blocks',pass:await page.locator('#downloadExcelBtn').isDisabled()});
 await input.fill('');await input.dispatchEvent('change');results.push({name:'clear-restores',pass:base===await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan))});
 await input.fill(JSON.stringify(values));await input.dispatchEvent('change');
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1000});await input.scrollIntoViewIfNeeded();results.push({name:'layout-'+width,pass:await input.evaluate(e=>e.getBoundingClientRect().right<=e.closest('article').getBoundingClientRect().right)});await page.screenshot({path:path.join(out,`tps-${width}.png`)});}
 results.push({name:'browser-errors',pass:errors.length===0,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
