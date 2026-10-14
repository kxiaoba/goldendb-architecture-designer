import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b8-20261014/gtm-output');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 for(const module of ['business','reverse']) {
  results.push(...await page.evaluate(module=>{
   resetForm();$('designModule').value=module;$('designModule').dispatchEvent(new Event('change',{bubbles:true}));
   if(module==='reverse')$('reverseServerCount').value='100';
   render();const base=structuredClone(latestDesignData),r=[],check=(name,pass)=>r.push({name:module+'-'+name,pass});
   const rows=data=>buildExcelSheets(data).find(s=>s.name==='风险水位').rows.filter(row=>row[0]==='GTM副本');
   check('baseline',getPlanRoleIdentityAudit(base).complete&&rows(base).every(row=>row[1]==='通过'));
   for(const defect of ['duplicate','center','pool','component']) {
    const data=structuredClone(base),hosts=getPlanServers(data),entries=hosts.flatMap(h=>h.roles.filter(isGtmRole).map(role=>({h,role})));
    const a=entries[0],b=entries.find(e=>e.role!==a.role&&getGtmRoleGroupKey(e.role)===getGtmRoleGroupKey(a.role));
    if(defect==='duplicate')b.h.roles[b.h.roles.indexOf(b.role)]=a.role;
    if(defect==='center')a.h.azIndex=(a.h.azIndex+1)%data.azCount;
    if(defect==='pool')a.h.tenantPool='wrong';
    if(defect==='component')a.h.componentKeys=[];
    const group=getGtmRoleGroupKey(a.role),expected=getGtmRolePlacements(data).filter(p=>p.groupKey===group).length;
    const valid=expected-(defect==='duplicate'?2:1);
    check(defect+'-count-unchanged',getGtmGroupPlacementAudit(hosts,data).complete);
    check(defect+'-excel-high-risk',rows(data).some(row=>row[1]==='高风险'&&row[3].includes(`身份有效 ${valid} / ${expected}`)));
    check(defect+'-identity-redline',!getPlanRoleIdentityAudit(data).complete);
    if(defect==='duplicate')window.exportData=data;
   }
   latestDesignData=window.exportData;renderTopology(latestDesignData);
   window.warningCaptured=false;
   const original=inlineExportStyles;
   inlineExportStyles=(s,c)=>{if(s.textContent.includes('本图仅供排查'))window.warningCaptured=true;return original(s,c);};
   return r;
  },module));
  for(const id of ['downloadTopologyBtn','downloadServerTopologyBtn']) {
   const pending=page.waitForEvent('download');await page.locator('#'+id).click();
   const file=path.join(out,`${module}-${id}.png`);await(await pending).saveAs(file);
   const b=fs.readFileSync(file);results.push({name:module+'-'+id,pass:b.readUInt32BE(16)>500&&b.readUInt32BE(20)>200});
  }
  results.push({name:module+'-png-warning',pass:await page.evaluate(()=>window.warningCaptured)});
 }
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const pending=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await pending).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:!errors.length});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
