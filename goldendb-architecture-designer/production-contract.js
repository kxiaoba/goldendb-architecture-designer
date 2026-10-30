/* Read-only production-review contract. Imported claims never grant deployment approval. */
(function(root){
'use strict';
const infrastructure=root.GoldenDBInfrastructure||(typeof module==='object'&&module.exports?require('./infrastructure-contract.js'):null);
const capabilities=root.GoldenDBVersionCapabilities||(typeof module==='object'&&module.exports?require('./version-capabilities.js'):null);
const connectivity=root.GoldenDBComponentNetwork||(typeof module==='object'&&module.exports?require('./component-network.js'):null);
const SCHEMA='goldendb-production-review-v1';
const CATEGORIES=Object.freeze({versionSupport:'版本与组件支持',inventory:'物理库存与故障域',network:'网络与访问控制',capacity:'正常及故障容量',ha:'复制选主与容灾',backupRestore:'备份与恢复',security:'安全与授权',operations:'监控与运维',cutover:'部署割接与回退',acceptance:'环境验收与审批'});
const LIMIT=4*1024*1024;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
const id=x=>text(x)&&x.length<=160;
const clone=x=>JSON.parse(JSON.stringify(x));
function canonical(value){
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value)){if(value.some(x=>x===undefined)||Object.keys(value).length!==value.length)throw Error('稀疏数组');return '['+value.map(canonical).join(',')+']';}
 if(object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw Error('不支持的JSON值');
}
function instant(s){
 if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s))return NaN;
 const n=Date.parse(s);return Number.isFinite(n)&&new Date(n).toISOString()===s.replace(/(?<!\.\d{3})Z$/,'.000Z')?n:NaN;
}
function template(context){
 const infra=infrastructure?infrastructure.template(context):null;
 const topology={clusters:[],dcs:[],azs:[],racks:[],hosts:context.hostIds.map(id=>({id,physicalId:null,clusterId:null,azId:null,rackId:null}))};
 const connections=connectivity?connectivity.template(context):null;
 return {schema:SCHEMA,infrastructure:infra,connectivity:connections,capabilities:capabilities?capabilities.template(context,infra,topology,connections):null,design:{id:null,revision:null,targetVersion:null,environmentId:null,entry:context.entry,snapshot:clone(context.snapshot)},
  topology,
  evidence:Object.keys(CATEGORIES).map(category=>({id:category,category,designId:null,revision:null,targetVersion:null,environmentId:null,source:null,sourceVersion:null,sha256:null,collectedAt:null,validUntil:null,owner:null,result:'unknown',limitations:null}))};
}
function evaluate(input,context,now=new Date().toISOString()){
 const issues=[],rows=[];let materialsComplete=true;
 const add=(severity,code,path,message)=>{issues.push({severity,code,path,message});materialsComplete=false;};
 const missing=(path,message)=>add('unknown','missing',path,message);
 const error=(code,path,message)=>add('error',code,path,message);
 const finish=()=>{const blocked=issues.some(x=>x.severity==='error');return {schema:SCHEMA,checkedAt:now,designId:id(input?.design?.id)?input.design.id:null,revision:id(input?.design?.revision)?input.design.revision:null,
  status:blocked?'阻断':materialsComplete?'待独立核验':'未评估',productionStatus:blocked?'未通过':'未评估',canDeploy:false,materialsComplete,
  rows,issues,errorCount:issues.filter(x=>x.severity==='error').length,unknownCount:issues.filter(x=>x.severity==='unknown').length,
  limitation:'仅检查材料结构、设计绑定和适用性；未读取或认证证据正文/签名，填写通过不等于生产核验。'};};
 const fields=(o,allowed,path)=>{if(!object(o)){error('type',path,'应为对象');return false;}for(const k of Object.keys(o))if(!allowed.includes(k))error('unknown-field',path+'.'+k,'未知字段，不能作为核验或批准依据');return true;};
 const required=(o,keys,path)=>{for(const k of keys)if(!id(o[k]))missing(path+'.'+k,'请填写明确值，不能以空值代替核验');};
 const time=instant(now);
 if(!Number.isFinite(time)){error('clock','$now','检查时间须为有效UTC时间');return finish();}
 if(!object(context)||!['business','reverse','fixed'].includes(context.entry)||!Array.isArray(context.hostIds)||!context.hostIds.length||context.hostIds.some(h=>!id(h))||new Set(context.hostIds).size!==context.hostIds.length||!['passed','blocked','unknown'].includes(context.structuralStatus)){
  error('context','$context','当前规划不存在、主机身份不完整或检查状态非法');return finish();
 }
 try{canonical(context.snapshot);}catch{error('context','$context.snapshot','当前规划快照无效');return finish();}
 if(!Array.isArray(context.hostZones)||context.hostZones.length!==context.hostIds.length||new Set(context.hostZones.map(h=>h?.id)).size!==context.hostIds.length||context.hostZones.some(h=>!h||!context.hostIds.includes(h.id)||!id(h.zone))){error('context','$context.hostZones','规划主机的逻辑可用区映射不完整');return finish();}
 if(context.structuralStatus==='blocked')error('plan-blocked','$context','当前规划已有身份、落位或资源红线，不能送作可实施方案');
 if(context.structuralStatus==='unknown')missing('$context','当前规划结构尚未验证');
 if(input==null){missing('$','尚未导入与当前规划绑定的生产评审材料');return finish();}
 try{if(new TextEncoder().encode(canonical(input)).length>LIMIT){error('size','$','材料超过4MiB检查上限');return finish();}}catch{error('json','$','材料须为有限、非稀疏的JSON数据');return finish();}
 if(!fields(input,['schema','design','topology','evidence','infrastructure','capabilities','connectivity'],'$'))return finish();
 if(input.schema!==SCHEMA)error('schema','$.schema','不支持此材料版本');
 if(!fields(input.design,['id','revision','targetVersion','environmentId','entry','snapshot'],'$.design'))return finish();
 const d=input.design;required(d,['id','revision','targetVersion','environmentId'],'$.design');
 if(d.entry!==context.entry)error('entry','$.design.entry','材料所属设计入口与当前规划不符');
 if(d.snapshot==null)missing('$.design.snapshot','缺少绑定的规划快照');
 else if(canonical(d.snapshot)!==canonical(context.snapshot))error('snapshot','$.design.snapshot','规划参数或落位已改变，请更新设计版本及证据后重新评审');
 if(fields(input.topology,['clusters','dcs','azs','racks','hosts'],'$.topology')){
  const t=input.topology,maps={};
  const defs={clusters:['id'],dcs:['id','region'],azs:['id','dcId'],racks:['id','azId','powerDomain','networkDomain'],hosts:['id','physicalId','clusterId','azId','rackId']};
  for(const [name,keys]of Object.entries(defs)){
   const list=t[name];maps[name]=new Map();
   if(!Array.isArray(list)||list.length>5000){error('list','$.topology.'+name,'应为不超过5000项的清单');continue;}
   if(!list.length)missing('$.topology.'+name,'缺少真实对象映射，示意标签不能作为物理故障域');
   list.forEach((v,i)=>{const p='$.topology.'+name+'['+i+']';if(!fields(v,keys,p))return;required(v,keys,p);if(!id(v.id))return;if(maps[name].has(v.id))error('duplicate',p+'.id','同类对象ID重复');else maps[name].set(v.id,v);});
  }
  const ref=(o,k,map,p)=>{if(id(o[k])&&!map.has(o[k]))error('reference',p+'.'+k,'引用的对象不存在');};
  for(const a of maps.azs.values())ref(a,'dcId',maps.dcs,'AZ '+a.id);
  for(const r of maps.racks.values())ref(r,'azId',maps.azs,'rack '+r.id);
  const physical=new Set();
  for(const h of maps.hosts.values()){
   if(!context.hostIds.includes(h.id))error('extra-host','host '+h.id,'物理映射包含当前规划以外的主机');
   for(const [k,m]of [['clusterId','clusters'],['azId','azs'],['rackId','racks']])ref(h,k,maps[m],'host '+h.id);
   if(id(h.physicalId)){if(physical.has(h.physicalId))error('physical-alias','host '+h.id,'同一物理服务器被多个规划主机重复占用');physical.add(h.physicalId);}
   const rack=maps.racks.get(h.rackId);if(rack&&id(h.azId)&&id(rack.azId)&&h.azId!==rack.azId)error('domain-conflict','host '+h.id,'主机与机柜的AZ归属冲突');
  }
  const zoneToAz=new Map(),azToZone=new Map();
  for(const z of context.hostZones){const h=maps.hosts.get(z.id);if(!h||!id(h.azId))continue;if(zoneToAz.has(z.zone)&&zoneToAz.get(z.zone)!==h.azId)error('zone-split','host '+h.id,'同一规划可用区映射到多个物理AZ');if(azToZone.has(h.azId)&&azToZone.get(h.azId)!==z.zone)error('zone-collapse','host '+h.id,'多个规划可用区映射到同一个物理AZ，不能据逻辑标签证明隔离');zoneToAz.set(z.zone,h.azId);azToZone.set(h.azId,z.zone);}
  if(new Set([...maps.hosts.values()].map(h=>h.clusterId).filter(id)).size>1)error('multi-cluster-unmodelled','$.topology.hosts','当前规划适配器未建立跨集群复制语义，多个集群映射须待P02b专项设计');
  for(const h of context.hostIds)if(!maps.hosts.has(h))missing('host '+h,'当前规划主机未映射到真实物理库存');
 }
 if(!Array.isArray(input.evidence)||input.evidence.length>1000){error('list','$.evidence','证据应为不超过1000条的清单');return finish();}
 const ids=new Set(),seen=new Set();
 input.evidence.forEach((e,i)=>{
  const p='$.evidence['+i+']',start=issues.length;
  if(!fields(e,['id','category','designId','revision','targetVersion','environmentId','source','sourceVersion','sha256','collectedAt','validUntil','owner','result','limitations'],p))return;
  required(e,['id','designId','revision','targetVersion','environmentId','sourceVersion','owner'],p);
  if(ids.has(e.id))error('duplicate',p+'.id','证据ID重复');ids.add(e.id);
  if(!Object.hasOwn(CATEGORIES,e.category)){error('category',p+'.category','未知评审类别');return;}seen.add(e.category);
  for(const [k,dk]of [['designId','id'],['revision','revision'],['targetVersion','targetVersion'],['environmentId','environmentId']])if(id(e[k])&&id(d[dk])&&e[k]!==d[dk])error('scope',p+'.'+k,'证据与当前设计版本/目标版本/环境不匹配');
  if(!text(e.source))missing(p+'.source','缺少证据文件或资料定位');
  else if(/^(?:javascript|data|vbscript):/i.test(e.source.trim()))error('source',p+'.source','不接受可执行内容作为资料位置');
  if(e.sha256==null)missing(p+'.sha256','缺少证据文件SHA-256');else if(typeof e.sha256!=='string'||!/^[a-f0-9]{64}$/.test(e.sha256))error('digest',p+'.sha256','文件摘要须为64位小写SHA-256');
  const collected=instant(e.collectedAt),until=instant(e.validUntil);
  for(const [k,n]of [['collectedAt',collected],['validUntil',until]])if(e[k]==null)missing(p+'.'+k,'缺少UTC时间');else if(!Number.isFinite(n))error('date',p+'.'+k,'须为有效UTC时间，不接受非法日期或隐含时区');
  if(Number.isFinite(collected)&&collected>time)error('future',p+'.collectedAt','证据时间晚于检查时间');
  if(Number.isFinite(until)&&until<=time)error('expired',p+'.validUntil','证据已到期，须重新核验');
  if(Number.isFinite(collected)&&Number.isFinite(until)&&until<=collected)error('interval',p,'有效期必须晚于采集时间');
  if(!['unknown','pass','fail','unsupported'].includes(e.result))error('result',p+'.result','仅接受unknown/pass/fail/unsupported；不接受自报verified');
  if(e.result==='unknown')missing(p+'.result','尚未提供检查结果');
  if(e.result==='fail'||e.result==='unsupported')error('negative-evidence',p+'.result','已有失败或不支持结论，不能被其他通过材料抵消');
  if(!text(e.limitations))missing(p+'.limitations','须说明适用条件与失效条件');
  const local=issues.slice(start);rows.push({id:e.id,category:e.category,label:CATEGORIES[e.category],status:local.some(x=>x.severity==='error')?'阻断':local.length?'未评估':'待独立核验',source:e.source??null});
 });
 for(const category of Object.keys(CATEGORIES))if(!seen.has(category)){missing('evidence '+category,'缺少'+CATEGORIES[category]+'材料');rows.push({category,label:CATEGORIES[category],status:'未评估',source:null});}
 if(!infrastructure)missing('$.infrastructure','库存网络检查模块未加载');
 else {const extra=infrastructure.evaluate(input.infrastructure,context,d.targetVersion);for(const issue of extra.issues)add(issue.severity,issue.code,'$.infrastructure.'+issue.path,issue.message);rows.push({category:'infrastructure',label:'库存与双栈网络结构',status:extra.status,source:null});for(const row of extra.capacityRows||[])rows.push({category:'inventory-capacity',label:'实际库存容量 / '+row.hostId,status:row.status,detail:row.detail,source:null});}
 if(!capabilities)missing('$.capabilities','版本能力检查模块未加载');
 else{const extra=capabilities.evaluate(input.capabilities,context,input.infrastructure,d.targetVersion,input.evidence,input.topology,input.connectivity);for(const issue of extra.issues)add(issue.severity,issue.code,'$.capabilities.'+issue.path,issue.message);rows.push(...extra.rows);}
 if(!connectivity)missing('$.connectivity','组件连接检查模块未加载');
 else{const extra=connectivity.evaluate(input.connectivity,context,input.infrastructure,d.targetVersion,input.evidence);for(const issue of extra.issues)add(issue.severity,issue.code,'$.connectivity.'+issue.path,issue.message);rows.push(...extra.rows);}
 return finish();
}
function summary(r){return `生产设计门禁：${r.status}；设计 ${r.designId||'待登记'} / ${r.revision||'待登记'}；阻断${r.errorCount}项、缺失${r.unknownCount}项；生产准入${r.productionStatus}。${r.limitation}`;}
const api={SCHEMA,CATEGORIES,LIMIT,canonical,template,evaluate,summary};root.GoldenDBProductionContract=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
