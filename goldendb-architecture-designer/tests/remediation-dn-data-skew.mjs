import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260919/s01b3b2b2b1');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const checks=[],check=(name,pass)=>checks.push({name,pass});
  const d=structuredClone(latestDesignData),t=d.tenantPlans[0];
  Object.assign(t,{plannedTxnTps:4000,shardCount:4,dnCores:16,dnMemoryGb:64,futureDataTb:6});
  Object.assign(d,{dnReferenceTps:2000,dnReferenceCores:16,dnReferenceMemoryGb:64,maxShardTb:2});
  delete t.dnDataSkewFactor;
  let r=getDnTakeoverCapacity(d)[0];check('legacy-uniform',r.dataTb===1.5&&r.storageEnough);
  t.dnDataSkewFactor=1.5;const before=JSON.stringify(d);r=getDnTakeoverCapacity(d)[0];
  check('fractional-skew',r.averageDataTb===1.5&&r.dataTb===2.25&&!r.storageEnough&&r.error);
  check('tps-independent',r.target===1000&&r.performanceEnough);
  check('read-only',JSON.stringify(d)===before);
  check('disk-limit-explicit',r.text.includes('整机磁盘仍按原均匀模型'));
  check('excel-linked',JSON.stringify(buildExcelSheets(d)).includes(r.text));
  t.dnDataSkewFactor=100;r=getDnTakeoverCapacity(d)[0];check('cap-at-tenant-total',r.dataTb===6);
  t.shardCount=1;r=getDnTakeoverCapacity(d)[0];check('single-group',r.dataTb===6);
  t.shardCount=4;t.dnDataSkewFactor=1.5;t.futureDataTb=12;r=getDnTakeoverCapacity(d)[0];check('growth-applied-once',r.dataTb===4.5);
  const second={...t,tenantId:createTenantIdentity(),name:'second',dnDataSkewFactor:1};d.tenantPlans.push(second);
  const rows=getDnTakeoverCapacity(d);check('tenant-isolation',rows[0].dataTb===4.5&&rows[1].dataTb===3);
  for(const v of ['',0,.5,Infinity,NaN,'bad']){t.dnDataSkewFactor=v;let rejected=false;try{getDnTakeoverCapacity(d);}catch(e){rejected=e instanceof PlanningInputError;}check('invalid-'+v,rejected);}
  return checks;
 }));
 const field=page.locator('[data-key="dnDataSkewFactor"]').first();
 const before=await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan));
 await field.fill('1.5');await field.dispatchEvent('change');
 results.push({name:'ui-linked',pass:await page.evaluate(()=>latestDesignData.tenantPlans[0].dnDataSkewFactor===1.5)});
 results.push({name:'placement-preserved',pass:before===await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan))});
 await field.fill('');await field.dispatchEvent('change');
 results.push({name:'blank-blocks-export',pass:await page.locator('#downloadExcelBtn').isDisabled()});
 await field.fill('3');await field.dispatchEvent('change');
 results.push({name:'ui-capacity-error',pass:await page.evaluate(()=>getDnTakeoverCapacity(latestDesignData)[0].storageEnough===false)});
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await wait).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1000});await field.scrollIntoViewIfNeeded();
  results.push({name:'layout-'+width,pass:await field.evaluate(e=>e.getBoundingClientRect().right<=e.closest('article').getBoundingClientRect().right)});
  await page.screenshot({path:path.join(out,`skew-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:errors.length===0,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
