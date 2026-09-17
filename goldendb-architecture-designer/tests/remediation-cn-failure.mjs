import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260917/s01b3a');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 await page.evaluate(()=>{
  resetForm();$('forceEven').checked=false;
  const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
  Object.assign(t,{qps:16000,workloadMode:'split',cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,
   onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,onlineCount:2,
   batchRateMode:'tps',batchRate:800,batchCoreTps:50,batchCpuLimit:.7,batchGrowth:1,
   batchCount:2,batchSizingMode:'manual',batchCores:16,batchMemoryGb:64,jointDnTps:1600});render();
 });
 results.push(...await page.evaluate(()=>{
  const d=structuredClone(latestDesignData),before=JSON.stringify(d),checks=[];
  const check=(name,pass)=>checks.push({name,pass});
  const rows=getActualCnCapacityAudits(d),a=rows[0];
  check('online-per-az-arithmetic',a.actual===2&&a.capacity===1120&&a.target===800&&a.failureCapacity===560&&a.error);
  check('non-window-batch-covered',rows.length===6&&rows[3].key==='batch'&&rows[3].capacity===1120&&rows[3].error);
  check('no-cross-az-capacity-pooling',rows[1].capacity===1120&&rows[1].failureCapacity===560&&rows[1].target===800);
  check('dr-not-production-redline',!rows[2].required&&!rows[2].error);
  check('production-failure-redline',getResourceReductionRedlines(d).some(s=>s.includes('CN 实际容量')&&s.includes('单机故障容量不足')));
  check('excel-linked',JSON.stringify(buildExcelSheets(d)).includes(a.text));
  const p=structuredClone(d);p.environment='poc';
  check('poc-failure-advisory',getActualCnCapacityAudits(p).filter(x=>x.required).every(x=>!x.error&&!x.oneHostWithinCapacity));
  const t=d.tenantPlans[0],key=getTenantKey(t);
  const online=r=>parseCnTenant(r)===key&&t.cnRoleSpecs[Number(/-CN(\d+)$/.exec(r)?.[1])-1]?.key==='online';
  const missing=structuredClone(d);
  missing.serverSizing.serverPlan.filter(h=>h.azIndex===0).forEach(h=>{h.roles=h.roles.filter(r=>!online(r));});
  const m=getActualCnCapacityAudits(missing);
  check('actual-not-planned',m[0].actual===0&&m[0].capacity===0&&m[0].error&&m[1].actual===2&&m[3].actual===2);
  missing.environment='poc';check('poc-normal-shortfall-error',getActualCnCapacityAudits(missing)[0].error);
  const unsafe=structuredClone(d);
  unsafe.serverSizing.serverPlan.filter(h=>h.azIndex===0).forEach(h=>{h.resourceAudit.withinWatermark=false;});
  check('unsafe-excluded',getActualCnCapacityAudits(unsafe)[0].actual===0);
  const mixed=structuredClone(d),hosts=mixed.serverSizing.serverPlan.filter(h=>h.azIndex===0&&h.roles.some(online));
  const role=hosts[1].roles.find(online);hosts[1].roles=hosts[1].roles.filter(r=>r!==role);hosts[0].roles.push(role);
  const mix=getActualCnCapacityAudits(mixed)[0];
  check('physical-host-loss-not-one-instance',mix.actual===2&&mix.largestHost===2&&mix.failureCapacity===0);
  hosts[0].roles.push(role);check('duplicate-not-extra-capacity',getActualCnCapacityAudits(mixed)[0].actual===2);
  const window=structuredClone(d);window.tenantPlans[0].cnWorkloads[1].windowAudit={};
  check('window-batch-not-double-audited',getActualCnCapacityAudits(window).length===3);
  const reverse=structuredClone(d);reverse.reverse=true;check('reverse-no-invented-tps',getActualCnCapacityAudits(reverse).length===0);
  check('read-only-audit',JSON.stringify(d)===before);
  return checks;
 }));
 await page.locator('[data-key=onlineCount]').fill('3');
 results.push(await page.evaluate(()=>{const a=getActualCnCapacityAudits(latestDesignData)[0];return {name:'manual-linkage-recovery',pass:a.actual===3&&a.failureCapacity===1120&&!a.error};}));
 results.push(await page.evaluate(()=>{
  const t=businessTenantSpecs[0];businessTenantSpecs.push({...t,tenantId:createTenantIdentity(),name:'second'});render();
  const rows=getActualCnCapacityAudits(latestDesignData);return {name:'multi-tenant-independent',pass:rows.length===12&&rows.filter(x=>x.key==='online'&&x.required).every(x=>x.actual===3&&x.target===800)};
 }));
 results.push(await page.evaluate(()=>{
  resetForm();const a=getActualCnCapacityAudits(latestDesignData),t=latestDesignData.tenantPlans[0];
  return {name:'legacy-single-scene',pass:a.length===3&&a[0].capacity===a[0].actual*t.cnSafeTpsPerNode&&a[0].target===t.cnTargetTps};
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 for(const [id,name] of [['downloadExcelBtn','workloads.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
  const wait=page.waitForEvent('download');await page.locator('#'+id).click();const file=await wait;await file.saveAs(path.join(out,name));results.push({name,pass:fs.statSync(path.join(out,name)).size>1000});
 }
 for(const width of [390,875,1600]) {
  await page.setViewportSize({width,height:1000});await page.locator('.cn-placement-summary').scrollIntoViewIfNeeded();
  results.push({name:'audit-layout-'+width,pass:await page.locator('.cn-placement-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});
  await page.screenshot({path:path.join(out,`audit-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
