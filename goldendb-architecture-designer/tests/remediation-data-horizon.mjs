import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v3b3a-20261025/horizon');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});
const results=[],errors=[],check=(name,pass)=>results.push({name,pass});
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(()=>{
    const r=[],c=(name,pass)=>r.push({name,pass});
    const base={...defaultReverseTenants[0],storageDemandMode:'explicit',dataTimeBasis:'current',currentDataTb:3,dataGrowthFactor:2,dataYears:1,shardCount:2,currentDnGroupDataInput:'[1,2]'};
    const build=s=>buildReverseTenantPlans({specs:[s],environment:'production',minReplica:4,azCount:3})[0];
    const t=build(base),audit=getDataHorizonAudits({reverse:true,tenantPlans:[t]})[0];
    c('3-times-2-power1-equals6',t.dataTb===3&&t.futureDataTb===6&&t.storageDataBasis==='current');
    c('groups-grown-once',JSON.stringify(t.dnGroupDataTb)==='[2,4]');
    c('replica-data24',t.futureDataTb*t.replicasPerShard===24&&getRoleResourceDemand(`${getTenantKey(t)}-DN-G2-Slave1`,[t]).disk===4);
    c('three-year24-gap18',audit.targetTb===24&&audit.gapTb===18&&audit.status==='年限短于参考目标');
    const y3=build({...base,dataYears:3});
    c('three-year-current24',y3.futureDataTb===24&&JSON.stringify(y3.dnGroupDataTb)==='[8,16]');
    c('three-year-reference-covered',getDataHorizonAudits({reverse:true,tenantPlans:[y3]})[0].gapTb===0);
    const zero=build({...base,currentDataTb:0,currentDnGroupDataInput:'[0,0]'});
    c('zero-current-array-finite',zero.futureDataTb===0&&zero.dnGroupDataTb.every(v=>v===0));
    c('zero-year-no-growth',build({...base,dataYears:0}).futureDataTb===3);
    c('growth-one-no-extra-data',build({...base,dataGrowthFactor:1,dataYears:3}).futureDataTb===3);
    const planned=build({...base,dataTimeBasis:'planned',plannedDataTb:6,plannedDataYears:3,dnGroupDataInput:'[2,4]',currentDataTb:-1,dataGrowthFactor:NaN});
    c('planned-not-double-grown',planned.futureDataTb===6&&planned.dataTb===6&&JSON.stringify(planned.dnGroupDataTb)==='[2,4]');
    c('planned-covers-years-not-capacity-claim',getDataHorizonAudits({reverse:true,tenantPlans:[planned]})[0].status==='年限声明达到参考目标');
    c('planned-missing-current-not-extrapolated',getDataHorizonAudits({reverse:true,tenantPlans:[planned]})[0].targetTb===undefined);
    const old=build({...base,dataTimeBasis:undefined,plannedDataTb:6,dnGroupDataInput:'[2,4]',plannedDataYears:undefined});
    c('old-planned-default-unchanged',old.futureDataTb===6&&old.dataHorizonYears===null);
    c('old-unset-years-unassessed',getDataHorizonAudits({reverse:true,tenantPlans:[old]})[0].status==='年限未评估');
    const unknown=build({...base,storageDemandMode:'unknown',dataTimeBasis:'bad',dataYears:-1});
    c('unknown-ignores-inactive-time-drafts',!unknown.storageDemandKnown&&unknown.futureDataTb===0&&getDataHorizonAudits({reverse:true,tenantPlans:[unknown]})[0].status==='未评估');
    for(const [name,patch]of [['bad-basis',{dataTimeBasis:'bad'}],['blank-current',{currentDataTb:''}],['negative-current',{currentDataTb:-1}],['blank-growth',{dataGrowthFactor:''}],['growth-below-one',{dataGrowthFactor:.5}],['blank-year',{dataYears:''}],['negative-year',{dataYears:-1}],['fraction-year',{dataYears:.5}],['over-100-years',{dataYears:101}],['nan',{dataYears:NaN}],['infinity',{dataGrowthFactor:Infinity}],['growth-overflow',{dataGrowthFactor:100,dataYears:100}],['group-sum',{currentDnGroupDataInput:'[2,2]'}],['zero-current-nonzero-groups',{currentDataTb:0,currentDnGroupDataInput:'[0.0000000001,0]'}],['zero-planned-nonzero-groups',{dataTimeBasis:'planned',plannedDataTb:0,dnGroupDataInput:'[0.0000000001,0]'}],['bad-planned-year',{dataTimeBasis:'planned',plannedDataTb:6,plannedDataYears:-1}]]) {
      let failed=false;try{build({...base,...patch});}catch(e){failed=e instanceof PlanningInputError;}c('reject-'+name,failed);
    }
    const large=build({...base,currentDataTb:1,currentDnGroupDataInput:'',dataGrowthFactor:1e10,dataYears:1});
    c('unavailable-three-year-does-not-invalidate-main',large.futureDataTb===1e10&&getDataHorizonAudits({reverse:true,tenantPlans:[large]})[0].status==='三年外推未评估');
    c('default-business-years-not-forced',latestDesignData.years===1&&$('years').value==='1');
    const snapshot=JSON.stringify(latestDesignData);getDataHorizonAudits(latestDesignData);
    c('audit-does-not-mutate-plan',JSON.stringify(latestDesignData)===snapshot);
    return r;
  }));
  await page.locator('#growthFactor').fill('2');await page.locator('#years').fill('1');
  check('business-current-plan6-reference24',await page.evaluate(()=>latestDesignData.futureDataTb===6&&getDataHorizonAudits(latestDesignData)[0].targetTb===24&&getDataHorizonAudits(latestDesignData)[0].gapTb===18));
  await page.locator('#years').fill('3');
  check('business-three-year24-no-double-growth',await page.evaluate(()=>latestDesignData.futureDataTb===24&&getDataHorizonAudits(latestDesignData)[0].gapTb===0));
  await page.selectOption('#designModule','reverse');
  const field=k=>page.locator(`.tenant-input[data-mode=reverse][data-index="0"][data-key="${k}"]`);
  await field('storageDemandMode').selectOption('explicit');await field('plannedDataTb').fill('6');await field('dnGroupDataInput').fill('[3,1,1,1]');
  check('planned-default-time-unassessed',await page.evaluate(()=>latestDesignData.futureDataTb===6&&getDataHorizonAudits(latestDesignData)[0].status==='年限未评估'));
  await field('plannedDataYears').fill('3');
  check('planned-horizon-does-not-resize',await page.evaluate(()=>latestDesignData.futureDataTb===6&&latestDesignData.tenantPlans[0].dataHorizonYears===3));
  await field('dataTimeBasis').selectOption('current');
  await field('currentDataTb').fill('3');await field('dataGrowthFactor').fill('2');await field('dataYears').fill('1');
  await field('currentDnGroupDataInput').fill('[1,1,0.5,0.5]');
  await page.locator('#reverseServerCount').fill('60');
  check('current-ui6-and-grown-groups',await page.evaluate(()=>latestDesignData.futureDataTb===6&&JSON.stringify(latestDesignData.tenantPlans[0].dnGroupDataTb)==='[2,2,1,1]'));
  check('pool-demand-grown24',await page.evaluate(()=>latestDesignData.storedDataTb===24&&latestDesignData.componentSizing.poolSizings.reduce((n,p)=>n+p.componentDemands.dn.diskTb,0)===24));
  check('actual-data24',await page.evaluate(()=>latestDesignData.serverPlan.reduce((n,s)=>n+(s.resourceAudit?.used.disk||0),0)===24));
  check('candidate-preserves-grown-data',await page.evaluate(()=>{
    const c=buildLayoutCandidate(latestDesignData,'cnDnMixed');return c.tenantPlans[0].futureDataTb===6&&c.serverPlan.reduce((n,s)=>n+(s.resourceAudit?.used.disk||0),0)===24;
  }));
  await field('dataTimeBasis').selectOption('planned');
  check('planned-drafts-restored',await field('plannedDataTb').inputValue()==='6'&&await field('plannedDataYears').inputValue()==='3'&&await field('dnGroupDataInput').inputValue()==='[3,1,1,1]');
  await field('dataTimeBasis').selectOption('current');
  check('current-drafts-restored',await field('currentDataTb').inputValue()==='3'&&await field('currentDnGroupDataInput').inputValue()==='[1,1,0.5,0.5]');
  await field('dataYears').fill('101');
  check('invalid-year-disables-export',await page.evaluate(()=>!latestDesignData&&$('downloadExcelBtn').disabled));
  await field('dataYears').fill('1');
  check('formula-shows-basis-and-reference',await page.locator('#formulaOutput').textContent().then(s=>s.includes('当前量+增长')&&s.includes('三年参考单份 24TB')&&s.includes('还差 18TB')));
  check('excel-horizon-status',await page.evaluate(()=>buildExcelSheets(latestDesignData).find(s=>s.name==='方案摘要').rows.some(r=>String(r[0]).includes('三年参考')&&r[1]==='年限短于参考目标')));
  fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,file]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(path.join(out,file));check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
  }
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});await field('dataTimeBasis').scrollIntoViewIfNeeded();
    check('input-fit-'+width,await page.locator('#reverseTenantEditor').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`horizon-input-${width}.png`)});
    await page.locator('.storage-capacity-summary').scrollIntoViewIfNeeded();
    check('summary-fit-'+width,await page.locator('.storage-capacity-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`horizon-summary-${width}.png`)});
  }
  await page.evaluate(()=>resetForm());await page.selectOption('#designModule','reverse');
  check('reset-clears-new-tenant-fields',await page.evaluate(()=>reverseTenantSpecs.every(t=>t.dataTimeBasis===undefined&&t.currentDataTb===undefined&&t.plannedDataYears===undefined)));
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceHash:createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex'),results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
