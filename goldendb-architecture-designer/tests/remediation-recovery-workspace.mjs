import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v3b3b1-20261025/workspace');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});
const results=[],errors=[],check=(name,pass)=>results.push({name,pass});
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(()=>{
    const r=[],c=(name,pass)=>r.push({name,pass}),near=(a,b)=>Math.abs(a-b)<1e-9;
    const p={mode:'net',raid:'raid5',spareDisks:1,fsReserveRatio:.1,logTb:1,indexTb:.5,tempTb:.3,watermark:.8};
    const spec={cores:64,memoryGb:256,diskTb:16,dataDiskCount:8,dataDiskTb:2,maxInstances:100,storage:p};
    const extra={...spec,storage:{...p,recoveryMode:'extra',recoveryTb:1,recoverySource:'客户工作区预算假设'}};
    const d=getDiskCapacity(extra,.35),u=getUsableServerResources(extra,.35);
    c('independent-extra-6.4',near(d.arrayTb,12)&&near(d.fsTb,10.8)&&near(d.reservedTb,2.8)&&near(d.dataTb,8)&&near(d.usableTb,6.4));
    c('cpu-memory-unchanged',u.cpu===41.6&&u.memory===166.4);
    c('no-second-unified-reserve',near(getUsableServerResources(extra,.5).disk,6.4));
    const included={...spec,storage:{...p,recoveryMode:'included',recoveryTb:.2,recoverySource:'已含临时工作区'}};
    c('included-does-not-double-deduct',near(getDiskCapacity(included,.35).usableTb,7.2)&&getDiskCapacity(included,.35).recoveryExtraTb===0);
    c('exact-temp-boundary',near(getDiskCapacity({...included,storage:{...included.storage,recoveryTb:.3}},.35).usableTb,7.2));
    c('none-no-deduction',near(getDiskCapacity({...spec,storage:{...p,recoveryMode:'none',recoverySource:'声明无需额外空间',recoveryTb:-5}},.35).usableTb,7.2));
    c('unknown-inactive-drafts-ignored',near(getDiskCapacity({...spec,storage:{...p,recoveryMode:'unknown',recoveryTb:-5,recoverySource:'\u0001'}},.35).usableTb,7.2));
    c('old-net-default-compatible',near(getDiskCapacity(spec,.35).usableTb,7.2));
    c('legacy-ignores-new-profile-drafts',near(getDiskCapacity({...extra,storage:{mode:'legacy',recoveryMode:'bad'}},.35).usableTb,10.4));
    for(const [name,patch]of [['zero',{recoveryTb:0}],['negative',{recoveryTb:-1}],['blank',{recoveryTb:''}],['nan',{recoveryTb:NaN}],['infinity',{recoveryTb:Infinity}],['no-source',{recoverySource:''}],['space-source',{recoverySource:' '}],['xml-control',{recoverySource:'\u0001'}],['bad-mode',{recoveryMode:'bad'}],['included-over-temp',{recoveryMode:'included',recoveryTb:.31}],['exhausted',{recoveryTb:10}],['none-no-source',{recoveryMode:'none',recoverySource:''}]]) {
      let failed=false;try{getDiskCapacity({...extra,storage:{...extra.storage,...patch}},.35);}catch(e){failed=e instanceof PlanningInputError;}c('reject-'+name,failed);
    }
    c('net-requirement-budget',near(calculateComponentRequirement({instances:10,cpuCores:10,memoryGb:10,diskTb:64},extra,.35).usableDiskTb,6.4));
    const audit=getServerResourceAudit({spec:extra,roles:[]},{tenantPlans:[],reserveRatio:.35},{cpu:1,memory:1,disk:6.4});
    c('net-watermark-and-percent',audit.withinWatermark&&audit.diskPercent===80&&near(audit.usable.disk,6.4));
    c('over-workspace-watermark-fails',!getServerResourceAudit({spec:extra,roles:[]},{tenantPlans:[],reserveRatio:.35},{cpu:1,memory:1,disk:6.401}).withinWatermark);
    c('different-workspace-profiles-not-compatible',!areComponentSpecsCompatible({cn:spec,dn:extra},['cn','dn']));
    return r;
  }));
  await page.evaluate(()=>{
    $('businessServerConfigMode').value='customer';$('customerDnEnabled').checked=true;
    $('customerDnDataDiskTb').value=2;$('customerDnDataDiskCount').value=8;
    for(const [f,v]of Object.entries({Mode:'net',Raid:'raid5',SpareDisks:1,FsReserveRatio:.1,LogTb:1,IndexTb:.5,TempTb:.3,Watermark:.8})) $(storageInputId('dn',f)).value=v;
    render();
  });
  await page.locator('[data-business-storage=dn]').evaluate(e=>e.open=true);
  check('unknown-fields-hidden',!await page.locator('#businessStorageDnRecoveryTb').isVisible()&&!await page.locator('#businessStorageDnRecoverySource').isVisible());
  check('unknown-explicit-not-recovery-pass',await page.evaluate(()=>getRecoveryWorkspaceAudits(latestDesignData).find(a=>a.component==='DN 数据节点').status==='恢复工作区未评估'));
  await page.selectOption('#businessStorageDnRecoveryMode','extra');
  check('missing-budget-blocks-export',await page.evaluate(()=>!latestDesignData&&$('downloadExcelBtn').disabled));
  await page.locator('#businessStorageDnRecoveryTb').fill('1');await page.locator('#businessStorageDnRecoverySource').fill('客户 <b>恢复&预算</b>');
  check('business-net-6.4',await page.evaluate(()=>latestDesignData.serverSizing.serverPlan.filter(s=>s.componentKeys.includes('dn')&&s.spec).every(s=>Math.abs(s.resourceAudit.usable.disk-6.4)<1e-9)));
  check('source-escaped-in-page',await page.locator('.storage-capacity-summary').evaluate(e=>e.textContent.includes('<b>恢复&预算</b>')&&!e.querySelector('b')));
  check('declaration-not-verified',await page.evaluate(()=>getRecoveryWorkspaceAudits(latestDesignData).find(a=>a.component==='DN 数据节点').text.includes('未核验')&&getRecoveryWorkspaceAudits(latestDesignData).find(a=>a.component==='DN 数据节点').text.includes('不等于恢复可行')));
  await page.selectOption('#businessStorageDnRecoveryMode','included');
  check('over-temp-blocks',await page.evaluate(()=>!latestDesignData&&$('businessStorageDnRecoveryTb').value==='1'));
  await page.locator('#businessStorageDnRecoveryTb').fill('0.2');
  check('business-included-7.2',await page.evaluate(()=>Math.abs(getDiskCapacity(latestDesignData.componentSpecs.dn,.35).usableTb-7.2)<1e-9));
  await page.selectOption('#businessStorageDnRecoveryMode','unknown');
  check('unknown-retains-drafts',await page.evaluate(()=>!!latestDesignData&&$('businessStorageDnRecoveryTb').value==='0.2'&&$('businessStorageDnRecoverySource').value==='客户 <b>恢复&预算</b>'));
  await page.evaluate(()=>{$('businessStorageDnRecoveryMode').value='extra';$('businessStorageDnRecoveryTb').value=1;$('businessHostModelSource').value='dn';render();});
  check('uniform-host-inherits-workspace',await page.evaluate(()=>Object.values(latestDesignData.componentSpecs).every(s=>s.storage.recoveryMode==='extra'&&s.storage.recoveryTb===1)));
  await page.evaluate(()=>{$('businessStorageCnRecoveryMode').value='extra';$('businessStorageCnRecoveryTb').value=-1;render();});
  check('inactive-uniform-draft-ignored',await page.evaluate(()=>!!latestDesignData&&$('businessStorageCnRecoveryMode').disabled));
  await page.selectOption('#designModule','reverse');
  await page.locator('#reverseStorageEditor').evaluate(e=>e.open=true);
  await page.evaluate(()=>{
    $('reverseDiskTb').value=16;$('reverseServerCount').value=60;
    for(const [f,v]of Object.entries({Mode:'net',Raid:'raid5',DiskCount:8,DiskTb:2,SpareDisks:1,FsReserveRatio:.1,LogTb:1,IndexTb:.5,TempTb:.3,Watermark:.8,RecoveryMode:'extra',RecoveryTb:1,RecoverySource:'每主机工作区假设，待实测'})) $('reverseStorage'+f).value=v;
    Object.assign(reverseTenantSpecs[0],{storageDemandMode:'explicit',plannedDataTb:6,dnGroupDataInput:'[3,1,1,1]'});
    Object.assign(reverseTenantSpecs[1],{storageDemandMode:'explicit',plannedDataTb:0});render();
  });
  check('reverse-actual-net-budget',await page.evaluate(()=>latestDesignData.serverPlan.filter(s=>s.roles.length).every(s=>Math.abs(s.resourceAudit.usable.disk-6.4)<1e-9)));
  check('replica-data-not-expanded-by-workspace',await page.evaluate(()=>latestDesignData.storedDataTb===24&&latestDesignData.serverPlan.reduce((n,s)=>n+(s.resourceAudit?.used.disk||0),0)===24));
  check('candidate-workspace-preserved',await page.evaluate(()=>buildLayoutCandidate(latestDesignData,'cnDnMixed').serverPlan.filter(s=>s.roles.length).every(s=>s.spec.storage.recoveryTb===1&&Math.abs(s.resourceAudit.usable.disk-6.4)<1e-9)));
  await page.evaluate(()=>{Object.assign(reverseTenantSpecs[0],{plannedDataTb:8,dnGroupDataInput:'[6.5,0.5,0.5,0.5]'});render();});
  check('workspace-causes-real-single-group-shortfall',await page.evaluate(()=>getInstanceFitIssues(latestDesignData).some(a=>a.component==='dn'&&a.demand.disk===6.5)));
  check('workspace-shortfall-not-false-feasible',await page.evaluate(()=>getLayoutFeasibilityAudits(latestDesignData).every(a=>a.feasibleServers===null)));
  check('workspace-invalid-group-cannot-count-as-covered',await page.evaluate(()=>getDnFailureCoverage(latestDesignData).some(a=>a.scenario==='normal'&&a.missing.includes(1))));
  await page.evaluate(()=>{Object.assign(reverseTenantSpecs[0],{plannedDataTb:6,dnGroupDataInput:'[3,1,1,1]'});render();});
  check('formula-explicit-single-deduction',await page.locator('#formulaOutput').textContent().then(t=>t.includes('额外恢复工作区 1TB')&&t.includes('数据空间 8TB')&&t.includes('6.40TB')&&t.includes('不等于恢复可行')));
  await page.selectOption('#reverseStorageRecoveryMode','none');
  check('none-hides-budget-keeps-source',!await page.locator('#reverseStorageRecoveryTb').isVisible()&&await page.locator('#reverseStorageRecoverySource').isVisible());
  check('none-explicit-no-extra',await page.evaluate(()=>getRecoveryWorkspaceAudits(latestDesignData)[0].text.includes('新增扣减0TB')));
  await page.selectOption('#reverseStorageMode','legacy');
  check('legacy-workspace-unassessed',await page.evaluate(()=>getRecoveryWorkspaceAudits(latestDesignData)[0].status==='恢复工作区未评估'&&Math.abs(getDiskCapacity(latestDesignData.componentSpecs.dn,.35).usableTb-10.4)<1e-9));
  await page.selectOption('#reverseStorageMode','net');await page.selectOption('#reverseStorageRecoveryMode','extra');
  check('reverse-workspace-drafts-restored',await page.locator('#reverseStorageRecoveryTb').inputValue()==='1');
  check('excel-declaration-scope',await page.evaluate(()=>buildExcelSheets(latestDesignData).find(s=>s.name==='方案摘要').rows.some(r=>String(r[0]).includes('恢复工作区预算')&&String(r[2]).includes('不等于恢复可行'))));
  fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,file]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(path.join(out,file));check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
  }
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});await page.locator('#reverseStorageRecoveryMode').scrollIntoViewIfNeeded();
    check('input-fit-'+width,await page.locator('#reverseStorageEditor').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`workspace-input-${width}.png`)});
    await page.locator('.storage-capacity-summary').scrollIntoViewIfNeeded();
    check('summary-fit-'+width,await page.locator('.storage-capacity-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`workspace-summary-${width}.png`)});
  }
  await page.evaluate(()=>resetForm());
  check('reset-new-fields',await page.evaluate(()=>componentServerDefinitions.every(({key})=>$(storageInputId(key,'RecoveryMode')).value==='unknown'&&$(storageInputId(key,'RecoveryTb')).value==='0'&&$(storageInputId(key,'RecoverySource')).value==='')&&$('reverseStorageRecoveryMode').value==='unknown'&&$('reverseStorageRecoveryTb').value==='0'&&$('reverseStorageRecoverySource').value===''));
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceHash:createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex'),results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
