import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b9-20261014/management-identity');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 for(const module of ['business','reverse'])for(const environment of ['production','poc']) {
  results.push(...await page.evaluate(({module,environment})=>{
   resetForm();$('designModule').value=module;$('designModule').dispatchEvent(new Event('change',{bubbles:true}));
   $('environmentType').value=environment;
   $(module==='business'?'deploymentMode':'reverseDeploymentMode').value='local2az';
   $(module+'ManagementNodes').value='4';
   if(module==='reverse')$('reverseServerCount').value='100';
   render();const base=structuredClone(latestDesignData),r=[],check=(name,pass)=>r.push({name:module+'-'+environment+'-'+name,pass});
   check('baseline',getPlanRoleIdentityAudit(base).complete);
   const bad=structuredClone(base),hosts=getPlanServers(bad),local=hosts.filter(h=>h.azIndex===0&&h.roles.includes('管理节点'));
   check('two-independent-hosts',local.length===2);
   local[1].roles.splice(local[1].roles.indexOf('管理节点'),1);local[0].roles.push('管理节点');
   check('total-count-still-complete',getControlPlanePlacementAudit(hosts,bad.managementNodes,bad.gtmNodes).complete);
   check('identity-fails',getPlanRoleIdentityIssues(bad).some(s=>s.includes('管理节点重复落位2次')));
   check('summary-fails',!getPlanRoleIdentitySummary(bad).complete);
   check('redline',getResourceReductionRedlines(bad).some(s=>s.includes('管理节点重复落位2次')));
   check('excel-fails',buildExcelSheets(bad).find(s=>s.name==='方案摘要').rows.some(r=>r[0]==='实例身份完整性'&&r[1]==='未通过'));
   check('conclusion-rejects',getReverseConclusion({...bad,resourceState:'充足'}).includes('不可作为可用部署方案'));
   latestDesignData=bad;return r;
  },{module,environment}));
 }
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const pending=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await pending).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:!errors.length});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
