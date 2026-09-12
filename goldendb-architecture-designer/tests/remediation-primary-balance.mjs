import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out = path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-remediation-20260906/mp/evidence/balance');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('file://' + path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(() => {
    const key = 'TID-unit';
    const role = (g, r) => `${key}-DN-G${g}-${r}`;
    const tenant = { tenantId: key, name: '单元租户', shardCount: 4, replicasPerShard: 2,
      primaryStrategy: 'centerA', deploymentStrategy: 'shared', dnCores: 16, dnMemoryGb: 64, futureDataTb: 2 };
    const config = { tenantPlans: [tenant], mode: 'local1az', azCount: 1, maxDnPerServer: 2,
      maxTenantDnPerServer: 2, dnTenantPlacement: 'isolated', reserveRatio: .2 };
    const fixture = () => [[role(1,'Master'),role(2,'Master')], [role(1,'Slave1'),role(2,'Slave1')],
      [role(3,'Master'),role(4,'Master')], [role(3,'Slave1'),role(4,'Slave1')]].map((roles,i)=>({
        id:`H${i}`, azIndex:0, az:'中心A', tenantPool:'shared', componentKeys:['dn'], roles,
        dnCount:2, cnCount:0, spec:{cores:64,memoryGb:256,diskTb:4} }));
    const count = hosts => hosts.map(h => h.roles.filter(r => r.endsWith('-Master')).length);
    const checks = [];
    const hosts=fixture(), before=structuredClone(hosts);
    balanceDnPrimaryRoles(hosts,config);
    checks.push({name:'unit-2-0-2-0-to-1-1-1-1',pass:count(hosts).every(x=>x===1)});
    checks.push({name:'unit-resource-and-count-invariant',pass:hosts.every((h,i)=>
      JSON.stringify(getServerResourceAudit(h,config))===JSON.stringify(getServerResourceAudit(before[i],config)) && h.dnCount===2)});
    checks.push({name:'unit-unique-primary-and-site',pass:!getDnPlacementIssues({...config,reverse:true,serverPlan:hosts}).length});
    const once=JSON.stringify(hosts); balanceDnPrimaryRoles(hosts,config);
    checks.push({name:'unit-idempotent',pass:once===JSON.stringify(hosts)});
    checks.push({name:'unit-same-group-hosts-preserved',pass:hosts.every((h,i)=>
      JSON.stringify(h.roles.map(r=>parseDnPlacementRole(r).group).sort())===JSON.stringify(before[i].roles.map(r=>parseDnPlacementRole(r).group).sort()))});
    const odd=fixture();odd.forEach(h=>{h.roles=h.roles.filter(r=>parseDnPlacementRole(r).group!==4);h.dnCount=h.roles.length;});
    balanceDnPrimaryRoles(odd,{...config,tenantPlans:[{...tenant,shardCount:3}]});
    checks.push({name:'unit-three-masters-four-hosts',pass:count(odd).reduce((s,n)=>s+n,0)===3&&Math.max(...count(odd))-Math.min(...count(odd))<=1});
    for(const kind of ['missing','overloaded','wrong-pool','duplicate-group','no-spec','density']) {
      const h=fixture(), c=structuredClone(config);
      if(kind==='missing')h[1].roles.pop();
      if(kind==='overloaded')h[0].spec.cores=16;
      if(kind==='wrong-pool')h[0].tenantPool='other';
      if(kind==='duplicate-group'){h[0].roles[1]=role(1,'Slave1');h[1].roles[0]=role(2,'Master');}
      if(kind==='no-spec')delete h[0].spec;
      if(kind==='density')c.maxDnPerServer=1;
      const saved=JSON.stringify(h);balanceDnPrimaryRoles(h,c);
      checks.push({name:`unit-preserve-invalid-${kind}`,pass:saved===JSON.stringify(h)});
    }
    const single=fixture(); const c={...config,tenantPlans:[{...tenant,replicasPerShard:1}]};
    single.forEach(h=>{h.roles=h.roles.filter(r=>r.endsWith('-Master'));h.dnCount=h.roles.length;});
    const saved=JSON.stringify(single);balanceDnPrimaryRoles(single,c);
    checks.push({name:'unit-no-slave-no-unsafe-move',pass:saved===JSON.stringify(single)});
    return checks;
  }));
  for (const module of ['business','reverse']) for (const mode of ['local2az','twoSiteThreeDc','threeSiteFiveDc'])
    for (const environment of ['production','poc']) for (const policy of ['centerA','centerB','balanced']) {
      results.push(await page.evaluate(({module,mode,environment,policy})=>{
        resetForm(); $('designModule').value=module;
        // Preserve each module's native parameter binding through the controls.
        $('designModule').dispatchEvent(new Event('change',{bubbles:true}));
        const modeInput = module==='business' ? $('deploymentMode') : $('reverseDeploymentMode');
        modeInput.value=mode;
        $('environmentType').value=environment;
        const specs=module==='business'?businessTenantSpecs:reverseTenantSpecs;
        specs.forEach(t=>{t.primaryStrategy=policy;});
        const optimize=balanceDnPrimaryRoles;
        let before;
        try {balanceDnPrimaryRoles=()=>{};render();before=structuredClone(latestDesignData);}
        finally{balanceDnPrimaryRoles=optimize;}
        render();const d=latestDesignData, a=getPlanServers(before), b=getPlanServers(d);
        const stable=a.length===b.length && a.every((s,i)=>{
          const h=b[i];
          return s.id===h.id && s.azIndex===h.azIndex && s.tenantPool===h.tenantPool
            && JSON.stringify(s.spec)===JSON.stringify(h.spec)
            && JSON.stringify(s.resourceAudit)===JSON.stringify(h.resourceAudit)
            && JSON.stringify(s.roles.filter(r=>!isDnRole(r)))===JSON.stringify(h.roles.filter(r=>!isDnRole(r)))
            && before.tenantPlans.every(t=>countTenantDnRoles(s,getTenantKey(t))===countTenantDnRoles(h,getTenantKey(t)));
        });
        const sameIssues=JSON.stringify(getDnPlacementIssues(before))===JSON.stringify(getDnPlacementIssues(d));
        const counts=getDnPrimaryDistribution(d).map(x=>({az:x.az,spread:x.spread,counts:x.hosts.map(h=>h.masters)}));
        const example=module!=='business'||mode!=='local2az'||environment!=='production'||policy==='balanced'
          || counts.filter(x=>x.counts.some(Boolean)).every(x=>x.counts.every(n=>n===1));
        const details=getDnPrimaryDistribution(d).every(item=>$('placementDetails').textContent.includes(item.text));
        const cleanGraphs=!$('topology').querySelector('.cn-placement-summary')&&!$('serverTopology').querySelector('.cn-placement-summary');
        return {module,mode,environment,policy,counts,pass:stable&&sameIssues&&example&&details&&cleanGraphs&&d.mode===mode&&d.environment===environment};
      },{module,mode,environment,policy}));
    }
  for (const count of [3,4]) for (const mixed of [false,true]) {
    results.push(await page.evaluate(({count,mixed})=>{
      resetForm(); $('designModule').value='business'; $('deploymentMode').value='local2az';
      $('businessAllowCnDnMixed').checked=mixed;
      const base=businessTenantSpecs[0];
      businessTenantSpecs=Array.from({length:count},(_,i)=>({...base,tenantId:createTenantIdentity(),name:`租户${i}`,
        primaryStrategy:['centerA','centerB','balanced'][i%3],deploymentStrategy:i===2?'dedicated':'shared',
        minShardsManual:true,minShards:3,qps:50000+i*10000}));
      const fn=balanceDnPrimaryRoles;let before;
      try{balanceDnPrimaryRoles=()=>{};render();before=structuredClone(latestDesignData);}finally{balanceDnPrimaryRoles=fn;}
      render();const d=latestDesignData;
      const same=JSON.stringify(getDnPlacementIssues(before))===JSON.stringify(getDnPlacementIssues(d));
      const a=getPlanServers(before),b=getPlanServers(d);
      return {name:`${count}-tenants-mixed-${mixed}`,pass:same&&a.length===b.length&&a.every((s,i)=>
        JSON.stringify(s.resourceAudit)===JSON.stringify(b[i].resourceAudit)&&s.tenantPool===b[i].tenantPool
        &&d.tenantPlans.every(t=>countTenantDnRoles(s,getTenantKey(t))===countTenantDnRoles(b[i],getTenantKey(t))))};
    },{count,mixed}));
  }
  await page.evaluate(()=>{resetForm();$('deploymentMode').value='local2az';businessTenantSpecs[0].primaryStrategy='centerA';render();});
  results.push(await page.evaluate(()=>{
    const items=getDnPrimaryDistribution(latestDesignData);
    const sheet=buildExcelSheets(latestDesignData).find(s=>s.name==='方案摘要');
    return {name:'final-plan-summary-and-excel',pass:items.every(item=>
      $('placementDetails').textContent.includes(item.text)&&!$('topology').textContent.includes(item.text)
      &&!$('serverTopology').textContent.includes(item.text)&&sheet.rows.some(row=>row.includes(item.text)))};
  }));
  for(const width of [390,875,1600]) {
    await page.setViewportSize({width,height:1000});
    results.push(await page.evaluate(width=>({name:`balance-text-${width}`,pass:[...document.querySelectorAll('.dn-primary-distribution')]
      .every(n=>n.scrollWidth<=n.clientWidth+2)}),width));
  }
  await page.locator('#topology').screenshot({path:path.join(out,'balanced-centerA.png')});
  await page.locator('#placementDetails').screenshot({path:path.join(out,'placement-details.png')});
  for (const id of ['downloadTopologyBtn','downloadServerTopologyBtn']) {
    const pending=page.waitForEvent('download');await page.locator('#'+id).click();const download=await pending;
    await download.saveAs(path.join(out,id+'.png'));
    results.push({name:id,pass:!(await download.failure())});
  }
  results.push(await page.evaluate(()=>{
    businessTenantSpecs[0].qps='';render();
    const cleared=!latestDesignData&&!$('placementDetails').querySelector('.cn-placement-summary');
    businessTenantSpecs[0].qps=100000;render();
    return {name:'details-invalid-clear-and-restore',pass:cleared&&!!$('placementDetails').querySelector('.cn-placement-summary')};
  }));
  results.push({name:'browser-errors',errors,pass:!errors.length});
} finally {
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();
}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length}));
if(results.some(r=>!r.pass))process.exitCode=1;
