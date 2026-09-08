import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out = path.resolve('outputs/goldendb-remediation-20260906/b4a/evidence');
fs.mkdirSync(out,{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1600,height:1000}});
const results=[], errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 for(const module of ['business','reverse']) {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  await page.locator('#designModule').selectOption(module);
  for(const policy of ['centerA','centerB','balanced']) {
   await page.locator(`.tenant-input[data-mode="${module}"][data-index="0"][data-key="primaryStrategy"]`).selectOption(policy);
   results.push(await page.evaluate(({module,policy})=>{
    const d=latestDesignData, servers=getPlanServers(d), t=d.tenantPlans[0];
    const masters=servers.flatMap(s=>s.roles.filter(r=>r.startsWith(`${getTenantKey(t)}-DN`) && r.endsWith('-Master')).map(r=>({r,az:s.azIndex})));
    const correct=masters.every(({r,az})=>az === getDnReplicaAz(t,parseDnPlacementRole(r).group,1,d));
    const audit=getDnPlacementIssues(d);
    const demandMatches = module==='reverse' || d.serverSizing.siteComponentDemands.every(site => servers.filter(s=>s.azIndex===site.azIndex).reduce((sum,s)=>sum+s.roles.filter(isDnRole).length,0)===site.dn.instances);
    return {module,policy,masters,audit,demandMatches,pass:correct && demandMatches && masters.every(m=>!isDisasterSite(d.mode,m.az)) && (module==='reverse' || audit.length===0)};
   },{module,policy}));
  }
  results.push(await page.evaluate(()=>{
   const d=latestDesignData, fake=structuredClone(d), servers=getPlanServers(fake);
   servers.forEach(s=>{s.roles=s.roles.filter(r=>!isDnRole(r));});
   return {name:'missing-dn-redline',pass:getResourceReductionRedlines(fake).some(x=>x.includes('DN 副本未完整'))};
  }));
 }
 await page.locator('#designModule').selectOption('business');
 results.push(await page.evaluate(()=>{
  resetForm();
  const template=businessTenantSpecs[0];
  businessTenantSpecs=['centerA','centerB','balanced'].map((primaryStrategy,i)=>({...template,tenantId:createTenantIdentity(),name:`租户${i+1}`,primaryStrategy,deploymentStrategy:i?'dedicated':'shared'}));
  render();
  return {name:'mixed-tenant-strategies',pass:getDnPlacementIssues(latestDesignData).length===0};
 }));
 await page.locator('#topology').screenshot({path:path.join(out,'primary-topology.png')});
 for (const mode of ['local2az','twoSiteThreeDc','threeSiteFiveDc']) for(const mixed of [false,true]) {
  results.push(await page.evaluate(({mode,mixed})=>{
   resetForm(); $('deploymentMode').value=mode;
   $('businessAllowCnDnMixed').checked=mixed;
   businessTenantSpecs[0].primaryStrategy='centerB';
   businessTenantSpecs[0].minShardsManual=true; businessTenantSpecs[0].minShards=2;
   render(); const d=latestDesignData, issues=getDnPlacementIssues(d);
   const actual=getPlanServers(d).flatMap(s=>s.roles.filter(r=>r.endsWith('-Master')).map(r=>({r,az:s.azIndex})));
   return {name:`${mode}-mixed-${mixed}`,issues,pass:d.tenantPlans[0].shardCount===2 && actual.every(m=>m.az===1)
    && (!issues.length || getResourceReductionRedlines(d).some(s=>s.includes('DN 副本未完整')))};
  },{mode,mixed}));
 }
 results.push(await page.evaluate(()=>{
  resetForm(); const base=businessTenantSpecs[0];
  businessTenantSpecs=['centerA','centerB','balanced'].map((primaryStrategy,i)=>({...base,tenantId:createTenantIdentity(),name:`共享${i}`,primaryStrategy}));
  render(); const d=latestDesignData, issues=getDnPlacementIssues(d);
  return {name:'shared-pool-strict-failure-report',issues,pass:issues.length>0 && getResourceReductionRedlines(d).some(s=>s.includes('DN 副本未完整'))
   && getPlanServers(d).every(s=>!s.roles.some(isDnRole) || s.resourceAudit.withinWatermark)};
 }));
 results.push(await page.evaluate(()=>{
  let rejected=false;
  try {getDnReplicaAz({primaryStrategy:'centerB'},1,1,{mode:'local1az',azCount:1});}catch{rejected=true;}
  return {name:'single-site-B-rejected',pass:rejected};
 }));
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{fs.writeFileSync(path.join(out,'primary-results.json'),JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length}));
if(results.some(x=>!x.pass))process.exitCode=1;
