import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b3-20260930/identity');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],check=(name,pass)=>r.push({name,pass}),base=structuredClone(latestDesignData);
  check('normal-plan',getPlanRoleIdentityIssues(base).length===0);
  const saved=JSON.stringify(base);getPlanRoleIdentityIssues(base);check('pure-audit',saved===JSON.stringify(base));
  for(const component of ['cn','dn','gtm'])for(const defect of ['duplicate','missing','az','pool','component']) {
   const data=structuredClone(base),hosts=getPlanServers(data);
   const predicate=component==='cn'?isCnRole:component==='dn'?isDnRole:isGtmRole;
   const source=hosts.find(h=>h.roles.some(predicate)),role=source.roles.find(predicate);
   if(defect==='duplicate')hosts.find(h=>h!==source).roles.push(role);
   if(defect==='missing')source.roles=source.roles.filter(x=>x!==role);
   if(defect==='az')source.azIndex=(source.azIndex+1)%data.azCount;
   if(defect==='pool')source.tenantPool='wrong';
   if(defect==='component')source.componentKeys=source.componentKeys.filter(x=>x!==component);
   const issues=getPlanRoleIdentityIssues(data);
   const token={duplicate:'实际落位2次',missing:'实际落位0次',az:'目标中心不符',pool:'资源池不符',component:'组件主机类型不符'}[defect];
   check(component+'-'+defect,issues.some(x=>x.includes(role)&&x.includes(token)));
   check(component+'-'+defect+'-redline',getResourceReductionRedlines(data).some(x=>x.includes(role)&&x.includes(token)));
   check(component+'-'+defect+'-excel',JSON.stringify(buildExcelSheets(data).find(s=>s.name==='风险水位')).includes(token));
  }
  const duplicate=structuredClone(base),hosts=getPlanServers(duplicate),roles=getGtmRolePlacements(duplicate);
  hosts.forEach(h=>{h.roles=h.roles.map(r=>r===roles[1].label?roles[0].label:r);});
  check('equal-total-not-valid',getControlPlanePlacementAudit(hosts,duplicate.managementNodes,duplicate.gtmNodes).complete&&getPlanRoleIdentityIssues(duplicate).some(s=>s.includes('实际落位2次')));
  const legacy=structuredClone(base);getPlanServers(legacy).forEach(h=>{h.roles=h.roles.map(r=>r.replace(/-Slave1$/,'-Slave'));});
  check('legacy-alias-identity',getPlanRoleIdentityIssues(legacy).length===0);
  for(const defect of ['total','replicas','groups','kind']) {
   const data=structuredClone(base);
   if(defect==='total')data.gtmNodes++;
   if(defect==='replicas')data.gtmReplicasPerGroup++;
   if(defect==='groups')data.gtmBinding.groupCount++;
   if(defect==='kind')data.gtmBinding.kind='invalid';
   check('binding-'+defect,getPlanRoleIdentityIssues(data).some(x=>x.includes('GTM绑定结构不一致')));
  }
  const management=structuredClone(base),mgr=getPlanServers(management).find(h=>h.roles.includes('管理节点'));
  mgr.azIndex=(mgr.azIndex+1)%management.azCount;
  check('management-center-count',getPlanRoleIdentityIssues(management).filter(x=>x.includes('管理节点数量不符')).length===2);
  mgr.tenantPool='wrong';check('management-pool',getPlanRoleIdentityIssues(management).some(x=>x.includes('管理节点资源池')));
  return r;
 }));
 for(const module of ['business','reverse'])for(const environment of ['production','poc'])for(const mode of ['local2az','twoSiteThreeDc','threeSiteFiveDc']){
  results.push(await page.evaluate(({module,environment,mode})=>{
   resetForm();$('designModule').value=module;$('designModule').dispatchEvent(new Event('change',{bubbles:true}));
   $('environmentType').value=environment;$(module==='business'?'deploymentMode':'reverseDeploymentMode').value=mode;render();
   const d=latestDesignData,issues=getPlanRoleIdentityIssues(d);
   // Resource-limited reverse plans may be incomplete, but generated roles must be correctly identified.
   const invalid=issues.filter(x=>!x.includes('实际落位0次')&&!x.includes('管理节点数量不符'));
   return {name:`matrix-${module}-${environment}-${mode}`,pass:invalid.length===0,invalid};
  },{module,environment,mode}));
 }
 for(const binding of ['shared','dedicated']) {
  results.push(await page.evaluate(binding=>{
   resetForm();businessTenantSpecs=Array.from({length:4},(_,i)=>({...businessTenantSpecs[0],tenantId:`TID${900+i}`,name:`租户${i+1}`,deploymentStrategy:i===3?'dedicated':'shared'}));
   $('gtmBindMode').value=binding;render();
   const data=latestDesignData,issues=getPlanRoleIdentityIssues(data),hosts=getPlanServers(data);
   const missing=getGtmRolePlacements(data).filter(p=>!hosts.some(h=>h.roles.includes(p.label)));
   const placement=JSON.stringify(hosts),audit=getPlanRoleIdentityIssues;
   try {getPlanRoleIdentityIssues=()=>[];render();}finally{getPlanRoleIdentityIssues=audit;}
   const unchanged=placement===JSON.stringify(getPlanServers(latestDesignData));
   render();
   return {name:`four-tenants-${binding}`,pass:unchanged&&issues.length===missing.length
     &&missing.every(p=>issues.some(x=>x.includes(p.label)&&x.includes('实际落位0次')))
     &&(missing.length===0||!data.serverSizing.controlPlaneAudit.complete),issues,unchanged};
  },binding));
 }
 await page.evaluate(()=>resetForm());
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:errors.length===0});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
