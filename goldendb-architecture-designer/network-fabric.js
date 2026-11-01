/* Declared interface adjacency and gateway identity; never a complete forwarding proof. */
(function(root){'use strict';
const ip=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null),SCHEMA='goldendb-network-fabric-v1',NA='not-applicable';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048,same=(a,b)=>a&&b&&a.family===b.family&&a.value===b.value,refEqual=(a,b)=>a&&b&&a.kind===b.kind&&a.id===b.id;
function template(){return {schema:SCHEMA,targetVersion:null,devices:[],interfaces:[],adjacencies:[],directPaths:[],gatewayBindings:[],review:{coverage:'unknown',source:null}};}
function evaluate(input,context,infra,connections,targetVersion){
 const usedAdjacencies=new Set(),directTraces=[];
 const issues=[],rows=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message}),err=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const done=()=>({issues,rows,directTraces,usedAdjacencyIds:[...usedAdjacencies],status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明邻接待实测',canDeploy:false});
 if(input==null){unknown('fabric-missing','fabric','缺少设备与邻接材料，同网段或网关地址存在不等于实际邻接');rows.push({category:'network-fabric',label:'设备与邻接',status:'未评估',detail:'缺少直连关系和网关接口归属'});return done();}
 const fields=(x,keys,p)=>{if(!obj(x)){err('fabric-type',p,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))err('fabric-field',p+'.'+k,'未建模邻接字段');return true;};
 const index=(a,p,max=5000)=>{const m=new Map();if(!Array.isArray(a)||a.length>max){err('fabric-list',p,'须为不超过'+max+'项清单');return m;}for(const v of a){if(!obj(v)||!text(v.id)){err('fabric-id',p,'ID无效');continue;}if(m.has(v.id))err('fabric-duplicate',p,'ID重复：'+v.id);else m.set(v.id,v);}return m;};
 if(!fields(input,['schema','targetVersion','devices','interfaces','adjacencies','directPaths','gatewayBindings','review'],'fabric'))return done();
 if(input.schema!==SCHEMA)err('fabric-schema','fabric','设备邻接材料版本不支持');
 if(!text(input.targetVersion)||!text(targetVersion))unknown('fabric-version','fabric','缺少目标版本/补丁');else if(input.targetVersion!==targetVersion)err('fabric-version','fabric','邻接资料与目标版本不符');
 if(fields(input.review,['coverage','source'],'fabric.review')){if(input.review.coverage==='unknown')unknown('fabric-coverage','fabric.review','设备和邻接材料完整性尚未声明');else if(input.review.coverage!=='declared-complete')err('fabric-coverage','fabric.review','仅允许unknown/declared-complete，不接受自报可达');if(!text(input.review.source))unknown('fabric-source','fabric.review','缺少邻接清单资料定位与适用范围');}
 const components=index(context?.components,'components'),hostIfaces=index(infra?.interfaces,'hostInterfaces'),networks=index(infra?.networks,'networks'),endpoints=index(connections?.endpoints,'endpoints'),links=index(connections?.links,'links'),tables=index(connections?.routing?.tables,'tables',1000),paths=index(connections?.routing?.paths,'routing.paths');
 const devices=index(input.devices,'devices',1000),interfaces=index(input.interfaces,'routerInterfaces'),adjacencies=index(input.adjacencies,'adjacencies'),direct=index(input.directPaths,'directPaths'),bindings=index(input.gatewayBindings,'gatewayBindings'),validDevices=new Set(),validIfaces=new Set(),assets=new Set();
 for(const d of devices.values()){
  const start=issues.length,p='device '+d.id;fields(d,['id','assetId','model','osVersion','forwarding','source'],p);
  for(const k of ['assetId','model','osVersion','source'])if(!text(d[k]))unknown('fabric-device-facts',p,'设备'+k+'未明确');
  if(text(d.assetId)){if(assets.has(d.assetId))err('fabric-device-alias',p,'同一资产重复登记，不能当作独立设备');assets.add(d.assetId);}
  if(fields(d.forwarding,['ipv4','ipv6'],p+'.forwarding'))for(const f of ['ipv4','ipv6'])if(!['enabled','disabled','unknown'].includes(d.forwarding[f]))err('fabric-forwarding',p,'须分别声明IPv4/IPv6转发enabled/disabled/unknown');
  if(issues.length===start)validDevices.add(d.id);
 }
 const addressKey=(a,n)=>JSON.stringify([n.vrf,a.family,a.value.toString()]),occupied=new Set();
 for(const i of hostIfaces.values()){const a=ip?.parse(i.address),n=networks.get(i.networkId);if(a&&n)occupied.add(addressKey(a,n));}
 for(const e of endpoints.values())if(e.kind==='external'){const a=ip?.parse(e.address),n=networks.get(e.networkId);if(a&&n)occupied.add(addressKey(a,n));}
 const routerAddresses=new Map();
 for(const i of interfaces.values()){
  const start=issues.length,p='router-interface '+i.id;fields(i,['id','deviceId','networkId','address','state','addressRole','source'],p);const n=networks.get(i.networkId),a=ip?.parse(i.address),prefix=ip?.prefix(n?.cidr);
  if(!devices.has(i.deviceId))err('fabric-device-reference',p,'接口引用的设备不存在');
  if(!['up','down','unknown'].includes(i.state))err('fabric-interface-state',p,'接口状态须为up/down/unknown');
  if(!['unicast','virtual','unknown'].includes(i.addressRole))err('fabric-address-role',p,'地址角色未支持');else if(i.addressRole!=='unicast')unknown('fabric-virtual-address',p,'VIP/共享或未知归属须单独建模，不能用普通接口证明');
  if(!text(i.source))unknown('fabric-source',p,'缺少接口资料来源');
  if(!n||!prefix||!text(n.vrf))err('fabric-network',p,'接口网段/VRF引用无效');
  if(!a)err('fabric-address',p,'接口地址无效或作用域未建模');
  else if(prefix){if(a.family!==prefix.family||a.value<prefix.start||a.value>prefix.end)err('fabric-address',p,'接口地址族或网段范围不匹配');else if(ip.classification(a)!=='ordinary')unknown('fabric-special-address',p,'特殊地址/作用域尚待专项核验');else if(a.family===4&&prefix.bits<=30&&(a.value===prefix.start||a.value===prefix.end))err('fabric-address',p,'IPv4接口不能使用网络/广播地址');else if(a.family===6&&prefix.bits<=126&&a.value===prefix.start)unknown('fabric-special-address',p,'IPv6子网全零地址须核验任播语义');}
  if(a&&n){const key=addressKey(a,n),previous=routerAddresses.get(key);if(occupied.has(key))err('fabric-address-owned',p,'设备接口地址已由规划主机或外部端点占用');if(previous){add(previous.addressRole==='unicast'&&i.addressRole==='unicast'?'error':'unknown','fabric-address-duplicate',p,'同VRF设备接口地址重复归属；VIP不能冒充独立单播接口');validIfaces.delete(previous.id);}else routerAddresses.set(key,i);}
  if(issues.length===start&&validDevices.has(i.deviceId))validIfaces.add(i.id);
 }
 function resolve(ref,p){
  if(!fields(ref,['kind','id'],p))return null;let i,kind=ref.kind;
  if(kind==='host-interface'){i=hostIfaces.get(ref.id);if(!i||!context?.hostIds?.includes(i.hostId)){err('fabric-endpoint',p,'主机接口不存在或不属于当前规划');return null;}}
  else if(kind==='external-endpoint'){i=endpoints.get(ref.id);if(!i||i.kind!=='external'){err('fabric-endpoint',p,'外部端点不存在');return null;}}
  else if(kind==='router-interface'){i=interfaces.get(ref.id);if(!i){err('fabric-endpoint',p,'设备接口不存在');return null;}if(!validIfaces.has(i.id))unknown('fabric-interface-invalid',p,'设备接口或资产资料尚不能使用');}
  else{err('fabric-endpoint-kind',p,'端点只支持主机接口/设备接口/外部端点');return null;}
  const n=networks.get(i.networkId),a=ip?.parse(i.address),prefix=ip?.prefix(n?.cidr);if(!n||!a||!prefix||a.family!==prefix.family||a.value<prefix.start||a.value>prefix.end){err('fabric-endpoint-address',p,'邻接端点地址/网段无法解析');return null;}if(ip.classification(a)!=='ordinary')unknown('fabric-special-address',p,'邻接特殊地址用途尚未核验');return {...ref,networkId:i.networkId,vrf:n.vrf,address:a,deviceId:kind==='router-interface'?i.deviceId:null};
 }
 const resolved=new Map(),tuples=new Set();
 for(const a of adjacencies.values()){
  const start=issues.length,p='adjacency '+a.id;fields(a,['id','source','target','state','evidenceSource'],p);const s=resolve(a.source,p+'.source'),t=resolve(a.target,p+'.target');
  if(!['up','down','unknown'].includes(a.state))err('fabric-adjacency-state',p,'邻接状态须up/down/unknown');
  if(!text(a.evidenceSource))unknown('fabric-source',p,'缺少邻接资料/实测记录定位');
  if(s&&t){if(refEqual(s,t))err('fabric-self-adjacency',p,'不能用自身接口邻接代替路径');if(s.networkId!==t.networkId||s.vrf!==t.vrf||s.address.family!==t.address.family)err('fabric-l2-domain',p,'声明的直接邻接必须在同一网段/VRF/地址族；中间转发不能省略');const key=JSON.stringify([a.source.kind,a.source.id,a.target.kind,a.target.id]);if(tuples.has(key))err('fabric-adjacency-duplicate',p,'同方向邻接重复');tuples.add(key);}
  resolved.set(a.id,{...a,valid:issues.length===start});
 }
 function useAdj(id,source,target,p,active=true){const a=resolved.get(id);if(!a){err('fabric-adjacency-reference',p,'邻接引用不存在');return;}if(active)usedAdjacencies.add(id);if(!refEqual(a.source,source)||!refEqual(a.target,target))err('fabric-adjacency-direction',p,'所引用邻接的方向或接口与实际路径不一致');if(!a.valid)unknown('fabric-adjacency-invalid',p,'邻接端点或资料未通过检查');if(!active)return;for(const ref of [a.source,a.target])if(ref?.kind==='router-interface'){const iface=interfaces.get(ref.id);if(iface?.state==='down')err('fabric-interface-down',p,'使用的设备接口明确为down');else if(iface?.state==='unknown')unknown('fabric-interface-unknown',p,'使用的设备接口状态未知');}if(a.state==='down')err('fabric-adjacency-down',p,'路径使用的邻接明确为down');else if(a.state==='unknown')unknown('fabric-adjacency-unknown',p,'路径使用的邻接状态未知');}
 const endpointRef=e=>e?.kind==='component'?{kind:'host-interface',id:e.interfaceId}:e?.kind==='external'?{kind:'external-endpoint',id:e.id}:null;
 const sourceRef=(t,r)=>t.ownerType==='host'&&hostIfaces.get(r.interfaceId)?.hostId===t.ownerId?{kind:'host-interface',id:r.interfaceId}:t.ownerType==='external'&&endpoints.get(t.ownerId)?.kind==='external'&&endpoints.get(t.ownerId)?.networkId===r.networkId?{kind:'external-endpoint',id:t.ownerId}:null;
 const directByLink=new Map();for(const p of direct.values()){fields(p,['id','linkId','forwardAdjacencyId','reverseAdjacencyId'],'directPath '+p.id);if(!links.has(p.linkId))err('fabric-link-reference',p.id,'直连路径引用的连接不存在');if(directByLink.has(p.linkId))err('fabric-path-duplicate',p.id,'同连接直连路径重复');else directByLink.set(p.linkId,p);}
 const pathByLink=new Map([...paths.values()].map(p=>[p.linkId,p]));
 for(const l of links.values()){
  const start=issues.length,p=directByLink.get(l.id),routePath=pathByLink.get(l.id);
  for(const side of ['forward','reverse']){const b=routePath?.[side],t=tables.get(b?.tableId),r=Array.isArray(t?.routes)?t.routes.find(r=>r?.id===b?.routeId):null;if(!r)continue;if(r.kind!=='direct')continue;const directionStart=issues.length;
   const target=endpointRef(endpoints.get(side==='forward'?l.targetEndpointId:l.sourceEndpointId)),source=sourceRef(t,r);
   if(!p)unknown('fabric-direct-missing',l.id,'直连路由缺少两个方向的明确邻接绑定');else if(!source||!target)err('fabric-path-endpoint',l.id,'直连路径端点无法解析');else useAdj(p[side+'AdjacencyId'],source,target,l.id+' / '+(side==='forward'?'正向':'返回'));
   const directionIssues=issues.slice(directionStart);directTraces.push({linkId:l.id,direction:side,adjacencyId:p?.[side+'AdjacencyId']??null,status:directionIssues.some(i=>i.severity==='error')?'阻断':directionIssues.length?'未评估':'声明邻接待实测'});
  }
  const local=issues.slice(start);rows.push({category:'network-fabric',label:'直连邻接 / '+l.id,status:local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':'声明关系待实测',detail:'仅核对已选direct路由的有向接口关系；local/via不由本行证明，不代表实际链路或完整转发'});
 }
 const activeRoutes=new Set();for(const p of paths.values())for(const side of ['forward','reverse'])if(p?.[side])activeRoutes.add(JSON.stringify([p[side].tableId,p[side].routeId]));
 const byRoute=new Map();for(const b of bindings.values()){fields(b,['id','tableId','routeId','routerInterfaceId','adjacencyId'],'gateway '+b.id);const key=JSON.stringify([b.tableId,b.routeId]);if(byRoute.has(key))err('fabric-gateway-duplicate',b.id,'同一路由网关绑定重复');byRoute.set(key,b);const t=tables.get(b.tableId),r=Array.isArray(t?.routes)?t.routes.find(r=>r?.id===b.routeId):null;if(!r||r.kind!=='via')err('fabric-route-reference',b.id,'网关绑定须引用存在的via路由');}
 let count=0;
 for(const t of tables.values())for(const r of Array.isArray(t.routes)?t.routes:[]){if(++count>5000){unknown('fabric-budget','gatewayBindings','路由邻接核对超过5000条，剩余未评估');return done();}if(r?.kind!=='via')continue;const start=issues.length,p=t.id+'/'+r.id,b=byRoute.get(JSON.stringify([t.id,r.id]));
  if(!b)unknown('fabric-gateway-missing',p,'经网关路由缺少具体设备接口及首跳邻接绑定');else{
   const i=interfaces.get(b.routerInterfaceId),a=ip?.parse(i?.address),g=ip?.parse(r.nextHop),n=networks.get(i?.networkId);
   if(!i)err('fabric-gateway-interface',p,'网关接口不存在');else{
    if(!g)unknown('fabric-gateway-scope',p,'网关地址作用域尚未建模');else if(!same(a,g))err('fabric-gateway-address',p,'网关地址与绑定设备接口地址不一致');
    if(i.networkId!==r.networkId||n?.vrf!==t.vrf)err('fabric-gateway-domain',p,'网关接口与路由出口网段/VRF不一致');
    const d=devices.get(i.deviceId),f=g?.family===4?'ipv4':g?.family===6?'ipv6':null;
    if(activeRoutes.has(JSON.stringify([t.id,r.id]))&&f&&d?.forwarding?.[f]==='disabled')err('fabric-forwarding-disabled',p,'网关设备对应地址族的转发明确禁用');else if(activeRoutes.has(JSON.stringify([t.id,r.id]))&&(!f||d?.forwarding?.[f]!=='enabled'))unknown('fabric-forwarding-unknown',p,'网关设备对应地址族的转发尚未确认');
    const source=sourceRef(t,r);if(source)useAdj(b.adjacencyId,source,{kind:'router-interface',id:i.id},p,activeRoutes.has(JSON.stringify([t.id,r.id])));else err('fabric-path-endpoint',p,'网关路径源接口未解析');
   }
  }
  const local=issues.slice(start);rows.push({category:'network-fabric',label:'网关首跳 / '+p,status:local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':'声明首跳待实测',detail:'仅网关归属/邻接/转发开关，不证明设备FIB、后续出口、循环或完整往返可达'});
 }
 return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBNetworkFabric=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
