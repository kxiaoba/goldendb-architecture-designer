/* Explicit physical paths and effective IP MTU declarations; no live link or failover proof. */
(function(root){'use strict';
const risk=root.GoldenDBSharedRisk||(typeof module==='object'&&module.exports?require('./network-shared-risk.js'):null);
const ip=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null),SCHEMA='goldendb-network-physical-v1';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048,key=r=>JSON.stringify([r?.kind,r?.id]),mtu=x=>Number.isInteger(x)&&x>=68&&x<=65535;
function template(){return {schema:SCHEMA,targetVersion:null,switches:[],faultDomains:[],ports:[],bindings:[],cables:[],transits:[],paths:[],selections:[],identities:null,review:{coverage:'unknown',source:null}};}
function evaluate(input,context,infra,connections,targetVersion,usedAdjacencyIds){
 const issues=[],rows=[],alternativeIssues=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message}),err=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const done=()=>({issues,rows,alternativeIssues,status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明物理路径待实测',canDeploy:false});
 if(input==null){unknown('physical-missing','physical','缺少物理端口、链路与MTU资料，逻辑邻接不能替代物理路径');rows.push({category:'network-physical',label:'物理链路与MTU',status:'未评估',detail:'缺少实际端口、线缆、交换转发及有效IP MTU资料'});return done();}
 const fields=(x,keys,p)=>{if(!obj(x)){err('physical-type',p,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))err('physical-field',p+'.'+k,'未建模字段，不得隐含参与物理转发');return true;};
 const index=(a,p,max=5000)=>{const m=new Map();if(!Array.isArray(a)||a.length>max){err('physical-list',p,'须为最多'+max+'项清单');return m;}for(const v of a){if(!obj(v)||!text(v.id)){err('physical-id',p,'ID无效');continue;}if(m.has(v.id))err('physical-duplicate',p,'ID重复：'+v.id);else m.set(v.id,v);}return m;};
 if(!fields(input,['schema','targetVersion','switches','faultDomains','ports','bindings','cables','transits','paths','selections','identities','review'],'physical'))return done();
 if(input.schema!==SCHEMA)err('physical-schema','physical','物理路径材料版本不支持');if(!text(input.targetVersion)||!text(targetVersion))unknown('physical-version','physical','缺少目标版本');else if(input.targetVersion!==targetVersion)err('physical-version','physical','物理资料与目标版本不一致');
 if(fields(input.review,['coverage','source'],'physical.review')){if(input.review.coverage==='unknown')unknown('physical-coverage','physical.review','物理清单完整性未明确');else if(input.review.coverage!=='declared-complete')err('physical-coverage','physical.review','仅允许unknown/declared-complete');if(!text(input.review.source))unknown('physical-source','physical.review','缺少资料来源');}
 const fabric=connections?.routing?.fabric;if(!fabric){unknown('physical-fabric-missing','physical','尚无可对应的逻辑设备邻接');return done();}
 const switches=index(input.switches,'switches',1000),domains=index(input.faultDomains,'faultDomains'),ports=index(input.ports,'ports'),bindings=index(input.bindings,'bindings'),cables=index(input.cables,'cables'),transits=index(input.transits,'transits'),paths=index(input.paths,'physical.paths');
 const networks=index(infra?.networks,'networks'),hostIfaces=index(infra?.interfaces,'hostInterfaces'),routerIfaces=index(fabric.interfaces,'routerInterfaces'),devices=index(fabric.devices,'devices',1000),endpoints=index(connections?.endpoints,'endpoints'),adjacencies=index(fabric.adjacencies,'adjacencies');
 const facts=(v,p)=>{if(!text(v.source))unknown('physical-source',p,'缺少配置/采集资料来源');};
 const state=(v,p)=>{if(!['up','down','unknown'].includes(v.state))err('physical-state',p,'状态须up/down/unknown');};
 const checkMtu=(v,p)=>{if(v.ipMtuBytes!==null&&!mtu(v.ipMtuBytes))err('physical-mtu-value',p,'有效IP MTU须为68..65535整数或null；不接受帧长度/字符串/无限值');};
 const domainRefs=(v,p)=>{if(!Array.isArray(v.faultDomainIds)){err('physical-domains',p,'故障域引用须为数组，未知可填空数组');return;}if(new Set(v.faultDomainIds).size!==v.faultDomainIds.length)err('physical-domains',p,'故障域引用重复');for(const id of v.faultDomainIds)if(!domains.has(id))err('physical-domain-reference',p,'故障域引用不存在');};
 for(const d of domains.values()){fields(d,['id','kind','source'],d.id);if(!['power','rack','conduit','site','device','other'].includes(d.kind))err('physical-domain-kind',d.id,'故障域类型未支持');facts(d,d.id);}
 const assets=new Set([...devices.values()].map(d=>d.assetId).filter(text));
 for(const s of switches.values()){fields(s,['id','assetId','model','source','faultDomainIds'],s.id);facts(s,s.id);domainRefs(s,s.id);if(!text(s.assetId)||!text(s.model))unknown('physical-switch-facts',s.id,'交换设备资产/型号未明确');else{if(assets.has(s.assetId))err('physical-asset-alias',s.id,'物理资产重复登记，不能作为独立交换/路由设备');assets.add(s.assetId);}}
 const owners=new Set();
 for(const p of ports.values()){
  fields(p,['id','owner','name','networkId','mode','state','ipMtuBytes','source','faultDomainIds'],p.id);fields(p.owner,['kind','id'],p.id+'.owner');facts(p,p.id);state(p,p.id);checkMtu(p,p.id);domainRefs(p,p.id);
  const k=p.owner?.kind,id=p.owner?.id,valid=k==='host'?context?.hostIds?.includes(id):k==='router'?devices.has(id):k==='switch'?switches.has(id):k==='external'?endpoints.get(id)?.kind==='external':false;
  if(!valid)err('physical-owner',p.id,'端口归属对象不存在');if(!text(p.name))unknown('physical-port-name',p.id,'缺少物理端口名');else{const tag=JSON.stringify([k,id,p.name]);if(owners.has(tag))err('physical-port-alias',p.id,'同一物理端口重复登记；聚合/子接口不能冒充独立端口');owners.add(tag);}
  if(!networks.has(p.networkId))err('physical-network',p.id,'端口网段不存在');if(!['dedicated-l2','unknown'].includes(p.mode))err('physical-mode',p.id,'本批仅建模单网段专用物理端口；聚合/隧道等须保留unknown');
 }
 const bound=new Map(),boundPorts=new Set();
 function logical(ref){let i,owner;if(ref?.kind==='host-interface'){i=hostIfaces.get(ref.id);owner={kind:'host',id:i?.hostId};}else if(ref?.kind==='router-interface'){i=routerIfaces.get(ref.id);owner={kind:'router',id:i?.deviceId};}else if(ref?.kind==='external-endpoint'&&endpoints.get(ref.id)?.kind==='external'){i=endpoints.get(ref.id);owner={kind:'external',id:i.id};}return i?{...i,owner}:null;}
 for(const b of bindings.values()){
  fields(b,['id','interface','portId','mode','source'],b.id);fields(b.interface,['kind','id'],b.id+'.interface');facts(b,b.id);const i=logical(b.interface),p=ports.get(b.portId);
  if(!i||!p||key(i.owner)!==key(p.owner)||i.networkId!==p.networkId)err('physical-binding',b.id,'逻辑接口未绑定其真实归属/网段的物理端口');
  if(!['one-to-one','unknown'].includes(b.mode))err('physical-binding-mode',b.id,'本批仅支持one-to-one或unknown；不模拟bond/子接口');
  const k=key(b.interface);if(bound.has(k)||boundPorts.has(b.portId))err('physical-binding-duplicate',b.id,'逻辑接口/物理端口重复绑定，不能任选');else bound.set(k,b);boundPorts.add(b.portId);
 }
 const cabled=new Set();
 for(const c of cables.values()){
  fields(c,['id','aPortId','bPortId','state','ipMtuBytes','source','faultDomainIds'],c.id);facts(c,c.id);state(c,c.id);checkMtu(c,c.id);domainRefs(c,c.id);const a=ports.get(c.aPortId),b=ports.get(c.bPortId);
  if(!a||!b||c.aPortId===c.bPortId)err('physical-cable-port',c.id,'线缆两端须为不同有效物理端口');else if(a.networkId!==b.networkId)err('physical-cable-network',c.id,'线缆两端网段不同，标签转换未建模');
  for(const id of[c.aPortId,c.bPortId]){if(cabled.has(id))err('physical-port-occupied',c.id,'同一物理端口被多条线缆占用');cabled.add(id);}
 }
 const transferKeys=new Set();
 for(const t of transits.values()){
  fields(t,['id','switchId','fromPortId','toPortId','networkId','state','ipMtuBytes','source'],t.id);facts(t,t.id);state(t,t.id);checkMtu(t,t.id);const a=ports.get(t.fromPortId),b=ports.get(t.toPortId);
  if(!switches.has(t.switchId)||!a||!b||a.id===b.id||[a,b].some(p=>p.owner?.kind!=='switch'||p.owner.id!==t.switchId||p.networkId!==t.networkId))err('physical-transit',t.id,'交换转发须连接同交换设备/网段的两个不同端口');
  const k=JSON.stringify([t.switchId,t.fromPortId,t.toPortId,t.networkId]);if(transferKeys.has(k))err('physical-transit-duplicate',t.id,'同方向交换转发重复');transferKeys.add(k);
 }
 const byAdj=new Map(),candidates=new Map(),invalidPaths=new Set();
 for(const p of paths.values()){
  const start=issues.length;fields(p,['id','adjacencyId','segments','requiredIpMtu','packetPolicy','source'],p.id);facts(p,p.id);
  if(!adjacencies.has(p.adjacencyId))err('physical-adjacency',p.id,'物理路径引用的逻辑邻接不存在');if(!candidates.has(p.adjacencyId))candidates.set(p.adjacencyId,[]);candidates.get(p.adjacencyId).push(p);
  if(p.requiredIpMtu!==null&&!mtu(p.requiredIpMtu))err('physical-required-mtu',p.id,'无分片IP MTU目标须68..65535整数或null');if(!['no-fragment','unknown'].includes(p.packetPolicy))err('physical-packet-policy',p.id,'仅支持no-fragment或unknown');
  if(!Array.isArray(p.segments))err('physical-segments',p.id,'路径段须为数组');else if(p.segments.length>128)unknown('physical-path-budget',p.id,'路径超过128段，未计算');
  if(issues.length!==start)invalidPaths.add(p.id);
 }
 // A selection is a declared snapshot, never an automatic failover policy.
 const selections=index(input.selections===undefined?[]:input.selections,'physical.selections'),selectionByAdj=new Map(),invalidSelections=new Set();
 for(const s of selections.values()){
  const start=issues.length;fields(s,['id','adjacencyId','activePathId','mode','source'],s.id);facts(s,s.id);
  if(!adjacencies.has(s.adjacencyId))err('physical-selection-adjacency',s.id,'选择引用的逻辑邻接不存在');
  if(selectionByAdj.has(s.adjacencyId)){err('physical-selection-duplicate',s.id,'同一邻接重复选择，不能任选');invalidSelections.add(s.adjacencyId);}else selectionByAdj.set(s.adjacencyId,s);
  if(s.mode==='unknown')unknown('physical-selection-mode',s.id,'活动路径选择方式未明确');else if(s.mode!=='declared-single-active')err('physical-selection-mode',s.id,'本批只支持声明单活动路径，不模拟自动/聚合/ECMP选择');
  if(s.activePathId===null)unknown('physical-selection-target',s.id,'尚未明确活动路径');else if(!paths.has(s.activePathId)||paths.get(s.activePathId).adjacencyId!==s.adjacencyId)err('physical-selection-target',s.id,'活动路径不存在或属于其他邻接');
  if(issues.length!==start)invalidSelections.add(s.adjacencyId);
 }
 for(const [id,list] of candidates){
  const selected=selectionByAdj.get(id);
  if(selected){if(!invalidSelections.has(id))byAdj.set(id,paths.get(selected.activePathId));}
  else if(list.length===1)byAdj.set(id,list[0]);
  else err('physical-path-duplicate',id,'同邻接多条候选路径缺少明确单活动选择，不能任选第一条或自动选up');
 }
 if(!Array.isArray(usedAdjacencyIds)){unknown('physical-usage','physical','逻辑路径使用集合未提供，不能任取物理路径');return done();}
 let steps=0;
 function assess(id,p,alternative){
  const start=issues.length,a=adjacencies.get(id),path='physical '+id+(alternative?' / 备选 '+p.id:''),risks=new Set(),values=[],usedPorts=new Set(),segments=[],endpointPortIds=[],resourceSets=Object.fromEntries(['ports','cables','transits','owners','assets','faultDomains'].map(k=>[k,new Set()]));
  const use=(v,label)=>{if(!v)return;if(v.state==='down')err('physical-path-down',path,'物理路径所用端口/链路/交换转发为down：'+label);else if(v.state!=='up')unknown('physical-path-state',path,'物理路径状态未明确：'+label);if(v.mode&&v.mode!=='dedicated-l2')unknown('physical-path-mode',path,'物理端口特殊语义未建模：'+label);if(mtu(v.ipMtuBytes))values.push(v.ipMtuBytes);else unknown('physical-mtu-unknown',path,'有效IP MTU未知：'+label);if(!text(v.source))unknown('physical-path-source',path,'路径资料来源未明确：'+label);if('faultDomainIds'in v){if(!Array.isArray(v.faultDomainIds)||!v.faultDomainIds.length)unknown('physical-domain-unknown',path,'路径故障域未明确：'+label);else for(const d of v.faultDomainIds)risks.add(d);}};
  if(!a||!p)unknown('physical-path-missing',path,'使用的逻辑邻接缺少对应物理路径');
  else if(invalidPaths.has(p.id))unknown('physical-path-invalid',path,'物理路径材料不完整、无效或超过预算');
  else{
   const first=bound.get(key(a.source)),last=bound.get(key(a.target)),network=logical(a.source)?.networkId,n=networks.get(network),family=ip?.prefix(n?.cidr)?.family;
   for(const b of[first,last])if(b?.portId)endpointPortIds.push(b.portId);
   for(const b of[first,last])if(!b||b.mode!=='one-to-one'||!text(b.source))unknown('physical-endpoint-binding',path,'路径端点的唯一物理绑定未明确');
   if(!mtu(p.requiredIpMtu)||p.packetPolicy!=='no-fragment')unknown('physical-packet-target',path,'无分片IP包目标或适用性未知，不能判定MTU满足');
   if(family===6&&mtu(p.requiredIpMtu)&&p.requiredIpMtu<1280)err('physical-ipv6-target',path,'IPv6有效IP MTU目标低于1280；底层分段/重组不在本模型');
   let truncated=false,current=first?.portId??p.segments[0]?.fromPortId;const visited=new Set(current?[current]:[]);if(!p.segments.length)err('physical-empty-path',path,'不同端点的物理路径不能为空');
   for(const seg of p.segments){
    if(++steps>10000){unknown('physical-budget',path,'累计路径段超过10000预算');truncated=true;break;}
    if(!fields(seg,['kind','id','fromPortId','toPortId'],path))continue;
    const from=ports.get(seg.fromPortId),to=ports.get(seg.toPortId),e=seg.kind==='cable'?cables.get(seg.id):seg.kind==='transit'?transits.get(seg.id):null;
    if(!from||!to||!e){err('physical-segment-reference',path,'路径段引用不存在或类型不支持');continue;}
    if(current!==from.id)err('physical-disconnected',path,'物理路径不连续，不能省略中间端口/设备');
    if(seg.kind==='cable'&&!((e.aPortId===from.id&&e.bPortId===to.id)||(e.bPortId===from.id&&e.aPortId===to.id))||seg.kind==='transit'&&(e.fromPortId!==from.id||e.toPortId!==to.id))err('physical-segment-direction',path,'路径段方向或线缆端口不对应');
    if(from.networkId!==network||to.networkId!==network)err('physical-path-network',path,'路径跨网段，不能省略VLAN/隧道等转换');
    resourceSets[seg.kind==='cable'?'cables':'transits'].add(e.id);
    for(const v of[from,to]){resourceSets.ports.add(v.id);resourceSets.owners.add(key(v.owner));const asset=v.owner?.kind==='router'?devices.get(v.owner.id)?.assetId:v.owner?.kind==='switch'?switches.get(v.owner.id)?.assetId:null;if(text(asset))resourceSets.assets.add(asset);}
    for(const v of[from,to])if(!usedPorts.has(v.id)){use(v,v.id);usedPorts.add(v.id);if(v.owner?.kind==='switch'){const sw=switches.get(v.owner.id);if(!text(sw?.source))unknown('physical-path-source',path,'交换设备来源未知');if(!Array.isArray(sw?.faultDomainIds)||!sw.faultDomainIds.length)unknown('physical-domain-unknown',path,'交换设备故障域未明确');else for(const d of sw.faultDomainIds)risks.add(d);}}
    use(e,e.id);segments.push(seg.kind+':'+e.id+' '+from.id+'→'+to.id);current=to.id;if(visited.has(current))err('physical-loop',path,'物理路径重复到访端口：'+current);visited.add(current);
   }
   if(!truncated&&last&&current!==last.portId)err('physical-terminal',path,'物理路径未到达目标接口绑定的端口');
   const minimum=values.length?Math.min(...values):null,required=Math.max(mtu(p.requiredIpMtu)?p.requiredIpMtu:0,mtu(n?.mtu)?n.mtu:0);
   if(minimum!==null&&required&&minimum<required)err('physical-mtu-insufficient',path,'路径已知有效IP MTU '+minimum+' 小于声明无分片目标 '+required+'；不能认定满足MTU设计');
   if(family===6&&minimum!==null&&minimum<1280)err('physical-ipv6-minimum',path,'路径有效IP MTU低于IPv6的1280要求；未建模底层适配');
  }
  const local=issues.slice(start),status=local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':'声明物理路径待实测';
  rows.push({category:alternative?'network-physical-alternative':'network-physical',label:(alternative?'备选物理路径 / '+p.id+' / ':'物理路径 / ')+id,status,detail:'已知最小有效IP MTU：'+(values.length?Math.min(...values)+' B':'未知')+'；目标：'+(p?.requiredIpMtu??'未知')+' B；路径：'+segments.join(' | ')+'；故障域：'+[...risks].join(',')+'。已知最小值非完整实测PMTU；故障域列表不证明双链路独立或切换成功',adjacencyId:id,pathId:p?.id??null,selected:!alternative&&!!p,knownMinimumIpMtu:values.length?Math.min(...values):null,networkId:logical(a?.source)?.networkId??null,networkMtu:networks.get(logical(a?.source)?.networkId)?.mtu??null,faultDomainIds:[...risks],segments,endpointPortIds,resources:Object.fromEntries(Object.entries(resourceSets).map(([k,v])=>[k,[...(k==='faultDomains'?risks:v)].sort()]))});
  if(alternative){const found=issues.splice(start);alternativeIssues.push(...found.map(i=>({...i,adjacencyId:id,pathId:p.id})));rows[rows.length-1].detail+='；备选诊断：'+(found.length?found.map(i=>i.message).join('；'):'声明检查未发现问题，仍待实测')+'；仅备选单路径检查，不参与当前路径结论；不能证明自动切换、故障域独立或容量满足';}
 }
 const used=[...new Set(usedAdjacencyIds)];
 // Check every active path before any candidate: spare paths cannot consume its budget.
 for(const id of used)assess(id,byAdj.get(id),false);
 for(const id of used){
  const list=candidates.get(id)||[],active=byAdj.get(id),selection=selectionByAdj.get(id);
  if(list.length>1||selection)rows.push({category:'network-path-selection',label:'物理路径选择 / '+id,status:active?'声明单活动路径待实测':'未评估',detail:'当前路径：'+(active?.id??'未知')+'；候选：'+list.map(p=>p.id).join(',')+'；选择来源：'+(selection?.source??'单一路径')+'。未模拟自动切换、STP/LAG/ECMP或故障后重选',adjacencyId:id,activePathId:active?.id??null,candidatePathIds:list.map(p=>p.id)});
  for(const p of list)if(p!==active)assess(id,p,true);
 }
 if(risk){const identities=risk.resolveIdentities(input.identities,context,connections,targetVersion);issues.push(...identities.issues);rows.push(...identities.rows,...risk.compare(rows,identities));}else unknown('shared-risk-module','physical','共享风险检查模块未加载');
 return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBNetworkPhysical=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
