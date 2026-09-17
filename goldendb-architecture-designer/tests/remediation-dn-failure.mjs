import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260917/s01b3b1');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const d=structuredClone(latestDesignData),before=JSON.stringify(d),checks=[];
  const check=(name,pass)=>checks.push({name,pass});
  const rows=getDnFailureCoverage(d),key=getTenantKey(d.tenantPlans[0]);
  const dn=r=>parseDnPlacementRole(r)?.tenant===key;
  const g1=r=>dn(r)&&parseDnPlacementRole(r).group===1;
  check('default-five-audits',rows.length===5&&rows.every(x=>x.missing.length===0));
  check('no-ha-guarantee',rows.every(x=>x.text.includes('存活不等于可提升为主')&&x.text.includes('不累加从副本TPS')));
  const same=structuredClone(d),h=same.serverSizing.serverPlan;
  const roles=h.flatMap(s=>s.roles.filter(g1)),target=h.find(s=>s.roles.some(g1));
  h.forEach(s=>s.roles=s.roles.filter(r=>!g1(r)));target.roles.push(...roles);
  const sr=getDnFailureCoverage(same);
  check('same-host-all-copies',sr[0].missing.length===0&&sr[1].missing.includes(1)&&sr[1].error);
  check('same-center-all-copies',sr.find(x=>x.az===target.az).missing.includes(1));
  check('redline-linked',getResourceReductionRedlines(same).some(x=>x.includes('DN 单机故障副本覆盖')));
  check('excel-linked',JSON.stringify(buildExcelSheets(same)).includes(sr[1].text));
  same.environment='poc';check('poc-failure-advisory',getDnFailureCoverage(same).every(x=>!x.error));
  const missing=structuredClone(d);missing.serverSizing.serverPlan.forEach(s=>s.roles=s.roles.filter(r=>!g1(r)));
  check('missing-all-replicas',getDnFailureCoverage(missing)[0].missing.includes(1)&&getDnFailureCoverage(missing)[0].error);
  const unsafe=structuredClone(d);unsafe.serverSizing.serverPlan.forEach(s=>{s.resourceAudit.withinWatermark=false;});
  check('unsafe-host-not-counted',getDnFailureCoverage(unsafe)[0].missing.length===d.tenantPlans[0].shardCount);
  const dup=structuredClone(d);dup.serverSizing.serverPlan.forEach(s=>s.roles.push(...s.roles.filter(g1)));
  check('ambiguous-duplicate-excluded',getDnFailureCoverage(dup)[0].missing.includes(1));
  const fake=structuredClone(missing);fake.serverSizing.serverPlan[0].roles.push(`${key}-DN-G1-Slave99`);
  check('unexpected-copy-not-evidence',getDnFailureCoverage(fake)[0].missing.includes(1));
  const reverse={...d,reverse:true,serverPlan:d.serverSizing.serverPlan};
  check('reverse-same-physical-check',JSON.stringify(getDnFailureCoverage(reverse))===JSON.stringify(rows));
  const local=structuredClone(same);local.environment='production';local.azCount=1;local.mode='local1az';
  check('single-center-not-promised-dr',!getDnFailureCoverage(local).find(x=>x.scenario==='az').error);
  check('read-only-model',JSON.stringify(d)===before);
  return checks;
 }));
 for(const mode of ['local2az','threeSiteFiveDc']){
  results.push(await page.evaluate(mode=>{
   $('deploymentMode').value=mode;render();const d=latestDesignData;
   return {name:mode,pass:!!d&&getDnFailureCoverage(d).length===d.azCount+2};
  },mode));
 }
 await page.evaluate(()=>resetForm());
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await (await wait).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){
  await page.setViewportSize({width,height:1000});await page.locator('#placementDetails').scrollIntoViewIfNeeded();
  results.push({name:'layout-'+width,pass:await page.locator('#placementDetails').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});
  await page.screenshot({path:path.join(out,`audit-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
