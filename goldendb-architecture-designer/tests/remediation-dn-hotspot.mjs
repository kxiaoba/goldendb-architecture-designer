import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260919/s01b3b2b2a');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const checks=[],check=(name,pass)=>checks.push({name,pass});
  const data=structuredClone(latestDesignData),t=data.tenantPlans[0];
  Object.assign(t,{plannedTxnTps:6000,shardCount:4,dnCores:16,dnMemoryGb:64,futureDataTb:4});
  Object.assign(data,{dnReferenceTps:2000,dnReferenceCores:16,dnReferenceMemoryGb:64,maxShardTb:2});
  let r=getDnTakeoverCapacity(data)[0];check('legacy-default',r.target===1500&&r.performanceEnough);
  t.dnHotspotFactor=1.5;const original=JSON.stringify(data);r=getDnTakeoverCapacity(data)[0];
  check('fractional-hotspot',r.target===2250&&!r.performanceEnough&&r.error);
  check('storage-unchanged',r.dataTb===1);
  check('no-allocation-mutation',JSON.stringify(data)===original);
  check('excel-consistent',JSON.stringify(buildExcelSheets(data)).includes(r.text));
  const key=getTenantKey(t),host=data.serverSizing.serverPlan.find(h=>h.roles.some(isDnRole));
  host.roles=[`${key}-DN-G1-Master`];data.serverSizing.serverPlan=[host];
  host.resourceAudit={used:{cpu:16},usable:{cpu:20},withinWatermark:true};
  let p=getDnHostPressure(data)[0];check('host-hotspot-linked',p.pressureCpu===18&&!p.error);
  t.dnHotspotFactor=2;p=getDnHostPressure(data)[0];check('host-redline',p.pressureCpu===24&&p.error);
  t.dnHotspotFactor=10;r=getDnTakeoverCapacity(data)[0];check('bounded-by-total',r.target===6000&&r.effectiveHotspotFactor===4);
  t.shardCount=1;r=getDnTakeoverCapacity(data)[0];check('single-group-no-inflation',r.target===6000);
  for(const invalid of ['',0,.9,Infinity,NaN,'oops']){t.dnHotspotFactor=invalid;let rejected=false;try{getDnTakeoverCapacity(data);}catch(e){rejected=e instanceof PlanningInputError;}check('invalid-'+String(invalid),rejected);}
  t.dnHotspotFactor=1.5;data.reverse=true;data.serverPlan=data.serverSizing.serverPlan;check('reverse-not-fabricated',!getDnTakeoverCapacity(data)[0].evaluated);
  return checks;
 }));
 const field=page.locator('[data-key="dnHotspotFactor"]').first();
 const base=await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan));
 await field.fill('1.5');await field.dispatchEvent('change');
 results.push({name:'input-linked',pass:await page.evaluate(()=>latestDesignData.tenantPlans[0].dnHotspotFactor===1.5)});
 results.push({name:'input-no-reallocation',pass:base===await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan))});
 await field.fill('');await field.dispatchEvent('change');
 results.push({name:'blank-blocks-export',pass:await page.locator('#downloadExcelBtn').isDisabled()});
 await field.fill('1.5');await field.dispatchEvent('change');
 results.push({name:'valid-recovers',pass:await page.locator('#downloadExcelBtn').isEnabled()});
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await wait).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1000});await field.scrollIntoViewIfNeeded();
  results.push({name:'input-layout-'+width,pass:await field.evaluate(e=>e.getBoundingClientRect().right<=e.closest('article').getBoundingClientRect().right)});
  await page.screenshot({path:path.join(out,`hotspot-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:errors.length===0,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
