import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260917/s01b3b2a');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const original=structuredClone(latestDesignData),before=JSON.stringify(original),checks=[];
  const check=(name,pass)=>checks.push({name,pass});
  const d=structuredClone(original),t=d.tenantPlans[0];
  Object.assign(d,{dnReferenceTps:2000,dnReferenceCores:16,dnReferenceMemoryGb:64,maxShardTb:2});
  Object.assign(t,{plannedTxnTps:800*t.shardCount,dnCores:8,dnMemoryGb:32,futureDataTb:t.shardCount});
  let a=getDnTakeoverCapacity(d)[0];
  check('single-replica-formula',a.perReplicaTps===1000&&a.target===800&&a.dataTb===1&&a.performanceEnough&&a.storageEnough);
  check('no-success-claim',a.status==='容量算式满足，接管未验证'&&a.text.includes('不累加主从副本TPS'));
  t.plannedTxnTps=1500*t.shardCount;a=getDnTakeoverCapacity(d)[0];
  check('no-sum-slave-throughput',a.perReplicaTps===1000&&a.error&&!a.performanceEnough);
  check('redline',getResourceReductionRedlines(d).some(x=>x.includes('DN 单副本接管容量：必要条件不足')));
  check('export-same-result',JSON.stringify(buildExcelSheets(d)).includes(a.text));
  d.dnReferenceTps=1400;t.plannedTxnTps=600*t.shardCount;a=getDnTakeoverCapacity(d)[0];
  check('already-effective-no-second-water',a.perReplicaTps===700);
  t.dnCores=32;t.dnMemoryGb=128;a=getDnTakeoverCapacity(d)[0];
  check('no-upward-extrapolation',a.perReplicaTps===1400);
  t.dnCores=8;t.dnMemoryGb=16;a=getDnTakeoverCapacity(d)[0];
  check('insufficient-memory-unknown',a.perReplicaTps===null&&a.performanceEnough===null&&!a.evaluated&&a.status==='性能未评估');
  t.futureDataTb=3*t.shardCount;a=getDnTakeoverCapacity(d)[0];
  check('storage-independent-of-unknown-performance',a.error&&!a.storageEnough);
  const missing=structuredClone(original),key=getTenantKey(missing.tenantPlans[0]);
  missing.serverSizing.serverPlan.forEach(s=>s.roles=s.roles.filter(r=>parseDnPlacementRole(r)?.tenant!==key));
  check('no-replicas-never-adequate',getDnTakeoverCapacity(missing)[0].error&&getDnTakeoverCapacity(missing)[0].physicalGaps>0);
  const rev={...original,reverse:true,serverPlan:original.serverSizing.serverPlan};a=getDnTakeoverCapacity(rev)[0];
  check('reverse-no-invented-throughput',!a.evaluated&&a.status==='未评估'&&!a.error);
  for(const field of ['dnReferenceTps','dnReferenceCores','dnReferenceMemoryGb']) {
   const bad=structuredClone(original);bad[field]=undefined;
   check('missing-'+field,getDnTakeoverCapacity(bad)[0].status==='未评估');
  }
  check('read-only',JSON.stringify(original)===before);
  return checks;
 }));
 results.push(await page.evaluate(()=>{
  const t=businessTenantSpecs[0];Object.assign(t,{dnSizingMode:'manual',dnCores:8,dnMemoryGb:32,minShardsManual:true,minShards:1});render();
  const a=getDnTakeoverCapacity(latestDesignData)[0];return {name:'ui-manual-spec-linked',pass:a.perReplicaTps===1000&&a.target===5000&&a.error};
 }));
 results.push(await page.evaluate(()=>{
  const t=businessTenantSpecs[0];businessTenantSpecs.push({...t,tenantId:createTenantIdentity(),name:'other',qps:1000});render();
  const a=getDnTakeoverCapacity(latestDesignData);return {name:'multi-tenant-target-independent',pass:a.length===2&&a[0].target===5000&&a[1].target===50};
 }));
 await page.evaluate(()=>resetForm());
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await (await wait).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){
  await page.setViewportSize({width,height:1000});await page.locator('.dn-failure-summary').scrollIntoViewIfNeeded();
  results.push({name:'layout-'+width,pass:await page.locator('.dn-failure-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});
  await page.screenshot({path:path.join(out,`audit-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
