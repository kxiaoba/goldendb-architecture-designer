import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out = path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-cn-options-20261018');
fs.mkdirSync(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome', headless:true});
const page = await browser.newPage({viewport:{width:1600,height:1100}});
const results = [], errors = [];
const check = (name, pass) => results.push({name,pass});
page.on('pageerror', e => errors.push(e.message));
const setup = async (extra={}) => page.evaluate(extra => {
  resetForm(); $('forceEven').checked=false;
  const t=businessTenantSpecs[0]; renderWorkloadEditor(t,0);
  Object.assign(t,{qps:16000,workloadMode:'split',cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,
    onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,onlineCount:0,
    batchRateMode:'tps',batchRate:800,batchCoreTps:50,batchCpuLimit:.7,batchGrowth:1,
    batchCount:0,batchSizingMode:'manual',batchCores:16,batchMemoryGb:64,jointDnTps:1600,...extra}); render();
},extra);
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  await setup();
  check('legacy-count-preserved',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads.every(w=>w.count===2)));
  await page.locator('[data-key=cnFailurePolicy]').selectOption('required');
  check('nplus1-count-and-physical-loss',await page.evaluate(()=>
    latestDesignData.tenantPlans[0].cnWorkloads.every(w=>w.count===3) &&
    getActualCnCapacityAudits(latestDesignData).filter(a=>a.required).every(a=>a.oneHostWithinCapacity&&!a.error)));
  await setup({cnFailurePolicy:'required',onlineCount:2,batchCount:2});
  check('manual-quantity-preserved-and-rejected',await page.evaluate(()=>{
    const d=latestDesignData;return d.tenantPlans[0].cnWorkloads.every(w=>w.count===2) &&
      getActualCnCapacityAudits(d).some(a=>a.error) && d.tenantPlans[0].workloadIssues.some(s=>s.includes('N+1'));
  }));
  await page.locator('[data-key=cnFailurePolicy]').selectOption('normal');
  check('normal-policy-advisory-and-export',await page.evaluate(()=>{
    const d=latestDesignData, rows=getActualCnCapacityAudits(d);
    return rows.filter(a=>a.required).every(a=>!a.error&&!a.oneHostWithinCapacity&&!a.failureRequired) &&
      JSON.stringify(buildExcelSheets(d)).includes('仅正常峰值');
  }));
  check('normal-shortfall-still-error',await page.evaluate(()=>{
    const d=structuredClone(latestDesignData); d.tenantPlans[0].cnWorkloads[0].target=1e6;
    return getActualCnCapacityAudits(d)[0].error;
  }));
  await setup({cnFailurePolicy:'required',cnSizingMode:'auto',batchSizingMode:'auto'});
  check('automatic-spec-nminus1-capacity',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads.every(w=>(w.count-1)*w.cores*w.k*w.water>=w.target)));
  await page.evaluate(()=>{$('environmentType').value='poc';render();});
  check('poc-no-forced-extra-node',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads.every(w=>w.count===2)));
  await setup({cnFailurePolicy:'required'});
  await page.evaluate(()=>{$('forceEven').checked=true;render();});
  check('even-count-after-reserve',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads.every(w=>w.count===4)));
  await page.evaluate(()=>{businessTenantSpecs.push({...businessTenantSpecs[0],tenantId:createTenantIdentity(),name:'second'});render();});
  check('multi-tenant-independent',await page.evaluate(()=>latestDesignData.tenantPlans.length===2&&latestDesignData.tenantPlans.every(t=>t.cnWorkloads.every(w=>w.count===4))));
  await setup({cnFailurePolicy:'invalid'});
  check('invalid-policy-rejected',await page.evaluate(()=>!latestDesignData));
  await setup({workloadMode:'single',cnFailurePolicy:'required',cnSizingMode:'auto'});
  check('single-scene-nplus1',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads.every(w=>(w.count-1)*w.cores*w.k*w.water>=w.target)));
  await setup();
  check('peak-only-units',await page.locator('[data-key=batchRateMode] option').evaluateAll(es=>es.map(e=>e.value).join(',')==='qps,tps'));
  await page.locator('[data-key=batchInputBasis]').selectOption('volume');
  check('volume-only-units',await page.locator('[data-key=batchRateMode] option').evaluateAll(es=>es.map(e=>e.value).join(',')==='sqlWindow,work'));
  await page.locator('[data-key=batchSqlTotal]').fill('5760000');
  await page.locator('[data-key=batchSqlWindow]').fill('2');
  await page.locator('[data-key=batchSqlPerTxn]').fill('1');
  await page.locator('[data-key=batchSqlPerTxn]').blur();
  check('volume-arithmetic',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads[1].target===800));
  await page.locator('[data-key=batchInputBasis]').selectOption('peak');
  check('peak-mode-and-value-restored',await page.evaluate(()=>businessTenantSpecs[0].batchRateMode==='tps'&&Number(businessTenantSpecs[0].batchRate)===800&&latestDesignData.tenantPlans[0].cnWorkloads[1].target===800));
  await page.locator('[data-key=batchInputBasis]').selectOption('volume');
  check('volume-values-restored',await page.evaluate(()=>Number(businessTenantSpecs[0].batchSqlTotal)===5760000&&latestDesignData.tenantPlans[0].cnWorkloads[1].target===800));
  await page.locator('[data-key=batchSqlWindow]').fill('0');
  check('zero-window-rejected',await page.evaluate(()=>!latestDesignData));
  await setup({batchRateMode:'work',batchAmount:5760000,batchWindow:2,batchWindowCheck:true,
    batchEfficiency:1,cnFailurePolicy:'normal'});
  check('window-policy-linked',await page.evaluate(()=>getActualBatchWindowAudits(latestDesignData).filter(a=>a.required).every(a=>a.withinWindow&&!a.oneHostWithinWindow&&!a.failureRequired)));
  await setup();
  for(const tier of [32,64,128]) {
    await page.locator('[data-key=cnPreset]').selectOption(String(tier));
    check('preset-'+tier,await page.evaluate(tier=>{
      const t=latestDesignData.tenantPlans[0],w=t.cnWorkloads[0];
      return w.cores===tier&&w.memoryGb===tier*4&&w.capacity===w.count*tier*35&&
        t.cnRoleSpecs.filter(r=>r.key==='online').every(r=>r.cores===tier&&r.memoryGb===tier*4);
    },tier));
  }
  check('oversized-instance-keeps-redline',await page.evaluate(()=>getResourceReductionRedlines(latestDesignData).some(s=>s.includes('CN')&&(s.includes('适配')||s.includes('落位')||s.includes('缺口')))));
  await page.locator('[data-mode=business][data-key=cnMemoryGb]').fill('513');
  check('custom-memory-updates-preset',await page.locator('[data-key=cnPreset]').inputValue()==='custom');
  await page.locator('[data-workload-options=batch] summary').click();
  await page.locator('[data-key=batchPreset]').selectOption('64');
  check('batch-preset-linked',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads[1].cores===64&&Number(businessTenantSpecs[0].batchMemoryGb)===256));
  await setup();
  await page.locator('[data-key=onlineCoreTps]').fill('100');
  check('live-performance-table',await page.locator('[data-cn-performance=online] tr').nth(2).locator('td').nth(2).textContent()==='2240');
  await page.locator('[data-key=onlineCpuLimit]').fill('1.5');
  check('invalid-table-no-numeric-promise',await page.locator('[data-cn-performance=online] tr').first().textContent().then(s=>s.includes('待标定')));
  await setup();
  await page.locator('.workload-options summary').filter({hasText:'CN 规格与性能初算'}).first().click();
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});
    await page.locator('.workload-settings').first().scrollIntoViewIfNeeded();
    check('layout-'+width,await page.locator('.workload-settings').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`options-${width}.png`)});
    await page.locator('[data-key=batchInputBasis]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`batch-${width}.png`)});
  }
  fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
  for(const [id,file] of [['downloadExcelBtn','planning.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();
    await (await pending).saveAs(path.join(out,file));check('download-'+file,fs.statSync(path.join(out,file)).size>1000);
  }
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass)}));
if(results.some(r=>!r.pass))process.exitCode=1;
