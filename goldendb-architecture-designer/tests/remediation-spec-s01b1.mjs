import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve('outputs/goldendb-spec-remediation-20260915/s01b1');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const results=[], errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 await page.evaluate(()=>{
  resetForm();$('forceEven').checked=false;
  const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
  Object.assign(t,{qps:16000,workloadMode:'split',cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,
   onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,onlineCount:0,
   batchRateMode:'work',batchAmount:36000000,batchWindow:2,batchCoreTps:100,batchCpuLimit:.7,
   batchGrowth:1,batchCount:0,batchSizingMode:'manual',batchCores:16,batchMemoryGb:96,
   batchWindowCheck:true,batchEfficiency:1,batchLostCn:0,batchPauseMinutes:0,batchRetryRatio:0,jointDnTps:5000});
  render();
 });
 results.push(...await page.evaluate(()=>{
  const original=structuredClone(latestDesignData), checks=[];
  const rows=getActualBatchWindowAudits(original);
  checks.push({name:'actual-baseline',pass:rows.length===3&&rows[0].actual===5&&Math.abs(rows[0].seconds-36000000/5600)<1e-6});
  checks.push({name:'single-host-loss',pass:rows[0].largestHost===1&&!rows[0].oneHostWithinWindow&&rows[0].withinWindow});
  checks.push({name:'production-failure-redline',pass:getResourceReductionRedlines(original).some(s=>s.includes('跑批实际落位窗口'))});
  const data=structuredClone(original),hosts=data.serverSizing.serverPlan;
  const t=data.tenantPlans[0],key=getTenantKey(t);
  const isBatch=r=>parseCnTenant(r)===key&&t.cnRoleSpecs[Number(/-CN(\d+)$/.exec(r)?.[1])-1]?.key==='batch';
  hosts.filter(h=>h.azIndex===0).forEach(h=>{h.roles=h.roles.filter(r=>!isBatch(r));});
  const missing=getActualBatchWindowAudits(data);
  checks.push({name:'missing-actual-not-planned',pass:missing[0].actual===0&&missing[0].seconds===null&&!missing[0].withinWindow&&missing[1].actual===5});
  checks.push({name:'missing-export-redline',pass:getResourceReductionRedlines(data).some(s=>s.includes('有效 CN 0/5'))&&JSON.stringify(buildExcelSheets(data)).includes('有效 CN 0/5')});
  checks.push({name:'source-unchanged',pass:JSON.stringify(original)===JSON.stringify(latestDesignData)});
  const unsafe=structuredClone(original);
  unsafe.serverSizing.serverPlan.filter(h=>h.azIndex===0).forEach(h=>{h.resourceAudit.withinWatermark=false;});
  checks.push({name:'unsafe-hosts-excluded',pass:getActualBatchWindowAudits(unsafe)[0].actual===0});
  const mixed=structuredClone(original),mh=mixed.serverSizing.serverPlan.filter(h=>h.azIndex===0&&h.roles.some(isBatch));
  const role=mh[1].roles.find(isBatch);mh[1].roles=mh[1].roles.filter(r=>r!==role);mh[0].roles.push(role);
  const m=getActualBatchWindowAudits(mixed)[0];
  checks.push({name:'physical-host-not-single-instance-loss',pass:m.actual===5&&m.largestHost===2&&Math.abs(m.oneHostSeconds-36000000/3360)<1e-6});
  mixed.tenantPlans[0].cnWorkloads.find(w=>w.key==='batch').windowAudit.lost=2;
  checks.push({name:'no-double-count-outage',pass:getActualBatchWindowAudits(mixed)[0].oneHostSeconds===m.oneHostSeconds});
  const disabled=structuredClone(original);delete disabled.tenantPlans[0].cnWorkloads.find(w=>w.key==='batch').windowAudit;
  checks.push({name:'opt-in-only',pass:getActualBatchWindowAudits(disabled).length===0});
  checks.push({name:'dr-full-takeover-separate',pass:!rows[2].required});
  return checks;
 }));
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(await page.evaluate(()=>getActualBatchWindowAudits(latestDesignData)),null,2));
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));if(results.some(r=>!r.pass))process.exitCode=1;
