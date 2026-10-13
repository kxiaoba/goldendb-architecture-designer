import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b5-20261013/pressure-identity');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const base=structuredClone(latestDesignData),r=[],check=(name,pass)=>r.push({name,pass});
  check('normal-evaluated',getDnHostPressure(base).every(row=>row.evaluated));
  for(const defect of ['pool','az','component','duplicate','alias-duplicate']){
   const data=structuredClone(base),hosts=getPlanServers(data),host=hosts.find(h=>h.roles.some(r=>r.endsWith('-Slave1')));
   const role=host.roles.find(r=>r.endsWith('-Slave1'));
   if(defect==='pool')host.tenantPool='wrong';
   if(defect==='az')host.azIndex=(host.azIndex+1)%data.azCount;
   if(defect==='component')host.componentKeys=host.componentKeys.filter(k=>k!=='dn');
   if(defect==='duplicate')hosts.find(h=>h!==host).roles.push(role);
   if(defect==='alias-duplicate')hosts.find(h=>h!==host).roles.push(role.replace(/-Slave1$/,'-Slave'));
   const row=getDnHostPressure(data).find(r=>r.host===host.id);
   check(defect+'-not-evaluated',!row.evaluated&&row.pressureCpu===null);
   check(defect+'-redline',getResourceReductionRedlines(data).length>getResourceReductionRedlines(base).length);
   check(defect+'-excel',JSON.stringify(buildExcelSheets(data)).includes(row.text));
  }
  const alias=structuredClone(base);getPlanServers(alias).forEach(h=>h.roles=h.roles.map(r=>r.replace(/-Slave1$/,'-Slave')));
  check('legacy-alias-preserved',JSON.stringify(getDnHostPressure(alias))===JSON.stringify(getDnHostPressure(base)));
  return r;
 }));
 const diagnosis=await page.evaluate(()=>{
  resetForm();businessTenantSpecs=Array.from({length:4},(_,i)=>({...businessTenantSpecs[0],tenantId:`TID${900+i}`,name:`租户${i+1}`,deploymentStrategy:i===3?'dedicated':'shared'}));
  $('gtmBindMode').value='dedicated';render();
  const data=latestDesignData,hosts=getPlanServers(data),config={...data,reserveRatio:data.serverSizing.reserveRatio};
  const missing=getGtmRolePlacements(data).filter(p=>!hosts.some(h=>h.roles.includes(p.label)));
  const repairs=missing.map(p=>{
   const candidates=hosts.filter(h=>h.azIndex===p.azIndex&&h.tenantPool===p.resourcePoolKey&&h.componentKeys.includes('gtm'));
   const max=data.componentSpecs.gtm.maxInstances;
   for(const source of candidates)for(const target of candidates)for(const role of source.roles.filter(isGtmRole)){
    if(source===target||target.roles.filter(isGtmRole).length>=max||target.roles.some(r=>getGtmRoleGroupKey(r)===getGtmRoleGroupKey(role)))continue;
    const a={...source,roles:source.roles.filter(r=>r!==role)},b={...target,roles:[...target.roles]};
    if(a.roles.some(r=>getGtmRoleGroupKey(r)===p.groupKey)||a.roles.filter(isGtmRole).length>=max)continue;
    if(canPlaceRoleWithinWatermark(b,role,config)&&canPlaceRoleWithinWatermark(a,p.label,config))
     return {missing:p.label,move:role,from:source.id,to:target.id,placeOn:source.id,feasible:true};
   }
   return {missing:p.label,feasible:false};
  });
  return {allowGroupColocation:data.resourceReduction.allowGtmGroupColocation,maxInstances:data.componentSpecs?.gtm?.maxInstances,
   repairs,missing:missing.map(p=>({...p,
    candidates:hosts.filter(h=>h.azIndex===p.azIndex&&h.tenantPool===p.resourcePoolKey&&h.componentKeys.includes('gtm')).map(h=>({id:h.id,roles:h.roles,
     sameGroup:h.roles.some(r=>getGtmRoleGroupKey(r)===p.groupKey),gtmCount:h.roles.filter(isGtmRole).length,
     watermark:canPlaceRoleWithinWatermark(h,p.label,config)}))}))};
 });
 fs.writeFileSync(path.join(out,'gtm-diagnosis.json'),JSON.stringify(diagnosis,null,2));
 results.push({name:'gtm-known-two-gaps',pass:diagnosis.missing.length===2});
 results.push({name:'gtm-alternative-without-new-hosts',pass:diagnosis.repairs.length===2&&diagnosis.repairs.every(r=>r.feasible)});
 await page.evaluate(()=>resetForm());
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await wait).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:errors.length===0});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
