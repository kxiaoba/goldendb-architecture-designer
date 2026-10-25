import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v3b2-20261025/net');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});
const results=[],errors=[],check=(name,pass)=>results.push({name,pass});
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  await page.selectOption('#designModule','reverse');
  await page.locator('#reverseStorageEditor').evaluate(e=>e.open=true);
  const legacy=await page.evaluate(()=>JSON.stringify({n:latestDesignData.requiredServerCount,dn:latestDesignData.dnInstances,roles:latestDesignData.serverPlan.map(s=>[s.az,s.roles])}));
  check('legacy-default',await page.evaluate(()=>$('reverseStorageMode').value==='legacy'&&getDiskCapacity(latestDesignData.componentSpecs.dn,.35).usableTb===5.2));
  check('legacy-net-fields-disabled',await page.locator('#reverseStorageDiskCount').isDisabled());
  await page.selectOption('#reverseStorageMode','net');
  check('unknown-raid-blocks-export',await page.evaluate(()=>latestDesignData===null&&$('downloadExcelBtn').disabled));
  await page.evaluate(()=>{
    $('reverseDiskTb').value=16;
    for(const [f,v]of Object.entries({DiskCount:8,DiskTb:2,Raid:'raid5',SpareDisks:1,FsReserveRatio:.1,LogTb:1,IndexTb:.5,TempTb:.3,Watermark:.8})) $('reverseStorage'+f).value=v;
    render();
  });
  check('independent-7.2TB',await page.evaluate(()=>{
    const d=latestDesignData,c=getDiskCapacity(d.componentSpecs.dn,d.reserveRatio);
    return c.rawTb===16&&c.arrayTb===12&&c.fsTb===10.8&&c.dataTb===9&&c.usableTb===7.2;
  }));
  check('all-component-specs-use-same-profile',await page.evaluate(()=>Object.values(latestDesignData.componentSpecs).every(s=>s.storage.mode==='net'&&s.dataDiskCount===8&&s.dataDiskTb===2&&s.diskTb===16)));
  check('net-hardware-unknown-demand-stays-unassessed',await page.evaluate(()=>getStorageCapacityAudits(latestDesignData)[0].status==='净容量初算 / 需求未评估'&&!latestDesignData.storageDemandComplete));
  check('actual-hosts-use-net-budget',await page.evaluate(()=>latestDesignData.serverPlan.filter(s=>s.roles.length).every(s=>s.resourceAudit.usable.disk===7.2)));
  await page.locator('#reverseReserveRatio').fill('0.5');
  check('no-double-disk-reserve',await page.evaluate(()=>{
    const h=latestDesignData.serverPlan.find(s=>s.spec);return h.resourceAudit.usable.disk===7.2&&h.resourceAudit.usable.cpu===32&&h.resourceAudit.usable.memory===128;
  }));
  await page.locator('#reverseReserveRatio').fill('0.35');
  results.push(...await page.evaluate(()=>{
    const r=[],c=(name,pass)=>r.push({name,pass}),saved={...Object.fromEntries([...$('reverseStorageEditor').querySelectorAll('input,select')].map(e=>[e.id,e.value])),reverseDiskTb:$('reverseDiskTb').value};
    const bad=[['raw-mismatch','reverseDiskTb','15'],['blank-disk','reverseStorageDiskTb',''],['zero-disk','reverseStorageDiskTb','0'],['zero-count','reverseStorageDiskCount','0'],['fraction-count','reverseStorageDiskCount','2.5'],['all-spares','reverseStorageSpareDisks','8'],['negative-log','reverseStorageLogTb','-1'],['exhausted-budget','reverseStorageLogTb','20'],['fs-too-high','reverseStorageFsReserveRatio','0.9'],['zero-watermark','reverseStorageWatermark','0'],['watermark-over-one','reverseStorageWatermark','1.1'],['raid10-odd','reverseStorageRaid','raid10'],['unknown-raid','reverseStorageRaid','unknown'],['bad-mode','reverseStorageMode','bad']];
    for(const [name,id,value]of bad) {
      for(const [k,v]of Object.entries(saved))$(k).value=v;
      $(id).value=value;
      let failed=false;try{calculateReverse();}catch(e){failed=e instanceof PlanningInputError;}
      c('reject-'+name,failed);
    }
    for(const [k,v]of Object.entries(saved))$(k).value=v;render();
    const spec=latestDesignData.componentSpecs.dn;
    const req=calculateComponentRequirement({instances:10,cpuCores:10,memoryGb:10,diskTb:72},{...spec,cores:512,memoryGb:4096,maxInstances:100},.35);
    c('quantity-by-net-disk',req.byDisk===10&&req.usableDiskTb===7.2);
    return r;
  }));
  await page.locator('#reverseDiskTb').fill('15');
  check('raw-value-not-overwritten',await page.evaluate(()=>$('reverseDiskTb').value==='15'&&!latestDesignData&&$('downloadExcelBtn').disabled));
  await page.locator('#reverseDiskTb').fill('16');
  await page.selectOption('#reverseStorageMode','legacy');
  check('legacy-switch-uses-raw-unified-reserve',await page.evaluate(()=>getDiskCapacity(latestDesignData.componentSpecs.dn,.35).usableTb===10.4&&$('reverseDiskTb').value==='16'));
  await page.locator('#reverseDiskTb').fill('8');
  check('legacy-placement-restored',legacy===await page.evaluate(()=>JSON.stringify({n:latestDesignData.requiredServerCount,dn:latestDesignData.dnInstances,roles:latestDesignData.serverPlan.map(s=>[s.az,s.roles])})));
  await page.selectOption('#reverseStorageMode','net');
  check('net-drafts-retained-not-silently-fixed',await page.evaluate(()=>$('reverseStorageDiskCount').value==='8'&&$('reverseStorageLogTb').value==='1'&&!latestDesignData&&$('reverseDiskTb').value==='8'));
  await page.locator('#reverseDiskTb').fill('16');
  await page.selectOption('#designModule','business');
  check('business-independent-from-reverse-net',await page.evaluate(()=>!!latestDesignData&&!latestDesignData.reverse&&Object.values(latestDesignData.componentSpecs).every(s=>s.storage.mode==='legacy')));
  await page.selectOption('#designModule','reverse');
  check('reverse-profile-restored',await page.evaluate(()=>latestDesignData.reverse&&latestDesignData.componentSpecs.dn.storage.logTb===1));
  await page.evaluate(()=>{
    $('reverseServerCount').value=60;
    Object.assign(reverseTenantSpecs[0],{storageDemandMode:'explicit',plannedDataTb:6,dnGroupDataInput:'[3,1,1,1]'});
    Object.assign(reverseTenantSpecs[1],{storageDemandMode:'explicit',plannedDataTb:0});render();
  });
  check('known-demand-and-net-not-production-claim',await page.evaluate(()=>latestDesignData.storageDemandComplete&&getStorageCapacityAudits(latestDesignData)[0].status==='净容量工程初算 / 已录入需求'&&getStorageCapacityAudits(latestDesignData)[0].text.includes('不代表生产承载已通过')));
  check('24TB-replicated-actual-placement',await page.evaluate(()=>latestDesignData.storedDataTb===24&&latestDesignData.serverPlan.reduce((n,s)=>n+(s.resourceAudit?.used.disk||0),0)===24));
  check('host-net-space-percent',await page.evaluate(()=>{
    const s=latestDesignData.serverPlan.find(s=>s.roles.some(isDnRole)&&s.resourceAudit.used.disk>0);
    return s.resourceAudit.diskPercent===Math.round(s.resourceAudit.used.disk/9*100)&&s.resourceAudit.usable.disk===7.2;
  }));
  check('candidate-profiles-preserved',await page.evaluate(()=>{
    const d=buildLayoutCandidate(latestDesignData,'cnDnMixed');return d.serverPlan.filter(s=>s.roles.length).every(s=>s.spec.storage.mode==='net'&&s.resourceAudit.usable.disk===7.2);
  }));
  await page.locator('#reverseStorageWatermark').fill('0.9');
  check('production-over80-redline',await page.evaluate(()=>getStorageCapacityAudits(latestDesignData)[0].error&&getResourceReductionRedlines(latestDesignData).some(s=>s.includes('80%'))));
  await page.locator('#reverseStorageWatermark').fill('0.8');
  await page.evaluate(()=>{$('reverseStorageSpareDisks').value=0;$('reverseStorageRaid').value='raid0';render();});
  check('production-raid0-redline',await page.evaluate(()=>getStorageCapacityAudits(latestDesignData)[0].error&&getResourceReductionRedlines(latestDesignData).some(s=>s.includes('无磁盘冗余'))));
  await page.selectOption('#environmentType','poc');
  check('poc-raid0-advisory',await page.evaluate(()=>!getStorageCapacityAudits(latestDesignData)[0].error&&getStorageCapacityAudits(latestDesignData)[0].text.includes('无磁盘冗余')));
  await page.evaluate(()=>{$('environmentType').value='production';$('reverseStorageRaid').value='raid5';$('reverseStorageSpareDisks').value=1;render();});
  check('formula-full-net-chain',await page.locator('#formulaOutput').textContent().then(t=>t.includes('阵列 12TB')&&t.includes('数据空间 9TB')&&t.includes('7.20TB')&&t.includes('副本落盘 24TB')));
  fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,file]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(path.join(out,file));check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
  }
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});await page.locator('#reverseStorageEditor').evaluate(e=>e.open=true);
    await page.locator('#reverseStorageMode').scrollIntoViewIfNeeded();
    check('input-fit-'+width,await page.locator('#reverseStorageEditor').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`net-input-${width}.png`)});
    await page.locator('.storage-capacity-summary').scrollIntoViewIfNeeded();
    check('summary-fit-'+width,await page.locator('.storage-capacity-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`net-summary-${width}.png`)});
  }
  await page.evaluate(()=>resetForm());await page.selectOption('#designModule','reverse');
  check('reset-restores-all-storage-defaults',await page.evaluate(()=>$('reverseStorageMode').value==='legacy'&&$('reverseStorageDiskCount').value==='4'&&$('reverseStorageDiskTb').value==='2'&&$('reverseStorageRaid').value==='unknown'&&$('reverseStorageLogTb').value==='0'&&$('reverseDiskTb').value==='8'));
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceHash:createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex'),results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
