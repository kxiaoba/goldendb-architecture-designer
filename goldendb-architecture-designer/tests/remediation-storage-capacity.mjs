import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v3a-20261019/storage');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});
const results=[],errors=[],check=(name,pass)=>results.push({name,pass});
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(()=>{
    const r=[],c=(name,pass)=>r.push({name,pass}),near=(a,b)=>Math.abs(a-b)<1e-10;
    const spec={cores:64,memoryGb:256,diskTb:16,dataDiskTb:2,dataDiskCount:8,maxInstances:100,
      storage:{mode:'net',raid:'raid5',spareDisks:1,fsReserveRatio:.1,logTb:1,indexTb:.5,tempTb:.3,watermark:.8}};
    const d=getDiskCapacity(spec,.35),u=getUsableServerResources(spec,.35);
    c('independent-capacity-7.2',near(d.arrayTb,12)&&near(d.fsTb,10.8)&&near(d.reservedTb,1.8)&&near(d.dataTb,9)&&near(u.disk,7.2));
    c('cpu-memory-reserve-unchanged',near(u.cpu,41.6)&&near(u.memory,166.4));
    c('net-no-double-reserve',near(getUsableServerResources(spec,.5).disk,7.2)&&getUsableServerResources(spec,.5).cpu===32);
    const legacy=getUsableServerResources({...spec,storage:{mode:'legacy'}},.35);
    c('legacy-capacity-10.4',near(legacy.disk,10.4));
    c('legacy-missing-profile-compatible',near(getUsableServerResources({...spec,storage:undefined},.35).disk,10.4));
    const capacity=calculateComponentRequirement({instances:10,cpuCores:10,memoryGb:10,diskTb:72},spec,.35);
    c('quantity-uses-net-budget',capacity.byDisk===10&&near(capacity.usableDiskTb,7.2));
    const host={roles:[],spec};
    const a=getServerResourceAudit(host,{tenantPlans:[],reserveRatio:.35},{cpu:1,memory:1,disk:7.2});
    c('actual-watermark-and-net-percent',a.withinWatermark&&a.diskPercent===80&&near(a.usable.disk,7.2));
    c('actual-over-limit-rejected',!getServerResourceAudit(host,{tenantPlans:[],reserveRatio:.35},{cpu:1,memory:1,disk:7.201}).withinWatermark);
    for(const [raid,expected]of [['raid0',16],['raid5',14],['raid10',8]]) {
      const s={...spec,storage:{...spec.storage,raid,spareDisks:0,fsReserveRatio:0,logTb:0,indexTb:0,tempTb:0,watermark:1}};
      c('raid-'+raid,getDiskCapacity(s,.35).usableTb===expected);
    }
    const bad=[['unknown',{raid:'unknown'}],['raid0-spare',{raid:'raid0',spareDisks:1}],['all-spares',{spareDisks:8}],
      ['negative-spare',{spareDisks:-1}],['fractional-spare',{spareDisks:.5}],['raid5-too-few',{spareDisks:6}],
      ['raid10-odd',{raid:'raid10',spareDisks:1}],['raid10-too-few',{raid:'raid10',spareDisks:6}],
      ['negative-log',{logTb:-1}],['empty-log',{logTb:''}],['bad-fs',{fsReserveRatio:.81}],['bad-water',{watermark:0}],
      ['over-water',{watermark:1.01}],['exhausted',{logTb:12}],['infinite',{tempTb:Infinity}]];
    for(const [name,p]of bad) {
      let rejected=false;try{getDiskCapacity({...spec,storage:{...spec.storage,...p}},.35);}catch(e){rejected=e instanceof PlanningInputError;}
      c('reject-'+name,rejected);
    }
    for(const [field,value]of [['dataDiskTb',0],['dataDiskCount',7.5],['diskTb',15],['diskTb',NaN]]) {
      let rejected=false;try{getDiskCapacity({...spec,[field]:value},.35);}catch(e){rejected=e instanceof PlanningInputError;}
      c('reject-spec-'+field,rejected);
    }
    const other={...spec,source:'recommended'},same=structuredClone(other);
    c('same-storage-compatible',areComponentSpecsCompatible({a:other,b:same},['a','b']));
    same.storage.logTb=2;
    c('different-storage-not-compatible',!areComponentSpecsCompatible({a:other,b:same},['a','b']));
    c('legacy-net-not-compatible',!areComponentSpecsCompatible({a:other,b:{...other,storage:{mode:'legacy'}}},['a','b']));
    c('default-legacy-model',Object.values(latestDesignData.componentSpecs).every(s=>s.storage.mode==='legacy'));
    return r;
  }));
  check('legacy-fields-disabled',await page.locator('#businessStorageDnLogTb').isDisabled());
  await page.evaluate(()=>{
    $('businessServerConfigMode').value='customer';$('customerDnEnabled').checked=true;
    $('customerDnDataDiskTb').value='2';$('customerDnDataDiskCount').value='8';render();
    window.storageBaseline=JSON.stringify(latestDesignData.serverSizing.serverPlan);
  });
  await page.locator('[data-business-storage=dn] summary').click();
  await page.locator('#businessStorageDnMode').selectOption('net');
  check('unknown-raid-blocks-and-retains-draft',await page.evaluate(()=>!latestDesignData&&$('businessStorageDnMode').value==='net'&&$('customerDnDataDiskCount').value==='8'));
  await page.locator('#businessStorageDnRaid').selectOption('raid5');
  for(const [field,value]of [['SpareDisks','1'],['FsReserveRatio','.1'],['LogTb','1'],['IndexTb','.5'],['TempTb','.3']]) await page.locator('#businessStorageDn'+field).fill(value);
  check('ui-budget-linked-to-actual-hosts',await page.evaluate(()=>{
    const d=latestDesignData;return !!d&&d.serverSizing.serverPlan.filter(h=>h.componentKeys.includes('dn')).every(h=>Math.abs(h.resourceAudit.usable.disk-7.2)<1e-9);
  }));
  check('mixed-candidate-sees-incompatible-budgets',await page.evaluate(()=>getLayoutFeasibilityAudits(latestDesignData).find(x=>x.layout==='cnDnMixed').status==='机型不兼容'));
  check('formula-and-export-budget',await page.evaluate(()=>$('formulaOutput').textContent.includes('7.20TB')&&JSON.stringify(buildExcelSheets(latestDesignData)).includes('净磁盘口径')));
  check('actual-percent-denominator',await page.evaluate(()=>getPlanServers(latestDesignData).filter(h=>h.componentKeys.includes('dn')).every(h=>h.resourceAudit.diskPercent===Math.round(h.resourceAudit.used.disk/9*100))));
  await page.locator('#businessStorageDnMode').selectOption('legacy');
  check('legacy-restores-same-placement',await page.evaluate(()=>storageBaseline===JSON.stringify(latestDesignData.serverSizing.serverPlan)));
  await page.locator('#businessStorageDnMode').selectOption('net');
  check('net-mode-restores-profile',await page.evaluate(()=>$('businessStorageDnLogTb').value==='1'&&getDiskCapacity(latestDesignData.componentSpecs.dn,.35).usableTb>7.19));
  await page.locator('#businessStorageDnWatermark').fill('.9');
  check('production-over-80-policy',await page.evaluate(()=>getResourceReductionRedlines(latestDesignData).some(s=>s.includes('80%'))));
  await page.locator('#businessStorageDnWatermark').fill('.8');
  await page.locator('#businessStorageDnSpareDisks').fill('0');
  await page.locator('#businessStorageDnRaid').selectOption('raid0');
  check('raid0-production-risk',await page.evaluate(()=>getResourceReductionRedlines(latestDesignData).some(s=>s.includes('无磁盘冗余'))));
  await page.evaluate(()=>{$('environmentType').value='poc';render();});
  check('raid0-poc-advisory',await page.evaluate(()=>!getStorageCapacityAudits(latestDesignData).find(x=>x.component==='DN 数据节点').error));
  await page.evaluate(()=>{
    $('environmentType').value='production';$('businessStorageDnRaid').value='raid5';$('businessStorageDnSpareDisks').value='1';
    $('businessHostModelSource').value='dn';$('businessStorageCnMode').value='net';$('businessStorageCnRaid').value='unknown';render();
  });
  check('uniform-host-inherits-storage-only-from-source',await page.evaluate(()=>!!latestDesignData&&Object.values(latestDesignData.componentSpecs).every(s=>s.storage.raid==='raid5'&&s.storage.logTb===1)));
  check('unused-profile-disabled',await page.locator('#businessStorageCnMode').isDisabled());
  await page.evaluate(()=>{$('businessHostModelSource').value='component';render();});
  check('restored-invalid-draft-blocks',await page.evaluate(()=>!latestDesignData&&$('businessStorageCnRaid').value==='unknown'));
  await page.evaluate(()=>{$('designModule').value='reverse';render();});
  check('reverse-not-blocked-by-business-draft',await page.evaluate(()=>!!latestDesignData&&latestDesignData.reverse));
  check('reverse-demand-explicitly-unassessed',await page.evaluate(()=>getStorageCapacityAudits(latestDesignData)[0].text.includes('反推尚未提供业务数据量')));
  await page.evaluate(()=>{resetForm();});
  check('reset-restores-legacy-defaults',await page.evaluate(()=>componentServerDefinitions.every(({key})=>$(storageInputId(key,'Mode')).value==='legacy'&&$(storageInputId(key,'Raid')).value==='unknown'&&$(storageInputId(key,'LogTb')).value==='0')));
  await page.evaluate(()=>{
    $('businessServerConfigMode').value='customer';$('customerDnEnabled').checked=true;
    $('customerDnDataDiskTb').value='2';$('customerDnDataDiskCount').value='8';
    for(const [field,v]of Object.entries({Mode:'net',Raid:'raid5',SpareDisks:1,FsReserveRatio:.1,LogTb:1,IndexTb:.5,TempTb:.3,Watermark:.8})) $(storageInputId('dn',field)).value=v;
    render();
  });
  fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,file]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(path.join(out,file));
    check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
  }
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});
    await page.locator('[data-business-storage=dn]').evaluate(e=>e.open=true);
    await page.locator('[data-business-storage=dn]').scrollIntoViewIfNeeded();
    check('fields-fit-'+width,await page.locator('#businessStorageEditor').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`storage-input-${width}.png`)});
    await page.locator('.storage-capacity-summary').scrollIntoViewIfNeeded();
    check('summary-fit-'+width,await page.locator('.storage-capacity-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`storage-summary-${width}.png`)});
  }
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceHash:createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex'),results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass))process.exitCode=1;
