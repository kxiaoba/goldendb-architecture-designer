/* Inventory and declared IPv4/IPv6 segment/ACL consistency; not a router or vendor installer. */
(function(root){'use strict';
const addressApi=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null);
const capacityApi=root.GoldenDBInventoryCapacity||(typeof module==='object'&&module.exports?require('./inventory-capacity.js'):null);
const SCHEMA='goldendb-infrastructure-v1',PURPOSES=['business','replication','management','backup'];
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),str=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
function ipv4(value){if(typeof value!=='string'||! /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(value))return null;const bytes=value.split('.').map(Number);return bytes.some(n=>n>255)?null:bytes.reduce((n,v)=>n*256+v,0);}
function cidr(value){if(typeof value!=='string')return null;const parts=value.split('/');if(parts.length!==2||! /^(0|[1-9]\d?)$/.test(parts[1]))return null;const address=ipv4(parts[0]),bits=Number(parts[1]);if(address===null||bits>32)return null;const size=2**(32-bits),start=Math.floor(address/size)*size;return {address,bits,start,end:start+size-1,canonical:address===start};}
function template(context){return {schema:SCHEMA,targetVersion:null,planUnits:{cpu:null,memory:null,disk:null,source:null},hosts:context.hostIds.map(id=>({id,cpuPhysicalCores:null,memoryGiB:null,dataUsableGiB:null,nicGbps:null,os:null,architecture:null,budget:{cpuReserveRatio:null,memoryReserveRatio:null,diskBasis:null,diskWatermark:null}})),networks:[],interfaces:[],acl:[],flows:[]};}
function evaluate(input,context,targetVersion){
 const issues=[];let capacityRows=[];let comparisons=0;const LIMIT=200000;
 const add=(severity,code,path,message)=>issues.push({severity,code,path,message});
 const error=(code,p,m)=>add('error',code,p,m),unknown=(code,p,m)=>add('unknown',code,p,m);
 const done=()=>({schema:SCHEMA,status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'结构一致待实测',canDeploy:false,issues,capacityRows,comparisons,limitation:'仅校验声明的IPv4/IPv6网段、库存必要容量和ACL需求；不证明链路连通/带宽/冗余、实际防火墙行为或厂商版本支持。'});
 const fields=(o,keys,p)=>{if(!obj(o)){error('type',p,'应为对象');return false;}for(const k of Object.keys(o))if(!keys.includes(k))error('field',p+'.'+k,'未支持字段，不能当作已验证配置');return true;};
 const need=(o,keys,p)=>keys.forEach(k=>{if(!str(o[k]))unknown('missing',p+'.'+k,'缺少明确值');});
 const number=(o,k,p,integer=false,max=Number.MAX_SAFE_INTEGER,min=0)=>{const v=o[k];if(v==null){unknown('missing',p+'.'+k,'缺少实测或实际规格');return false;}if(typeof v!=='number'||!Number.isFinite(v)||v<=min||v>max||(integer&&!Number.isInteger(v))){error('number',p+'.'+k,'数值、单位或范围非法');return false;}return true;};
 if(input==null){unknown('missing','$','尚未提供真实库存与网络补充资料');return done();}
 try{if(JSON.stringify(input).length>4*1024*1024){error('size','$','补充资料超过检查上限');return done();}}catch{error('json','$','补充资料不是有限JSON');return done();}
 if(!fields(input,['schema','targetVersion','planUnits','hosts','networks','interfaces','acl','flows'],'$'))return done();
 if(input.schema!==SCHEMA)error('schema','$.schema','不支持此补充资料版本');
 need(input,['targetVersion'],'$');if(str(input.targetVersion)&&str(targetVersion)&&input.targetVersion!==targetVersion)error('version','$.targetVersion','补充资料与设计目标版本不符');
 if(!obj(context)||!Array.isArray(context.hostIds)||!context.hostIds.length||context.hostIds.some(id=>!str(id))||new Set(context.hostIds).size!==context.hostIds.length){error('context','$context','缺少当前规划主机清单');return done();}
 const maps={};
 const definitions={hosts:['id','cpuPhysicalCores','memoryGiB','dataUsableGiB','nicGbps','os','architecture','budget'],networks:['id','cidr','vrf','vlan','mtu','purposes','pointToPoint'],interfaces:['id','hostId','networkId','nic','address'],acl:['id','sourceNetworkId','targetNetworkId','protocol','portStart','portEnd','action','source','targetVersion'],flows:['id','sourceNetworkId','targetNetworkId','protocol','port','purpose','source','targetVersion']};
 for(const [name,keys]of Object.entries(definitions)){
  maps[name]=new Map();const list=input[name];if(!Array.isArray(list)||list.length>5000){error('list','$. '+name,'应为不超过5000条的清单');continue;}if(!list.length)unknown('missing','$. '+name,'尚未提供清单');
  for(let i=0;i<list.length;i++){const v=list[i],p=name+'['+i+']';if(!fields(v,keys,p))continue;need(v,['id'],p);if(!str(v.id))continue;if(maps[name].has(v.id)){error('duplicate',p,'ID重复');continue;}maps[name].set(v.id,v);}
 }
 for(const h of maps.hosts.values()){
  const p='host '+h.id;if(!context.hostIds.includes(h.id))error('extra-host',p,'库存包含当前规划之外的主机');
  for(const k of ['cpuPhysicalCores','memoryGiB','dataUsableGiB','nicGbps'])if(!(k==='dataUsableGiB'&&h[k]===0))number(h,k,p,k==='cpuPhysicalCores');need(h,['os','architecture'],p);
 }
 for(const id of context.hostIds)if(!maps.hosts.has(id))unknown('missing-host','host '+id,'当前规划主机未提供实际规格');
 const ranges=new Map(),purposes=new Set();
 for(const n of maps.networks.values()){
  const p='network '+n.id;need(n,['vrf','cidr'],p);
  const range=str(n.cidr)&&addressApi?addressApi.prefix(n.cidr):null;
  if(str(n.cidr)){if(!addressApi)unknown('address-module',p,'地址检查模块未加载');else if(!range)error('cidr',p+'.cidr','IPv4/IPv6 CIDR非法');else if(!range.canonical)error('cidr-hostbits',p+'.cidr','网段地址带主机位；不能静默改写网段');else{ranges.set(n.id,range);if(range.family===4&&range.bits===31&&n.pointToPoint!==true)unknown('p2p-required',p,'/31需明确点到点链路适用条件');if(range.family===6&&range.bits===127)unknown('ipv6-inter-router',p,'/127须核验路由器间点到点用途；普通数据库接口不可仅凭此字段认定支持');}}
  if(n.pointToPoint!==true&&n.pointToPoint!==false)unknown('p2p-unknown',p+'.pointToPoint','须声明是否点到点');
  number(n,'vlan',p,true,4094);if(number(n,'mtu',p,true,65535)&&n.mtu<(range?.family===6?1280:576))error('mtu',p+'.mtu',range?.family===6?'IPv6链路MTU须至少1280；底层适配需专项核验':'低于本工具IPv4网络模板下限576，需专项设计');
  if(!Array.isArray(n.purposes)||!n.purposes.length||new Set(n.purposes).size!==n.purposes.length)unknown('purpose',p+'.purposes','须声明业务/复制/管理/备份用途');
  else for(const purpose of n.purposes){if(!PURPOSES.includes(purpose))error('purpose',p+'.purposes','未知网络用途');else purposes.add(purpose);}
 }
 for(const purpose of PURPOSES)if(!purposes.has(purpose))unknown('missing-purpose','network '+purpose,'缺少此用途网络；若共网须明确声明，隔离能力另验');
 const nets=[...maps.networks.values()];
 for(let i=0;i<nets.length;i++)for(let j=i+1;j<nets.length;j++){
  if(++comparisons>LIMIT){unknown('budget','$','检查预算用尽，未完成全部组合校验');return done();}
  const a=nets[i],b=nets[j],x=ranges.get(a.id),y=ranges.get(b.id);if(x&&y&&x.family===y.family&&str(a.vrf)&&a.vrf===b.vrf&&x.start<=y.end&&y.start<=x.end)error('overlapping-segments',a.id+'/'+b.id,'同VRF的直连网段重叠；本清单不接受路由汇总前缀冒充接口网段');
 }
 const addresses=new Set(),hostInterfaces=new Set();
 for(const v of maps.interfaces.values()){
  const p='interface '+v.id;need(v,['hostId','networkId','nic','address'],p);if(str(v.hostId)&&!maps.hosts.has(v.hostId))error('reference',p+'.hostId','主机不存在');
  const n=maps.networks.get(v.networkId);if(str(v.networkId)&&!n)error('reference',p+'.networkId','网段不存在');
  if(n&&maps.hosts.has(v.hostId))hostInterfaces.add(v.hostId);
  const ip=addressApi?.parse(v.address);if(!ip){if(str(v.address))error('ip',p+'.address','IPv4/IPv6地址非法、格式有歧义或包含尚未建模的作用域ID');continue;}
  const classification=addressApi.classification(ip);
  if(classification==='non-unicast')error('non-unicast',p+'.address','不适合作为本模板的普通业务/复制单播接口地址');
  else if(classification!=='ordinary')unknown('address-special',p+'.address','链路本地、IPv4映射或兼容地址须专项作用域/转换建模，不能按普通接口自动判定');
  if(n&&str(n.vrf)){const key=JSON.stringify([n.vrf,ip.family,ip.value.toString()]);if(addresses.has(key))error('duplicate-ip',p+'.address','同VRF地址重复占用；不同IPv6缩写/大小写按同一地址核对');addresses.add(key);}
  const range=ranges.get(v.networkId);if(range){if(ip.family!==range.family)error('address-family',p+'.address','接口地址族与网段不一致');else if(ip.value<range.start||ip.value>range.end)error('outside-subnet',p+'.address','地址不属于声明网段');else if(ip.family===4&&range.bits<=30&&(ip.value===range.start||ip.value===range.end))error('network-broadcast',p+'.address','网络或广播地址不能分配给普通主机接口');else if(ip.family===6&&range.bits<=126&&ip.value===range.start)unknown('subnet-router-anycast',p+'.address','全零接口标识可能具有子网路由器任播语义，须专项核验；IPv6不套用广播地址规则');}

 }
 for(const id of context.hostIds)if(!hostInterfaces.has(id))unknown('missing-interface','host '+id,'缺少引用有效网段的接口');
 const validAcl=[],validFlows=[];
 for(const [type,list]of [['acl',maps.acl],['flows',maps.flows]])for(const v of list.values()){
  const p=type+' '+v.id,start=issues.length;need(v,['sourceNetworkId','targetNetworkId','source','targetVersion'],p);
  for(const k of ['sourceNetworkId','targetNetworkId'])if(str(v[k])&&!maps.networks.has(v[k]))error('reference',p+'.'+k,'网段不存在');
  const sourceRange=ranges.get(v.sourceNetworkId),targetRange=ranges.get(v.targetNetworkId);if(sourceRange&&targetRange&&sourceRange.family!==targetRange.family)unknown('cross-family-flow',p,'跨IPv4/IPv6流量需要显式转换或双栈路径，当前ACL不能证明可达');
  if(!['tcp','udp'].includes(v.protocol))error('protocol',p+'.protocol','仅支持显式TCP/UDP需求，其他协议保持待建模');
  if(str(v.targetVersion)&&str(targetVersion)&&v.targetVersion!==targetVersion)error('version',p+'.targetVersion','端口/策略资料与目标版本不符');
  if(type==='acl'){number(v,'portStart',p,true,65535);number(v,'portEnd',p,true,65535);if(v.portStart>v.portEnd)error('ports',p,'端口区间倒置');if(!['allow','deny'].includes(v.action))error('action',p,'动作须为allow或deny');}
  else{number(v,'port',p,true,65535);if(!PURPOSES.includes(v.purpose))error('purpose',p,'未知流量用途');else for(const key of ['sourceNetworkId','targetNetworkId']){const n=maps.networks.get(v[key]);if(Array.isArray(n?.purposes)&&!n.purposes.includes(v.purpose))error('flow-purpose',p,'流量用途未被两端网段声明覆盖');}}
  if(issues.length===start)(type==='acl'?validAcl:validFlows).push(v);
 }
 for(let i=0;i<validAcl.length;i++)for(let j=i+1;j<validAcl.length;j++){
  if(++comparisons>LIMIT){unknown('budget','$','检查预算用尽，未完成ACL冲突校验');return done();}
  const a=validAcl[i],b=validAcl[j];if(a.action!==b.action&&a.sourceNetworkId===b.sourceNetworkId&&a.targetNetworkId===b.targetNetworkId&&a.protocol===b.protocol&&a.portStart<=b.portEnd&&b.portStart<=a.portEnd)error('acl-conflict',a.id+'/'+b.id,'相同流向和协议的端口区间存在允许/拒绝冲突；规则顺序须专项映射');
 }
 for(const f of validFlows){
  let allow=false,deny=false;for(const a of validAcl){if(++comparisons>LIMIT){unknown('budget','$','检查预算用尽，未完成全部流量校验');return done();}if(a.sourceNetworkId===f.sourceNetworkId&&a.targetNetworkId===f.targetNetworkId&&a.protocol===f.protocol&&a.portStart<=f.port&&a.portEnd>=f.port){if(a.action==='allow')allow=true;else deny=true;}}
  if(deny)error(allow?'acl-conflict':'flow-denied','flow '+f.id,allow?'声明的允许与拒绝规则冲突；本工具不猜测防火墙规则顺序':'所需流量被声明规则拒绝');
  else if(!allow)error('flow-uncovered','flow '+f.id,'缺少覆盖此方向、协议和目标端口的允许规则');
 }
 for(const purpose of PURPOSES)if(!validFlows.some(f=>f.purpose===purpose))unknown('missing-flow','flow '+purpose,'未提供该用途的完整连接需求；端口必须来自目标版本资料');
 if(!capacityApi)unknown('capacity-module','$','容量核对模块未加载');
 else{const capacity=capacityApi.evaluate([...maps.hosts.values()],context,input.planUnits);capacityRows=capacity.rows;issues.push(...capacity.issues);}
 return done();
}
const api={SCHEMA,PURPOSES,ipv4,cidr,template,evaluate};root.GoldenDBInfrastructure=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
