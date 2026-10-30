/* Declared endpoint/flow consistency only. No inferred full mesh or packet forwarding proof. */
(function(root){'use strict';
const addresses=root.GoldenDBNetworkAddress||(typeof module==='object'&&module.exports?require('./network-address.js'):null);
const SCHEMA='goldendb-component-network-v1',TYPES=['CN','DN','GTM','MGR','OPS'];
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
function canonical(x){if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);if(typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);if(Array.isArray(x)){if(Object.keys(x).length!==x.length)throw Error('sparse');return '['+x.map(canonical).join(',')+']';}if(object(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';throw Error('invalid');}
function template(context){const components=JSON.parse(canonical(context?.components??[]));return {schema:SCHEMA,targetVersion:null,components,endpoints:components.map((c,i)=>({id:'EP'+(i+1),kind:'component',componentId:c.id,interfaceId:null})),links:[],review:{coverage:'unknown',evidenceIds:[],conditions:null}};}
function evaluate(input,context,infra,targetVersion,evidence){
 const issues=[],rows=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message});let mapped=0,participating=0,total=0;
 const done=()=>({status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明对应一致待实测',canDeploy:false,issues,rows,counts:{components:total,mapped,participating},limitation:'仅检查已声明组件/端点/连接的对应与参与；不能证明厂商所需连接齐全、监听端口、路由可达或实际授权。'});
 const error=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const fields=(v,allowed,p)=>{if(!object(v)){error('connection-type',p,'应为对象');return false;}for(const k of Object.keys(v))if(!allowed.includes(k))error('connection-field',p+'.'+k,'未建模字段，不能静默作为配置使用');return true;};
 const list=(value,name,max=5000)=>{if(!Array.isArray(value)||value.length>max){error('connection-list',name,'清单缺失或超过'+max+'条上限');return [];}return value;};
 const index=(value,name)=>{const map=new Map();for(const v of list(value,name)){if(!object(v)||!text(v.id)){error('connection-id',name,'对象ID缺失');continue;}if(map.has(v.id))error('connection-duplicate',name,'ID重复：'+v.id);else map.set(v.id,v);}return map;};
 try{canonical(context?.components??null);if(input!=null&&new TextEncoder().encode(canonical(input)).length>4*1024*1024){error('connection-size','$','连接材料超过4MiB');return done();}}catch{error('connection-json','$','清单须为有限、非稀疏JSON');return done();}
 if(!Array.isArray(context?.components)||!context.components.length){unknown('connection-context','$context','当前规划缺少组件身份目录');return done();}
 const components=index(context.components,'$context.components');total=components.size;
 for(const c of components.values())if(!TYPES.includes(c.type)||!text(c.hostId)||!context.hostIds?.includes(c.hostId)||!text(c.zone)||!text(c.group)||!text(c.role)||!(c.tenantId===null||text(c.tenantId))||(['CN','DN'].includes(c.type)&&!text(c.tenantId)))error('connection-context',c.id,'组件类型、宿主机、租户/Group、角色或站点无效');
 if(input==null){unknown('connection-missing','$','尚未提供组件连接矩阵；网段端口允许不等于组件通信关系完整');rows.push({category:'component-network',label:'组件连接矩阵',status:'未评估',detail:'当前'+total+'个组件尚未绑定通信端点和连接'});return done();}
 if(!fields(input,['schema','targetVersion','components','endpoints','links','review'],'$'))return done();
 if(input.schema!==SCHEMA)error('connection-schema','$','不支持此连接材料版本');
 if(!text(input.targetVersion)||!text(targetVersion))unknown('connection-version','$','缺少明确目标版本/补丁');else if(input.targetVersion!==targetVersion)error('connection-version','$','连接资料与目标版本不符');
 if(!Array.isArray(input.components))error('connection-catalog','$.components','缺少绑定的组件目录');else if(canonical(input.components)!==canonical(context.components))error('connection-catalog','$.components','组件身份/角色/租户/组/宿主机或站点已变化，不能沿用旧连接矩阵');
 const interfaces=index(infra?.interfaces,'interfaces'),networks=index(infra?.networks,'networks'),flows=index(infra?.flows,'flows'),proofs=index(evidence,'evidence');
 const refs=(ids,categories,p)=>{const cats=new Set();if(!Array.isArray(ids)||ids.length>30||ids.some(id=>!text(id))||new Set(ids).size!==ids.length){error('connection-evidence-list',p,'证据ID应为最多30项的不重复清单');return;}for(const id of ids){const e=proofs.get(id);if(!e){error('connection-evidence-reference',p,'引用证据不存在：'+id);continue;}cats.add(e.category);if(text(targetVersion)&&e.targetVersion!==targetVersion)error('connection-evidence-version',p,'引用证据目标版本不符');if(e.result==='fail'||e.result==='unsupported')error('connection-negative-evidence',p,'引用证据声明失败/不支持');else if(e.result!=='pass')unknown('connection-evidence-result',p,'引用证据尚未声明通过');}for(const cat of categories)if(!cats.has(cat))unknown('connection-evidence-category',p,'缺少'+cat+'类别依据');};
 if(fields(input.review,['coverage','evidenceIds','conditions'],'$.review')){
  if(input.review.coverage==='unknown')unknown('connection-coverage','$.review','目标版本的完整连接清单尚未复核');else if(input.review.coverage!=='declared-complete')error('connection-coverage','$.review','只接受unknown/declared-complete，不能自报生产验证');
  if(!text(input.review.conditions))unknown('connection-conditions','$.review','缺少连接清单来源章节、适用范围及未覆盖项');refs(input.review.evidenceIds,['network','versionSupport'],'$.review');
 }
 const internalIPs=new Set();for(const i of interfaces.values()){const a=addresses?.parse(i.address),n=networks.get(i.networkId);if(a&&n)internalIPs.add(JSON.stringify([n.vrf,a.family,a.value.toString()]));}
 const endpoints=index(input.endpoints,'endpoints'),resolved=new Map(),bindings=new Set(),externalIPs=new Set(),mappedIds=new Set();
 for(const e of endpoints.values()){
  const start=issues.length,p='endpoint '+e.id;let networkId,tenantId,componentId=null;
  if(e.kind==='component'){
   if(!fields(e,['id','kind','componentId','interfaceId'],p))continue;
   const c=components.get(e.componentId),i=interfaces.get(e.interfaceId);
   if(!c)error('endpoint-component',p,'组件不存在于当前规划');
   if(!text(e.interfaceId))unknown('endpoint-interface',p,'尚未指定组件使用的网卡接口');else if(!i)error('endpoint-interface',p,'接口引用不存在');
   if(c&&i&&c.hostId!==i.hostId)error('endpoint-host',p,'组件端点引用了其他服务器的接口');
   if(c&&i){const a=addresses?.parse(i.address),n=networks.get(i.networkId),r=addresses?.prefix(n?.cidr);if(!a)error('endpoint-address',p,'组件接口地址非法或未提供');else if(!r)unknown('endpoint-address',p,'组件接口网段尚不能验证');else if(a.family!==r.family||a.value<r.start||a.value>r.end)error('endpoint-address',p,'组件接口地址族或网段范围不匹配');else if(addresses.classification(a)==='non-unicast')error('endpoint-address',p,'组件接口不是普通单播地址');else if(addresses.classification(a)!=='ordinary')unknown('endpoint-special',p,'组件接口特殊地址用途须专项核验');else if(a.family===4&&r.bits<=30&&(a.value===r.start||a.value===r.end))error('endpoint-address',p,'组件接口不能使用IPv4网络/广播地址');else if(a.family===6&&r.bits<=126&&a.value===r.start)unknown('endpoint-special',p,'IPv6子网全零标识须专项核验');networkId=i.networkId;tenantId=c.tenantId;componentId=c.id;const key=JSON.stringify([c.id,i.id]);if(bindings.has(key))error('endpoint-alias',p,'同一组件/接口被重复登记');bindings.add(key);}
  }else if(e.kind==='external'){
   if(!fields(e,['id','kind','externalKind','networkId','address','tenantId'],p))continue;
   if(!['application','load-balancer','backup','monitoring','operations'].includes(e.externalKind))error('endpoint-kind',p,'外部端点类型未支持');
   if(!(e.tenantId===null||text(e.tenantId)))error('endpoint-tenant',p,'外部端点租户须明确填写，或显式null表示共享/尚待专项授权');
   const n=networks.get(e.networkId),a=addresses?.parse(e.address),r=addresses?.prefix(n?.cidr);networkId=e.networkId;tenantId=e.tenantId;
   if(!a)error('endpoint-address',p,'外部端点地址非法或作用域未建模');
   else if(!r)unknown('endpoint-address',p,'外部端点网段尚不能验证');
   else if(a.family!==r.family||a.value<r.start||a.value>r.end)error('endpoint-address',p,'外部端点地址族/范围与声明网段不符');
   else if(addresses.classification(a)!=='ordinary')unknown('endpoint-special',p,'特殊地址用途/作用域须专项核验');
   else if(a.family===4&&r.bits<=30&&(a.value===r.start||a.value===r.end))error('endpoint-address',p,'外部端点不能使用IPv4网络/广播地址');
   else if(a.family===6&&r.bits<=126&&a.value===r.start)unknown('endpoint-special',p,'IPv6子网全零标识须核验任播语义');
   if(a&&n){const key=JSON.stringify([n.vrf,a.family,a.value.toString()]);if(internalIPs.has(key))unknown('endpoint-ownership',p,'外部端点与规划主机共用地址，真实进程/监听及授权边界须专项核验');if(externalIPs.has(key))error('endpoint-alias',p,'同VRF外部地址重复登记，请复用已有端点');externalIPs.add(key);}
  }else error('endpoint-kind',p,'端点须为component或external');
  if(!text(networkId))unknown('endpoint-network',p,'端点网段尚未映射');else if(!networks.has(networkId))error('endpoint-network',p,'端点网段引用不存在');
  if(issues.length===start){resolved.set(e.id,{...e,networkId,tenantId,componentId});if(componentId)mappedIds.add(componentId);}
 }
 mapped=mappedIds.size;
 const links=index(input.links,'links'),used=new Set(),usedFlows=new Set(),usedEndpoints=new Set(),tuples=new Set();
 for(const l of links.values()){
  const start=issues.length,p='link '+l.id;
  if(!fields(l,['id','sourceEndpointId','targetEndpointId','flowId','securityEvidenceIds'],p))continue;
  const s=resolved.get(l.sourceEndpointId),t=resolved.get(l.targetEndpointId),f=flows.get(l.flowId);
  if(!s||!t)error('connection-endpoint',p,'连接端点缺失或端点映射未通过');
  if(!f)error('connection-flow',p,'连接引用的流量需求不存在');
  if(s&&t&&f){
   if(s.id===t.id||s.componentId&&s.componentId===t.componentId)error('connection-self',p,'不能用组件自连接充当组件通信参与证明');
   if(s.networkId!==f.sourceNetworkId||t.networkId!==f.targetNetworkId)error('connection-direction',p,'连接两端实际接口网段与流量方向不一致');
   if(!['tcp','udp'].includes(f.protocol)||!Number.isInteger(f.port)||f.port<1||f.port>65535||!text(f.source))error('connection-flow',p,'引用流量的协议/目标端口/来源非法或缺失');
   if(text(targetVersion)&&f.targetVersion!==targetVersion)error('connection-flow-version',p,'引用流量与目标版本不符');
   for(const n of [networks.get(s.networkId),networks.get(t.networkId)])if(!Array.isArray(n?.purposes)||!n.purposes.includes(f.purpose))error('connection-purpose',p,'流量用途未被连接两端网段声明覆盖');
   const key=JSON.stringify([s.id,t.id,f.protocol,f.port,f.purpose]);if(tuples.has(key))error('connection-duplicate-link',p,'相同方向/协议/端口/用途的连接重复');tuples.add(key);
   const crossTenant=s.tenantId!==t.tenantId||s.kind==='external'&&s.tenantId===null||t.kind==='external'&&t.tenantId===null;
   refs(l.securityEvidenceIds,crossTenant?['security']:[],p);
   if(issues.length===start){usedFlows.add(f.id);usedEndpoints.add(s.id);usedEndpoints.add(t.id);if(s.componentId)used.add(s.componentId);if(t.componentId)used.add(t.componentId);}
  }
 }
 for(const f of flows.values())if(!usedFlows.has(f.id))unknown('flow-unbound',f.id,'声明流量尚未绑定到有效组件/外部端点连接');
 for(const e of resolved.values())if(e.kind==='external'&&!usedEndpoints.has(e.id))unknown('endpoint-uncovered',e.id,'外部端点未参与有效声明连接');
 participating=used.size;
 for(const c of components.values()){
  const mapped=mappedIds.has(c.id),participates=used.has(c.id);
  if(!mapped)unknown('component-unmapped',c.id,'当前组件未映射到有效网卡接口');
  if(!participates)unknown('component-uncovered',c.id,'当前组件未出现在有效声明连接中，不能由其他组件端口开放推断通信覆盖');
  rows.push({category:'component-network',label:'组件连接 / '+c.id,status:mapped&&participates?'已声明参与待实测':'未评估',detail:c.type+'；租户'+(c.tenantId??'共享/集群')+'；组'+c.group+'；主机'+c.hostId+'；仅引用与参与检查，不证明所需连接齐全或实际可达'});
 }
 return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBComponentNetwork=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
