import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260920/evidence-status');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const d=structuredClone(latestDesignData),checks=[],check=(name,pass)=>checks.push({name,pass});
  const before=JSON.stringify(d);let rows=getPerformanceEvidence(d);
  check('default-cn-no-evidence',rows[0].status==='未提供客户证据');
  check('default-dn-example',rows.some(r=>r.component.endsWith('DN')&&r.status==='参考示例，非客户实测'));
  check('joint-not-assessed',rows.at(-1).status==='未评估');
  check('read-only',JSON.stringify(d)===before);
  const sheets=JSON.stringify(buildExcelSheets(d));check('export-same-source',rows.every(r=>sheets.includes(r.text)));
  renderRisks(d);check('risk-linked',rows.every(r=>document.querySelector('#riskList').textContent.includes(r.text)));
  d.dnCalibration.source='已验证 <img src=x onerror=alert(1)>';d.dnCalibration.requiresEvidence=true;
  rows=getPerformanceEvidence(d);check('declaration-not-proof',rows.every(r=>!r.verified)&&rows.find(r=>r.component.endsWith('DN')).status==='来源已填写，待核验');
  renderRisks(d);check('source-escaped',!document.querySelector('#riskList img')&&document.querySelector('#riskList').textContent.includes(d.dnCalibration.source));
  d.dnCalibration.source='';check('custom-missing-evidence',getPerformanceEvidence(d).find(r=>r.component.endsWith('DN')).status==='未提供客户证据');
  d.tenantPlans[0].cnWorkloads=[{label:'在线',benchmarkSource:'online-report'},{label:'跑批',benchmarkSource:''}];
  rows=getPerformanceEvidence(d);check('workloads-independent',rows[0].status==='来源已填写，待核验'&&rows[1].status==='未提供客户证据');
  d.tenantPlans.push({...d.tenantPlans[0],tenantId:createTenantIdentity(),name:'second',cnWorkloads:[{label:'在线',benchmarkSource:'second-report'}]});
  rows=getPerformanceEvidence(d);check('tenants-independent',rows.filter(r=>r.component.endsWith('CN')).length===3&&rows.some(r=>r.text.includes('second-report')));
  check('dn-global-not-tenant-proof',rows.filter(r=>r.component.endsWith('DN')).length===2);
  check('reverse-no-invented-evidence',getPerformanceEvidence({...d,reverse:true}).length===1&&!getPerformanceEvidence({...d,reverse:true})[0].verified);
  renderRisks(latestDesignData);return checks;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await wait).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1000});await page.locator('.dn-failure-summary > div').last().scrollIntoViewIfNeeded();results.push({name:'layout-'+width,pass:await page.locator('.dn-failure-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});await page.screenshot({path:path.join(out,`evidence-${width}.png`)});}
 results.push({name:'browser-errors',pass:errors.length===0,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
