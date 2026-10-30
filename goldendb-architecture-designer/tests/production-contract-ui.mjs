import {createRequire} from 'node:module';const {makeInfrastructure}=createRequire(import.meta.url)('./infrastructure-fixture.cjs');const {fillCapabilities}=createRequire(import.meta.url)('./capability-fixture.cjs');
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{chromium}from'/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/production-ui');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const check=(name,pass)=>results.push({name,pass:!!pass});
const load=async object=>{await page.locator('[data-file]').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(typeof object==='string'?object:JSON.stringify(object))});await page.waitForTimeout(80);};
const download=async(selector,name)=>{const pending=page.waitForEvent('download');await page.locator(selector).click();await(await pending).saveAs(path.join(out,name));return fs.readFileSync(path.join(out,name),'utf8');};
function complete(x){Object.assign(x.design,{id:'SYNTHETIC-ONLY',revision:'r1',targetVersion:'fixture-version',environmentId:'test-only'});const zones=[...new Set(x.topology.hosts.map(h=>h.id.startsWith('A-')?'0':'1'))];x.topology.clusters=[{id:'C'}];x.topology.dcs=zones.map(z=>({id:'D'+z,region:'R'}));x.topology.azs=zones.map(z=>({id:'Z'+z,dcId:'D'+z}));x.topology.racks=zones.map(z=>({id:'R'+z,azId:'Z'+z,powerDomain:'P'+z,networkDomain:'N'+z}));x.topology.hosts.forEach(h=>{const z=h.id.startsWith('A-')?'0':'1';Object.assign(h,{physicalId:'fixture-'+h.id,clusterId:'C',azId:'Z'+z,rackId:'R'+z});});x.evidence.forEach(e=>Object.assign(e,{designId:x.design.id,revision:'r1',targetVersion:'fixture-version',environmentId:'test-only',source:'synthetic://only/'+e.id,sourceVersion:'v1',sha256:'a'.repeat(64),collectedAt:'2026-01-01T00:00:00Z',validUntil:'2099-01-01T00:00:00Z',owner:'fixture',result:'pass',limitations:'仅自动测试材料，不能用于生产认证'}));x.infrastructure=makeInfrastructure({hostIds:x.topology.hosts.map(h=>h.id)},'fixture-version');return fillCapabilities(x);}
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/fixed-constraints.html'));
 check('fixed-default-unknown',await page.locator('.production-summary').textContent().then(s=>s.includes('未评估')));
 const raw=await page.evaluate(()=>{const r=structuredClone(GoldenDBFixedView.getCurrent());delete r.productionReview;return r;});
 const template=JSON.parse(await download('[data-template]','fixed-template.json'));check('template-bound-exactly',JSON.stringify(template.design.snapshot)===JSON.stringify(raw));
 const ready=complete(structuredClone(template));await load(ready);
 check('self-claims-not-approved',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='未评估'&&!r.materialsComplete&&r.issues.some(i=>i.code==='capacity-demand-unknown')&&r.canDeploy===false;}));

 check('fixed-capability-facts-60-hosts',ready.capabilities.claims.find(c=>c.id==='deployment').configuration.design.hostCount===60);
 check('fixed-capability-management-six',ready.capabilities.claims.find(c=>c.id==='management').configuration.count===6);
 check('fixed-capability-dn-24-3-1-six-replicas',ready.capabilities.claims.find(c=>c.id==='dn').configuration.tenants.map(t=>t.shards).join(',')==='24,3,1'&&ready.capabilities.claims.find(c=>c.id==='dn').configuration.placements.length===168);
 check('fixed-capability-dedicated-gtm-18',ready.capabilities.claims.find(c=>c.id==='gtm').configuration.kind==='dedicated'&&ready.capabilities.claims.find(c=>c.id==='gtm').configuration.placements.length===18);
 check('fixed-capability-ops-two',ready.capabilities.claims.find(c=>c.id==='operations').configuration.count===2);
 for(const id of ready.capabilities.claims.map(c=>c.id)){
  const unsupported=structuredClone(ready);unsupported.capabilities.claims.find(c=>c.id===id).decision='unsupported';await load(unsupported);
  check('fixed-capability-unsupported-'+id,await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='capability-unsupported')&&!r.canDeploy;}));
  if(id==='management'){
   const j=JSON.parse(await download('#downloadJson','unsupported-management-plan.json')),h=await download('#downloadReport','unsupported-management.html'),v=await download('#downloadNetwork','unsupported-management.svg');
   check('unsupported-management-all-exports',j.productionStatus==='未通过'&&h.includes('声明此配置不受目标版本支持')&&v.includes('生产设计门禁：阻断')&&j.productionReview.rows.some(r=>r.category==='version-capability'&&r.label==='管理组件数量与高可用'&&r.status==='阻断'));
  }
 }
 await load(ready);

 check('fixed-network-catalog-212',ready.connectivity.components.length===212&&new Set(ready.connectivity.components.map(c=>c.id)).size===212);
 check('fixed-network-catalog-groups',new Set(ready.connectivity.components.filter(c=>c.type==='DN').map(c=>c.group)).size===28&&ready.connectivity.components.filter(c=>c.type==='OPS').length===2);
 const wrongInterface=structuredClone(ready),ep=wrongInterface.connectivity.endpoints[0],component=wrongInterface.connectivity.components.find(c=>c.id===ep.componentId);ep.interfaceId=wrongInterface.infrastructure.interfaces.find(i=>i.hostId!==component.hostId).id;fillCapabilities(wrongInterface);await load(wrongInterface);
 check('wrong-component-host-blocked',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='endpoint-host')));
 const nj=JSON.parse(await download('#downloadJson','wrong-component-host.json')),nh=await download('#downloadReport','wrong-component-host.html'),ns=await download('#downloadNetwork','wrong-component-host.svg');
 check('component-failure-fixed-all-exports',nj.productionStatus==='未通过'&&nh.includes('组件端点引用了其他服务器的接口')&&ns.includes('生产设计门禁：阻断'));
 const omitted=structuredClone(ready);omitted.connectivity.links=[];fillCapabilities(omitted);omitted.connectivity.links=[];await load(omitted);
 check('removed-links-detected',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='component-uncovered')));
 await load(ready);
 const infraCases=[
 ['duplicate-ip',x=>x.interfaces[1].address=x.interfaces[0].address,'重复占用','阻断'],
 ['outside-subnet',x=>x.interfaces[0].address='10.1.0.1','不属于声明网段','阻断'],
 ['overlap',x=>x.networks.push({...x.networks[0],id:'N2',cidr:'10.0.1.0/24'}),'直连网段重叠','阻断'],
 ['acl-conflict',x=>x.acl.push({...x.acl[0],id:'deny',action:'deny'}),'允许','阻断'],
 ['wrong-port-version',x=>x.flows[0].targetVersion='wrong','目标版本不符','阻断'],
 ['unknown-memory',x=>x.hosts[0].memoryGiB=null,'缺少实测或实际规格','未评估'],
 ['ipv6',x=>{x.networks[0].cidr='2001:db8::/64';x.interfaces.forEach((v,i)=>v.address='2001:db8::'+(i+1));},'当前规划没有明确','未评估']
 ];
 for(const [name,mutate,phrase,status] of infraCases){const x=structuredClone(ready);mutate(x.infrastructure);fillCapabilities(x);await load(x);check('infrastructure-'+name,await page.locator('[data-result]').textContent().then(s=>s.includes(phrase))&&await page.evaluate(status=>GoldenDBFixedView.getCurrent().productionReview.status===status,status));if(name==='duplicate-ip'){const j=JSON.parse(await download('#downloadJson','duplicate-ip-plan.json')),h=await download('#downloadReport','duplicate-ip-report.html'),v=await download('#downloadNetwork','duplicate-ip-network.svg');check('network-failure-all-fixed-exports',j.productionStatus==='未通过'&&h.includes('重复占用')&&h.includes('生产准入未通过')&&v.includes('生产设计门禁：阻断'));}}
 await load(ready);
 const after=await page.evaluate(()=>{const r=structuredClone(GoldenDBFixedView.getCurrent());delete r.productionReview;return r;});check('import-never-mutates-planning',JSON.stringify(raw)===JSON.stringify(after));
 const report=JSON.parse(await download('[data-report]','fixed-gate-record.json'));check('report-current-binding',report.material.design.id==='SYNTHETIC-ONLY'&&report.report.status==='未评估'&&report.report.issues.some(i=>i.code==='capacity-demand-unknown')&&report.context.hostIds.length===60);
 const json=JSON.parse(await download('#downloadJson','fixed-plan.json')),html=await download('#downloadReport','fixed-deployment.html'),svg=await download('#downloadNetwork','fixed-network.svg');
 check('json-html-svg-gate-agree',json.productionReview.status==='未评估'&&json.productionReview.rows.filter(r=>r.category==='inventory-capacity').length===60&&html.includes('生产设计门禁：未评估')&&svg.includes('生产设计门禁：未评估')&&svg.includes('&quot;canDeploy&quot;:false'));
 const rendered=await browser.newPage();await rendered.goto('file://'+path.join(out,'fixed-deployment.html'));check('actual-html-60-rows',await rendered.locator('tbody tr').count()===60);await rendered.screenshot({path:path.join(out,'fixed-deployment.png'),fullPage:false});await rendered.close();
 const stale=structuredClone(ready);stale.evidence[0].validUntil='2026-02-01T00:00:00Z';await load(stale);check('expired-visible',await page.locator('[data-result]').textContent().then(s=>s.includes('已到期')&&s.includes('阻断')));
 const blockedPlan=JSON.parse(await download('#downloadJson','fixed-blocked-plan.json'));check('blocked-production-top-level',blockedPlan.productionStatus==='未通过'&&blockedPlan.productionReview.productionStatus==='未通过'&&(await page.locator('#result .status').textContent()).includes('生产准入未通过'));
 await load(ready);await page.locator('#maxComponents').fill('5');check('edited-input-disables-record',await page.locator('[data-report]').isDisabled());await page.locator('#run').click();check('changed-design-invalidates-evidence',await page.locator('[data-result]').textContent().then(s=>s.includes('规划参数或落位已改变')));
 await page.locator('#reset').click();await load('{broken');check('bad-json-clears-old-material',await page.locator('[data-result]').textContent().then(s=>s.includes('解析失败')&&s.includes('阻断')));
 await page.locator('[data-clear]').click();check('clear-returns-unknown',await page.locator('.production-summary').textContent().then(s=>s.includes('设计 待登记')));
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1100});await page.locator('#productionReview').screenshot({path:path.join(out,'fixed-'+width+'.png')});check('fixed-width-'+width,await page.locator('#productionReview').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 for(const module of ['business','reverse']){
  await page.evaluate(module=>{$('designModule').value=module;$('designModule').dispatchEvent(new Event('change',{bubbles:true}));},module);
  const template=JSON.parse(await download('[data-template]',module+'-template.json'));
  check(module+'-current-snapshot',await page.evaluate(t=>JSON.stringify(t.design.snapshot)===JSON.stringify(latestDesignData)&&t.design.entry===(latestDesignData.reverse?'reverse':'business'),template));
  const bad=structuredClone(template);bad.design.id='IMPORTED-'+module;bad.design.revision='v1';bad.design.targetVersion='fixture';bad.design.environmentId='test';bad.design.snapshot.mode='CHANGED';await load(bad);
  check(module+'-risk-formula-excel-same',await page.evaluate(()=>{const s=getProductionSummary(latestDesignData);return getProductionReport(latestDesignData).status==='阻断'&&$('riskList').textContent.includes(s)&&$('formulaOutput').textContent.includes(s)&&buildExcelSheets(latestDesignData).find(x=>x.name==='方案摘要').rows.some(r=>r.includes(s));}));
  check(module+'-mutation-detected',await page.evaluate(()=>{const d=latestDesignData,c=getProductionContext(d);d.mode='mutated';const changed=getProductionContext(d);d.mode=c.snapshot.mode;return changed.snapshot.mode==='mutated';}));
  const clipboard=await page.evaluate(async()=>{let copied='';const old=navigator.clipboard;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});try{copySummary();await Promise.resolve();return copied.includes(getProductionSummary(latestDesignData));}finally{Object.defineProperty(navigator,'clipboard',{configurable:true,value:old});}});check(module+'-clipboard-gate',clipboard);await download('#downloadExcelBtn',module+'-gate.xlsx');
  const record=JSON.parse(await download('[data-report]',module+'-gate.json'));check(module+'-record-blocked',record.report.status==='阻断'&&!record.report.canDeploy);
  await page.locator('[data-clear]').click();
 }
 for(const mode of ['local1az','local2az','twoSiteThreeDc','threeSiteFiveDc']){const r=await page.evaluate(mode=>{resetForm();$('deploymentMode').value=mode;render();if(!latestDesignData)return false;const c=getProductionContext(latestDesignData);return c.hostIds.length===c.hostZones.length&&c.hostIds.length===getPlanServers(latestDesignData).length;},mode);check('logical-domain-context-'+mode,r);}
 await page.evaluate(()=>{resetForm();$('designModule').value='business';$('designModule').dispatchEvent(new Event('change',{bubbles:true}));});
 for(const width of [390,875,1600]){await page.setViewportSize({width,height:1100});await page.locator('#productionReview').screenshot({path:path.join(out,'main-'+width+'.png')});check('main-width-'+width,await page.locator('#productionReview').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 // Inspect the PNG staging element used by the actual exporter before serialization.
 const png=await page.evaluate(async()=>{const fn=HTMLCanvasElement.prototype.toBlob;let seen=false;const observer=new MutationObserver(()=>{for(const n of document.querySelectorAll('body>div'))if(n.style.left==='-100000px'&&n.textContent.includes(getProductionSummary(latestDesignData)))seen=true;});observer.observe(document.body,{childList:true,subtree:true});try{const blob=await renderElementToPng($('topology'));return {seen,bytes:[...new Uint8Array(await blob.arrayBuffer())]};}finally{observer.disconnect();HTMLCanvasElement.prototype.toBlob=fn;}});fs.writeFileSync(path.join(out,'main-gate.png'),Buffer.from(png.bytes));check('png-carries-gate',png.seen&&png.bytes.length>1000);
 check('no-page-errors',errors.length===0);
}finally{await browser.close();const files=['infrastructure-contract.js','production-contract.js','production-contract-ui.js','production-contract.css','app.js','index.html','fixed-constraints-ui.js','fixed-constraints.html'];fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,sourceHashes:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.resolve('goldendb-architecture-designer',n))).digest('hex')]))},null,2));}
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass),errors}));if(errors.length||results.some(r=>!r.pass))process.exitCode=1;
