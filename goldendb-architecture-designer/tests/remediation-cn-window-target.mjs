import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v2c-20261019/window-target');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,pass)=>results.push({name,pass});
const setup=async(extra={},environment='production')=>page.evaluate(({extra,environment})=>{
  resetForm();$('forceEven').checked=false;$('environmentType').value=environment;$('years').value='2';
  const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
  Object.assign(t,{qps:16000,workloadMode:'split',cnFailurePolicy:'required',cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,
    onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,onlineCount:0,
    batchRateMode:'work',batchAmount:5760000,batchWindow:2,batchCoreTps:50,batchCpuLimit:.7,batchGrowth:1,
    batchCount:0,batchSizingMode:'manual',batchCores:16,batchMemoryGb:64,batchWindowCheck:true,
    batchEfficiency:.5,batchLostCn:2,batchPauseMinutes:30,batchRetryRatio:.1,jointDnTps:1600,...extra});render();
},{extra,environment});
const batch=()=>page.evaluate(()=>latestDesignData?.tenantPlans[0].cnWorkloads[1]);
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  await setup();
  let b=await batch();
  check('independent-count-seven',b?.count===7);
  check('independent-work-once',Math.abs(b?.windowAudit.work-6336000)<1e-6);
  check('window-audit-meets-target',b?.windowAudit.withinWindow===true);
  check('actual-physical-failure-meets-window',await page.evaluate(()=>getActualBatchWindowAudits(latestDesignData).filter(a=>a.required).every(a=>a.withinWindow&&a.oneHostWithinWindow)));
  results.push(...await page.evaluate(()=>{
    const checks=[],data=latestDesignData,plan=data.tenantPlans[0];
    for(const efficiency of [.2,.5,1])for(const lost of [0,2])for(const pause of [0,30])for(const retry of [0,.1]) {
      const s={...businessTenantSpecs[0],batchEfficiency:efficiency,batchLostCn:lost,batchPauseMinutes:pause,batchRetryRatio:retry};
      const w=applyWorkloadSettings(plan,s,data).cnWorkloads[1];
      const work=5760000*(1+retry),available=7200-pause*60,reserve=Math.max(1,lost);
      const expected=Math.max(2,Math.ceil(work/(available*560*efficiency))+reserve);
      checks.push({name:`independent-matrix-${efficiency}-${lost}-${pause}-${retry}`,pass:w.count===expected&&(w.count-reserve)*560*efficiency*available>=work});
    }
    return checks;
  }));
  await setup({batchSizingMode:'auto'});b=await batch();
  check('auto-spec-window-capacity',!!b&&b.cores<=await page.evaluate(()=>latestDesignData.cnPlanningCores)&&b.windowAudit.withinWindow);
  await setup({batchRateMode:'sqlWindow',batchSqlTotal:115200000,batchSqlWindow:2,batchSqlPerTxn:20});b=await batch();
  check('sql-window-same-transaction-work',b?.count===7&&b.target===800&&Math.abs(b.windowAudit.work-6336000)<1e-6);
  await setup({batchCalibrationMode:'safe',batchCoreTps:35,batchCpuLimit:''});b=await batch();
  check('safe-water-once',b?.count===7&&b.water===1&&b.windowAudit.withinWindow);
  await setup({batchGrowth:1.5});b=await batch();
  check('growth-once',b?.target===1800&&b.count===12&&Math.abs(b.windowAudit.work-14256000)<1e-5);
  await setup();await page.evaluate(()=>{$('forceEven').checked=true;render();});b=await batch();
  check('even-after-window-reserve',b?.count===8);
  await setup({batchCount:3});b=await batch();
  check('manual-count-kept-and-shortage',b?.count===3&&!b.windowAudit.withinWindow);
  check('manual-shortage-redline',await page.evaluate(()=>getResourceReductionRedlines(latestDesignData).some(s=>s.includes('跑批实际落位窗口')&&s.includes('窗口不足'))));
  await setup({cnFailurePolicy:'audit'});check('audit-count-unchanged',(await batch())?.count===2);
  await setup({cnFailurePolicy:'normal'});check('normal-count-unchanged',(await batch())?.count===2);
  await setup({},'poc');check('poc-count-unchanged',(await batch())?.count===2);
  await setup({batchRateMode:'tps',batchRate:800,batchWindow:0,batchEfficiency:0});
  check('peak-mode-ignores-hidden-window',(await batch())?.count===3);
  await setup({batchWindowCheck:false,batchWindow:2,batchEfficiency:0});
  check('disabled-window-not-applied',(await batch())?.count===3);
  await setup({batchPauseMinutes:120});
  check('no-effective-window-no-finite-auto-plan',await page.evaluate(()=>!latestDesignData&&businessTenantSpecs[0].batchPauseMinutes===120));
  for(const [key,value]of [['batchEfficiency',0],['batchEfficiency',1.01],['batchLostCn',1.5],['batchRetryRatio',-1],['batchPauseMinutes',-1]]) {
    await setup({[key]:value});check('invalid-'+key+'-'+value,await page.evaluate(()=>!latestDesignData));
  }
  await setup({workloadMode:'single',cnSizingMode:'auto',cnFailurePolicy:'invalid'});
  check('single-invalid-policy-rejected',await page.evaluate(()=>!latestDesignData));
  await setup({batchCount:2,batchEfficiency:1,batchLostCn:0,batchPauseMinutes:0,batchRetryRatio:0},'poc');
  check('poc-window-failure-neutral',await page.evaluate(()=>{
    const a=getActualBatchWindowAudits(latestDesignData)[0];
    const e=[...document.querySelector('.cn-placement-summary').children].find(e=>e.textContent===a.text);
    return a.withinWindow&&!a.oneHostWithinWindow&&a.error===false&&!e.classList.contains('cn-placement-error')&&!e.classList.contains('cn-placement-ok');
  }));
  await setup({batchCount:2,batchEfficiency:1,batchLostCn:0,batchPauseMinutes:0,batchRetryRatio:0});
  check('dr-window-shortage-advisory',await page.evaluate(()=>{
    const a=getActualBatchWindowAudits(latestDesignData).find(x=>!x.required);
    const e=[...document.querySelector('.cn-placement-summary').children].find(e=>e.textContent===a.text);
    return !a.withinWindow&&a.error===false&&!e.classList.contains('cn-placement-error');
  }));
  check('production-failure-red',await page.evaluate(()=>getActualBatchWindowAudits(latestDesignData).filter(x=>x.required).every(x=>x.error)));
  await setup({cnFailurePolicy:'normal',batchCount:2,batchEfficiency:1,batchLostCn:0,batchPauseMinutes:0,batchRetryRatio:0});
  check('normal-failure-only-advisory',await page.evaluate(()=>getActualBatchWindowAudits(latestDesignData).filter(x=>x.required).every(x=>x.withinWindow&&!x.oneHostWithinWindow&&x.error===false)));
  await setup({cnFailurePolicy:'normal',batchCount:2,batchLostCn:2});
  check('normal-explicit-unavailable-still-red',await page.evaluate(()=>getActualBatchWindowAudits(latestDesignData).filter(x=>x.required).every(x=>!x.withinWindow&&x.error)));
  await setup({batchEfficiency:1,batchLostCn:0,batchPauseMinutes:0,batchRetryRatio:0});
  check('physical-multi-cn-loss-not-one',await page.evaluate(()=>{
    const d=structuredClone(latestDesignData),t=d.tenantPlans[0],key=getTenantKey(t);
    const batchRole=r=>parseCnTenant(r)===key&&t.cnRoleSpecs[Number(/-CN(\d+)$/.exec(r)?.[1])-1]?.key==='batch';
    const hosts=getPlanServers(d).filter(h=>h.azIndex===0&&h.roles.some(batchRole));
    const role=hosts[1].roles.find(batchRole);hosts[1].roles=hosts[1].roles.filter(r=>r!==role);hosts[0].roles.push(role);
    const a=getActualBatchWindowAudits(d)[0];return a.largestHost===2&&a.actual===3&&a.withinWindow&&!a.oneHostWithinWindow&&a.error;
  }));
  check('budget-does-not-skip-current-failure',await page.evaluate(()=>{
    const before=structuredClone(businessTenantSpecs);
    try {
      businessTenantSpecs[0].onlineCount=601;
      const d=calculate();d.tenantPlans[0].cnWorkloads[1].windowAudit.work*=100;
      return d.totalCn>600&&getLayoutFeasibilityAudits(d).some(x=>x.status==='未评估')&&getActualBatchWindowAudits(d)[0].error;
    } finally {businessTenantSpecs=before;}
  }));
  await setup();
  await page.evaluate(()=>{const t=businessTenantSpecs[0];businessTenantSpecs.push({...t,tenantId:createTenantIdentity(),name:'second'});render();});
  check('multi-tenant-window-independent',await page.evaluate(()=>latestDesignData.tenantPlans.every(t=>t.cnWorkloads[1].count===7)));
  if(!process.env.REMEDIATION_BASELINE) {
    await setup();
    check('formula-window-sizing-explained',await page.locator('#formulaOutput').textContent().then(s=>s.includes('窗口反算')&&s.includes('7')));
    fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
    for(const [id,file]of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
      const pending=page.waitForEvent('download');await page.locator('#'+id).click();await(await pending).saveAs(path.join(out,file));
      check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
    }
    for(const width of [390,875,1600]) {
      await page.setViewportSize({width,height:1100});await page.locator('.cn-placement-summary').scrollIntoViewIfNeeded();
      check('layout-'+width,await page.locator('.cn-placement-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      await page.screenshot({path:path.join(out,`window-${width}.png`)});
    }
  }
  check('browser-errors',!errors.length);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceHash:createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex'),results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass))process.exitCode=1;
