/* Version claims bound to the exact current design facts; never a vendor certification. */
(function(root){'use strict';
const SCHEMA='goldendb-version-capabilities-v1';
const RULES=Object.freeze({deployment:{label:'部署模式与规模',categories:['versionSupport']},dn:{label:'DN分片、副本与分布',categories:['versionSupport','ha']},gtm:{label:'GTM归属、副本与分布',categories:['versionSupport','ha']},management:{label:'管理组件数量与高可用',categories:['versionSupport','ha']},cn:{label:'业务CN与租户分布',categories:['versionSupport']},cohosting:{label:'实际共宿组合与密度',categories:['versionSupport']},operations:{label:'运维CN与跨租户授权',categories:['versionSupport','security']},platform:{label:'硬件与操作系统适配',categories:['versionSupport','inventory']},network:{label:'地址族与网络配置适配',categories:['versionSupport','network']}});
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
function canonical(x){if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);if(typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);if(Array.isArray(x)){if(Object.keys(x).length!==x.length)throw Error('sparse');return '['+x.map(canonical).join(',')+']';}if(object(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';throw Error('invalid JSON');}
const copy=x=>JSON.parse(canonical(x));
function known(x,key){if(x===null&&key==='tenantId')return true;if(x===null||x===undefined)return false;if(typeof x==='string')return text(x);if(Array.isArray(x))return Object.keys(x).length===x.length&&x.every(known);if(object(x))return Object.keys(x).length>0&&Object.entries(x).every(([k,v])=>known(v,k));return typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x);}
function requirements(context,infra,topology,connectivity){return Object.entries(RULES).map(([id,r])=>({id,label:r.label,categories:r.categories,configuration:id==='deployment'?{design:context?.capabilityFacts?.deployment??null,topology:topology??null}:id==='platform'?(Array.isArray(infra?.hosts)&&infra.hosts.length?{hosts:infra.hosts,planUnits:infra.planUnits??null}:null):id==='network'?(Array.isArray(infra?.networks)&&infra.networks.length?{networks:infra.networks,interfaces:infra.interfaces??null,acl:infra.acl??null,flows:infra.flows??null,connectivity:connectivity??null}:null):context?.capabilityFacts?.[id]??null}));}
function template(context,infra,topology,connectivity){return {schema:SCHEMA,targetVersion:null,claims:requirements(context,infra,topology,connectivity).map(r=>({id:r.id,configuration:copy(r.configuration),decision:'unknown',evidenceIds:[],conditions:null}))};}
function evaluate(input,context,infra,targetVersion,evidence,topology,connectivity){
 const issues=[],rows=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message});
 const done=()=>({status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明完整待核验',canDeploy:false,issues,rows});
 const fields=(x,keys,path)=>{if(!object(x)){add('error','capability-type',path,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))add('error','capability-field',path+'.'+k,'未支持字段，不能据此声明已验证');return true;};
 let expected;
 try{expected=requirements(context,infra,topology,connectivity);canonical(expected);if(input!=null&&new TextEncoder().encode(canonical(input)).length>4*1024*1024){add('error','capability-size','$','能力资料超过4MiB');return done();}}catch{add('error','capability-json','$','能力资料或当前事实不是完整有限JSON');return done();}
 const profile=context?.capabilityFacts;
 if(!object(profile)||Object.keys(profile).some(k=>!Object.hasOwn(RULES,k)||['platform','network'].includes(k)))add('unknown','capability-context','$context','当前适配器缺少完整版本能力事实或含未支持类别');
 if(input==null){for(const r of expected){add('unknown','capability-missing',r.id,'缺少'+r.label+'的指定版本支持结论');rows.push({category:'version-capability',label:r.label,status:'未评估',detail:'待补指定版本支持范围及证据定位'});}return done();}
 if(!fields(input,['schema','targetVersion','claims'],'$'))return done();
 if(input.schema!==SCHEMA)add('error','capability-schema','$','不支持此能力资料版本');
 if(!text(input.targetVersion))add('unknown','capability-version','$.targetVersion','缺少目标版本/补丁');
 else if(text(targetVersion)&&input.targetVersion!==targetVersion)add('error','capability-version','$.targetVersion','能力资料与当前设计目标版本不符');
 if(!Array.isArray(input.claims)||input.claims.length>100){add('error','capability-list','$.claims','能力结论须为不超过100条的清单');return done();}
 if(!text(targetVersion))add('unknown','capability-version','$.targetVersion','当前设计尚未指定目标版本，无法核对适用范围');
 const claims=new Map(),evidenceMap=new Map();
 if(Array.isArray(evidence))for(const e of evidence){if(!object(e))continue;if(evidenceMap.has(e.id))add('error','capability-evidence-duplicate','evidence '+e.id,'证据ID不唯一');else evidenceMap.set(e.id,e);}
 for(const [i,c]of input.claims.entries()){
  const p='claims['+i+']';if(!fields(c,['id','configuration','decision','evidenceIds','conditions'],p))continue;
  if(!Object.hasOwn(RULES,c.id)){add('error','capability-id',p,'未知能力项；不能用自定义项替代必需项');continue;}
  if(claims.has(c.id)){add('error','capability-duplicate',p,'能力项重复，不能用通过覆盖否定结论');continue;}claims.set(c.id,c);
 }
 for(const r of expected){
  const start=issues.length,c=claims.get(r.id),p='capability '+r.id;
  if(!known(r.configuration))add('unknown','capability-facts',p,'当前设计或库存事实缺项，不能判定适用范围');
  if(!c)add('unknown','capability-missing',p,'缺少'+r.label+'的指定版本支持结论');
  else{
   if(c.configuration===undefined)add('unknown','capability-configuration-missing',p,'缺少绑定的配置事实');
   else if(canonical(c.configuration)!==canonical(r.configuration))add('error','capability-configuration',p,'支持结论绑定的数量/副本/落位/库存或网络已不匹配，请重新核验');
   if(!['unknown','supported','unsupported'].includes(c.decision))add('error','capability-decision',p,'仅接受unknown/supported/unsupported；不接受自报verified或批准');
   if(c.decision==='unknown')add('unknown','capability-unknown',p,'尚无指定版本支持结论');
   if(c.decision==='unsupported')add('error','capability-unsupported',p,'声明此配置不受目标版本支持，必须修订方案或取得适用的新证据');
   if(!text(c.conditions))add('unknown','capability-conditions',p,'缺少适用条件、限制及证据章节/页码；笼统通过不足');
   const cats=new Set();
   if(!Array.isArray(c.evidenceIds)||c.evidenceIds.length>30||c.evidenceIds.some(v=>!text(v))||new Set(c.evidenceIds).size!==c.evidenceIds.length)add('error','capability-evidence-list',p,'证据引用须为不重复且不超过30个ID的清单');
   else for(const id of c.evidenceIds){const e=evidenceMap.get(id);if(!e){add('error','capability-evidence-reference',p,'引用证据不存在：'+id);continue;}cats.add(e.category);if(text(targetVersion)&&e.targetVersion!==targetVersion)add('error','capability-evidence-version',p,'引用证据目标版本不符');if(e.result==='fail'||e.result==='unsupported')add('error','capability-negative-evidence',p,'引用证据存在失败/不支持结论');else if(e.result!=='pass')add('unknown','capability-evidence-result',p,'引用证据尚未声明通过');}
   for(const cat of r.categories)if(!cats.has(cat))add('unknown','capability-evidence-category',p,'缺少'+cat+'类别证据引用');
  }
  const local=issues.slice(start);rows.push({category:'version-capability',label:r.label,status:local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':'已声明支持待核验',detail:c?.conditions??'未填写指定版本适用条件'});
 }
 return done();
}
const api={SCHEMA,RULES,requirements,template,evaluate};root.GoldenDBVersionCapabilities=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
