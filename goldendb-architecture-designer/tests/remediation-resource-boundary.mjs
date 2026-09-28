import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-spec-remediation-20260920/resource-boundary');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(...await page.evaluate(()=>{
  const checks=[],check=(name,pass)=>checks.push({name,pass}),near=(a,b)=>Math.abs(a-b)<1e-12;
  const spec={cores:1,memoryGb:1,diskTb:.1,maxInstances:10,source:'recommended'};
  const demand={instances:1,cpuCores:.1,memoryGb:.1,diskTb:.08};
  const config={tenantPlans:[],reserveRatio:.35,componentSpecs:{dn:spec},componentDemands:{dn:demand}};
  const audit=getServerResourceAudit({roles:[],spec},config,{cpu:.1,memory:.1,disk:.08});
  check('disk-not-padded',near(audit.usable.disk,.065)&&!audit.withinWatermark);
  const small=getServerResourceAudit({roles:[],spec}, {...config,reserveRatio:.8},{cpu:.3,memory:.3,disk:0});
  check('cpu-memory-not-padded',near(small.usable.cpu,.2)&&near(small.usable.memory,.2)&&!small.withinWatermark);
  const r=calculateComponentRequirement(demand,spec,.35);check('independent-disk',near(r.usableDiskTb,.065)&&r.byDisk===2);
  const mixed=calculateMixedServerAnalysis(['dn'],config);check('mixed-disk',mixed.servers===2);
  const whole={...spec,cores:64,memoryGb:256,diskTb:10};
  const requirement=calculateComponentRequirement({...demand,instances:2,cpuCores:83,memoryGb:2,diskTb:0},whole,.35);
  check('cpu-consistent-fractional',requirement.usableCores===41.6&&requirement.byCpu===2);
  check('no-reserve',getUsableServerResources(spec,0).disk===.1);
  check('default-reserve',getUsableServerResources(spec).cpu===1);
  let underflow=false;try{getUsableServerResources({...spec,diskTb:Number.MIN_VALUE},.8);}catch(e){underflow=e instanceof PlanningInputError;}check('numeric-underflow-rejected',underflow);
  for(const reserve of [-.1,.81,1,NaN,Infinity,'']){let rejected=false;try{getUsableServerResources(spec,reserve);}catch(e){rejected=e instanceof PlanningInputError;}check('invalid-reserve-'+reserve,rejected);}
  for(const field of ['cores','memoryGb','diskTb'])for(const value of [0,-1,NaN,Infinity]){let rejected=false;try{getUsableServerResources({...spec,[field]:value},.35);}catch(e){rejected=e instanceof PlanningInputError;}check('invalid-spec-'+field+'-'+value,rejected);}
  const data=latestDesignData,servers=data.serverSizing.serverPlan;
  check('actual-host-balances',servers.every(h=>near(h.resourceAudit.usable.cpu,h.spec.cores*(1-data.serverSizing.reserveRatio))&&near(h.resourceAudit.usable.disk,h.spec.diskTb*(1-data.serverSizing.reserveRatio))));
  return checks;
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const wait=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();await(await wait).saveAs(path.join(out,'workloads.xlsx'));
 results.push({name:'browser-errors',pass:errors.length===0,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(results.filter(r=>!r.pass));console.log(`${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
