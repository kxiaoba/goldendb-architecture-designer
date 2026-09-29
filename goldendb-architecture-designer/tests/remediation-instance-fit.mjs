import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-remediation-20260929/instance-fit');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],c=(name,pass)=>r.push({name,pass}),base=structuredClone(latestDesignData),saved=JSON.stringify(base);
  c('normal-no-fit-errors',getInstanceFitIssues(base).length===0);
  c('no-model-mutation',JSON.stringify(base)===saved);
  const make=()=>{const d=structuredClone(base),t=d.tenantPlans[0];t.cnRoleSpecs=undefined;t.cnCores=8;t.cnMemoryGb=32;d.serverSizing.reserveRatio=0;return d;};
  const candidates=d=>getPlanServers(d).filter(h=>h.componentKeys.includes('cn')&&h.azIndex===0&&h.tenantPool===getTenantResourcePoolKey(d.tenantPlans[0]));
  const cnErrors=d=>getInstanceFitIssues(d).filter(i=>i.component==='cn'&&i.azIndex===0);
  for(const [name,cpu,memory] of [['cpu',4,64],['memory',16,16],['exact',8,32]]){
   const d=make();candidates(d).forEach(h=>Object.assign(h.spec,{cores:cpu,memoryGb:memory}));
   c('single-'+name,name==='exact'?cnErrors(d).length===0:cnErrors(d).length===d.tenantPlans[0].cnByAz[0]);
   if(name==='cpu'){
    c('redline-specific',getResourceReductionRedlines(d).some(s=>s.includes('仅增加同规格服务器不能解决')));
    c('excel-specific',JSON.stringify(buildExcelSheets(d)).includes('单实例不可跨服务器拆分'));
   }
  }
  const mixed=make();candidates(mixed).forEach((h,i)=>Object.assign(h.spec,{cores:i%2?4:16,memoryGb:i%2?64:16}));
  c('no-cross-host-dimension-summing',cnErrors(mixed).length>0);
  const newHost=structuredClone(candidates(mixed)[0]);newHost.id='new-compatible';newHost.spec.cores=16;newHost.spec.memoryGb=64;newHost.roles=[];
  mixed.serverSizing.serverPlan.push({...newHost,azIndex:1});
  c('other-center-does-not-rescue',cnErrors(mixed).length>0);
  mixed.serverSizing.serverPlan.push({...newHost,tenantPool:'other'});
  c('other-pool-does-not-rescue',cnErrors(mixed).length>0);
  mixed.serverSizing.serverPlan.push(newHost);
  c('one-compatible-host-suffices-for-necessary-condition',cnErrors(mixed).length===0);
  const occupied=make();candidates(occupied).forEach(h=>h.roles=['unknown']);
  c('occupancy-not-single-fit',cnErrors(occupied).length===0);
  const missing=make();candidates(missing)[0].spec=null;
  c('unknown-spec-not-oversize',cnErrors(missing).length===0);
  const dn=make();dn.tenantPlans[0].dnGroupDataTb=Array(dn.tenantPlans[0].shardCount).fill(.1);dn.tenantPlans[0].dnGroupDataTb[0]=10000;
  c('per-group-disk-not-average',getInstanceFitIssues(dn).filter(i=>i.component==='dn').every(i=>i.role.includes('-G1-'))&&getInstanceFitIssues(dn).some(i=>i.component==='dn'));
  const reserve=make();candidates(reserve).forEach(h=>Object.assign(h.spec,{cores:8,memoryGb:32}));reserve.serverSizing.reserveRatio=.35;
  c('reserve-applied',cnErrors(reserve).length>0);
  const heterogeneous=make();heterogeneous.tenantPlans[0].cnRoleSpecs=[{cores:100000,memoryGb:32}];
  c('per-role-not-average',cnErrors(heterogeneous).length===1&&cnErrors(heterogeneous)[0].role.endsWith('-CN1'));
  latestDesignData=dn;
  return r;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await createExcelWorkbook(buildExcelSheets(latestDesignData)).arrayBuffer())));
 fs.writeFileSync(path.join(out,'workloads.xlsx'),Buffer.from(bytes));
 results.push({name:'browser-errors',pass:errors.length===0});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(x=>!x.pass));console.log(`${results.filter(x=>x.pass).length}/${results.length}`);if(results.some(x=>!x.pass))process.exitCode=1;
