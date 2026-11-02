/* Derived path overlap and exact inventory identity conflicts; never certifies independence. */
(function(root){'use strict';
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048,KINDS=['ports','cables','transits','owners','assets','faultDomains'];
const LABELS={ports:'端口',cables:'线缆',transits:'交换转发',owners:'归属对象',assets:'物理资产',faultDomains:'故障域'};
function display(kind,value){if(kind!=='owners')return value;try{const [type,id]=JSON.parse(value);return ({host:'服务器',router:'路由设备',switch:'交换设备',external:'外部端点'}[type]||type)+'/'+id;}catch{return value;}}
function resolveIdentities(input,context,connections,targetVersion,evidence){
 const issues=[],assets=new Map(),domains=new Map(),rows=[],key=s=>JSON.stringify([s?.kind,s?.id]),obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),token=x=>text(x)&&x.length<=160&&x===x.trim(),add=(severity,code,path,message)=>issues.push({severity,code,path,message});
 const done=()=>{rows.push({category:'network-identities',label:'资产与故障域统一身份',status:input==null?'未评估':issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明映射完整，证据待核验',detail:'资产映射 '+[...assets.values()].filter(Boolean).length+' 项；故障域映射 '+[...domains.values()].filter(Boolean).length+' 项。命名空间与编号精确匹配；来源/证据引用不等于证据已认证；未映射或不同统一编号不能证明独立',identityProven:false});return {issues,rows,assets,domains,complete:input!=null&&!issues.length};};
 if(input==null)return done();
 const evidenceIndex=new Map();
 if(evidence!==undefined){if(!Array.isArray(evidence)||evidence.length>1000)add('error','identity-evidence-budget','identities','证据目录无效或超过1000项');else for(const item of evidence){const id=item?.id;if(!evidenceIndex.has(id))evidenceIndex.set(id,[]);evidenceIndex.get(id).push(item);}}
 const fields=(x,ks,p)=>{if(!obj(x)){add('error','identity-type',p,'身份材料须为对象');return false;}for(const k of Object.keys(x))if(!ks.includes(k))add('error','identity-field',p+'.'+k,'未支持字段；不接受手工通过结果或传递别名链');return true;};
 if(!fields(input,['schema','targetVersion','assets','domains','review'],'identities'))return done();
 if(input.schema!=='goldendb-identities-v1')add('error','identity-schema','identities','身份材料版本不支持');if(!text(input.targetVersion)||!text(targetVersion))add('unknown','identity-version','identities','缺少准确目标版本');else if(input.targetVersion!==targetVersion)add('error','identity-version','identities','身份材料与当前目标版本不符');
 if(fields(input.review,['coverage','source'],'identities.review')){if(input.review.coverage==='unknown')add('unknown','identity-coverage','identities.review','未声明映射覆盖完整');else if(input.review.coverage!=='declared-complete')add('error','identity-coverage','identities.review','覆盖仅允许unknown/declared-complete');if(!text(input.review.source))add('unknown','identity-source','identities.review','缺少映射范围来源');}
 const expectedAssets=new Set(),expectedDomains=new Map();let catalogComplete=true;
 const addCatalog=(list,max,kind)=>{if(!Array.isArray(list)||list.length>max){catalogComplete=false;return;}for(const v of list){const id=kind==='host'?v:v?.id;if(!text(id)){catalogComplete=false;continue;}expectedAssets.add(key({kind,id}));}};
 addCatalog(context?.hostIds,5000,'host');addCatalog(connections?.routing?.fabric?.devices,1000,'router');addCatalog(connections?.routing?.physical?.switches,1000,'switch');
 const catalog=connections?.routing?.physical?.faultDomains;if(!Array.isArray(catalog)||catalog.length>5000)catalogComplete=false;else for(const d of catalog)if(text(d?.id))expectedDomains.set(d.id,d.kind);else catalogComplete=false;
 if(!catalogComplete)add('unknown','identity-catalog','identities','实际对象目录缺失/超限，不能证明覆盖');
 for(const type of ['assets','domains']){
  const list=input[type],map=type==='assets'?assets:domains,ids=new Set(),seen=new Set(),canonicalKinds=new Map();
  if(!Array.isArray(list)||list.length>(type==='assets'?7000:5000)){add('error','identity-list',type,'映射清单缺失或超过预算');continue;}
  for(const e of list){const start=issues.length,p=type+'/'+(e?.id??'?');if(!fields(e,['id','subject','identity','source','evidenceIds'],p))continue;
   if(!token(e.id)||ids.has(e.id))add('error','identity-id',p,'映射ID无效或重复');ids.add(e.id);fields(e.subject,['kind','id'],p+'.subject');fields(e.identity,['namespace','value'],p+'.identity');
   const subject=type==='assets'?key(e.subject):e.subject?.id;
   if(type==='assets'?!expectedAssets.has(subject):e.subject?.kind!=='domain'||!expectedDomains.has(subject))add('error','identity-subject',p,'映射对象不存在或类别错误');
   if(seen.has(subject)){add('error','identity-duplicate',p,'同一对象重复映射，不能任选');map.set(subject,null);}seen.add(subject);
   if(!token(e.identity?.namespace)||!token(e.identity?.value))add('error','identity-key',p,'统一身份命名空间和编号须明确，不接受首尾空格或隐式归一');
   if(!text(e.source))add('unknown','identity-source',p,'缺少该映射的资料来源');
   if(!Array.isArray(e.evidenceIds)||!e.evidenceIds.length)add('unknown','identity-evidence-missing',p,'缺少映射证据引用');else if(e.evidenceIds.length>20||e.evidenceIds.some(v=>!token(v))||new Set(e.evidenceIds).size!==e.evidenceIds.length)add('error','identity-evidence-list',p,'证据引用无效、重复或超过20项');
   else if(evidence!==undefined){for(const id of e.evidenceIds){const refs=evidenceIndex.get(id)||[];if(refs.length!==1||!['inventory','network'].includes(refs[0].category))add('error','identity-evidence-reference',p,'证据不存在、不唯一或类别不适用');else if(refs[0].targetVersion!==targetVersion||['fail','unsupported'].includes(refs[0].result))add('error','identity-evidence-invalid',p,'证据版本不符或明确失败');else if(refs[0].result!=='pass')add('unknown','identity-evidence-unknown',p,'映射证据结果未知');}}
   const canonical=JSON.stringify([e.identity?.namespace,e.identity?.value]);
   if(type==='domains'&&expectedDomains.has(subject)){const kind=expectedDomains.get(subject);if(canonicalKinds.has(canonical)&&canonicalKinds.get(canonical)!==kind)add('error','identity-domain-kind',p,'不同类型故障域不能直接认定为同一实体');else canonicalKinds.set(canonical,kind);}
   // Evidence uncertainty must not erase an otherwise unambiguous declared shared asset.
   if(!issues.slice(start).some(i=>i.code!=='identity-source'&&!i.code.startsWith('identity-evidence-'))&&!map.has(subject))map.set(subject,canonical);
  }
  for(const id of(type==='assets'?expectedAssets:expectedDomains.keys()))if(!map.get(id))add('unknown','identity-unmapped',type+'/'+id,'对象缺少唯一且完整的统一身份映射');
 }
 return done();
}

function compare(rows,identities){
 const output=[],active=new Map();let visits=0;
 if(!Array.isArray(rows)||rows.length>20000)return [{category:'network-shared-risk',label:'路径共享风险',status:'未评估',detail:'缺少派生路径结果或超过20000行预算；不能证明独立'}];
 for(const r of rows)if(r?.category==='network-physical'&&r.selected&&text(r.pathId))active.set(r.adjacencyId,r);
 for(const b of rows){if(b?.category!=='network-physical-alternative')continue;const a=active.get(b.adjacencyId),shared=Object.fromEntries(KINDS.map(k=>[k,[]]));let limited=false,complete=!!a&&a.status==='声明物理路径待实测'&&b.status==='声明物理路径待实测';
  for(const k of KINDS){const left=a?.resources?.[k],right=b.resources?.[k];if(!Array.isArray(left)||!Array.isArray(right)){complete=false;continue;}if(left.length>5000||right.length>5000){limited=true;complete=false;continue;}const set=new Set(left.filter(text));for(const id of new Set(right.filter(text))){if(++visits>100000){limited=true;complete=false;break;}if(set.has(id))shared[k].push(id);}shared[k].sort();}
  const canonicalShared={assets:[],faultDomains:[]};
  for(const [kind,source,map] of [['assets','owners',identities?.assets],['faultDomains','faultDomains',identities?.domains]]){
   const collect=r=>{const values=r?.resources?.[source];if(!Array.isArray(values)||values.length>5000){complete=false;return [];}const found=[];for(const v of values){if(++visits>100000){limited=true;complete=false;break;}const resolved=map?.get(v);if(resolved)found.push(resolved);}return found;};
   if(map){const left=new Set(collect(a));canonicalShared[kind]=[...new Set(collect(b))].filter(v=>left.has(v)).sort();}
  }
  const hasShared=KINDS.some(k=>shared[k].length)||Object.values(canonicalShared).some(v=>v.length),endpointPorts=shared.ports.filter(id=>(a?.endpointPortIds||[]).includes(id)||(b.endpointPortIds||[]).includes(id));
  output.push({category:'network-shared-risk',label:'共享风险 / '+(a?.pathId??'当前路径未知')+' ↔ '+b.pathId,status:hasShared?'存在已知共享，冗余未评估':'未评估',detail:'共享资源：'+KINDS.map(k=>LABELS[k]+'：'+(shared[k].length?shared[k].map(v=>display(k,v)).join('、'):'未发现已知重合')).join('；')+'；统一身份重合：'+Object.entries(canonicalShared).map(([k,v])=>(k==='assets'?'资产':'故障域')+'：'+(v.map(x=>JSON.parse(x).join('/')).join('、')||'未发现已知重合')).join('；')+'；共同端点端口：'+(endpointPorts.join(',')||'未识别')+'。'+(limited?'比较预算不足；':!complete?'路径资料/计算不完整；':'')+(hasShared?'共同资源故障可能同时影响两条路径；':'未发现已知重合不能证明物理独立；')+'未校验资产别名全集、隐藏故障域、自动切换或故障容量',adjacencyId:b.adjacencyId,activePathId:a?.pathId??null,candidatePathId:b.pathId,shared,canonicalShared,identityCoverageComplete:identities?.complete===true,endpointPortIds:endpointPorts,comparisonComplete:complete,budgetExceeded:limited,independenceProven:false});
 }
 return output;
}
function auditAssets(topology,connections,context,targetVersion,evidence){
 const issues=[],rows=[],hosts=new Map(),networks=[],add=(code,path,message)=>issues.push({severity:'error',code,path,message});
 const lists=[['hosts',topology?.hosts,5000],['routers',connections?.routing?.fabric?.devices,1000],['switches',connections?.routing?.physical?.switches,1000]];let complete=true;
 for(const [kind,list,max] of lists){if(!Array.isArray(list)||list.length>max){complete=false;continue;}for(const v of list){const asset=kind==='hosts'?v?.physicalId:v?.assetId;if(!text(v?.id)||!text(asset)){complete=false;continue;}if(kind==='hosts'){if(!hosts.has(asset))hosts.set(asset,[]);hosts.get(asset).push(v.id);}else networks.push({kind,id:v.id,asset});}}
 const collisions=[];for(const n of networks)if(hosts.has(n.asset)){const h=hosts.get(n.asset);collisions.push({...n,hostIds:h});add('cross-catalog-asset-alias',n.kind+'/'+n.id,'网络设备与数据库主机引用同一物理资产标识 '+n.asset+'（主机 '+h.join(',')+'）；不能作为独立物理资源，应统一身份或补充共宿/虚拟化模型');}
 const canonicalCollisions=[];
 const resolved=resolveIdentities(connections?.routing?.physical?.identities,context,connections,targetVersion,evidence),groups=new Map();
 for(const [subject,canonical] of resolved.assets)if(canonical){if(!groups.has(canonical))groups.set(canonical,[]);groups.get(canonical).push(subject);}
 for(const [canonical,members] of groups)if(members.length>1){canonicalCollisions.push({identity:JSON.parse(canonical),subjects:members.map(x=>JSON.parse(x))});add('identity-asset-collision','identities/assets','多个独立设备对象映射到同一物理身份 '+JSON.parse(canonical).join('/')+'：'+members.map(x=>JSON.parse(x).join('/')).join('、')+'；须统一物理资源或提供共宿模型');}
 issues.push(...resolved.issues.filter(i=>i.code.startsWith('identity-evidence-')));
 rows.push({category:'network-asset-identity',label:'网络与数据库物理资产核对',status:issues.some(i=>i.severity==='error')?'阻断':!complete||!hosts.size||!networks.length?'未评估':'声明未发现同号冲突，身份待核验',detail:'精确匹配物理资产标识；数据库主机资产 '+hosts.size+' 项，网络对象 '+networks.length+' 项；同号冲突 '+collisions.length+' 项；统一身份冲突 '+issues.filter(i=>i.code==='identity-asset-collision').length+' 项。不同标识不能证明不同物理设备；不自动合并、忽略大小写或推断别名',collisions,canonicalCollisions,identityProven:false});
 return {issues,rows};
}
const api={compare,auditAssets,resolveIdentities};root.GoldenDBSharedRisk=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
