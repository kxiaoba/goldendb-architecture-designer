import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260919/s01b3b2b2b2');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const checks=[],check=(name,pass)=>checks.push({name,pass});
  const d=structuredClone(latestDesignData),t=d.tenantPlans[0];
  Object.assign(t,{dataTb:3,futureDataTb:6,shardCount:4,replicasPerShard:2,dnCores:16,dnMemoryGb:64,cnByAz:[0,0],plannedTxnTps:4000});
  check('empty-default',parseDnGroupData('',t)===null&&getDnGroupDataTb(t,1)===1.5);
  const values=parseDnGroupData('[1.5,0.5,0.5,0.5]',t);t.dnGroupDataTb=values;
  check('growth-once',values.join(',')==='3,1,1,1');
  const key=getTenantKey(t),role=(g,r)=>`${key}-DN-G${g}-${r}`;
  check('master-slave-same-capacity',getRoleResourceDemand(role(1,'Master'),[t]).disk===3&&getRoleResourceDemand(role(1,'Slave1'),[t]).disk===3);
  const host={roles:[role(1,'Master'),role(2,'Master')],spec:{cores:128,memoryGb:1024,diskTb:4}};
  check('host-sum',getServerResourceAudit(host,{tenantPlans:[t],reserveRatio:0}).used.disk===4);
  check('host-watermark',!getServerResourceAudit(host,{tenantPlans:[t],reserveRatio:.2}).withinWatermark);
  check('placement-blocks',!canPlaceRoleWithinWatermark({...host,roles:[role(1,'Master')]},role(2,'Master'),{tenantPlans:[t],reserveRatio:.2}));
  const other={...t,tenantId:createTenantIdentity(),dnGroupDataTb:[.25,.25,.25,.25]};
  check('multi-tenant-disk',getServerResourceAudit({...host,roles:[role(1,'Master'),`${getTenantKey(other)}-DN-G1-Master`]},{tenantPlans:[t,other],reserveRatio:0}).used.disk===3.25);
  const sites=buildBusinessSiteDemands({tenantPlans:[t],azCount:2,mode:'local2az',siteCapacityFactors:[1,1],gtmPlacements:[],managementNodes:0,environment:'production',resourceReduction:{cnTenantPlacement:'isolated',dnTenantPlacement:'isolated',maxTenantDnPerServer:2}});
  check('site-sum-replication',sites.every(s=>s.dn.diskTb===6)&&sites.reduce((n,s)=>n+s.dn.diskTb,0)===12);
  Object.assign(d,{dnReferenceTps:2000,dnReferenceCores:16,dnReferenceMemoryGb:64,maxShardTb:2});t.dnDataSkewFactor=100;
  const r=getDnTakeoverCapacity(d)[0];
  check('actual-overrides-factor',r.dataTb===3&&!r.storageEnough&&r.error);
  check('export-description',JSON.stringify(buildExcelSheets(d)).includes('G1=3TB'));
  for(const raw of ['[]','{}','[1,1,1]','[1,1,1,1]','[3,0,0,-1]','["3",0,0,0]','[1e999,0,0,0]','[null,1,1,1]','broken']){
   let rejected=false;try{parseDnGroupData(raw,t);}catch(e){rejected=e instanceof PlanningInputError;}check('reject-'+raw,rejected);
  }
  check('empty-groups-supported',parseDnGroupData('[3,0,0,0]',t).join(',')==='6,0,0,0');
  check('float-tolerance',parseDnGroupData('[0.1,0.2]',{dataTb:.3,futureDataTb:.6,shardCount:2})[0]===.2);
  return checks;
 }));
 const input=page.locator('[data-key="dnGroupDataInput"]').first();
 const baseline=await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan));
 await input.fill('[1.5,0.5,0.5,0.5]');await input.dispatchEvent('change');
 results.push({name:'ui-model',pass:await page.evaluate(()=>latestDesignData.tenantPlans[0].dnGroupDataTb?.join(',')==='1.5,0.5,0.5,0.5')});
 results.push({name:'actual-audit-matches-roles',pass:await page.evaluate(()=>latestDesignData.serverSizing.serverPlan.every(h=>Math.abs(h.resourceAudit.used.disk-h.roles.reduce((sum,r)=>sum+getRoleResourceDemand(r,latestDesignData.tenantPlans).disk,0))<1e-9))});
 await input.fill('[3]');await input.dispatchEvent('change');
 results.push({name:'invalid-blocks',pass:await page.locator('#downloadExcelBtn').isDisabled()});
 await input.fill('[1.5,0.5,0.5,0.5]');await input.dispatchEvent('change');
 results.push({name:'recovery',pass:await page.locator('#downloadExcelBtn').isEnabled()});
 await input.fill('');await input.dispatchEvent('change');
 results.push({name:'clear-restores-baseline',pass:baseline===await page.evaluate(()=>JSON.stringify(latestDesignData.serverSizing.serverPlan))});
 await input.fill('[1.5,0.5,0.5,0.5]');await input.dispatchEvent('change');
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1000});await input.scrollIntoViewIfNeeded();
  results.push({name:'layout-'+width,pass:await input.evaluate(e=>e.getBoundingClientRect().right<=e.closest('article').getBoundingClientRect().right)});
  await page.screenshot({path:path.join(out,`groups-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:errors.length===0,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
