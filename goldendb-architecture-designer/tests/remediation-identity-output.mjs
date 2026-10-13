import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b7-20261013/identity-output');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],check=(name,pass)=>r.push({name,pass});
  const base=structuredClone(latestDesignData),bad=structuredClone(base),hosts=getPlanServers(bad);
  const h=hosts.find(h=>h.roles.some(isCnRole)),role=h.roles.find(isCnRole);
  const other=hosts.find(s=>s!==h&&s.azIndex===h.azIndex&&s.roles.some(isCnRole));
  other.roles[other.roles.findIndex(isCnRole)]=role;
  const node=document.createElement('div');node.innerHTML=renderCnPlacementSummary(bad);
  const row=[...node.querySelectorAll('.cn-placement-error')].find(e=>e.textContent.includes('身份有效'));
  check('equal-count-invalid-row-red',!!row&&row.textContent.includes('有效实例缺口 2'));
  check('normal-count-qualified',renderCnPlacementSummary(base).includes('数量统计，水位与性能另行校验'));
  check('identity-conclusion-precedes-state',getReverseConclusion({...bad,resourceState:'充足'}).includes('不可作为可用部署方案'));
  check('excel-identity-invalid',buildExcelSheets(bad).find(s=>s.name==='方案摘要').rows.some(r=>r[0]==='实例身份完整性'&&r[1]==='未通过'));
  window.outputBad=bad;
  window.exportWarnings=[];
  const original=inlineExportStyles;
  inlineExportStyles=(source,clone)=>{if(source.parentElement?.style.left==='-100000px')window.exportWarnings.push(source.textContent.includes('本图仅供排查'));return original(source,clone);};
  return r;
 }));
 for(const invalid of [false,true]) {
  if(invalid)await page.evaluate(()=>{latestDesignData=window.outputBad;renderTopology(latestDesignData);});
  for(const id of ['downloadTopologyBtn','downloadServerTopologyBtn']) {
   const download=page.waitForEvent('download');await page.locator('#'+id).click();
   const file=path.join(out,`${invalid?'invalid':'normal'}-${id}.png`);await(await download).saveAs(file);
   const bytes=fs.readFileSync(file);
   results.push({name:`png-${invalid}-${id}`,pass:bytes.readUInt32BE(16)>500&&bytes.readUInt32BE(20)>200});
  }
 }
 results.push({name:'export-warning-only-invalid',pass:await page.evaluate(()=>JSON.stringify(window.exportWarnings)===JSON.stringify([false,false,true,true]))});
 await page.evaluate(()=>{$('placementDetails').innerHTML=renderCnPlacementSummary(window.outputBad);});
 for(const width of [390,875,1600]) {
  await page.setViewportSize({width,height:1000});
  await page.locator('#placementDetails').scrollIntoViewIfNeeded();
  results.push({name:'layout-'+width,pass:await page.locator('#placementDetails').evaluate(e=>e.scrollWidth<=e.clientWidth+1)});
  await page.screenshot({path:path.join(out,`summary-${width}.png`)});
 }
 results.push({name:'browser-errors',pass:errors.length===0});
} finally {await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
