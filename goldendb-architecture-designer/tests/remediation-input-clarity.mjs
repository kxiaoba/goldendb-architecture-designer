import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-remediation-20260928/clarity');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,pass)=>results.push({name,pass});
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],c=(name,pass)=>r.push({name,pass}),d=latestDesignData;
  const config={tenantPlans:d.tenantPlans,reserveRatio:.35};
  const host={spec:{cores:256,memoryGb:2048,diskTb:100},roles:[]};
  const role=`${getTenantKey(d.tenantPlans[0])}-CN1`;
  c('missing-spec-rejected',getServerResourceAudit({roles:[]},config)===null&&!canPlaceRoleWithinWatermark({roles:[]},role,config));
  for(const name of ['unknown','missing-CN1','missing-DN-G1-M']){
   c('unknown-'+name,getRoleResourceDemand(name,config.tenantPlans).unknown===true&&!canPlaceRoleWithinWatermark(host,name,config));
   const a=getServerResourceAudit({...host,roles:[name]},config);
   c('audit-'+name,!a.withinWatermark&&a.issues.length===1);
  }
  c('valid-cn',canPlaceRoleWithinWatermark(host,role,config));
  c('valid-management',canPlaceRoleWithinWatermark(host,'管理节点',config));
  c('unknown-existing-rejected',!canPlaceRoleWithinWatermark({...host,roles:['unknown']},role,config));
  for(const field of ['cpu','memory','disk'])for(const value of [-1,NaN,Infinity,undefined]){
   const a=getServerResourceAudit(host,config,{cpu:1,memory:1,disk:0,[field]:value});
   c('invalid-'+field+'-'+value,!a.withinWatermark&&a.issues.length===1);
  }
  c('actual-audits-known',d.serverSizing.serverPlan.every(s=>s.resourceAudit?.issues.length===0));
  return r;
 }));
 await page.evaluate(()=>{
  const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
  Object.assign(t,{workloadMode:'split',qps:16000,onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,
   cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,onlineCount:0,batchRateMode:'qps',batchRate:5000,batchSqlPerTxn:20,
   batchCoreTps:50,batchCpuLimit:.7,batchGrowth:1,batchCount:0,batchSizingMode:'manual',batchCores:16,batchMemoryGb:64});render();
 });
 const before=await page.evaluate(()=>JSON.stringify(latestDesignData));
 check('advanced-initially-closed',await page.locator('.workload-options').evaluateAll(els=>els.length===2&&els.every(e=>!e.open)));
 await page.locator('[data-workload-options=batch] summary').click();
 check('expand-no-model-change',await page.evaluate(before=>JSON.stringify(latestDesignData)===before,before));
 await page.locator('[data-key=batchSizingMode]').selectOption('auto');
 check('expanded-state-retained',await page.locator('[data-workload-options=batch]').evaluate(e=>e.open));
 await page.locator('[data-key=batchGrowth]').fill('1.5');
 await page.locator('[data-key=batchGrowth]').blur();
 check('decimal-and-independent-target',await page.evaluate(()=>{
  const [o,b]=latestDesignData.tenantPlans[0].cnWorkloads;return o.target===800&&b.target===375;
 }));
 for(const mode of ['qps','tps','sqlWindow','work']){
  await page.locator('[data-key=batchRateMode]').selectOption(mode);
  check('explanation-'+mode,await page.locator('.workload-help').allTextContents().then(text=>text.join(' ').includes(mode==='sqlWindow'?'平均 QPS':mode==='work'?'相同业务单位':mode==='tps'?'不再除以':'跑批 TPS =')));
 }
 await page.locator('[data-key=batchRateMode]').selectOption('qps');
 check('formula-explained',await page.locator('#formulaOutput').textContent().then(s=>s.includes('每个生产AZ独立满足完整目标')&&s.includes('整实例实测吞吐')));
 for(const width of [390,875,1600]){
  await page.setViewportSize({width,height:1000});
  const section=page.locator('.workload-settings').first();await section.scrollIntoViewIfNeeded();
  check('fields-fit-'+width,await section.evaluate(el=>[...el.querySelectorAll('input,select,summary,.workload-help')].filter(e=>e.getBoundingClientRect().width).every(e=>{
   const b=e.getBoundingClientRect(),p=el.getBoundingClientRect();return b.left>=p.left-1&&b.right<=p.right+1;
  })));
  await section.screenshot({path:path.join(out,`inputs-${width}.png`)});
 }
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 check('browser-errors',errors.length===0);
}finally{
 await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));
}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
