import fs from 'node:fs';import path from 'node:path';import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/host-rebuild');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1100}});const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],c=(name,pass)=>r.push({name,pass}),clone=x=>structuredClone(x);
  function fixture(disks=[2],groups=2,replicas=2){const key='TID-unit',tenant={tenantId:key,name:'重建夹具',isDistributed:true,deploymentStrategy:'shared',cnPerAz:0,totalCn:0,cnCores:8,cnMemoryGb:32,dnCores:1,dnMemoryGb:1,shardCount:groups,replicasPerShard:replicas,futureDataTb:groups,storageDemandKnown:true,dnGroupDataTb:Array(groups).fill(1),primaryStrategy:'centerA'};
   const spec={cores:32,memoryGb:64,diskTb:10,maxInstances:4};const host=(id,roles,keys=['dn'],disk=10)=>({id,az:'本地机房',azIndex:0,tenantPool:'shared',componentKeys:keys,roles,dnCount:roles.filter(isDnRole).length,cnCount:0,spec:{...spec,diskTb:disk}});
   const role=(g,rep)=>`${key}-DN-G${g}-${rep===1?'Master':'Slave'+(rep-1)}`;
   const hosts=Array.from({length:replicas},(_,i)=>host(i===0?'FAILED':'SOURCE'+i,Array.from({length:groups},(_,g)=>role(g+1,i+1))));disks.forEach((disk,i)=>hosts.push(host('TARGET'+i,[],['dn'],disk)));hosts.push(host('GTM1',['GTM-SYS1'],['gtm']),host('GTM2',['GTM-SYS2'],['gtm']),host('MGR',['管理节点'],['management']));
   const d={reverse:true,mode:'local1az',azCount:1,environment:'production',tenantPlans:[tenant],gtmBinding:{kind:'shared',groupCount:1},gtmNodes:2,gtmReplicasPerGroup:2,managementNodes:1,reserveRatio:0,maxDnPerServer:4,maxCnPerServer:1,resourceReduction:{maxTenantDnPerServer:4,maxTenantCnPerServer:1,dnTenantPlacement:'shared'},serverPlan:hosts,componentSpecs:{dn:spec,cn:spec,gtm:spec,management:spec}};hosts.forEach(h=>h.resourceAudit=getServerResourceAudit(h,d));return d;}
  const f=fixture(),before=JSON.stringify(f),row=getDnRebuildAudits(f).find(x=>x.host==='FAILED');
  c('fixture-identity-valid',getPlanRoleIdentityAudit(f).complete);c('two-lost-joint-placement',row.assignments.length===2&&row.placementStatus==='预算内可排布（仅必要条件）');c('no-overclaim',row.status==='未评估'&&row.text.includes('实际可读')&&row.text.includes('RPO/RTO未验证'));c('read-only',JSON.stringify(f)===before);
  c('same-host-full-replica-set',row.lost.length===2&&row.assignments.every(a=>a.target==='TARGET0'&&a.sourceCandidates.every(s=>s.host==='SOURCE1')));
  const shared=fixture([1.5]);const sr=getDnRebuildAudits(shared).find(x=>x.host==='FAILED');c('individual-fit-not-joint-fit',sr.placementError&&sr.assignments.length===0&&sr.reason.includes('联合'));
  const split=fixture([1,1]);c('shared-ledger-uses-two-hosts',new Set(getDnRebuildAudits(split).find(x=>x.host==='FAILED').assignments.map(a=>a.target)).size===2);
  c('pool-total-cannot-fit-single-instance',getDnRebuildAudits(fixture([.6,.6],1)).find(x=>x.host==='FAILED').placementError);
  for(const [name,mutate]of [
   ['wrong-az',d=>{d.serverPlan.find(h=>h.id==='TARGET0').azIndex=1;}],
   ['wrong-pool',d=>{d.serverPlan.find(h=>h.id==='TARGET0').tenantPool='other';}],
   ['wrong-component',d=>{d.serverPlan.find(h=>h.id==='TARGET0').componentKeys=['cn'];}],
   ['cpu',d=>{d.serverPlan.find(h=>h.id==='TARGET0').spec.cores=1;}],
   ['memory',d=>{d.serverPlan.find(h=>h.id==='TARGET0').spec.memoryGb=1;}],
   ['density',d=>{d.maxDnPerServer=1;}],
   ['tenant-density',d=>{d.resourceReduction.maxTenantDnPerServer=1;}],
  ]){const d=fixture();mutate(d);const a=getDnRebuildAudits(d).find(x=>x.host==='FAILED');c('reject-'+name,a?.placementError&&a.assignments.length===0);}
  c('no-source-not-a-target-problem',getDnRebuildAudits(fixture([10],1,1)).find(x=>x.host==='FAILED').placementError);
  const noTargets=fixture([]);c('same-group-cannot-use-survivor-as-target',getDnRebuildAudits(noTargets).find(x=>x.host==='FAILED').placementError);
  const unknown=fixture();unknown.tenantPlans[0].storageDemandKnown=false;c('unknown-demand-unassessed',getDnRebuildAudits(unknown).every(x=>x.placementStatus==='未评估'));
  const noSpec=fixture();noSpec.serverPlan.find(h=>h.id==='TARGET0').spec=null;c('unknown-target-not-infeasible-proof',getDnRebuildAudits(noSpec).find(x=>x.host==='FAILED').placementStatus==='未评估');
  const stale=fixture();stale.serverPlan.find(h=>h.id==='TARGET0').spec.diskTb=.6;c('recompute-target-not-stale-audit',getDnRebuildAudits(stale).find(x=>x.host==='FAILED').placementError);
  const bad=fixture();bad.serverPlan[1].roles[0]=bad.serverPlan[1].roles[1];c('duplicate-role-baseline-unassessed',getDnRebuildAudits(bad)[0].placementStatus==='未评估'&&getDnRebuildAudits(bad)[0].host===null);
  const hostDup=fixture();hostDup.serverPlan[1].id=hostDup.serverPlan[0].id;c('duplicate-host-unassessed',getDnRebuildAudits(hostDup)[0].host===null);
  c('search-budget-not-partial-success',getDnRebuildAudits(f,{maxVisits:0}).every(a=>a.placementStatus==='未评估'&&!a.assignments.length));
  c('scale-limit-unassessed',getDnRebuildAudits(f,{maxHosts:1})[0].placementStatus==='未评估');c('invalid-budget-unassessed',getDnRebuildAudits(f,{maxVisits:NaN})[0].placementStatus==='未评估');
  const cache=fixture();const a=getDnRebuildAudits(cache);cache.serverPlan.find(h=>h.id==='TARGET0').spec.diskTb=.1;c('cache-invalidates',getDnRebuildAudits(cache).find(x=>x.host==='FAILED').placementError&&a.find(x=>x.host==='FAILED').assignments.length===2);
  const net=fixture();const target=net.serverPlan.find(h=>h.id==='TARGET0');Object.assign(target.spec,{diskTb:4,dataDiskCount:1,dataDiskTb:4,storage:{mode:'net',raid:'raid0',spareDisks:0,fsReserveRatio:0,logTb:0,indexTb:0,tempTb:.5,watermark:1,recoveryMode:'extra',recoveryTb:1,recoverySource:'测试预算'}});c('workspace-deducted-once',getDnRebuildAudits(net).find(x=>x.host==='FAILED').assignments.length===2&&getDiskCapacity(target.spec,0).usableTb===2.5);
  const inc=clone(net);inc.serverPlan.find(h=>h.id==='TARGET0').spec.storage={...target.spec.storage,recoveryMode:'included',recoveryTb:.5};c('included-workspace-not-double-deducted',getDnRebuildAudits(inc).find(x=>x.host==='FAILED').assignments.length===2);
  const multi=fixture([2]);const tenant=multi.tenantPlans[0];tenant.dnGroupDataTb=[0,2];c('zero-group-kept-exact',getDnRebuildAudits(multi).find(x=>x.host==='FAILED').assignments.some(a=>a.demand.disk===0));
  // Isolation must apply to existing non-DN occupants as well as added DN roles.
  const isolated=fixture();isolated.resourceReduction.dnTenantPlacement='isolated';c('isolated-own-tenant-baseline',getDnRebuildAudits(isolated).find(x=>x.host==='FAILED').assignments.length===2);
  const current=latestDesignData,beforeCurrent=JSON.stringify(current);c('business-main-rows',getDnRebuildAudits(current).length>0);c('business-summary-scope',getDnRebuildSummary(current).text.includes('必要条件'));c('candidate-linked',getLayoutFeasibilityAudits(current).filter(x=>x.rebuild).length>0);c('main-model-unchanged',JSON.stringify(current)===beforeCurrent);
  c('excel-summary-linked',buildExcelSheets(current).find(s=>s.name==='方案摘要').rows.some(r=>r[0]==='DN整机重建必要条件'));
  c('excel-risk-linked',buildExcelSheets(current).find(s=>s.name==='风险水位').rows.some(r=>r[0]==='DN整机重建'));
  c('copy-text-linked',document.querySelector('#formulaOutput').textContent.includes('DN整机重建必要条件'));
  window.rebuildFixture=f;window.rebuildFixtureReport=getDnRebuildSummary(f);return r;
 }));
 fs.writeFileSync(path.join(out,'fixture.json'),JSON.stringify(await page.evaluate(()=>({model:window.rebuildFixture,audit:getDnRebuildAudits(window.rebuildFixture)})),null,2));
 for(const module of ['business','reverse']){await page.evaluate(module=>{resetForm();$('designModule').value=module;render();},module);results.push({name:module+'-page-linked',pass:await page.locator('.dn-rebuild-summary').count()===1});
  fs.writeFileSync(path.join(out,module+'-sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,name]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]){const wait=page.waitForEvent('download');await page.locator('#'+id).click();await(await wait).saveAs(path.join(out,module+'-'+name));results.push({name:module+'-download-'+name,pass:fs.statSync(path.join(out,module+'-'+name)).size>1000});}
 }
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1100});await page.locator('.dn-rebuild-summary details').evaluate(e=>e.open=true);await page.locator('.dn-rebuild-summary').scrollIntoViewIfNeeded();results.push({name:'layout-'+width,pass:await page.locator('#placementDetails').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});await page.screenshot({path:path.join(out,'layout-'+width+'.png')});}
 results.push({name:'browser-errors',pass:!errors.length});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length,failed:results.filter(x=>!x.pass),errors}));if(results.some(x=>!x.pass)||errors.length)process.exitCode=1;
