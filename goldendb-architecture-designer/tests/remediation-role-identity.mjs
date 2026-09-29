import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1b1/identity');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const results=[],check=(name,pass)=>results.push({name,pass});
  const data=structuredClone(latestDesignData),tenant=data.tenantPlans[0],key=getTenantKey(tenant);
  const host=structuredClone(getPlanServers(data)[0]);host.roles=[];
  const bad=[`${key}-CN0`,`${key}-CN01`,`${key}-CN999`,`${key}-CN${tenant.totalCn+1}`,
   `${key}-DN-G0-Master`,`${key}-DN-G01-Master`,`${key}-DN-G${tenant.shardCount+1}-Master`,
   `${key}-DN-G1-Slave0`,`${key}-DN-G1-Slave01`,`${key}-DN-G1-Slave${tenant.replicasPerShard}`,
   'missing-CN1','missing-DN-G1-Master'];
  for(const role of bad){
   check(role+'-unknown',getRoleResourceDemand(role,data.tenantPlans).unknown===true);
   check(role+'-reject',!canPlaceRoleWithinWatermark(host,role,data));
   const audit=getServerResourceAudit({...host,roles:[role]},data);
   check(role+'-audit',!audit.withinWatermark&&audit.issues.length===1);
  }
  check('normal-all-roles',getPlanServers(data).every(h=>h.roles.every(role=>!getRoleResourceDemand(role,data.tenantPlans,data).unknown)));
  check('legacy-slave-alias',JSON.stringify(getRoleResourceDemand(`${key}-DN-G1-Slave`,data.tenantPlans))===JSON.stringify(getRoleResourceDemand(`${key}-DN-G1-Slave1`,data.tenantPlans)));
  const legacy=structuredClone(tenant);delete legacy.cnRoleSpecs;
  check('legacy-cn-spec',getRoleResourceDemand(`${key}-CN1`,[legacy]).cpu===legacy.cnCores);
  const missing=structuredClone(tenant);missing.cnRoleSpecs=[];
  check('missing-role-spec',getRoleResourceDemand(`${key}-CN1`,[missing]).unknown===true);
  const damaged=structuredClone(data),server=getPlanServers(damaged)[0];server.roles.push(`${key}-CN999`);
  server.resourceAudit=getServerResourceAudit(server,damaged);
  check('redline',getResourceReductionRedlines(damaged).some(s=>s.includes('CN999')));
  check('excel-risk',JSON.stringify(buildExcelSheets(damaged).find(s=>s.name==='风险水位')).includes('CN999'));
  check('label-unknown',getRoleSpecLabel(`${key}-CN999`,damaged).includes('未评估'));
  const row=buildExcelSheets(damaged).find(s=>s.name==='组件实例').rows.find(r=>r[7]===`${key}-CN999`);
  check('excel-instance-unknown',row.slice(8,11).every(v=>v==='未评估'));
  for(const kind of ['shared','dedicated']) {
   const model={...data,gtmNodes:4,gtmBinding:{kind,groupCount:1}};
   const valid=getGtmRolePlacements(model).map(p=>p.label);
   check(kind+'-gtm-valid',valid.every(role=>getRoleResourceDemand(role,model.tenantPlans,model).cpu===4));
   for(const role of ['GTM','GTM-SYS0','GTM-SYS999',`${key}-GTM999`,kind==='shared'?`${key}-GTM1`:'GTM-SYS1']) {
    check(kind+'-reject-'+role,getRoleResourceDemand(role,model.tenantPlans,model).unknown===true&&!canPlaceRoleWithinWatermark(host,role,model));
   }
   const duplicate={...host,roles:[valid[0],valid[0]]};
   check(kind+'-duplicate-audit',!getServerResourceAudit(duplicate,model).withinWatermark);
   check(kind+'-duplicate-placement',!canPlaceRoleWithinWatermark({...host,roles:[valid[0]]},valid[0],model));
  }
  check('management-not-planned',getRoleResourceDemand('管理节点',data.tenantPlans,{...data,managementNodes:0}).unknown===true);
  check('management-missing-context',getRoleResourceDemand('管理节点',data.tenantPlans).unknown===true);
  check('management-duplicate',!getServerResourceAudit({...host,roles:['管理节点','管理节点']},data).withinWatermark);
  check('slave-alias-duplicate',!canPlaceRoleWithinWatermark({...host,roles:[`${key}-DN-G1-Slave`]},`${key}-DN-G1-Slave1`,data));
  return results;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const download=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await download).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:errors.length===0});
} finally {await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);
if(results.some(r=>!r.pass))process.exitCode=1;
