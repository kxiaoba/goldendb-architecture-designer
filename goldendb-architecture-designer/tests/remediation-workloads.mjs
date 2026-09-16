import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-remediation-20260906/workloads/evidence');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1100}});
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 const setup=async()=>page.evaluate(()=>{
  resetForm();$('forceEven').checked=false;
  const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
  Object.assign(t,{workloadMode:'split',qps:16000,onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,
   cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,onlineCount:0,
   batchRateMode:'work',batchAmount:36000000,batchWindow:2,batchCoreTps:100,batchCpuLimit:.7,batchGrowth:1,
   batchSizingMode:'manual',batchCores:16,batchMemoryGb:96,batchCount:0,jointDnTps:0});render();
 });
 await setup();
 results.push(await page.evaluate(()=>{
  const d=latestDesignData;if(!d)return {name:'split',pass:false,error:$('planningInputStatus').textContent};
  const t=d.tenantPlans[0],w=t.cnWorkloads,hosts=getPlanServers(d);
  return {name:'split-independent-units-resources',w,pass:w[0].count===2&&w[1].count===5&&w[1].target===5000&&t.cnPerAz===7
   &&t.cnByAz.join(',')==='7,7,4'&&t.cnCpuDemand===18*16&&t.cnMemoryDemand===5*64+13*96
   &&d.businessTenants===1&&d.gtmBinding.groupCount===1&&d.dataTb===3
   &&hosts.every(h=>h.roles.filter(r=>parseCnTenant(r)===getTenantKey(t)).length<=1)
   &&getResourceReductionRedlines(d).some(x=>x.includes('混合性能未评估'))};
 }));
 for(const mode of ['qps','tps']){
  await setup();results.push(await page.evaluate(mode=>{
   Object.assign(businessTenantSpecs[0],{batchRateMode:mode,batchRate:mode==='qps'?20000:1000,batchSqlPerTxn:20});render();
   return {name:mode,pass:latestDesignData.tenantPlans[0].cnWorkloads[1].target===1000};
  },mode));
 }
 await setup();results.push(await page.evaluate(()=>{
  const t=businessTenantSpecs[0];Object.assign(t,{onlineCount:1,batchCount:1,dnSizingMode:'manual',dnCores:8,dnMemoryGb:32,jointDnTps:6000});render();
  const p=latestDesignData.tenantPlans[0];return {name:'manual-count-spec-redlines',pass:p.cnPerAz===2&&p.cnBelowMinimum&&p.dnCores===8&&p.dnMemoryGb===32&&p.shardCount===6&&getResourceReductionRedlines(latestDesignData).length>0};
 }));
 for(const [key,value] of [['batchCoreTps',''],['batchWindow',0],['batchCores',1.5],['batchCpuLimit',2],['onlineCount',-1]]){
  await setup();results.push(await page.evaluate(({key,value})=>{businessTenantSpecs[0][key]=value;render();return {name:'invalid-'+key,pass:!latestDesignData&&$('downloadExcelBtn').disabled};},{key,value}));
 }
 await setup();results.push(await page.evaluate(()=>{
  Object.assign(businessTenantSpecs[0],{onlineCount:2,cnCores:128});render();const d=latestDesignData;
  return {name:'oversize-not-silently-clamped',pass:d.tenantPlans[0].cnWorkloads[0].cores===128&&!d.serverSizing.cnPlacementAudit.complete&&getResourceReductionRedlines(d).some(x=>x.includes('CN 落位不完整'))};
 }));
 await setup();results.push(await page.evaluate(()=>{
  businessTenantSpecs[0].jointDnTps=1;render();const t=latestDesignData.tenantPlans[0];
  return {name:'joint-dn-online-floor',pass:t.plannedTxnTps===t.cnWorkloads[0].target&&t.workloadIssues.some(x=>x.includes('低于在线需求'))};
 }));
 await setup();
 await page.locator('[data-key="onlineCount"]').fill('3');
 await page.locator('[data-key="onlineCount"]').dispatchEvent('change');
 results.push(await page.evaluate(()=>({name:'ui-online-count-linkage',pass:latestDesignData.tenantPlans[0].cnWorkloads[0].count===3})));
 await setup();results.push(await page.evaluate(()=>{
  const original=businessTenantSpecs[0];
  for(let i=2;i<=4;i++) businessTenantSpecs.push({...original,tenantId:createTenantIdentity(),name:`租户${i}`});
  render();const d=latestDesignData,hosts=getPlanServers(d);
  return {name:'four-tenants-split-resources-affinity',pass:d.tenantPlans.length===4
   &&d.tenantPlans.every(t=>t.totalCn===18&&t.cnCpuDemand===288&&t.cnMemoryDemand===1568)
   &&hosts.every(h=>d.tenantPlans.every(t=>h.roles.filter(r=>parseCnTenant(r)===getTenantKey(t)).length<=1))
   &&hosts.reduce((n,h)=>n+h.roles.filter(isCnRole).length,0)===72};
 }));
 for(const value of ['',-1,1000000]){
  await setup();results.push(await page.evaluate(value=>{
   Object.assign(businessTenantSpecs[0],{cnPerAzManual:true,cnPerAz:value});render();
   const d=latestDesignData;
   return {name:'hidden-legacy-count-'+value,pass:!!d&&d.tenantPlans[0].cnPerAz===7&&!d.tenantPlans[0].cnManual&&businessTenantSpecs[0].cnPerAz===value};
  },value));
 }
 await setup();results.push(await page.evaluate(()=>{
  const t=businessTenantSpecs[0];Object.assign(t,{cnPerAzManual:true,cnPerAz:'',workloadMode:'single'});render();
  return {name:'single-restores-count-validation',pass:!latestDesignData&&$('downloadExcelBtn').disabled&&t.cnPerAz===''};
 }));
 await setup();results.push(await page.evaluate(()=>{
  businessTenantSpecs[0].batchCount=1;render();const d=latestDesignData,t=d.tenantPlans[0],red=getResourceReductionRedlines(d);
  return {name:'batch-manual-label-and-units',pass:t.cnManual&&t.cnBelowMinimum
   &&red.some(x=>x.includes('跑批 CN 1')&&x.includes('5000')&&x.includes('业务单位/秒'))
   &&!red.some(x=>x.includes('单 AZ CN='))};
 }));
 for(const key of ['online','batch']){
  await setup();results.push(await page.evaluate(key=>{
   const t=businessTenantSpecs[0],before=latestDesignData.tenantPlans[0].cnWorkloads.find(w=>w.key===key);
   t[key+'CoreTps']=before.k*before.water;t[key+'CalibrationMode']='safe';t[key+'CpuLimit']='';render();
   const d=latestDesignData,after=d.tenantPlans[0].cnWorkloads.find(w=>w.key===key);
   return {name:'equivalent-safe-calibration-'+key,pass:after.capacity===before.capacity&&after.count===before.count
    &&after.cores===before.cores&&after.memoryGb===before.memoryGb&&after.water===1
    &&getResourceReductionRedlines(d).some(x=>x.includes('混合性能未评估'))};
  },key));
 }
 await setup();await page.locator('[data-key="batchCalibrationMode"]').selectOption('safe');
 results.push(await page.evaluate(()=>{
  const w=latestDesignData.tenantPlans[0].cnWorkloads[1];
  return {name:'safe-mode-no-double-discount',pass:w.count===4&&w.capacity===6400
   &&!document.querySelector('[data-key="batchCpuLimit"]')&&businessTenantSpecs[0].batchCpuLimit===.7
   &&w.reason.includes('不重复折减')};
 }));
 await page.locator('[data-key="batchCalibrationMode"]').selectOption('raw');
 results.push(await page.evaluate(()=>({name:'restore-raw-watermark',pass:latestDesignData.tenantPlans[0].cnWorkloads[1].count===5
  &&document.querySelector('[data-key="batchCpuLimit"]').value==='0.7'})));
 for(const key of ['online','batch']){
  await setup();results.push(await page.evaluate(key=>{
   businessTenantSpecs[0][key+'CalibrationMode']='unknown';render();return {name:'invalid-calibration-'+key,pass:!latestDesignData&&$('downloadExcelBtn').disabled};
  },key));
 }
 await setup();results.push(await page.evaluate(()=>{
  const t=businessTenantSpecs[0];Object.assign(t,{batchWindowCheck:true,batchCalibrationMode:'safe',batchEfficiency:.8,batchLostCn:1,batchPauseMinutes:10,batchRetryRatio:.1});render();
  const b=latestDesignData.tenantPlans[0].cnWorkloads[1],a=b.windowAudit;
  return {name:'batch-window-independent-arithmetic',pass:b.count===4&&a.work===39600000&&a.throughput===3840
   &&a.seconds===10912.5&&a.requiredCount===6&&!a.withinWindow
   &&getResourceReductionRedlines(latestDesignData).some(x=>x.includes('窗口不足'))};
 }));
 for(const [key,value] of [['batchEfficiency',''],['batchEfficiency',0],['batchEfficiency',1.1],['batchLostCn',1.5],['batchPauseMinutes',-1],['batchRetryRatio',-1]]){
  await setup();results.push(await page.evaluate(({key,value})=>{
   Object.assign(businessTenantSpecs[0],{batchWindowCheck:true,batchEfficiency:.8,[key]:value});render();
   return {name:'window-invalid-'+key+'-'+value,pass:!latestDesignData&&$('downloadExcelBtn').disabled};
  },{key,value}));
 }
 for(const [key,value] of [['batchLostCn',5],['batchPauseMinutes',120]]){
  await setup();results.push(await page.evaluate(({key,value})=>{
   Object.assign(businessTenantSpecs[0],{batchWindowCheck:true,batchEfficiency:1,[key]:value});render();
   const b=latestDesignData.tenantPlans[0].cnWorkloads[1];return {name:'window-unavailable-'+key,pass:!b.windowAudit.withinWindow&&b.count===5};
  },{key,value}));
 }
 await setup();results.push(await page.evaluate(()=>{
  Object.assign(businessTenantSpecs[0],{batchWindowCheck:true,batchEfficiency:1});render();const a=latestDesignData.tenantPlans[0].cnWorkloads[1].windowAudit;
  return {name:'window-satisfied-not-production-certification',pass:a.withinWindow&&a.seconds<=7200
   &&getResourceReductionRedlines(latestDesignData).some(x=>x.includes('混合性能未评估'))};
 }));
 await setup();await page.locator('[data-key="batchWindowCheck"]').check();
 results.push(await page.evaluate(()=>({name:'window-efficiency-required-ui',pass:!latestDesignData})));
 await page.locator('[data-key="batchEfficiency"]').fill('0.8');
 results.push(await page.evaluate(()=>({name:'window-efficiency-recovery-ui',pass:!!latestDesignData?.tenantPlans[0].cnWorkloads[1].windowAudit})));
 await page.locator('[data-key="batchWindowCheck"]').uncheck();
 results.push(await page.evaluate(()=>({name:'window-disabled-retains-draft',pass:!latestDesignData.tenantPlans[0].cnWorkloads[1].windowAudit&&Number(businessTenantSpecs[0].batchEfficiency)===.8})));
 await setup();await page.locator('[data-key="batchCalibrationMode"]').selectOption('safe');
 await page.locator('[data-key="batchWindowCheck"]').check();await page.locator('[data-key="batchEfficiency"]').fill('0.8');
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 for(const [id,name] of [['downloadExcelBtn','workloads.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]){
  const wait=page.waitForEvent('download');await page.locator('#'+id).click();const d=await wait;await d.saveAs(path.join(out,name));results.push({name,pass:fs.statSync(path.join(out,name)).size>1000});
 }
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1000});await page.locator('.workload-settings').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`settings-${width}.png`)});
  results.push({name:'layout-'+width,pass:await page.locator('.workload-settings').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});
 }
 results.push(await page.evaluate(()=>{resetForm();return {name:'reset',pass:latestDesignData&&!latestDesignData.tenantPlans[0].cnWorkloads&&businessTenantSpecs[0].workloadMode==='single'};}));
 results.push({name:'errors',errors,pass:!errors.length});
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results.filter(r=>!r.pass)));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
