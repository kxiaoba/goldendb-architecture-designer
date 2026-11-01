/* Declared exclusive listener checks, not OS bind tests or production certification. */
(function(root){'use strict';
const ip=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null);
const SCHEMA='goldendb-service-listeners-v1';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
const equal=(a,b)=>a&&b&&a.family===b.family&&a.value===b.value;
// null means the IPv6 wildcard's v6-only mode has not been declared.
function covers(a,v6Only,b){if(a.family===b.family)return a.value===0n||a.value===b.value;if(a.family===6&&a.value===0n&&b.family===4)return v6Only===null?null:!v6Only;return false;}
function overlaps(a,b){const x=covers(a.address,a.ipv6Only,b.address),y=covers(b.address,b.ipv6Only,a.address);return x===true||y===true?true:x===null||y===null?null:false;}
function template(){return {schema:SCHEMA,listeners:[],bindings:[],review:{coverage:'unknown',source:null}};}
function evaluate(input,context,infra,connections,targetVersion){
 const issues=[],rows=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message}),err=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const done=()=>({issues,rows,canDeploy:false,status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明监听一致待实测'});
 if(input==null){unknown('listener-missing','services','尚未提供服务监听清单，组件数量合规不能证明端口无冲突');rows.push({category:'service-listener',label:'服务监听',status:'未评估',detail:'缺少监听地址、协议、端口与连接目标绑定'});return done();}
 const fields=(x,keys,p)=>{if(!obj(x)){err('listener-type',p,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))err('listener-field',p+'.'+k,'未建模监听字段');return true;};
 const index=(a,p)=>{const m=new Map();if(!Array.isArray(a)||a.length>5000){err('listener-list',p,'应为不超过5000项的清单');return m;}for(const x of a){if(!obj(x)||!text(x.id)){err('listener-id',p,'缺少有效ID');continue;}if(m.has(x.id))err('listener-duplicate',p,'重复ID：'+x.id);else m.set(x.id,x);}return m;};
 if(!fields(input,['schema','listeners','bindings','review'],'services'))return done();
 if(input.schema!==SCHEMA)err('listener-schema','services','监听材料版本不支持');
 if(fields(input.review,['coverage','source'],'services.review')){if(input.review.coverage==='unknown')unknown('listener-review','services.review','完整进程监听清单尚待核对');else if(input.review.coverage!=='declared-complete')err('listener-review','services.review','仅允许unknown/declared-complete，不接受自报生产认证');if(!text(input.review.source))unknown('listener-source','services.review','缺少完整监听清单来源和适用范围');}
 const components=index(context?.components,'components'),interfaces=index(infra?.interfaces,'interfaces'),endpoints=index(connections?.endpoints,'endpoints'),links=index(connections?.links,'links'),flows=index(infra?.flows,'flows'),listeners=index(input.listeners,'listeners');
 const parsed=new Map(),eligible=new Set(),affected=new Set(),blocked=new Set(),groups=new Map();
 for(const l of listeners.values()){
  const p='listener '+l.id,start=issues.length;
  fields(l,['id','componentId','protocol','port','bindAddress','namespaceId','ipv6Only','reusePolicy','source','targetVersion'],p);
  const c=components.get(l.componentId),a=ip?.parse(l.bindAddress);
  if(!c||!text(c.hostId))err('listener-component',p,'监听组件不存在或宿主机未确定');
  if(!['tcp','udp'].includes(l.protocol)||!Number.isInteger(l.port)||l.port<1||l.port>65535)err('listener-port',p,'协议须tcp/udp，端口须1至65535整数');
  if(!text(l.namespaceId))unknown('listener-namespace',p,'缺少网络命名空间；不能默认相互隔离');else if(l.namespaceId!=='host')unknown('listener-namespace',p,'非host命名空间的接口归属、隔离及端口映射尚未建模');
  if(!['exclusive','shared','unknown'].includes(l.reusePolicy))err('listener-reuse',p,'监听复用策略无效');else if(l.reusePolicy!=='exclusive')unknown('listener-reuse',p,'端口复用须核验套接字选项、进程和目标平台，不自动放行');
  if(!text(l.source))unknown('listener-source',p,'缺少监听配置来源/章节/进程说明');
  if(!text(targetVersion)||!text(l.targetVersion))unknown('listener-version',p,'缺少目标版本/补丁');else if(l.targetVersion!==targetVersion)err('listener-version',p,'监听资料与目标版本不符');
  if(!a)err('listener-address',p,'绑定地址非法或作用域未建模');
  else{
   if(a.family===6&&!(l.ipv6Only===true||l.ipv6Only===false||l.ipv6Only===null))err('listener-v6only',p,'IPv6须声明ipv6Only布尔值或null未知');
   else if(a.family===6&&l.ipv6Only===null)unknown('listener-v6only',p,'IPV6_V6ONLY未知，不能假设IPv4端口独立');
   else if(a.family===4&&l.ipv6Only!=='not-applicable')err('listener-v6only',p,'IPv4的ipv6Only须为not-applicable');
   if(a.value!==0n){if(ip.classification(a)!=='ordinary')unknown('listener-special',p,'特殊/映射/带作用域地址须专项核验');if(c&&l.namespaceId==='host'&&![...interfaces.values()].some(i=>i.hostId===c.hostId&&equal(ip.parse(i.address),a)))err('listener-ownership',p,'具体绑定地址不属于当前组件宿主机的已登记接口');}
  }
  if(c&&a&&['tcp','udp'].includes(l.protocol)&&Number.isInteger(l.port)&&l.port>0&&l.port<=65535){
   const v={...l,address:a,hostId:c.hostId};parsed.set(l.id,v);if(text(l.namespaceId)){const key=JSON.stringify([c.hostId,l.namespaceId,l.protocol,l.port]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(v);}
  }
  if(issues.length===start)eligible.add(l.id);else{affected.add(l.componentId);if(issues.slice(start).some(i=>i.severity==='error'))blocked.add(l.componentId);}
 }
 let comparisons=0,exhausted=false;
 outer:for(const group of groups.values())for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  if(++comparisons>100000||issues.length>=1000){unknown('listener-budget','services','达到100000次比较或1000条诊断上限，剩余监听冲突未评估');exhausted=true;break outer;}
  const a=group[i],b=group[j],hit=overlaps(a,b);if(hit===false)continue;
  const code=hit===true&&a.reusePolicy==='exclusive'&&b.reusePolicy==='exclusive'?'listener-conflict':'listener-conflict-unknown';
  add(code==='listener-conflict'?'error':'unknown',code,a.id+' / '+b.id,'同机同命名空间监听范围重叠：'+a.hostId+' '+a.protocol+'/'+a.port+'；'+a.id+' 与 '+b.id+'；需修改绑定或提供专项复用依据');
  if(code==='listener-conflict'){blocked.add(a.componentId);blocked.add(b.componentId);}
  eligible.delete(a.id);eligible.delete(b.id);affected.add(a.componentId);affected.add(b.componentId);
 }
 if(exhausted){eligible.clear();for(const c of components.keys())affected.add(c);}
 const bindings=index(input.bindings,'bindings'),bound=new Set(),seen=new Set();
 for(const b of bindings.values()){
  const p='binding '+b.id,start=issues.length;fields(b,['id','linkId','listenerId'],p);const link=links.get(b.linkId),l=parsed.get(b.listenerId),e=endpoints.get(link?.targetEndpointId),f=flows.get(link?.flowId),iface=interfaces.get(e?.interfaceId),c=components.get(e?.componentId);
  if(seen.has(b.linkId))err('listener-binding-duplicate',p,'一个入向连接只能绑定一个明确目标监听');seen.add(b.linkId);
  if(!link||!l)err('listener-reference',p,'连接或监听引用不存在/格式无效');
  else if(e?.kind!=='component')err('listener-target',p,'本阶段只绑定规划组件入向监听，外部服务须单独核验');
  else{
   if(!c||l.componentId!==e.componentId||!iface||iface.hostId!==c.hostId)err('listener-target',p,'监听组件或接口宿主机与连接目标不一致');
   if(!f||f.protocol!==l.protocol||f.port!==l.port)err('listener-flow',p,'连接协议/目标端口与监听不一致');
   const target=ip?.parse(iface?.address);if(!target)err('listener-target-address',p,'连接目标地址无效');else{const hit=covers(l.address,l.ipv6Only,target);if(hit===false)err('listener-target-address',p,'监听绑定地址不覆盖连接目标地址');else if(hit===null)unknown('listener-target-address',p,'IPv6双栈监听是否覆盖IPv4目标尚未确认');}
   if(!eligible.has(l.id))unknown('listener-not-eligible',p,'目标监听存在缺项或冲突，不能计作已匹配');
  }
  if(issues.length===start)bound.add(b.linkId);else if(e?.componentId){affected.add(e.componentId);if(issues.slice(start).some(i=>i.severity==='error'))blocked.add(e.componentId);}
 }
 for(const l of links.values()){const e=endpoints.get(l.targetEndpointId);if(e?.kind==='component'&&!bound.has(l.id)){unknown('listener-unbound',l.id,'入向连接未匹配到无冲突且已声明的目标监听');affected.add(e.componentId);}}
 for(const c of components.values()){
  const declared=[...listeners.values()].filter(l=>l.componentId===c.id),valid=declared.some(l=>eligible.has(l.id));
  if(!valid){unknown('component-listener-missing',c.id,'组件缺少有效监听声明；需补充完整进程清单');affected.add(c.id);}
  rows.push({category:'service-listener',label:'服务监听 / '+c.id,status:blocked.has(c.id)?'阻断':affected.has(c.id)?'未评估':'声明监听待实测',detail:'主机'+c.hostId+'；'+declared.length+'条监听声明；仅host直接绑定及入向连接匹配，外部服务/容器转发/运行时端口占用须实测'});
 }
 return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBServiceListeners=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
