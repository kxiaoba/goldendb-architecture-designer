import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-remediation-20260929/control-fit');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),results=[];
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const r=[],check=(name,pass)=>r.push({name,pass});
  const cfg={azCount:2,tenantPlans:[],gtmNodes:2,managementNodes:2,gtmBinding:{kind:'shared',groupCount:1},reserveRatio:0,environment:'production',componentSpecs:{gtm:{maxInstances:4}},allowGtmGroupColocation:true};
  const host=(id,az,cores=8)=>({id,azIndex:az,tenantPool:'shared',componentKeys:['gtm','management'],roles:[],spec:{cores,memoryGb:16,diskTb:1}});
  for(const env of ['production','poc'])for(const kind of ['gtm','management']){
   const place=kind==='gtm'?placeGtmRolesByPool:placeManagementRolesByPool;
   const config={...cfg,environment:env};
   const tiny=[host('A',0,2),host('B',1,2)];place(tiny,config);check(env+'-'+kind+'-oversize',tiny.every(h=>!h.roles.length));
   const other=[host('B',1)];place(other,config);check(env+'-'+kind+'-no-cross-center',other[0].roles.length===1);
   const full=[host('A',0,4),host('B',1,4)];full.forEach(h=>h.roles=['管理节点']);place(full,config);check(env+'-'+kind+'-occupied',full.every(h=>h.roles.length===1));
   const valid=[host('A',0),host('B',1)];place(valid,config);check(env+'-'+kind+'-normal',valid.every(h=>h.roles.length===1));
  }
  const both=[host('A',0),host('B',1)];placeGtmRolesByPool(both,cfg);placeManagementRolesByPool(both,cfg);check('mixed-exact',both.every(h=>h.roles.length===2&&getServerResourceAudit(h,cfg).withinWatermark));
  const tenant={id:'dedicated-id',name:'独立租户',isDistributed:true,deploymentStrategy:'dedicated'};
  const dedicated={...cfg,tenantPlans:[tenant],gtmBinding:{kind:'dedicated',groupCount:1}};
  const shared=[host('A',0),host('B',1)];placeGtmRolesByPool(shared,dedicated);check('dedicated-not-shared',shared.every(h=>!h.roles.length));
  const own=shared.map(h=>({...h,tenantPool:getTenantResourcePoolKey(tenant)}));placeGtmRolesByPool(own,dedicated);check('dedicated-own-pool',own.every(h=>h.roles.length===1));
  const data=structuredClone(latestDesignData);getPlanServers(data).filter(h=>h.componentKeys.some(k=>['gtm','management'].includes(k))).forEach(h=>h.spec={...h.spec,cores:1});
  const issues=getInstanceFitIssues(data);check('both-diagnostics',issues.some(i=>i.component==='gtm')&&issues.some(i=>i.component==='management'));
  check('excel-diagnostics',JSON.stringify(buildExcelSheets(data)).includes('单实例无法适配'));
  latestDesignData=data;
  return r;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 fs.writeFileSync(path.join(out,'workloads.xlsx'),Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await createExcelWorkbook(buildExcelSheets(latestDesignData)).arrayBuffer())))));
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(x=>!x.pass));console.log(`${results.filter(x=>x.pass).length}/${results.length}`);if(results.some(x=>!x.pass))process.exitCode=1;
