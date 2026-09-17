import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-spec-remediation-20260916/s01b2b/inputs');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}}), results=[], errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,pass)=>results.push({name,pass});
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 const setup=async(extra={})=>page.evaluate(extra=>{
  resetForm();$('forceEven').checked=false;
  const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
  Object.assign(t,{workloadMode:'split',qps:16000,onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,
   cnSizingMode:'manual',cnCores:16,cnMemoryGb:64,onlineCount:0,
   batchRateMode:'sqlWindow',batchSqlTotal:36000000,batchSqlWindow:2,batchSqlPerTxn:20,
   batchCoreTps:50,batchCpuLimit:.7,batchGrowth:1,batchCount:0,
   batchSizingMode:'manual',batchCores:16,batchMemoryGb:64,batchWindowCheck:true,batchEfficiency:1,
   ...extra});render();
 },extra);
 await setup();
 check('sql-window-arithmetic-per-az',await page.evaluate(()=>{
  const [o,b]=latestDesignData.tenantPlans[0].cnWorkloads;
  return o.target===800&&b.target===250&&b.k===50&&b.capacity===1120&&b.count===2
   &&b.cnByAz.slice(0,2).every(n=>n===2)&&b.windowAudit.work===1800000
   &&Math.abs(b.windowAudit.seconds-1800000/1120)<1e-6&&b.reason.includes('平均QPS（非峰值）')
   &&getActualBatchWindowAudits(latestDesignData).length===3;
 }));
 check('qps-single-source-online-section',await page.evaluate(()=>{
  const nodes=document.querySelectorAll('[data-key=qps]');
  return nodes.length===1&&nodes[0].closest('.grid-two').previousElementSibling.textContent==='在线 CN';
 }));
 await setup({batchBenchmarkMode:'instance',batchBenchmarkRate:800,batchBenchmarkCores:16,batchBenchmarkMemoryGb:64,batchCoreTps:''});
 check('instance-fold-and-inactive-core-draft',await page.evaluate(()=>{
  const b=latestDesignData.tenantPlans[0].cnWorkloads[1];return b.k===50&&b.capacity===1120&&b.reason.includes('800 TPS / 16物理核');
 }));
 await setup({batchBenchmarkMode:'instance',batchBenchmarkRate:560,batchBenchmarkCores:16,batchBenchmarkMemoryGb:64,batchCalibrationMode:'safe',batchCpuLimit:''});
 check('safe-no-double-water',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads[1].capacity===1120));
 await setup({onlineBenchmarkMode:'instance',onlineBenchmarkRate:800,onlineBenchmarkCores:16,onlineBenchmarkMemoryGb:64,onlineCoreTps:''});
 check('online-instance-independent',await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads.every(w=>w.k===50)));
 for(const [key,value] of [['batchSqlWindow',0],['batchSqlTotal',''],['batchSqlPerTxn',''],['batchSqlPerTxn',0],['batchCpuLimit',1.5],['batchGrowth',.5],['batchCount',1.5],['batchEfficiency',1.5]]) {
  await setup({[key]:value});check('invalid-'+key,await page.evaluate(()=>!latestDesignData&&$('downloadExcelBtn').disabled));
 }
 for(const [key,value] of [['batchBenchmarkCores',1.5],['batchBenchmarkMemoryGb',''],['batchBenchmarkRate',0]]) {
  await setup({batchBenchmarkMode:'instance',batchBenchmarkRate:800,batchBenchmarkCores:16,batchBenchmarkMemoryGb:64,[key]:value});
  check('invalid-'+key,await page.evaluate(()=>!latestDesignData));
 }
 await setup({batchBenchmarkMode:'instance',batchBenchmarkRate:800,batchBenchmarkCores:8,batchBenchmarkMemoryGb:32,batchBenchmarkSource:'POC <sample> "quoted"'});
 check('extrapolation-and-source-escaped',await page.evaluate(()=>{
  const d=latestDesignData;return getResourceReductionRedlines(d).some(x=>x.includes('跨规格线性折算未验证'))
   &&JSON.stringify(buildExcelSheets(d)).includes('POC <sample>')&&!document.querySelector('sample');
 }));
 await setup();
 for(const key of ['onlineGrowth','batchGrowth']) {
  const field=page.locator(`[data-key=${key}]`);await field.fill('');await field.pressSequentially('1.5');await field.blur();
  check('decimal-typing-'+key,await field.evaluate(el=>el.value==='1.5'&&el.validity.valid));
 }
 check('decimal-targets',await page.evaluate(()=>{const w=latestDesignData.tenantPlans[0].cnWorkloads;return w[0].target===1200&&w[1].target===375;}));
 await page.locator('[data-key=batchSqlPerTxn]').fill('2.5');
 check('independent-weighted-transactions',await page.evaluate(()=>{const w=latestDesignData.tenantPlans[0].cnWorkloads;return w[0].target===1200&&w[1].target===3000;}));
 for(const mode of ['tps','work']) {
  await setup({batchRateMode:mode,batchRate:250,batchAmount:1800000,batchWindow:2,batchSqlPerTxn:'',batchSqlWindow:0,batchSqlTotal:''});
  check('hidden-sql-fields-'+mode,await page.evaluate(()=>latestDesignData.tenantPlans[0].cnWorkloads[1].target===250));
 }
 await setup();
 await page.locator('[data-key=workloadMode]').selectOption('single');
 check('single-qps-preserved',await page.evaluate(()=>document.querySelectorAll('[data-key=qps]').length===1&&businessTenantSpecs[0].qps===16000&&!!latestDesignData));
 await page.locator('[data-key=workloadMode]').selectOption('split');
 check('split-restores-values',await page.evaluate(()=>businessTenantSpecs[0].batchSqlTotal===36000000&&latestDesignData.tenantPlans[0].cnWorkloads[1].target===250));
 await page.evaluate(()=>{resetForm();});
 await page.locator('[data-key=workloadMode]').selectOption('split');
 check('new-batch-no-assumed-T',await page.evaluate(()=>businessTenantSpecs[0].batchSqlPerTxn===''&&!latestDesignData));
 await setup({batchBenchmarkMode:'instance',batchBenchmarkRate:800,batchBenchmarkCores:16,batchBenchmarkMemoryGb:64,batchBenchmarkSource:'POC model A'});
 for(const width of [390,875,1600]) {
  await page.setViewportSize({width,height:1000});await page.locator('[data-key=batchBenchmarkMode]').scrollIntoViewIfNeeded();
  check('layout-'+width,await page.locator('.workload-settings').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&[...e.querySelectorAll('input,select')].every(n=>n.getBoundingClientRect().right<=e.getBoundingClientRect().right+1)));
  await page.screenshot({path:path.join(out,`inputs-${width}.png`)});
 }
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 for(const [id,name] of [['downloadExcelBtn','workloads.xlsx'],['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
  const wait=page.waitForEvent('download');await page.locator('#'+id).click();const file=await wait;await file.saveAs(path.join(out,name));check(name,fs.statSync(path.join(out,name)).size>1000);
 }
 check('browser-errors',errors.length===0);
} finally {fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));await browser.close();}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
