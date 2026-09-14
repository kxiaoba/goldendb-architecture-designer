import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-remediation-20260906/w06b/evidence');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 const setup=async()=>page.evaluate(()=>{
  resetForm();$('businessServerConfigMode').value='customer';
  $(componentInputId('cn','Enabled')).checked=true;
  $(componentInputId('cn','Cores')).value=4;
  $(componentInputId('cn','MemoryGb')).value=2;
  Object.assign(businessTenantSpecs[0],{qps:20,dataTb:.1,cnSizingMode:'manual',cnCores:1,cnMemoryGb:1});
  render();
 });
 for(const mode of ['single','split']){
  await setup();results.push(await page.evaluate(mode=>{
   if(mode==='split')Object.assign(businessTenantSpecs[0],{workloadMode:'split',batchRateMode:'tps',batchRate:1,batchCoreTps:50,batchSizingMode:'manual',batchCores:1,batchMemoryGb:1});
   render();const d=latestDesignData;
   return {name:'manual-fits-'+mode,pass:!!d&&d.serverSizing.cnPlacementAudit.complete
    &&d.tenantPlans[0].cnRoleSpecs.every(r=>r.cores===1&&r.memoryGb===1),error:$('planningInputStatus').textContent};
  },mode));
 }
 for(const mode of ['single-auto','batch-auto','other-tenant-auto']){
  await setup();results.push(await page.evaluate(mode=>{
   if(mode==='single-auto')businessTenantSpecs[0].cnSizingMode='auto';
   if(mode==='batch-auto')Object.assign(businessTenantSpecs[0],{workloadMode:'split',batchRate:1,batchCoreTps:50,batchSizingMode:'auto'});
   if(mode==='other-tenant-auto')businessTenantSpecs.push(createBusinessTenantSpec(2));
   render();return {name:mode,pass:!latestDesignData&&$('downloadExcelBtn').disabled};
  },mode));
 }
 for(const [key,value] of [['cnMemoryGb',2],['cnCores',4]]){
  await setup();results.push(await page.evaluate(({key,value})=>{
   businessTenantSpecs[0][key]=value;render();const d=latestDesignData;
   return {name:'manual-overflow-'+key,pass:!!d&&!d.serverSizing.cnPlacementAudit.complete
    &&getResourceReductionRedlines(d).some(x=>x.includes('CN 落位不完整'))};
  },{key,value}));
 }
 await setup();results.push(await page.evaluate(()=>{
  businessTenantSpecs[0].cnCores=0;render();return {name:'invalid-manual',pass:!latestDesignData};
 }));
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results));if(results.some(r=>!r.pass))process.exitCode=1;
