import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v2b-20261018/layout-feasibility');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
const check=(name,pass)=>results.push({name,pass});
try {
  await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(()=>{
    const r=[],c=(name,pass)=>r.push({name,pass});
    const spec={cores:8,memoryGb:100,diskTb:10,maxInstances:10};
    const impossible=calculateComponentRequirement({instances:1,cpuCores:16,memoryGb:16,diskTb:0},spec,0);
    c('legacy-estimate-retained-but-not-feasible',impossible.servers===2&&impossible.resourceLowerBoundServers===2&&impossible.feasibleServers===null&&!impossible.averageInstanceFits);
    // 5+3 and 3+3+2 fit two 8-core hosts; average-density rounding estimates three.
    const average=calculateComponentRequirement({instances:5,cpuCores:16,memoryGb:5,diskTb:0},spec,0);
    c('estimate-is-not-lower-bound',average.servers===3&&average.resourceLowerBoundServers===2&&average.feasibleServers===null);
    const empty=calculateComponentRequirement({instances:0},spec,0);
    c('empty-finite',empty.servers===0&&empty.resourceLowerBoundServers===0);
    const d=latestDesignData,before=JSON.stringify(d),servers=JSON.stringify(getPlanServers(d));
    const rows=getLayoutFeasibilityAudits(d);
    c('five-layouts',rows.length===5&&new Set(rows.map(x=>x.layout)).size===5);
    c('production-all-mixed-blocked',rows.find(x=>x.layout==='allMixed').status==='生产策略不允许');
    c('selected-matches-actual',rows.find(x=>x.selected).testedServers===getPlanServers(d).length);
    c('no-model-mutation',JSON.stringify(d)===before&&JSON.stringify(getPlanServers(d))===servers);
    c('cache-deterministic',JSON.stringify(rows)===JSON.stringify(getLayoutFeasibilityAudits(d)));
    c('null-on-unconfirmed',rows.filter(x=>x.status!=='落位检查通过').every(x=>x.feasibleServers===null));
    c('finite-estimates',rows.every(x=>Number.isFinite(x.estimatedServers)&&Number.isFinite(x.resourceLowerBoundServers)));
    const broken=structuredClone(d),role=getPlanServers(broken)[0].roles.find(isCnRole);
    getLayoutFeasibilityAudits(broken);
    getPlanServers(broken)[0].roles=getPlanServers(broken)[0].roles.filter(r=>r!==role);
    c('cache-invalidated-on-mutation',getLayoutFeasibilityAudits(broken).find(x=>x.selected).feasibleServers===null);
    const large=structuredClone(d);large.totalCn=601;
    c('large-alternatives-unassessed',getLayoutFeasibilityAudits(large).filter(x=>!x.selected&&x.layout!=='allMixed').every(x=>x.status==='未评估'&&x.feasibleServers===null));
    const incompatible=structuredClone(d);
    Object.values(incompatible.componentSpecs).forEach((s,i)=>{s.source='customer';s.model='different-'+i;});
    c('incompatible-no-finite-feasible-count',getLayoutFeasibilityAudits(incompatible).filter(x=>x.layout!=='dedicated').every(x=>x.status==='机型不兼容'&&x.feasibleServers===null));
    const uneven=structuredClone(d),t=uneven.tenantPlans[0];
    t.dnGroupDataTb=Array(t.shardCount).fill(0);t.dnGroupDataTb[0]=t.futureDataTb;
    getPlanServers(uneven).filter(h=>h.componentKeys.includes('dn')).forEach(h=>{h.spec={...h.spec,diskTb:2};});
    c('largest-dn-group-not-hidden-by-average',getLayoutFeasibilityAudits(uneven).find(x=>x.selected).status==='单实例不适配');
    return r;
  }));
  await page.evaluate(()=>{
    resetForm();$('cpuCores').value='16';$('forceEven').checked=false;
    Object.assign(businessTenantSpecs[0],{cnSizingMode:'manual',cnCores:32,cnMemoryGb:128});render();
  });
  check('candidate-specific-fit-not-current-only',await page.evaluate(()=>{
    const rows=getLayoutFeasibilityAudits(latestDesignData);
    return rows.find(x=>x.layout==='dedicated').status==='单实例不适配'&&
      rows.find(x=>x.layout==='cnDnMixed').status!=='单实例不适配';
  }));
  await page.evaluate(()=>{
    resetForm();const t=businessTenantSpecs[0];renderWorkloadEditor(t,0);
    Object.assign(t,{workloadMode:'split',cnSizingMode:'manual',cnCores:8,cnMemoryGb:32,
      onlineSqlPerTxn:20,onlineCoreTps:50,onlineCpuLimit:.7,onlineGrowth:1,onlineCount:6,
      batchRateMode:'tps',batchRate:100,batchCoreTps:50,batchCpuLimit:.7,batchGrowth:1,
      batchCount:2,batchSizingMode:'manual',batchCores:64,batchMemoryGb:256,jointDnTps:5000});render();
  });
  check('heterogeneous-large-cn-not-hidden-by-average',await page.evaluate(()=>{
    const d=latestDesignData;
    return d.serverSizing.requirements.cn.servers>0 && getLayoutFeasibilityAudits(d).find(x=>x.layout==='dedicated').status==='单实例不适配';
  }));
  check('split-formula-linked',await page.locator('#formulaOutput').textContent().then(s=>s.includes('资源总量下界')&&s.includes('可行台数未确认')));
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1100});
    await page.locator('.layout-feasibility').scrollIntoViewIfNeeded();
    check('layout-'+width,await page.locator('.layout-feasibility').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.screenshot({path:path.join(out,`comparison-${width}.png`)});
  }
  const saveExport=async module=>{
    const directory=path.join(out,module);fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
    const pending=page.waitForEvent('download');await page.locator('#downloadExcelBtn').click();
    await(await pending).saveAs(path.join(directory,'planning.xlsx'));
    for(const [id,file] of [['downloadTopologyBtn','network.png'],['downloadServerTopologyBtn','servers.png']]) {
      const wait=page.waitForEvent('download');await page.locator('#'+id).click();await(await wait).saveAs(path.join(directory,file));
      check(module+'-'+file,fs.statSync(path.join(directory,file)).size>1000);
    }
    check(module+'-excel-status-linked',await page.evaluate(()=>JSON.stringify(buildExcelSheets(latestDesignData)).includes('组件组合落位核验')));
  };
  await saveExport('business');
  await page.evaluate(()=>{resetForm();$('designModule').value='reverse';render();});
  check('reverse-five-layouts-current-inventory',await page.evaluate(()=>{
    const d=latestDesignData,rows=getLayoutFeasibilityAudits(d);
    return rows.length===5&&rows.filter(r=>r.testedServers!==null).every(r=>r.testedServers===d.serverCount);
  }));
  check('reverse-no-input-mutation',await page.evaluate(()=>{
    const d=latestDesignData,model=JSON.stringify(d),draft=JSON.stringify(reverseTenantSpecs);
    getLayoutFeasibilityAudits(d);return model===JSON.stringify(d)&&draft===JSON.stringify(reverseTenantSpecs);
  }));
  await saveExport('reverse');
  await page.evaluate(()=>{$('environmentType').value='poc';render();});
  check('poc-all-mixed-assessed',await page.evaluate(()=>getLayoutFeasibilityAudits(latestDesignData).find(x=>x.layout==='allMixed').testedServers!==null));
  await page.evaluate(()=>{resetForm();businessTenantSpecs=Array.from({length:4},(_,i)=>({...businessTenantSpecs[0],tenantId:`TID${900+i}`,name:`租户${i+1}`,deploymentStrategy:i===3?'dedicated':'shared'}));$('gtmBindMode').value='dedicated';render();});
  check('multi-tenant-pools-kept',await page.evaluate(()=>{
    const d=latestDesignData,candidate=buildLayoutCandidate(d,'dedicated'),identity=getPlanRoleIdentityAudit(candidate);
    return !identity.issues.some(s=>s.includes('资源池不符')||s.includes('目标中心不符'));
  }));
  check('browser-errors',!errors.length);
} finally {
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors}));
if(results.some(r=>!r.pass))process.exitCode=1;
