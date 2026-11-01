/* Effective destination-route declarations only; device FIB delegated to network-forwarding; no reachability certification. */
(function(root){'use strict';
const ip=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null);
const fabric=root.GoldenDBNetworkFabric||(typeof module==='object'&&module.exports?require('./network-fabric.js'):null);
const forwarding=root.GoldenDBNetworkForwarding||(typeof module==='object'&&module.exports?require('./network-forwarding.js'):null);
const physical=root.GoldenDBNetworkPhysical||(typeof module==='object'&&module.exports?require('./network-physical.js'):null);
const mtu=root.GoldenDBNetworkMtu||(typeof module==='object'&&module.exports?require('./network-mtu.js'):null);
const SCHEMA='goldendb-network-routing-v1',NA='not-applicable';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
const inside=(a,p)=>a&&p&&a.family===p.family&&a.value>=p.start&&a.value<=p.end;
const same=(a,b)=>a&&b&&a.family===b.family&&a.value===b.value;
function template(){return {schema:SCHEMA,tables:[],paths:[],fabric:fabric?fabric.template():null,forwarding:forwarding?forwarding.template():null,physical:physical?physical.template():null,packetTargets:mtu?mtu.template():null};}
function evaluate(input,context,infra,connections,targetVersion){
 const usedAdjacencies=new Set(),routeChecks=[];let fabricResult,forwardingResult,physicalResult;
 const issues=[],rows=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message}),error=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const done=()=>({issues,rows,status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明往返路由待实测',canDeploy:false});
 if(input==null){unknown('routing-missing','routing','尚未提供往返路由声明，端口允许和监听匹配不能证明双向可达');rows.push({category:'network-path',label:'往返路由',status:'未评估',detail:'缺少路由表/网关/VRF及正向和返回路径'});return done();}
 const fields=(x,keys,p)=>{if(!obj(x)){error('routing-type',p,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))error('routing-field',p+'.'+k,'未建模的路由字段，不能静默用于选路');return true;};
 const index=(a,p,max=5000)=>{const m=new Map();if(!Array.isArray(a)||a.length>max){error('routing-list',p,'须为最多'+max+'项清单');return m;}for(const x of a){if(!obj(x)||!text(x.id)){error('routing-id',p,'缺少有效ID');continue;}if(m.has(x.id))error('routing-duplicate',p,'重复ID：'+x.id);else m.set(x.id,x);}return m;};
 if(!fields(input,['schema','tables','paths','fabric','forwarding','physical','packetTargets'],'routing'))return done();if(input.schema!==SCHEMA)error('routing-schema','routing','路由材料版本不支持');
 const components=index(context?.components,'components'),interfaces=index(infra?.interfaces,'interfaces'),networks=index(infra?.networks,'networks'),endpoints=index(connections?.endpoints,'endpoints'),links=index(connections?.links,'links');
 const endpoint=e=>{if(!e)return null;const c=components.get(e.componentId),i=interfaces.get(e.interfaceId),n=networks.get(e.kind==='component'?i?.networkId:e.networkId),a=ip?.parse(e.kind==='component'?i?.address:e.address),p=ip?.prefix(n?.cidr);if(!n||!inside(a,p)||ip.classification(a)!=='ordinary'||!text(n.vrf))return null;if(e.kind==='component'&&(!c||!i||c.hostId!==i.hostId))return null;if(!['component','external'].includes(e.kind))return null;return {id:e.id,address:a,networkId:n.id,vrf:n.vrf,ownerType:e.kind==='component'?'host':'external',ownerId:e.kind==='component'?c.hostId:e.id};};
 const tables=index(input.tables,'tables',1000),prepared=new Map(),owners=new Set();let routeCount=0;
 for(const t of tables.values()){
  const start=issues.length,p='table '+t.id;fields(t,['id','ownerType','ownerId','vrf','mode','coverage','source','targetVersion','routes'],p);
  if(!['host','external'].includes(t.ownerType))error('route-owner',p,'路由表归属须host或external');
  if(t.ownerType==='host'&&!context?.hostIds?.includes(t.ownerId)||t.ownerType==='external'&&endpoints.get(t.ownerId)?.kind!=='external')error('route-owner',p,'路由表归属对象不存在');
  if(!text(t.vrf))unknown('route-vrf',p,'VRF未明确');const key=JSON.stringify([t.ownerType,t.ownerId,t.vrf]);if(owners.has(key))error('route-owner-duplicate',p,'同一归属/VRF只能提供一张已完成策略选择的有效表');owners.add(key);
  if(t.mode==='unknown')unknown('route-mode',p,'策略路由/多表查找尚未归并为明确有效目的路由表');else if(t.mode!=='destination-only')error('route-mode',p,'仅支持destination-only或unknown，不模拟策略路由');
  if(t.coverage==='unknown')unknown('route-coverage',p,'路由表完整性尚未声明');else if(t.coverage!=='declared-complete')error('route-coverage',p,'仅允许unknown/declared-complete，不接受自报可达');
  if(!text(t.source))unknown('route-source',p,'缺少有效路由表来源、范围和采集/配置依据');
  if(!text(t.targetVersion)||!text(targetVersion))unknown('route-version',p,'缺少目标版本/补丁');else if(t.targetVersion!==targetVersion)error('route-version',p,'路由资料与设计目标版本不符');
  const routes=index(t.routes,p+'.routes',1000),parsed=[];
  routeCount+=routes.size;if(routeCount>5000){unknown('route-budget',p,'总路由超过5000条预算，后续未评估');break;}
  for(const r of routes.values()){
   const q=p+'/'+r.id;fields(r,['id','destination','kind','networkId','interfaceId','nextHop'],q);const prefix=ip?.prefix(r.destination),n=networks.get(r.networkId),iface=interfaces.get(r.interfaceId);
   if(!prefix||!prefix.canonical)error('route-prefix',q,'目的前缀非法或含非零主机位');
   if(!['direct','via','local','blackhole'].includes(r.kind))error('route-kind',q,'路由动作仅支持direct/via/local/blackhole');
   if(r.kind==='blackhole'){if(r.networkId!==NA||r.interfaceId!==NA||r.nextHop!==NA)error('route-blackhole-fields',q,'丢弃路由不应伪造出口或网关');}
   else{
    const netPrefix=ip?.prefix(n?.cidr);
    if(!n||!netPrefix)error('route-network',q,'出口网段不存在或无有效前缀');else if(n.vrf!==t.vrf)error('route-egress-vrf',q,'出口网段不属于当前路由表VRF');
    if(t.ownerType==='host'&&(!iface||iface.hostId!==t.ownerId||iface.networkId!==r.networkId))error('route-interface',q,'出口接口不属于路由表宿主机或出口网段');
    if(t.ownerType==='external'&&(r.interfaceId!==NA||endpoints.get(t.ownerId)?.networkId!==r.networkId))error('route-interface',q,'外部端点本阶段只支持其已声明网段出口');
    if(prefix&&netPrefix&&prefix.family!==netPrefix.family)error('route-family',q,'目的路由与出口网段地址族不同');
    if(r.kind==='via'){
     const g=ip?.parse(r.nextHop),baseGateway=typeof r.nextHop==='string'?ip?.parse(r.nextHop.split('%')[0]):null;const specialV6=netPrefix?.family===6&&baseGateway?.family===6&&['link-local','mapped'].includes(ip.classification(baseGateway));if(specialV6)unknown('route-gateway-scope',q,'IPv6链路本地/映射网关及接口作用域须专项建模，不能当作错误网关或已可达');else if(!inside(g,netPrefix)||g&&ip.classification(g)!=='ordinary')error('route-gateway',q,'网关须为出口网段内同族普通单播地址；递归网关未建模');
     else if(g.family===4&&netPrefix.bits<=30&&(g.value===netPrefix.start||g.value===netPrefix.end))error('route-gateway',q,'网关不能使用网络/广播地址');
     else if(g.family===6&&netPrefix.bits<=126&&g.value===netPrefix.start)unknown('route-gateway-special',q,'IPv6子网全零网关须核验任播语义');
     if(g&&((t.ownerType==='host'&&[...interfaces.values()].some(i=>i.hostId===t.ownerId&&same(ip.parse(i.address),g)))||(t.ownerType==='external'&&same(endpoint(endpoints.get(t.ownerId))?.address,g))))error('route-gateway-self',q,'网关不能填写当前归属对象自身地址');
    }else if(r.nextHop!==NA)error('route-gateway',q,'direct/local须明确填写not-applicable，不隐式忽略网关');
    if(r.kind==='local'){
     const a=t.ownerType==='host'?ip?.parse(iface?.address):endpoint(endpoints.get(t.ownerId))?.address;
     if(!prefix||!a||prefix.bits!==(a.family===4?32:128)||!inside(a,prefix))error('route-local',q,'local仅支持归属对象已登记地址的精确主机路由');
    }
   }
   if(prefix)parsed.push({...r,prefix});
  }
  prepared.set(t.id,{...t,routes,parsed,valid:issues.length===start});
 }
 let lookups=0;
 const direction=(b,s,d,p)=>{
  if(b==null){unknown('route-binding-missing',p,'缺少本方向路由表/条目绑定');return;}
  if(!fields(b,['tableId','routeId'],p))return;
  const t=prepared.get(b.tableId);if(!t){if(tables.has(b.tableId)&&routeCount>5000)unknown('route-budget',p,'路由表存在但超出解析预算，不能按不存在或可达处理');else error('route-table-reference',p,'路由表引用不存在');return;}
  if(!s||!d){error('route-endpoint',p,'端点地址、宿主机或网段无法解析');return;}
  if(t.ownerType!==s.ownerType||t.ownerId!==s.ownerId||t.vrf!==s.vrf){error('route-owner-binding',p,'本方向路由表不属于出发端点及其VRF');return;}
  if(!t.valid)unknown('route-table-invalid',p,'有效表存在缺项或错误，不能证明选路');
  const r=t.routes.get(b.routeId);if(!r){error('route-reference',p,'路由条目引用不存在');return;}
  if(t.mode!=='destination-only'||t.coverage!=='declared-complete'){unknown('route-selection-unassessed',p,'策略或表完整性未明确，不将局部最长前缀当作实际选路');return;}
  const matched=[];
  for(const candidate of t.parsed){if(++lookups>100000){unknown('route-lookup-budget',p,'路由匹配超过100000次预算，剩余未评估');return;}if(inside(d.address,candidate.prefix))matched.push(candidate);}
  if(!matched.length){add(t.mode==='destination-only'&&t.coverage==='declared-complete'?'error':'unknown','route-no-match',p,'声明有效表没有覆盖目标地址的路由');return;}
  const bits=Math.max(...matched.map(r=>r.prefix.bits)),best=matched.filter(r=>r.prefix.bits===bits);
  if(best.some(r=>r.id===b.routeId)===false)error('route-selection',p,'所选路由不是最长匹配前缀，不能跳过更具体的条目');
  if(best.length>1){unknown('route-ambiguous',p,'最长前缀存在多个有效候选；ECMP/优先级尚未归并，不能任取通过');return;}
  const selected=best[0];if(selected.kind==='blackhole'){error('route-blackhole',p,'最长匹配路由明确丢弃目标流量');return;}
  if(selected.kind==='via'){return 'via';} // Device transit is checked by the bounded forwarding module below.
  if(selected.kind==='direct'){
   if(selected.networkId!==d.networkId||t.vrf!==d.vrf)error('route-direct-domain',p,'direct不能跨声明网段或VRF，需提供真实转发方案');
   if(s.ownerType===d.ownerType&&s.ownerId===d.ownerId)unknown('route-local-required',p,'同归属对象通信须核对local路由，不能以直连网段推定');
  }
  if(selected.kind==='local'&&(s.ownerType!==d.ownerType||s.ownerId!==d.ownerId||t.vrf!==d.vrf))error('route-local-target',p,'local路由不能跨VRF或交付到其他归属对象');
  return selected.kind;
 };
 const paths=index(input.paths,'paths'),byLink=new Map();
 for(const p of paths.values()){fields(p,['id','linkId','forward','reverse'],'path '+p.id);if(!links.has(p.linkId))error('route-link-reference',p.id,'路径引用的有向连接不存在');if(byLink.has(p.linkId))error('route-path-duplicate',p.id,'同一连接重复声明往返路径');else byLink.set(p.linkId,p);}
 for(const l of links.values()){
  const start=issues.length,p=byLink.get(l.id),s=endpoint(endpoints.get(l.sourceEndpointId)),d=endpoint(endpoints.get(l.targetEndpointId));
  if(!p)unknown('route-path-missing',l.id,'连接缺少正向及返回路由声明');
  for(const side of ['forward','reverse']){const begin=issues.length,source=side==='forward'?s:d,target=side==='forward'?d:s,kind=direction(p?.[side],source,target,l.id+' / '+(side==='forward'?'正向':'返回')),found=issues.slice(begin);routeChecks.push({linkId:l.id,direction:side,kind:kind??null,family:source?.address?.family??null,status:found.some(i=>i.severity==='error')?'阻断':found.length?'未评估':'声明选路待实测'});}
  const local=issues.slice(start);rows.push({category:'network-path',label:'往返路由 / '+l.id,status:local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':'声明往返待实测',detail:l.sourceEndpointId+' → '+l.targetEndpointId+'；逐向检查有效目的路由；不证明实际ARP/ND、设备转发、ACL状态或故障后可达'});
 }
 if(!links.size)unknown('route-links-empty','routing','无有向连接，不能证明路径覆盖');
 if(fabric){const r=fabricResult=fabric.evaluate(input.fabric,context,infra,connections,targetVersion);issues.push(...r.issues);rows.push(...r.rows);for(const id of r.usedAdjacencyIds||[])usedAdjacencies.add(id);}else unknown('fabric-module','fabric','邻接检查模块未加载');
 if(forwarding){const r=forwardingResult=forwarding.evaluate(input.forwarding,context,infra,connections,targetVersion);issues.push(...r.issues);rows.push(...r.rows);for(const id of r.usedAdjacencyIds||[])usedAdjacencies.add(id);}else unknown('forwarding-module','forwarding','逐跳检查模块未加载');
 if(physical){const r=physicalResult=physical.evaluate(input.physical,context,infra,connections,targetVersion,[...usedAdjacencies]);issues.push(...r.issues);rows.push(...r.rows);}else unknown('physical-module','physical','物理链路检查模块未加载');
 if(mtu){const r=mtu.evaluate(input.packetTargets,connections,targetVersion,{routes:routeChecks,fabric:fabricResult,forwarding:forwardingResult,physical:physicalResult});issues.push(...r.issues);rows.push(...r.rows);}else unknown('flow-mtu-module','packetTargets','端到端MTU模块未加载');
 return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBNetworkRouting=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
