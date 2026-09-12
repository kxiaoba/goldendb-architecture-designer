import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve('outputs/goldendb-remediation-20260906/poc-density/evidence');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 for(const role of ['cn','dn'])results.push(await page.evaluate(role=>{
  const tenant={...defaultReverseTenants[0],tenantId:createTenantIdentity(),name:'均衡租户',deploymentStrategy:'shared',
   cnByAz:[6],cnPerAz:6,shardCount:6,replicasPerShard:1,futureDataTb:3};
  const hosts=Array.from({length:3},(_,i)=>({id:`H${i}`,azIndex:0,tenantPool:'shared',componentKeys:[role],roles:[],cnCount:0,dnCount:0,
   spec:{cores:128,memoryGb:1024,diskTb:16}}));
  const config={tenantPlans:[tenant],environment:'poc',azCount:1,mode:'local1az',reserveRatio:0.35,
   maxCnPerServer:4,maxDnPerServer:4,maxTenantCnPerServer:2,maxTenantDnPerServer:2,
   cnTenantPlacement:'shared',dnTenantPlacement:'shared',allowShardColocation:true};
  if(role==='cn')placeTenantCnRolesByPool(hosts,config);else placeDnRolesByPool(hosts,config);
  const counts=hosts.map(h=>h[role+'Count']);return {name:`balanced-${role}`,counts,pass:counts.every(n=>n===2)};
 },role));
 for(const module of ['business','reverse'])for(const tenants of [1,4])for(const enabled of [true,false])for(const shared of [true,false]) {
  results.push(await page.evaluate(({module,tenants,enabled,shared})=>{
   resetForm();$('designModule').value=module;$('environmentType').value='poc';
   const prefix=module;$(prefix+'DensityEnabled').checked=enabled;
   $(prefix+'PocCnLimit').value=4;$(prefix+'PocDnLimit').value=6;$(prefix+'PocTenantCnLimit').value=2;
   $(prefix+'MaxTenantDnPerServer').value=6;$(prefix+'AllowAllMixed').checked=true;
   $(prefix+'CnTenantPlacement').value=shared?'shared':'isolated';$(prefix+'DnTenantPlacement').value=shared?'shared':'isolated';
   if(module==='business'){
    $('businessHostModelSource').value='dn';
    businessTenantSpecs=Array.from({length:tenants},(_,i)=>({...defaultBusinessTenants[0],tenantId:createTenantIdentity(),name:`租户${i+1}`,qps:20000}));
   }else{
    $('reverseServerCount').value=80;
    reverseTenantSpecs=Array.from({length:tenants},(_,i)=>({...defaultReverseTenants[0],tenantId:createTenantIdentity(),name:`租户${i+1}`}));
   }
   render();const d=latestDesignData;if(!d)return {module,tenants,enabled,shared,pass:false,error:$('planningInputStatus').textContent};
   const servers=getPlanServers(d),s=d.reverse?d:d.serverSizing;
   const limits=servers.every(h=>!enabled || (h.cnCount<=4 && h.dnCount<=6 && d.tenantPlans.every(t=>h.roles.filter(r=>parseCnTenant(r)===getTenantKey(t)).length<=2)));
   const resources=servers.every(h=>!h.resourceAudit||h.resourceAudit.withinWatermark);
   const rules=!getDnReplicaHostViolations(servers).length&&!getGtmReplicaHostViolations(servers).length
    &&!getCnTenantIsolationViolations(servers,shared?'shared':'isolated').length&&!getDnTenantIsolationViolations(servers,shared?'shared':'isolated').length;
   const hardware=module==='reverse'||servers.every(h=>h.componentKeys.length===4);
   const warned=s.cnPlacementAudit.complete||getResourceReductionRedlines(d).some(r=>r.includes('CN 落位不完整'));
   return {module,tenants,enabled,shared,limits,resources,rules,hardware,warned,cn:s.cnPlacementAudit,dnIssues:getDnPlacementIssues(d),pass:limits&&resources&&rules&&hardware&&warned&&servers.some(h=>h.roles.length)};
  },{module,tenants,enabled,shared}));
 }
 results.push(await page.evaluate(()=>{
  resetForm();$('environmentType').value='poc';$('businessMaxTenantDnPerServer').value=6;render();
  const conflict=latestDesignData.resourceReduction.densityCapped;
  $('businessPocDnLimit').value=6;render();const fixed=!latestDesignData.resourceReduction.densityCapped;
  $('businessDensityEnabled').checked=false;$('businessPocCnLimit').value='';render();const disabled=!!latestDesignData;
  $('environmentType').value='production';render();const production=latestDesignData.resourceReduction.densityCapped&&latestDesignData.resourceReduction.densityEnabled;
  resetForm();return {name:'conflict-toggle-production-reset',pass:conflict&&fixed&&disabled&&production&&$('businessDensityEnabled').checked&&$('businessPocCnLimit').value==='0'&&$('businessHostModelSource').value==='component'};
 }));
 results.push(await page.evaluate(()=>{
  resetForm();$('environmentType').value='poc';$('businessServerConfigMode').value='customer';$('customerDnEnabled').checked=true;
  $('businessHostModelSource').value='dn';$('customerDnModel').value='客户唯一机型';$('businessAllowAllMixed').checked=true;render();
  const d=latestDesignData;return {name:'only-dn-custom-model',pass:Object.values(d.serverSizing.componentSpecs).every(s=>s.model==='客户唯一机型')};
 }));
 fs.writeFileSync(path.join(out,'poc-sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 for(const [button,file] of [['downloadExcelBtn','poc.xlsx'],['downloadTopologyBtn','poc-network.png'],['downloadServerTopologyBtn','poc-servers.png']]){
  const downloadPromise=page.waitForEvent('download');await page.locator('#'+button).click();
  const download=await downloadPromise;await download.saveAs(path.join(out,file));
  results.push({name:file,pass:fs.statSync(path.join(out,file)).size>1000});
 }
 results.push(await page.evaluate(()=>{
  resetForm();$('designModule').value='reverse';$('environmentType').value='poc';$('reverseServerCount').value=1;
  $('reverseCpuCores').value=1;$('reverseMemoryGb').value=1;$('reverseDensityEnabled').checked=false;$('reverseAllowAllMixed').checked=true;
  render();const d=latestDesignData;return {name:'density-off-does-not-bypass-capacity',pass:d.resourceState==='不足'&&getPlanServers(d).every(h=>!h.resourceAudit||h.resourceAudit.withinWatermark)&&getResourceReductionRedlines(d).length>0};
 }));
 await page.evaluate(()=>{resetForm();$('environmentType').value='poc';render();});
 for(const width of [390,875,1600]){
  await page.setViewportSize({width,height:1000});
  await page.locator('#businessPocDensitySettings').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`poc-${width}.png`)});
  results.push({name:`layout-${width}`,pass:await page.locator('#businessPocDensitySettings').evaluate(el=>el.scrollWidth<=el.clientWidth+1)});
 }
 results.push({name:'browser-errors',errors,pass:!errors.length});
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results.filter(r=>!r.pass)));
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length}));
if(results.some(r=>!r.pass))process.exitCode=1;
