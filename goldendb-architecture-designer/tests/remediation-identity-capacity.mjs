import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b4-20260930/identity-capacity');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],check=(name,pass)=>r.push({name,pass}),base=structuredClone(latestDesignData);
  const original=getActualCnCapacityAudits(base)[0].actual;
  for(const defect of ['pool','az','component','duplicate']) {
   const data=structuredClone(base),hosts=getPlanServers(data),host=hosts.find(h=>h.azIndex===0&&h.roles.some(isCnRole));
   const role=host.roles.find(isCnRole);
   if(defect==='pool')host.tenantPool='wrong';
   if(defect==='az')host.azIndex=1;
   if(defect==='component')host.componentKeys=[];
   if(defect==='duplicate')hosts.find(h=>h!==host).roles.push(role);
   check('cn-'+defect,getActualCnCapacityAudits(data)[0].actual===original-1);
   check('summary-'+defect,!getPlanRoleIdentitySummary(data).complete);
   check('excel-summary-'+defect,buildExcelSheets(data).find(s=>s.name==='方案摘要').rows.some(row=>row[0]==='实例身份完整性'&&row[1]==='未通过'));
   const tenant=data.tenantPlans[0];
   tenant.cnRoleSpecs=tenant.cnByAz.flatMap((count,azIndex)=>Array.from({length:count},()=>({key:'batch',azIndex,cores:tenant.cnCores,memoryGb:tenant.cnMemoryGb})));
   tenant.cnWorkloads=[{key:'batch',cnByAz:tenant.cnByAz,cores:tenant.cnCores,k:50,water:.7}];
   const work=tenant.cnWorkloads[0];
   work.windowAudit={efficiency:1,work:1000,pauseSeconds:0,lost:0,windowSeconds:1000};
   check('batch-'+defect,getActualBatchWindowAudits(data)[0].actual===original-1);
   check('redline-'+defect,getResourceReductionRedlines(data).some(s=>s.includes('CN')));
  }
  for(const defect of ['pool','az','component','duplicate']) {
   const data=structuredClone(base),hosts=getPlanServers(data);
   for(const h of hosts)for(const role of [...h.roles]) {
    const parsed=parseDnPlacementRole(role);if(parsed?.group!==1)continue;
    if(defect==='pool')h.tenantPool='wrong';
    if(defect==='az')h.azIndex=(h.azIndex+1)%data.azCount;
    if(defect==='component')h.componentKeys=[];
    if(defect==='duplicate')h.roles.push(role);
   }
   check('dn-'+defect,getDnFailureCoverage(data)[0].missing.includes(1));
   check('dn-excel-'+defect,JSON.stringify(buildExcelSheets(data)).includes(getDnFailureCoverage(data)[0].text));
  }
  const alias=structuredClone(base);getPlanServers(alias).forEach(h=>h.roles=h.roles.map(s=>s.replace(/-Slave1$/,'-Slave')));
  check('alias-coverage',JSON.stringify(getDnFailureCoverage(alias))===JSON.stringify(getDnFailureCoverage(base)));
  check('normal-identity',getPlanRoleIdentityAudit(base).complete);
  check('normal-count',getPlanRoleIdentityAudit(base).validRoleHosts.size===getPlanServers(base).reduce((n,h)=>n+h.roles.filter(r=>r!=='管理节点').length,0));
  return r;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:errors.length===0});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
