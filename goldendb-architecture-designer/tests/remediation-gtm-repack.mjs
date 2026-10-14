import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v2a-20261014/gtm-repack');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],check=(name,pass)=>r.push({name,pass}),repack=tryRepackGtmRole;
  const baseline=JSON.stringify(getPlanServers(latestDesignData));
  try {tryRepackGtmRole=()=>false;render();}finally{tryRepackGtmRole=repack;}
  check('normal-layout-unchanged',baseline===JSON.stringify(getPlanServers(latestDesignData)));
  resetForm();businessTenantSpecs=Array.from({length:4},(_,i)=>({...businessTenantSpecs[0],tenantId:`TID${900+i}`,name:`租户${i+1}`,deploymentStrategy:i===3?'dedicated':'shared'}));
  $('gtmBindMode').value='dedicated';
  try {tryRepackGtmRole=()=>false;render();}finally{tryRepackGtmRole=repack;}
  const old=structuredClone(latestDesignData),oldHosts=getPlanServers(old);
  const missing=getGtmRolePlacements(old).filter(p=>!oldHosts.some(h=>h.roles.includes(p.label)));
  check('old-two-gaps',missing.length===2);
  render();const current=latestDesignData,hosts=getPlanServers(current);
  check('new-complete',getPlanRoleIdentityAudit(current).complete);
  check('same-host-count',hosts.length===oldHosts.length);
  check('cn-dn-unchanged',hosts.every((h,i)=>JSON.stringify(h.roles.filter(r=>isCnRole(r)||isDnRole(r)))===JSON.stringify(oldHosts[i].roles.filter(r=>isCnRole(r)||isDnRole(r)))));
  check('management-count-unchanged',hosts.flatMap(h=>h.roles).filter(r=>r==='管理节点').length===oldHosts.flatMap(h=>h.roles).filter(r=>r==='管理节点').length);
  check('no-gtm-anti-affinity-conflicts',getGtmReplicaHostViolations(hosts).length===0);
  check('watermark',hosts.every(h=>h.resourceAudit.withinWatermark));
  check('density',hosts.every(h=>h.roles.filter(isGtmRole).length<=current.componentSpecs.gtm.maxInstances));
  const layout=JSON.stringify(hosts);render();check('deterministic',layout===JSON.stringify(getPlanServers(latestDesignData)));
  const p=missing[0],config={...old,reserveRatio:old.serverSizing.reserveRatio};
  for(const defect of ['az','pool','component','capacity','density']) {
   const candidates=structuredClone(oldHosts.filter(h=>h.azIndex===p.azIndex&&h.tenantPool===p.resourcePoolKey&&h.componentKeys.includes('gtm')));
   candidates.forEach(h=>{
    if(defect==='az')h.azIndex=99;
    if(defect==='pool')h.tenantPool='wrong';
    if(defect==='component')h.componentKeys=[];
    if(defect==='capacity')h.spec={...h.spec,cpuCores:1,memoryGb:1};
   });
   const before=JSON.stringify(candidates);
   check(defect+'-refused',!tryRepackGtmRole(candidates,p,config,defect==='density'?1:old.componentSpecs.gtm.maxInstances));
   check(defect+'-atomic',before===JSON.stringify(candidates));
  }
  return r;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const pending=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await pending).saveAs(path.join(out,'workloads.xlsx'));
 for(const id of ['downloadTopologyBtn','downloadServerTopologyBtn']) {
  const pending=page.waitForEvent('download');await page.locator('#'+id).click();
  const file=path.join(out,id+'.png');await(await pending).saveAs(file);
  const bytes=fs.readFileSync(file);results.push({name:id,pass:bytes.readUInt32BE(16)>500&&bytes.readUInt32BE(20)>200});
 }
 results.push({name:'browser-errors',pass:!errors.length});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
