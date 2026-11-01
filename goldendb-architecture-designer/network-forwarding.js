/* Bounded deterministic destination-only forwarding over declared data, not live packet verification. */
(function(root){'use strict';
const ip=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null),SCHEMA='goldendb-network-forwarding-v1',NA='not-applicable';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048,same=(a,b)=>a&&b&&a.family===b.family&&a.value===b.value,inside=(a,p)=>a&&p&&a.family===p.family&&a.value>=p.start&&a.value<=p.end;
const keyRef=r=>JSON.stringify([r?.kind,r?.id]),edgeKey=(a,b)=>JSON.stringify([keyRef(a),keyRef(b)]);
function template(){return {schema:SCHEMA,targetVersion:null,tables:[],review:{coverage:'unknown',source:null}};}
function evaluate(input,context,infra,connections,targetVersion){
 const usedAdjacencies=new Set();
 const issues=[],rows=[],traces=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message}),err=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const done=()=>({issues,rows,usedAdjacencyIds:[...usedAdjacencies],traces,status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明逐跳待实测',canDeploy:false});
 if(input==null){unknown('forwarding-missing','forwarding','缺少设备有效FIB材料，不能由网关首跳推断完整路径');rows.push({category:'network-hop',label:'设备逐跳',status:'未评估',detail:'尚未提供设备有效目的路由及完整往返计算资料'});return done();}
 const fields=(x,keys,p)=>{if(!obj(x)){err('forwarding-type',p,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))err('forwarding-field',p+'.'+k,'未建模字段，不能静默参与转发');return true;};
 const index=(a,p,max=5000)=>{const m=new Map();if(!Array.isArray(a)||a.length>max){err('forwarding-list',p,'清单缺失或超过'+max+'项上限');return m;}for(const v of a){if(!obj(v)||!text(v.id)){err('forwarding-id',p,'缺少有效ID');continue;}if(m.has(v.id))err('forwarding-duplicate',p,'ID重复：'+v.id);else m.set(v.id,v);}return m;};
 if(!fields(input,['schema','targetVersion','tables','review'],'forwarding'))return done();if(input.schema!==SCHEMA)err('forwarding-schema','forwarding','FIB材料版本不支持');
 if(!text(input.targetVersion)||!text(targetVersion))unknown('forwarding-version','forwarding','目标版本/补丁未明确');else if(input.targetVersion!==targetVersion)err('forwarding-version','forwarding','FIB资料与设计版本不匹配');
 if(fields(input.review,['coverage','source'],'forwarding.review')){if(input.review.coverage==='unknown')unknown('forwarding-coverage','forwarding.review','完整设备FIB资料尚未声明');else if(input.review.coverage!=='declared-complete')err('forwarding-coverage','forwarding.review','只接受unknown/declared-complete，不接受手工认证可达');if(!text(input.review.source))unknown('forwarding-source','forwarding.review','缺少FIB采集/配置资料与适用范围');}
 const fabric=connections?.routing?.fabric;
 if(fabric==null){unknown('forwarding-fabric-missing','forwarding','缺少设备邻接材料，逐跳未评估');rows.push({category:'network-hop',label:'设备逐跳',status:'未评估',detail:'设备接口/邻接材料缺失，不能推断转发路径'});return done();}
 const devices=index(fabric?.devices,'devices',1000),routerIfaces=index(fabric?.interfaces,'routerInterfaces'),adj=index(fabric?.adjacencies,'adjacencies'),gatewayBindings=index(fabric?.gatewayBindings,'gatewayBindings'),hostIfaces=index(infra?.interfaces,'hostInterfaces'),networks=index(infra?.networks,'networks'),components=index(context?.components,'components'),endpoints=index(connections?.endpoints,'endpoints'),links=index(connections?.links,'links'),hostTables=index(connections?.routing?.tables,'hostTables',1000),hostPaths=index(connections?.routing?.paths,'hostPaths');
 const tables=index(input.tables,'deviceTables',1000),byOwner=new Map(),parsed=new Map();let totalRoutes=0,lookupCount=0;
 for(const t of tables.values()){
  const start=issues.length,p='FIB '+t.id;fields(t,['id','deviceId','vrf','deviceOsVersion','mode','coverage','source','routes'],p);const d=devices.get(t.deviceId);
  if(!d)err('forwarding-device',p,'FIB设备不存在');if(!text(t.vrf))unknown('forwarding-vrf',p,'FIB的VRF未明确');
  if(!text(t.deviceOsVersion)||!text(d?.osVersion))unknown('forwarding-platform',p,'缺少设备软件版本');else if(t.deviceOsVersion!==d.osVersion)err('forwarding-platform',p,'FIB资料与设备软件版本不一致');
  if(t.mode==='unknown')unknown('forwarding-mode',p,'有效策略选择尚未明确');else if(t.mode!=='destination-only')err('forwarding-mode',p,'只支持目的地址有效FIB，不模拟策略路由');
  if(t.coverage==='unknown')unknown('forwarding-coverage',p,'设备有效FIB完整性未明确');else if(t.coverage!=='declared-complete')err('forwarding-coverage',p,'仅允许unknown/declared-complete');if(!text(t.source))unknown('forwarding-source',p,'缺少设备FIB来源');
  const key=JSON.stringify([t.deviceId,t.vrf]);if(!byOwner.has(key))byOwner.set(key,[]);byOwner.get(key).push(t.id);
  const routes=index(t.routes,p+'.routes',1000),entries=[];totalRoutes+=routes.size;if(totalRoutes>5000){unknown('forwarding-budget',p,'总FIB路由超过5000条预算，未解析部分不作可达结论');break;}
  for(const r of routes.values()){
   const q=p+'/'+r.id;fields(r,['id','destination','kind','interfaceId','nextHop'],q);const prefix=ip?.prefix(r.destination),i=routerIfaces.get(r.interfaceId),n=networks.get(i?.networkId),netPrefix=ip?.prefix(n?.cidr);
   if(!prefix||!prefix.canonical)err('forwarding-prefix',q,'路由目的前缀非法或主机位非零');
   if(!['direct','via','blackhole'].includes(r.kind))err('forwarding-action',q,'本批仅支持direct/via/blackhole');
   if(r.kind==='blackhole'){if(r.interfaceId!==NA||r.nextHop!==NA)err('forwarding-drop-fields',q,'丢弃路由不得伪造出口或网关');}
   else{
    if(!i||i.deviceId!==t.deviceId||n?.vrf!==t.vrf)err('forwarding-egress',q,'出口接口不属于当前设备/VRF');
    if(prefix&&netPrefix&&prefix.family!==netPrefix.family)err('forwarding-family',q,'目的路由与出口地址族不同，地址转换未建模');
    if(!netPrefix)err('forwarding-network',q,'出口网段没有有效前缀');
    if(r.kind==='direct'&&r.nextHop!==NA)err('forwarding-next-hop',q,'直连路由须明确无下一跳');
    if(r.kind==='via'){const a=ip?.parse(r.nextHop);if(!a||ip.classification(a)!=='ordinary')unknown('forwarding-next-hop-special',q,'下一跳地址/作用域未建模');else if(!inside(a,netPrefix))err('forwarding-next-hop',q,'下一跳不在出口网段，递归/特殊选项未建模');else if(a.family===6&&netPrefix.bits<=64&&a.value===netPrefix.start)unknown('forwarding-next-hop-special',q,'IPv6子网基地址的角色未建模');else if(a.family===4&&netPrefix.bits<=30&&(a.value===netPrefix.start||a.value===netPrefix.end))err('forwarding-next-hop',q,'下一跳不能是网络/广播地址');}
   }
   if(prefix)entries.push({...r,prefix});
  }
  parsed.set(t.id,{...t,entries,valid:issues.length===start});
 }
 for(const [key,ids]of byOwner)if(ids.length>1)err('forwarding-table-duplicate',key,'同设备/VRF存在多份有效FIB，不能任取一份');
 const edgeMap=new Map(),gatewayMap=new Map(),ifaceByAddress=new Map();
 for(const a of adj.values()){const k=edgeKey(a.source,a.target);if(!edgeMap.has(k))edgeMap.set(k,[]);edgeMap.get(k).push(a);}
 for(const b of gatewayBindings.values()){const k=JSON.stringify([b.tableId,b.routeId]);if(!gatewayMap.has(k))gatewayMap.set(k,[]);gatewayMap.get(k).push(b);}
 for(const i of routerIfaces.values()){const a=ip?.parse(i.address),n=networks.get(i.networkId);if(a&&n){const k=JSON.stringify([i.networkId,n.vrf,a.family,a.value.toString()]);if(!ifaceByAddress.has(k))ifaceByAddress.set(k,[]);ifaceByAddress.get(k).push(i.id);}}
 function node(ref,p){let i;if(ref?.kind==='host-interface')i=hostIfaces.get(ref.id);else if(ref?.kind==='router-interface')i=routerIfaces.get(ref.id);else if(ref?.kind==='external-endpoint')i=endpoints.get(ref.id);if(!i){err('forwarding-node',p,'转发节点接口引用不存在');return null;}const n=networks.get(i.networkId),a=ip?.parse(i.address),prefix=ip?.prefix(n?.cidr);if(!n||!inside(a,prefix)){err('forwarding-address',p,'转发接口地址/网段无效');return null;}if(ip.classification(a)!=='ordinary'){unknown('forwarding-special',p,'转发特殊地址/作用域未评估');return null;}if(a.family===4&&prefix.bits<=30&&(a.value===prefix.start||a.value===prefix.end)){err('forwarding-address',p,'接口不能使用IPv4网络/广播地址');return null;}if(a.family===6&&prefix.bits<=64&&a.value===prefix.start){unknown('forwarding-special',p,'IPv6子网基地址角色未评估');return null;}if(ref.kind==='router-interface'){
   if(i.state==='down'){err('forwarding-interface-down',p,'逐跳路径设备接口为down');return null;}if(i.state!=='up'||i.addressRole!=='unicast'||!text(i.source)){unknown('forwarding-interface-unknown',p,'逐跳接口状态、单播归属或来源未明确');return null;}
  }return {...ref,networkId:i.networkId,vrf:n.vrf,address:a,deviceId:i.deviceId};}
 function edge(from,to,p,requested,trail){const a=node(from,p),b=node(to,p);if(!a||!b)return false;if(a.networkId!==b.networkId||a.vrf!==b.vrf||a.address.family!==b.address.family){err('forwarding-adjacency-domain',p,'逐跳邻接跨网段/VRF/地址族，不能省略中间转发');return false;}const candidates=edgeMap.get(edgeKey(from,to))||[];if(!candidates.length){unknown('forwarding-adjacency-missing',p,'逐跳缺少所需方向的明确邻接');return false;}if(candidates.length!==1){unknown('forwarding-adjacency-ambiguous',p,'邻接存在多个同方向声明，不能任选');return false;}const e=candidates[0];usedAdjacencies.add(e.id);if(trail)trail.push(e.id);if(requested&&e.id!==requested){err('forwarding-adjacency-reference',p,'网关首跳引用的邻接不是实际所需方向');return false;}if(e.state==='down'){err('forwarding-adjacency-down',p,'逐跳路径使用的邻接为down');return false;}if(e.state!=='up'||!text(e.evidenceSource)){unknown('forwarding-adjacency-unknown',p,'逐跳邻接状态/来源未知');return false;}return true;}
 function endpoint(e,p){if(e?.kind==='external')return node({kind:'external-endpoint',id:e.id},p);if(e?.kind==='component'){const c=components.get(e.componentId),i=hostIfaces.get(e.interfaceId);if(!c||!i||c.hostId!==i.hostId){err('forwarding-endpoint',p,'组件端点未绑定其实际宿主机接口');return null;}return node({kind:'host-interface',id:i.id},p);}err('forwarding-endpoint',p,'连接端点不存在');return null;}
 const pathByLink=new Map([...hostPaths.values()].map(p=>[p.linkId,p]));
 function walk(link,side){const path=link.id+' / '+(side==='forward'?'正向':'返回'),hops=[],adjacencyIds=[],start=issues.length,b=pathByLink.get(link.id)?.[side],t=hostTables.get(b?.tableId),r=Array.isArray(t?.routes)?t.routes.find(r=>r?.id===b?.routeId):null;let state='未评估';
  const finish=()=>{const local=issues.slice(start);return {linkId:link.id,direction:side,status:local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':state,hops,adjacencyIds};};
  if(!r){unknown('forwarding-host-route',path,'起始有效路由尚未明确');return finish();}if(r.kind!=='via'){state='本机/直连另见对应检查';return finish();}
  const source=endpoint(endpoints.get(side==='forward'?link.sourceEndpointId:link.targetEndpointId),path),target=endpoint(endpoints.get(side==='forward'?link.targetEndpointId:link.sourceEndpointId),path);if(!source||!target)return finish();
  if(t.mode!=='destination-only'||t.coverage!=='declared-complete'||!text(t.source)||t.targetVersion!==targetVersion){unknown('forwarding-host-effective',path,'起始有效表策略/完整性/来源/版本未成立');return finish();}
  const hostMatches=[];for(const entry of t.routes){if(++lookupCount>100000){unknown('forwarding-lookup-budget',path,'主机及设备路由匹配超过100000次预算');return finish();}const prefix=ip?.prefix(entry?.destination);if(!prefix?.canonical){unknown('forwarding-host-effective',path,'起始表存在无法解释的目的前缀');return finish();}if(inside(target.address,prefix))hostMatches.push({entry,prefix});}
  const hostBits=Math.max(...hostMatches.map(x=>x.prefix.bits)),hostBest=hostMatches.filter(v=>v.prefix.bits===hostBits);
  if(hostBest.length!==1||hostBest[0].entry.id!==r.id){unknown('forwarding-host-selection',path,'绑定的起始路由不是唯一最长匹配，需先修正主机选路');return finish();}

  if(t.ownerType==='host'&&(source.kind!=='host-interface'||hostIfaces.get(source.id)?.hostId!==t.ownerId)||t.ownerType==='external'&&source.id!==t.ownerId||t.vrf!==source.vrf){err('forwarding-host-owner',path,'起始表归属/VRF不对应出发端点');return finish();}
  const bindings=gatewayMap.get(JSON.stringify([t.id,r.id]))||[];if(bindings.length!==1){unknown('route-transit',path,'网关首跳绑定缺失或不唯一，逐跳未评估');return finish();}
  const binding=bindings[0],first=routerIfaces.get(binding.routerInterfaceId),g=ip?.parse(r.nextHop),egress=t.ownerType==='host'?{kind:'host-interface',id:r.interfaceId}:{kind:'external-endpoint',id:t.ownerId};
  if(!first||!same(ip.parse(first.address),g)||first.networkId!==r.networkId||networks.get(first.networkId)?.vrf!==t.vrf){err('forwarding-gateway',path,'网关接口地址/出口/VRF与起始路由不匹配');return finish();}
  if(t.ownerType==='host'&&hostIfaces.get(r.interfaceId)?.hostId!==t.ownerId){err('forwarding-host-egress',path,'起始出口接口不属于路由表宿主机');return finish();}
  let incoming={kind:'router-interface',id:first.id};if(!edge(egress,incoming,path,binding.adjacencyId,adjacencyIds))return finish();hops.push('首跳 '+first.deviceId+'/'+first.id);const visited=new Set();
  for(let hop=0;hop<64;hop++){
   const ingress=node(incoming,path);if(!ingress)return finish();const d=devices.get(ingress.deviceId),family=target.address.family===4?'ipv4':'ipv6';
   if(!d){err('forwarding-device',path,'逐跳设备不存在');return finish();}if(d.forwarding?.[family]==='disabled'){err('forwarding-disabled',path,'所用地址族有效转发声明为禁用');return finish();}if(d.forwarding?.[family]!=='enabled'||!['assetId','model','osVersion','source'].every(k=>text(d[k]))){unknown('forwarding-device-unknown',path,'设备资料或所用地址族有效转发未知');return finish();}
   const owner=JSON.stringify([d.id,ingress.vrf]);if(visited.has(owner)){err('forwarding-loop',path,'检测到确定性转发循环：再次进入 '+d.id+' / '+ingress.vrf);return finish();}visited.add(owner);
   const ids=byOwner.get(owner)||[];if(ids.length!==1){unknown('route-transit',path,'设备 '+d.id+' / '+ingress.vrf+' 的有效FIB缺失或不唯一');return finish();}const fib=parsed.get(ids[0]);if(!fib||!fib.valid){unknown('route-transit',path,'设备FIB未知、错误或未在预算内解析，不能继续推断');return finish();}
   const matches=[];for(const entry of fib.entries){if(++lookupCount>100000){unknown('forwarding-lookup-budget',path,'逐跳路由匹配超过100000次预算');return finish();}if(inside(target.address,entry.prefix))matches.push(entry);}
   if(!matches.length){err('forwarding-no-route',path,'完整设备FIB没有目标路由：'+d.id+' / '+ingress.vrf);return finish();}const bits=Math.max(...matches.map(e=>e.prefix.bits)),best=matches.filter(e=>e.prefix.bits===bits);if(best.length!==1){unknown('forwarding-ecmp',path,'最长前缀有多个候选，ECMP/优先级未归并');return finish();}const selected=best[0];hops.push(d.id+'/'+ingress.vrf+' → '+selected.id+' ('+selected.kind+')');
   if(selected.kind==='blackhole'){err('forwarding-blackhole',path,'设备最长匹配路由明确丢弃流量：'+d.id+'/'+selected.id);return finish();}
   const outgoing={kind:'router-interface',id:selected.interfaceId},out=node(outgoing,path);if(!out)return finish();if(out.deviceId!==d.id||out.vrf!==ingress.vrf){err('forwarding-egress',path,'设备出口不属于当前设备/VRF');return finish();}
   if(selected.kind==='direct'){if(out.networkId!==target.networkId||out.vrf!==target.vrf){err('forwarding-terminal-domain',path,'设备直连出口不能交付到目标网段/VRF');return finish();}if(!edge(outgoing,{kind:target.kind,id:target.id},path,null,adjacencyIds))return finish();hops.push('到达 '+target.kind+'/'+target.id);state='声明逐跳到达待实测';return finish();}
   if(selected.kind!=='via'){unknown('forwarding-action',path,'未建模转发动作');return finish();}const next=ip?.parse(selected.nextHop);if(!next){unknown('forwarding-next-hop-special',path,'下一跳地址尚不能解析');return finish();}
   const candidates=ifaceByAddress.get(JSON.stringify([out.networkId,out.vrf,next.family,next.value.toString()]))||[];if(candidates.length!==1){unknown('forwarding-next-router',path,'下一跳设备接口缺失或地址归属不唯一');return finish();}const dest={kind:'router-interface',id:candidates[0]};if(!edge(outgoing,dest,path,null,adjacencyIds))return finish();incoming=dest;
  }
  unknown('forwarding-hop-budget',path,'达到64跳上限，不能据此断言可达或无循环');return finish();
 }
 for(const link of links.values()){
  const pair=['forward','reverse'].map(side=>walk(link,side));traces.push(...pair);const status=pair.some(t=>t.status==='阻断')?'阻断':pair.some(t=>t.status==='未评估')?'未评估':pair.some(t=>t.status==='声明逐跳到达待实测')?'声明逐跳待实测':'本机/直连另见对应检查';
  rows.push({category:'network-hop',label:'往返逐跳 / '+link.id,status,detail:pair.map(t=>(t.direction==='forward'?'正向':'返回')+'：'+t.status+'；'+t.hops.join(' → ')).join(' | ')+'。仅声明模型，不能替代实际转发/安全与故障验证',traces:pair});
 }
 return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBNetworkForwarding=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
