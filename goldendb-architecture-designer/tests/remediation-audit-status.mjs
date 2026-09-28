import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-remediation-20260928/audit-status');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();const results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],c=(name,pass)=>r.push({name,pass}),base=structuredClone(latestDesignData);
  const original=JSON.stringify(base);
  c('normal-status',getPlanServers(base).every(s=>getServerAuditStatus(s).status===(s.resourceAudit.withinWatermark?'通过':'未通过')));
  c('normal-no-mutation',JSON.stringify(base)===original);
  for(const mode of ['missingSpec','missingAudit','unknown','exceeded']){
   const d=structuredClone(base),s=getPlanServers(d)[0];
   if(mode==='missingSpec')s.spec=null;
   if(mode==='missingAudit')s.resourceAudit=null;
   if(mode==='unknown'){s.resourceAudit.issues=['组件 <unknown> 的资源需求未知或非法'];s.resourceAudit.withinWatermark=false;}
   if(mode==='exceeded'){s.resourceAudit.withinWatermark=false;s.resourceAudit.cpuPercent=110;}
   const state=getServerAuditStatus(s),sheets=buildExcelSheets(d),rows=sheets.find(x=>x.name==='服务器清单').rows;
   const row=rows.find(row=>row[0]===s.id);
   c('status-'+mode,state.status===(mode.startsWith('missing')?'未评估':'未通过'));
   c('excel-'+mode,row[15]===state.status && (mode==='exceeded'?row[12]===110:row.slice(12,15).every(value=>value==='未评估')));
   c('physical-'+mode,renderBusinessPhysicalServerRow(s).includes(state.status));
   if(mode!=='exceeded'){
    c('redline-'+mode,getResourceReductionRedlines(d).some(x=>x.includes(s.id)&&x.includes(state.detail)));
    c('risk-'+mode,JSON.stringify(sheets.find(x=>x.name==='风险水位')).includes(state.detail));
   }
   if(mode==='unknown')c('escaped',renderBusinessPhysicalServerRow(s).includes('&lt;unknown&gt;')&&!renderBusinessPhysicalServerRow(s).includes('<unknown>'));
  }
  getPlanServers(latestDesignData)[0].resourceAudit=null;
  return r;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 // Export the intentionally incomplete model through the same workbook writer.
 const file=await page.evaluate(async()=>Array.from(new Uint8Array(await createExcelWorkbook(buildExcelSheets(latestDesignData)).arrayBuffer())));
 fs.writeFileSync(path.join(out,'workloads.xlsx'),Buffer.from(file));
 results.push({name:'browser-errors',pass:errors.length===0});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(x=>!x.pass));console.log(`${results.filter(x=>x.pass).length}/${results.length}`);if(results.some(x=>!x.pass))process.exitCode=1;
