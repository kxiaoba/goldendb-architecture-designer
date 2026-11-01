import {createRequire as selectionRequire} from 'node:module';const {addAlternative}=selectionRequire(import.meta.url)('./selection-fixture.cjs');
import {createRequire as mtuRequire} from 'node:module';const {breakFlowMtu}=mtuRequire(import.meta.url)('./mtu-fixture.cjs');
import {createRequire as physicalRequire} from 'node:module';const {breakPhysicalMtu}=physicalRequire(import.meta.url)('./physical-fixture.cjs');
import {createRequire as forwardingRequire} from 'node:module';const {makeLoopMaterial}=forwardingRequire(import.meta.url)('./forwarding-fixture.cjs');
import {createRequire} from 'node:module';const {makeInfrastructure}=createRequire(import.meta.url)('./infrastructure-fixture.cjs');const {fillCapabilities}=createRequire(import.meta.url)('./capability-fixture.cjs');
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{chromium}from'/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/production-ui');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const check=(name,pass)=>results.push({name,pass:!!pass});
const load=async object=>{await page.locator('[data-file]').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(typeof object==='string'?object:JSON.stringify(object))});await page.waitForTimeout(80);};
const download=async(selector,name)=>{const pending=page.waitForEvent('download');await page.locator(selector).click();await(await pending).saveAs(path.join(out,name));return fs.readFileSync(path.join(out,name),'utf8');};
function complete(x){Object.assign(x.design,{id:'SYNTHETIC-ONLY',revision:'r1',targetVersion:'fixture-version',environmentId:'test-only'});const zones=[...new Set(x.topology.hosts.map(h=>h.id.startsWith('A-')?'0':'1'))];x.topology.clusters=[{id:'C'}];x.topology.dcs=zones.map(z=>({id:'D'+z,region:'R'}));x.topology.azs=zones.map(z=>({id:'Z'+z,dcId:'D'+z}));x.topology.racks=zones.map(z=>({id:'R'+z,azId:'Z'+z,powerDomain:'P'+z,networkDomain:'N'+z}));x.topology.hosts.forEach(h=>{const z=h.id.startsWith('A-')?'0':'1';Object.assign(h,{physicalId:'fixture-'+h.id,clusterId:'C',azId:'Z'+z,rackId:'R'+z});});x.evidence.forEach(e=>Object.assign(e,{designId:x.design.id,revision:'r1',targetVersion:'fixture-version',environmentId:'test-only',source:'synthetic://only/'+e.id,sourceVersion:'v1',sha256:'a'.repeat(64),collectedAt:'2026-01-01T00:00:00Z',validUntil:'2099-01-01T00:00:00Z',owner:'fixture',result:'pass',limitations:'仅自动测试材料，不能用于生产认证'}));x.infrastructure=makeInfrastructure({hostIds:x.topology.hosts.map(h=>h.id)},'fixture-version');return fillCapabilities(x);}
function breakReturnRoute(material){const x=structuredClone(material),ep=new Map(x.connectivity.endpoints.map(e=>[e.id,e])),comp=new Map(x.connectivity.components.map(c=>[c.id,c]));const link=x.connectivity.links.find(l=>{const a=ep.get(l.sourceEndpointId),b=ep.get(l.targetEndpointId);return a?.kind==='component'&&b?.kind==='component'&&comp.get(a.componentId).hostId!==comp.get(b.componentId).hostId;});if(!link)throw Error('fixture requires different hosts');const p=x.connectivity.routing.paths.find(p=>p.linkId===link.id),t=x.connectivity.routing.tables.find(t=>t.id===p.reverse.tableId),address=x.infrastructure.interfaces.find(i=>i.id===ep.get(link.sourceEndpointId).interfaceId).address;t.routes.push({id:'RETURN-DROP',destination:address+'/'+(address.includes(':')?128:32),kind:'blackhole',networkId:'not-applicable',interfaceId:'not-applicable',nextHop:'not-applicable'});return x;}
function breakReturnAdjacency(material){const x=structuredClone(material),f=x.connectivity.routing.fabric,p=f.directPaths.find(p=>p.reverseAdjacencyId!=='not-applicable');if(!p)throw Error('fixture requires direct return');f.adjacencies.find(a=>a.id===p.reverseAdjacencyId).state='down';return x;}
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

 const endToEndMtu=breakFlowMtu(ready);fillCapabilities(endToEndMtu);await load(endToEndMtu);
 check('fixed-end-to-end-mtu-blocked',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='flow-mtu-insufficient')&&!r.issues.some(i=>i.code==='physical-mtu-insufficient')&&!r.canDeploy;}));
 const mtuJson=JSON.parse(await download('#downloadJson','end-to-end-mtu.json')),mtuHtml=await download('#downloadReport','end-to-end-mtu.html'),mtuSvg=await download('#downloadNetwork','end-to-end-mtu.svg');
 check('mtu-all-fixed-exports',mtuJson.productionStatus==='未通过'&&mtuHtml.includes('端到端已知IP MTU')&&mtuSvg.includes('生产设计门禁：阻断')&&mtuJson.productionReview.rows.some(r=>r.category==='network-mtu'&&r.status==='阻断'&&r.parts.length>0&&r.bottlenecks.length>0));
 const choice=structuredClone(ready),chosen=addAlternative(choice);chosen.cable.state='down';fillCapabilities(choice);await load(choice);
 check('fixed-spare-failure-separated',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return !r.issues.some(i=>i.code==='physical-path-down')&&r.rows.some(x=>x.category==='network-physical-alternative'&&x.status==='阻断')&&r.rows.some(x=>x.category==='network-path-selection'&&x.activePathId)&&!r.canDeploy;}));
 const choiceJson=JSON.parse(await download('#downloadJson','path-selection.json')),choiceHtml=await download('#downloadReport','path-selection.html');await download('#downloadNetwork','path-selection.svg');
 check('selection-fixed-exports',choiceJson.productionReview.rows.some(x=>x.category==='network-physical-alternative'&&x.detail.includes('备选诊断'))&&choiceHtml.includes('不能证明自动切换')&&choiceHtml.includes('物理路径选择'));
 chosen.selection.activePathId=chosen.candidate.id;await load(choice);check('selection-change-invalidates-claim',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
 fillCapabilities(choice);await load(choice);check('selected-spare-failure-blocks',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='physical-path-down');}));
 const oldMtu=structuredClone(ready);delete oldMtu.connectivity.routing.packetTargets;fillCapabilities(oldMtu);await load(oldMtu);check('old-packet-targets-unknown',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='flow-mtu-missing')));
 await load(breakFlowMtu(ready));check('packet-target-change-invalidates-version-binding',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
 await load(ready);
 const badMtu=breakPhysicalMtu(ready);fillCapabilities(badMtu);await load(badMtu);
 check('fixed-physical-mtu-blocked',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='physical-mtu-insufficient')&&!r.canDeploy;}));
 const physicalJson=JSON.parse(await download('#downloadJson','physical-mtu.json')),physicalHtml=await download('#downloadReport','physical-mtu.html'),physicalSvg=await download('#downloadNetwork','physical-mtu.svg');
 check('physical-all-fixed-exports',physicalJson.productionStatus==='未通过'&&physicalHtml.includes('路径已知有效IP MTU')&&physicalSvg.includes('生产设计门禁：阻断')&&physicalJson.productionReview.rows.some(r=>r.category==='network-physical'&&r.status==='阻断'&&r.segments.length===3));
 const oldPhysical=structuredClone(ready);delete oldPhysical.connectivity.routing.physical;fillCapabilities(oldPhysical);await load(oldPhysical);check('old-physical-material-unknown',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='physical-missing')));
 await load(breakPhysicalMtu(ready));check('physical-change-invalidates-version-binding',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
 await load(ready);
 const loopMaterial=makeLoopMaterial(ready);fillCapabilities(loopMaterial);await load(loopMaterial);
 check('fixed-computed-forwarding-loop-blocked',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='forwarding-loop')&&!r.canDeploy;}));
 const hopJson=JSON.parse(await download('#downloadJson','forwarding-loop.json')),hopHtml=await download('#downloadReport','forwarding-loop.html'),hopSvg=await download('#downloadNetwork','forwarding-loop.svg');
 check('forwarding-loop-all-fixed-exports',hopJson.productionStatus==='未通过'&&hopHtml.includes('检测到确定性转发循环')&&hopSvg.includes('生产设计门禁：阻断')&&hopJson.productionReview.rows.some(r=>r.category==='network-hop'&&r.status==='阻断'&&r.traces.some(t=>t.hops.some(h=>h.includes('LOOP-R')))));
 const oldForwarding=structuredClone(ready);delete oldForwarding.connectivity.routing.forwarding;fillCapabilities(oldForwarding);await load(oldForwarding);check('old-forwarding-material-unknown',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='forwarding-missing')));
 await load(makeLoopMaterial(ready));check('forwarding-change-invalidates-version-binding',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
 await load(ready);
 const adjacencyDown=breakReturnAdjacency(ready);fillCapabilities(adjacencyDown);await load(adjacencyDown);
 check('fixed-return-adjacency-down-blocked',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='fabric-adjacency-down'&&i.path.endsWith('返回'))&&!r.canDeploy;}));
 const fj=JSON.parse(await download('#downloadJson','return-adjacency-down.json')),fh=await download('#downloadReport','return-adjacency-down.html'),fv=await download('#downloadNetwork','return-adjacency-down.svg');
 check('adjacency-all-fixed-exports',fj.productionStatus==='未通过'&&fh.includes('路径使用的邻接明确为down')&&fv.includes('生产设计门禁：阻断')&&fj.productionReview.rows.some(r=>r.category==='network-fabric'&&r.status==='阻断'));
 const oldFabric=structuredClone(ready);delete oldFabric.connectivity.routing.fabric;fillCapabilities(oldFabric);await load(oldFabric);check('old-fabric-material-unknown',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='fabric-missing')));
 const staleFabric=breakReturnAdjacency(ready);await load(staleFabric);check('fabric-change-invalidates-version-binding',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
 await load(ready);
 const returnDrop=breakReturnRoute(ready);fillCapabilities(returnDrop);await load(returnDrop);
 check('fixed-return-route-drop-blocked',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='route-blackhole'&&i.path.endsWith('返回'))&&!r.canDeploy;}));
 const rj=JSON.parse(await download('#downloadJson','return-route-drop.json')),rh=await download('#downloadReport','return-route-drop.html'),rs=await download('#downloadNetwork','return-route-drop.svg');
 check('return-route-all-fixed-exports',rj.productionStatus==='未通过'&&rh.includes('最长匹配路由明确丢弃目标流量')&&rs.includes('生产设计门禁：阻断')&&rj.productionReview.rows.some(r=>r.category==='network-path'&&r.status==='阻断'));
 const oldRoutes=structuredClone(ready);delete oldRoutes.connectivity.routing;fillCapabilities(oldRoutes);await load(oldRoutes);check('old-routing-material-unknown',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='routing-missing')));
 const changedRoute=breakReturnRoute(ready);await load(changedRoute);check('routing-change-invalidates-support-binding',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
 await load(ready);
 const conflict=structuredClone(ready),originalListener=conflict.connectivity.services.listeners[0];conflict.connectivity.services.listeners.push({...originalListener,id:'CONFLICT-LISTENER'});fillCapabilities(conflict);await load(conflict);
 check('fixed-listener-conflict-blocked',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='阻断'&&r.issues.some(i=>i.code==='listener-conflict')&&!r.canDeploy;}));
 const lj=JSON.parse(await download('#downloadJson','listener-conflict.json')),lh=await download('#downloadReport','listener-conflict.html'),ls=await download('#downloadNetwork','listener-conflict.svg');
 check('listener-conflict-all-fixed-exports',lj.productionStatus==='未通过'&&lh.includes('同机同命名空间监听范围重叠')&&ls.includes('生产设计门禁：阻断')&&lj.productionReview.rows.some(r=>r.category==='service-listener'&&r.status==='阻断'));
 const noServices=structuredClone(ready);delete noServices.connectivity.services;fillCapabilities(noServices);await load(noServices);
 check('fixed-old-material-listener-unknown',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='listener-missing')));
 const staleListener=structuredClone(ready);staleListener.connectivity.services.listeners[0].port++;await load(staleListener);
 check('listener-change-invalidates-version-claim',await page.evaluate(()=>GoldenDBFixedView.getCurrent().productionReview.issues.some(i=>i.code==='capability-configuration')));
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
 ['ipv6-stale-listeners',x=>{x.networks[0].cidr='2001:db8::/64';x.interfaces.forEach((v,i)=>v.address='2001:db8::'+(i+1));},'具体绑定地址','阻断']
 ];
 for(const [name,mutate,phrase,status] of infraCases){const x=structuredClone(ready);mutate(x.infrastructure);fillCapabilities(x);await load(x);check('infrastructure-'+name,await page.locator('[data-result]').textContent().then(s=>s.includes(phrase))&&await page.evaluate(status=>GoldenDBFixedView.getCurrent().productionReview.status===status,status));if(name==='duplicate-ip'){const j=JSON.parse(await download('#downloadJson','duplicate-ip-plan.json')),h=await download('#downloadReport','duplicate-ip-report.html'),v=await download('#downloadNetwork','duplicate-ip-network.svg');check('network-failure-all-fixed-exports',j.productionStatus==='未通过'&&h.includes('重复占用')&&h.includes('生产准入未通过')&&v.includes('生产设计门禁：阻断'));}}
 const freshV6=structuredClone(ready);freshV6.infrastructure.networks[0].cidr='2001:db8::/64';freshV6.infrastructure.interfaces.forEach((v,i)=>v.address='2001:db8::'+(i+1));createRequire(import.meta.url)('./listener-fixture.cjs').fillListeners(freshV6);fillCapabilities(freshV6);await load(freshV6);check('ipv6-updated-listeners-no-binding-error',await page.evaluate(()=>{const r=GoldenDBFixedView.getCurrent().productionReview;return r.status==='未评估'&&!r.issues.some(i=>i.code==='listener-ownership'||i.code==='listener-target-address'||i.code==='listener-conflict');}));
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
}finally{await browser.close();const files=['tests/selection-fixture.cjs','network-mtu.js','tests/mtu-fixture.cjs','network-physical.js','tests/physical-fixture.cjs','network-forwarding.js','tests/forwarding-fixture.cjs','network-fabric.js','network-routing.js','service-listeners.js','component-network.js','infrastructure-contract.js','production-contract.js','production-contract-ui.js','production-contract.css','app.js','index.html','fixed-constraints-ui.js','fixed-constraints.html'];fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,sourceHashes:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.resolve('goldendb-architecture-designer',n))).digest('hex')]))},null,2));}
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass),errors}));if(errors.length||results.some(r=>!r.pass))process.exitCode=1;
