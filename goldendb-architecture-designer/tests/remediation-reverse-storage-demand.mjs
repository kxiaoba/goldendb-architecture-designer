import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v3b1-20261025/demand');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});
const results=[],errors=[],check=(name,pass)=>results.push({name,pass});
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(()=>{
    const r=[],c=(name,pass)=>r.push({name,pass}),near=(a,b)=>Math.abs(a-b)<1e-9;
    const base={...defaultReverseTenants[0],storageDemandMode:'explicit',plannedDataTb:6,shardCount:4,replicaCount:2};
    const build=s=>buildReverseTenantPlans({specs:[s],environment:'poc',minReplica:1,azCount:2})[0];
    const t=build(base),key=getTenantKey(t);
    c('planned-total-not-grown',t.futureDataTb===6&&t.dataTb===6&&t.storageDemandKnown);
    c('uniform-group-1.5',getDnGroupDataTb(t,1)===1.5&&getDnGroupDataTb(t,4)===1.5);
    c('each-replica-same-data',getRoleResourceDemand(`${key}-DN-G2-Master`,[t]).disk===1.5&&getRoleResourceDemand(`${key}-DN-G2-Slave1`,[t]).disk===1.5);
    c('explicit-demand-not-unknown',!getRoleResourceDemand(`${key}-DN-G2-Master`,[t]).diskUnknown);
    const g=build({...base,dnGroupDataInput:'[3,1,0.5,1.5]'});
    c('skew-retained-no-growth',JSON.stringify(g.dnGroupDataTb)==='[3,1,0.5,1.5]');
    c('skew-role-demand',getRoleResourceDemand(`${getTenantKey(g)}-DN-G1-Slave1`,[g]).disk===3);
    const z=build({...base,plannedDataTb:0,dnGroupDataInput:'[0,0,0,0]'});
    c('explicit-zero-not-missing',z.storageDemandKnown&&z.futureDataTb===0&&z.dnGroupDataTb.every(v=>v===0));
    const u=build({...base,storageDemandMode:'unknown',plannedDataTb:-5,dnGroupDataInput:'invalid'});
    c('unknown-inactive-drafts-ignored',!u.storageDemandKnown&&u.futureDataTb===0&&!u.dnGroupDataTb);
    c('unknown-role-marked',getRoleResourceDemand(`${getTenantKey(u)}-DN-G1-Master`,[u]).diskUnknown);
    const legacy=build({...base,storageDemandMode:undefined});
    c('legacy-default-unknown',!legacy.storageDemandKnown&&legacy.futureDataTb===0);
    const central=build({...base,type:'centralized',dnGroupDataInput:'[6]'});
    c('centralized-one-group',central.shardCount===1&&getDnGroupDataTb(central,1)===6);
    const odd=build({...base,shardCount:3});
    c('existing-even-shards-retained',odd.shardCount===4&&near(getDnGroupDataTb(odd,1),1.5));
    for(const [name,change]of [['blank',{plannedDataTb:''}],['negative',{plannedDataTb:-1}],['nan',{plannedDataTb:NaN}],['infinity',{plannedDataTb:Infinity}],['over-limit',{plannedDataTb:1e100}],['bad-mode',{storageDemandMode:'bad'}],['bad-json',{dnGroupDataInput:'['}],['short-array',{dnGroupDataInput:'[6]'}],['wrong-sum',{dnGroupDataInput:'[1,1,1,1]'}],['negative-group',{dnGroupDataInput:'[-1,2,2,3]'}],['string-group',{dnGroupDataInput:'["3",1,1,1]'}]]) {
      let failed=false;try{build({...base,...change});}catch(e){failed=e instanceof PlanningInputError;}c('reject-'+name,failed);
    }
    const spec={cores:256,memoryGb:1024,diskTb:4,maxInstances:20};
    const host={roles:[`${getTenantKey(g)}-DN-G1-Master`],spec};
    const a=getServerResourceAudit(host,{tenantPlans:[g],reserveRatio:.25});
    c('exact-watermark-3TB',a.used.disk===3&&a.usable.disk===3&&a.diskPercent===75&&a.withinWatermark);
    const too=build({...base,dnGroupDataInput:'[3.01,0.99,0.5,1.5]'});
    c('over-watermark-rejected',!getServerResourceAudit({roles:[`${getTenantKey(too)}-DN-G1-Master`],spec},{tenantPlans:[too],reserveRatio:.25}).withinWatermark);
    c('unknown-host-partial',getServerAuditStatus({spec,resourceAudit:getServerResourceAudit({spec,roles:[`${getTenantKey(u)}-DN-G1-Master`]},{tenantPlans:[u],reserveRatio:.25})}).status==='部分未评估');
    c('business-growth-parser-preserved',parseDnGroupData('[1,2]',{dataTb:3,futureDataTb:6,shardCount:2}).join(',')==='2,4');
    return r;
  }));
  await page.selectOption('#designModule','reverse');
  await page.locator('#reverseServerCount').fill('60');
  const signature=()=>page.evaluate(()=>JSON.stringify({required:latestDesignData.requiredServerCount,roles:latestDesignData.serverPlan.map(s=>[s.az,s.roles]),dn:latestDesignData.dnInstances}));
  const baseline=await signature();
  const oldPage=await browser.newPage();
  const oldSource=execFileSync('git',['show','a65fb95:goldendb-architecture-designer/app.js'],{encoding:'utf8'});
  await oldPage.route('**/app.js',route=>route.fulfill({contentType:'application/javascript',body:oldSource}));
  await oldPage.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  await oldPage.selectOption('#designModule','reverse');await oldPage.locator('#reverseServerCount').fill('60');
  check('baseline-really-uses-old-source',await oldPage.evaluate(()=>!('storageDemandKnown' in latestDesignData.tenantPlans[0])));
  check('old-commit-default-numeric-and-placement-compatible',baseline===await oldPage.evaluate(()=>JSON.stringify({required:latestDesignData.requiredServerCount,roles:latestDesignData.serverPlan.map(s=>[s.az,s.roles]),dn:latestDesignData.dnInstances})));
  await oldPage.close();
  check('default-no-fabricated-total',await page.evaluate(()=>latestDesignData.futureDataTb===0&&!latestDesignData.storageDemandComplete));
  check('unknown-excel-no-zero-data',await page.evaluate(()=>{
    const s=buildExcelSheets(latestDesignData),rows=s.find(s=>s.name==='租户资源').rows;
    return rows.some(row=>row[15]==='未评估'&&row[19]==='数据需求未评估')&&s.find(s=>s.name==='组件实例').rows.some(row=>row[5]==='DN'&&row[10]==='未评估');
  }));
  const field=key=>page.locator(`.tenant-input[data-mode=reverse][data-index="0"][data-key="${key}"]`);
  await field('storageDemandMode').selectOption('explicit');
  check('empty-explicit-blocks',await page.evaluate(()=>latestDesignData===null));
  await field('plannedDataTb').fill('6');
  check('explicit-ui-total',await page.evaluate(()=>latestDesignData.futureDataTb===6&&!latestDesignData.storageDemandComplete));
  await field('dnGroupDataInput').fill('[3,1,1,1]');
  check('group-ui-total',await page.evaluate(()=>latestDesignData.tenantPlans[0].dnGroupDataTb.join(',')==='3,1,1,1'));
  check('replica-total-and-pool-demand',await page.evaluate(()=>{
    const d=latestDesignData;return d.storedDataTb===6*d.tenantPlans[0].replicasPerShard&&d.componentSizing.poolSizings.reduce((s,p)=>s+p.componentDemands.dn.diskTb,0)===d.storedDataTb;
  }));
  check('actual-placed-data',await page.evaluate(()=>{
    const d=latestDesignData;return d.serverPlan.filter(h=>h.roles.length).every(h=>h.resourceAudit)&&Math.abs(d.serverPlan.reduce((s,h)=>s+(h.resourceAudit?.used.disk||0),0)-d.storedDataTb)<1e-9;
  }));
  await page.locator('#reverseServerCount').fill('3');
  check('insufficient-inventory-preserves-missing-roles',await page.evaluate(()=>latestDesignData.resourceState==='不足'&&!getPlanRoleIdentityAudit(latestDesignData).complete&&latestDesignData.serverPlan.reduce((s,h)=>s+(h.resourceAudit?.used.disk||0),0)<latestDesignData.storedDataTb));
  await page.locator('#reverseServerCount').fill('60');
  await field('storageDemandMode').selectOption('unknown');
  check('unknown-numeric-placement-compatible',(await signature())===baseline);
  await field('storageDemandMode').selectOption('explicit');
  check('drafts-restored',await field('plannedDataTb').inputValue()==='6'&&await field('dnGroupDataInput').inputValue()==='[3,1,1,1]');
  await field('dnGroupDataInput').fill('[7,0,0,0]');
  check('bad-sum-blocks-export',await page.evaluate(()=>latestDesignData===null&&$('downloadExcelBtn').disabled));
  await field('dnGroupDataInput').fill('[3,1,1,1]');
  await field('plannedDataTb').fill('60');
  await field('dnGroupDataInput').fill('[40,10,5,5]');
  check('large-group-not-fit',await page.evaluate(()=>getInstanceFitIssues(latestDesignData).some(x=>x.component==='dn')));
  check('candidate-no-false-feasibility',await page.evaluate(()=>getLayoutFeasibilityAudits(latestDesignData).every(a=>a.feasibleServers===null)));
  await field('plannedDataTb').fill('6');await field('dnGroupDataInput').fill('[3,1,1,1]');
  await page.evaluate(()=>{Object.assign(reverseTenantSpecs[1],{storageDemandMode:'explicit',plannedDataTb:0});render();});
  check('all-known-including-zero',await page.evaluate(()=>latestDesignData.storageDemandComplete&&getStorageCapacityAudits(latestDesignData)[0].status==='已录入需求 / 净容量未评估'));
  await page.locator('#addReverseTenantBtn').click();
  check('partial-unknown-total',await page.evaluate(()=>latestDesignData.futureDataTb===6&&!latestDesignData.storageDemandComplete&&getStorageCapacityAudits(latestDesignData)[0].text.includes('尚未提供全部业务数据量')));
  check('unknown-diagram-spec-not-zero',await page.evaluate(()=>{
    const d=latestDesignData,t=d.tenantPlans[2];return getRoleSpecLabel(`${getTenantKey(t)}-DN-G1-Master`,d).includes('数据未评估');
  }));
  check('partial-candidate-scope-disclosed',await page.evaluate(()=>getLayoutFeasibilityAudits(latestDesignData).filter(a=>a.status==='落位检查通过').every(a=>a.reason.includes('只检查已录入部分'))));
  check('unknown-host-not-green',await page.evaluate(()=>latestDesignData.serverPlan.filter(s=>s.resourceAudit?.diskDemandUnknown).every(s=>getServerAuditStatus(s).status!=='通过')));
  check('formula-reports-data',await page.locator('#formulaOutput').textContent().then(s=>s.includes('副本落盘')&&s.includes('单份合计 6TB')));
  fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,file]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(path.join(out,file));check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
  }
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});
    await field('plannedDataTb').scrollIntoViewIfNeeded();
    check('input-fit-'+width,await page.locator('#reverseTenantEditor').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`demand-input-${width}.png`)});
    await page.locator('.storage-capacity-summary').scrollIntoViewIfNeeded();
    check('summary-fit-'+width,await page.locator('.storage-capacity-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`demand-summary-${width}.png`)});
  }
  await page.evaluate(()=>resetForm());await page.selectOption('#designModule','reverse');
  check('reset-default-tenants-and-unknown',await page.evaluate(()=>reverseTenantSpecs.length===defaultReverseTenants.length&&!reverseTenantSpecs[0].storageDemandMode&&!latestDesignData.storageDemandComplete));
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceHash:createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex'),results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
