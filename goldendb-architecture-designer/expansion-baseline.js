/* Read-only baseline contract v1. No deployment, planning-state import or production certification. */
(function(root){'use strict';
const TYPES=['CN','OPS_CN','DN','GTM','MGMT'],DIMS=['cpuCores','memoryGb','dataTb'];
function validateInternal(input,allowedUnplaced=null){
 const errors=[],unknowns=[],errorCodes=new Set(),unknownScopes=new Set();let errorCount=0,unknownCount=0,complete=false;const pending=new Set();const error=(code,path,message)=>{errorCodes.add(code);errorCount++;if(errors.length<300)errors.push({code,path,message});};
 const unknown=(scope,path,message)=>{unknownScopes.add(scope);unknownCount++;if(unknowns.length<300)unknowns.push({scope,path,message});};
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(x),integer=x=>Number.isSafeInteger(x)&&x>=0;
 const finish=(counts={})=>({schema:'goldendb-baseline-validation-v1',valid:errors.length===0,structuralStatus:errors.length?'未通过':unknownScopes.has('structure')?'部分未评估':'结构检查通过（非生产认证）',capacityStatus:errorCodes.has('capacity-exceeded')||errorCodes.has('resource')?'未通过':!complete||unknownScopes.has('capacity')?'未评估':'仅录入预算通过（非实测）',productionStatus:'未评估',errors,unknowns,errorCount,unknownCount,counts,...(allowedUnplaced?{unplacedInstances:[...pending]}:{}),limitation:'仅核对已录入的身份、归属、故障域和预算约束；不验证真实网络连通、版本/仲裁、性能或RPO/RTO，不应用到当前规划。'});
 if(!object(input)){error('schema','$','基线必须为JSON对象');return finish();}
 if(input.schema!=='goldendb-expansion-baseline-v1'){error('schema','schema','版本必须为goldendb-expansion-baseline-v1');return finish();}
 const caps={sites:16,pools:256,hosts:2000,tenants:100,groups:1000,instances:2000},maps={};
 for(const [name,limit]of Object.entries(caps)){
  const list=input[name];if(!Array.isArray(list)||list.length>limit||(!list.length&&['sites','pools','hosts','tenants'].includes(name))){error('collection',name,'清单缺失、为空或超过校验预算');return finish();}
  maps[name]=new Map();for(let i=0;i<list.length;i++){const x=list[i];if(!object(x)||!id(x.id)){error('identity',name+'['+i+']','对象或稳定ID非法');continue;}if(maps[name].has(x.id))error('duplicate-id',name+'.'+x.id,'稳定ID重复');else maps[name].set(x.id,x);}
 }
 const {sites,pools,hosts,tenants,groups}=maps;
 if(!object(input.source)||!['unknown','synthetic','user-declared'].includes(input.source.kind))error('source','source','来源须为unknown/synthetic/user-declared；文件声明不能充当核验结果');
 else if(input.source.kind!=='user-declared'||typeof input.source.reference!=='string'||!input.source.reference.trim()||typeof input.source.databaseVersion!=='string'||!input.source.databaseVersion.trim())unknown('evidence','source','现网来源或数据库版本未核验/未填写');
 const policy=input.policies,flags=['sameTenantCnAntiAffinity','allowCnGtmColocation','allowCrossTenantDn','allowCrossTenantCn','managementDedicated','opsCnDedicated','dnDedicated'];
 if(!object(policy)||!Number.isSafeInteger(policy.maxComponents)||policy.maxComponents<1||policy.maxComponents>64||!integer(policy.opsCnCount)||flags.some(k=>typeof policy[k]!=='boolean')){error('policy','policies','密度、运维CN数及全部隔离开关须显式录入');return finish();}
 const reference=(map,key,path)=>{if(!map.has(key))error('reference',path,'引用对象不存在：'+String(key));};
 const budget=(x,path)=>{if(x===null){unknown('capacity',path,'资源预算/实例需求未知');return null;}if(!object(x)||DIMS.some(k=>typeof x[k]!=='number'||!Number.isFinite(x[k])||x[k]<0)){error('resource',path,'资源须为null或有限非负cpuCores/memoryGb/dataTb');return null;}return x;};
 const allowedPools=(list,path)=>{if(list===null){unknown('structure',path,'允许资源池约束未知');return;}if(!Array.isArray(list)||!list.length||new Set(list).size!==list.length){error('pool-policy',path,'允许资源池须为非空且不重复的ID数组或null');return;}for(const pid of list)reference(pools,pid,path);};
 const hostBudget=new Map(),hostRows=new Map(),groupRows=new Map(),tenantCn=new Map();
 for(const [hid,h]of hosts){reference(sites,h.siteId,'hosts.'+hid+'.siteId');if(!id(h.poolId))error('pool','hosts.'+hid+'.poolId','必须提供资源池稳定ID');else reference(pools,h.poolId,'hosts.'+hid+'.poolId');
  if(h.maxComponents===null)unknown('structure','hosts.'+hid+'.maxComponents','单机组件上限未知');else if(!Number.isSafeInteger(h.maxComponents)||h.maxComponents<1||h.maxComponents>64)error('density','hosts.'+hid+'.maxComponents','单机组件上限须为1..64或null');
  hostBudget.set(hid,budget(h.usableResources,'hosts.'+hid+'.usableResources'));hostRows.set(hid,[]);
 }
 for(const [tid,t]of tenants){allowedPools(t.allowedCnPoolIds,'tenants.'+tid+'.allowedCnPoolIds');if(typeof t.name!=='string'||!t.name.trim()||t.name.length>120||/[\u0000-\u001f]/u.test(t.name))error('name','tenants.'+tid,'租户名称非法');
  if(!integer(t.cnCount))error('count','tenants.'+tid+'.cnCount','CN数量必须为非负整数');
  if(t.cnRequiredBySite===null)unknown('structure','tenants.'+tid+'.cnRequiredBySite','逐站点CN目标未知');
  else if(!object(t.cnRequiredBySite)||Object.keys(t.cnRequiredBySite).length!==sites.size||[...sites.keys()].some(s=>!Object.hasOwn(t.cnRequiredBySite,s)||!integer(t.cnRequiredBySite[s])))error('cn-site-target','tenants.'+tid,'每个站点须显式提供CN数量（含0）');
  else if(integer(t.cnCount)&&Object.values(t.cnRequiredBySite).reduce((a,b)=>a+b,0)!==t.cnCount)error('cn-site-target','tenants.'+tid,'逐站点CN数之和不等于CN总数');
  if(!Array.isArray(t.dnGroupIds)||new Set(t.dnGroupIds).size!==t.dnGroupIds.length)error('binding','tenants.'+tid+'.dnGroupIds','DN组清单必须完整且不可重复');
  else for(const gid of t.dnGroupIds){reference(groups,gid,'tenants.'+tid+'.dnGroupIds');const g=groups.get(gid);if(g&&(g.component!=='DN'||!Array.isArray(g.tenantIds)||g.tenantIds.length!==1||g.tenantIds[0]!==tid))error('binding','tenants.'+tid,'DN组归属不一致');}
  if(t.gtmGroupId!==null){reference(groups,t.gtmGroupId,'tenants.'+tid+'.gtmGroupId');const g=groups.get(t.gtmGroupId);if(g&&(g.component!=='GTM'||!Array.isArray(g.tenantIds)||!g.tenantIds.includes(tid)))error('binding','tenants.'+tid,'GTM组归属不一致');}tenantCn.set(tid,[]);
 }
 for(const [gid,g]of groups){allowedPools(g.allowedPoolIds,'groups.'+gid+'.allowedPoolIds');groupRows.set(gid,[]);if(!['DN','GTM','MGMT'].includes(g.component))error('component','groups.'+gid,'组类型非法');
  if(!Array.isArray(g.tenantIds)||new Set(g.tenantIds).size!==g.tenantIds.length){error('binding','groups.'+gid,'组租户清单非法');continue;}
  if(g.component==='DN'&&g.tenantIds.length!==1||g.component==='GTM'&&g.tenantIds.length<1||g.component==='MGMT'&&g.tenantIds.length!==0)error('binding','groups.'+gid,'组类型与租户数量不符');
  for(const tid of g.tenantIds){reference(tenants,tid,'groups.'+gid+'.tenantIds');const t=tenants.get(tid);if(t&&((g.component==='DN'&&(!Array.isArray(t.dnGroupIds)||!t.dnGroupIds.includes(gid)))||(g.component==='GTM'&&t.gtmGroupId!==gid)))error('binding','groups.'+gid,'反向租户绑定不一致');}
  if(g.replicaCount===null)unknown('structure','groups.'+gid+'.replicaCount','副本目标未知');else if(!Number.isSafeInteger(g.replicaCount)||g.replicaCount<1||g.replicaCount>2000)error('replicas','groups.'+gid,'副本数须为正整数或null');
  if(g.primarySiteId===null)unknown('structure','groups.'+gid+'.primarySiteId','主中心约束未知');else reference(sites,g.primarySiteId,'groups.'+gid+'.primarySiteId');
  if(g.requiredBySite===null)unknown('structure','groups.'+gid+'.requiredBySite','逐站点副本目标未知');
  else if(!object(g.requiredBySite)||Object.keys(g.requiredBySite).length!==sites.size||[...sites.keys()].some(s=>!Object.hasOwn(g.requiredBySite,s)||!integer(g.requiredBySite[s])))error('site-target','groups.'+gid,'每个站点须显式提供副本数（含0）');
  else if(Number.isSafeInteger(g.replicaCount)&&Object.values(g.requiredBySite).reduce((a,b)=>a+b,0)!==g.replicaCount)error('site-target','groups.'+gid,'逐站点副本数之和不等于组副本数');
 }
 let ops=0;
 for(const [iid,instance]of maps.instances){const x=instance,path='instances.'+iid;if(!TYPES.includes(x.component)){error('component',path,'组件类型非法');continue;}if(x.hostId===null&&allowedUnplaced?.has(iid)){pending.add(iid);unknown('structure',path+'.hostId','新增实例尚未落位');unknown('capacity',path+'.hostId','尚未落位，联合资源预算未评估');}else reference(hosts,x.hostId,path+'.hostId');if(hostRows.has(x.hostId))hostRows.get(x.hostId).push(x);
  x.resourceDemand===null?unknown('capacity',path+'.resourceDemand','实例资源需求未知'):budget(x.resourceDemand,path+'.resourceDemand');
  if(['DN','GTM','MGMT'].includes(x.component)){reference(groups,x.groupId,path+'.groupId');const g=groups.get(x.groupId);if(g){if(g.component!==x.component)error('component',path,'实例类型与组不符');groupRows.get(x.groupId).push(x);const h=hosts.get(x.hostId);if(h&&Array.isArray(g.allowedPoolIds)&&!g.allowedPoolIds.includes(h.poolId))error('group-pool',path,'副本不在组允许资源池');if(x.component==='DN'&&(!Array.isArray(g.tenantIds)||!g.tenantIds.includes(x.tenantId)))error('binding',path,'DN租户与组不符');}
   if(!['primary','replica'].includes(x.role))error('role',path,'副本组实例角色须为primary/replica');
   if(x.component!=='DN'&&x.tenantId!==null)error('binding',path,'GTM/MGMT由组管理归属，实例tenantId须为null');
  }else{if(x.groupId!==null||x.role!=='service')error('role',path,'CN/OPS_CN须为无组service实例');if(x.component==='CN'){reference(tenants,x.tenantId,path+'.tenantId');tenantCn.get(x.tenantId)?.push(x);const t=tenants.get(x.tenantId),h=hosts.get(x.hostId);if(t&&h&&Array.isArray(t.allowedCnPoolIds)&&!t.allowedCnPoolIds.includes(h.poolId))error('cn-pool',path,'CN不在租户允许资源池');}else{ops++;if(x.tenantId!==null)error('binding',path,'运维CN属于集群，tenantId须为null');}}
 }
 for(const [tid,list]of tenantCn){const t=tenants.get(tid);if(integer(t.cnCount)&&t.cnCount!==list.length)error('cn-count','tenants.'+tid,'CN实例数不等于目标');if(policy.sameTenantCnAntiAffinity&&new Set(list.filter(x=>!pending.has(x.id)).map(x=>x.hostId)).size!==list.filter(x=>!pending.has(x.id)).length)error('cn-affinity','tenants.'+tid,'同租户CN共宿');if(object(t.cnRequiredBySite))for(const sid of sites.keys())if(integer(t.cnRequiredBySite[sid])&&(list.filter(x=>hosts.get(x.hostId)?.siteId===sid).length>t.cnRequiredBySite[sid]||!list.some(x=>pending.has(x.id))&&list.filter(x=>hosts.get(x.hostId)?.siteId===sid).length!==t.cnRequiredBySite[sid]))error('cn-site','tenants.'+tid+'.'+sid,'站点CN数不等于目标');}
 if(ops!==policy.opsCnCount)error('ops-count','policies.opsCnCount','运维CN实例数不等于目标');
 for(const [gid,list]of groupRows){const g=groups.get(gid);if(Number.isSafeInteger(g.replicaCount)&&list.length!==g.replicaCount)error('replica-count','groups.'+gid,'实际副本数不等于目标');if(new Set(list.filter(x=>!pending.has(x.id)).map(x=>x.hostId)).size!==list.filter(x=>!pending.has(x.id)).length)error('replica-affinity','groups.'+gid,'同组副本同机');const primary=list.filter(x=>x.role==='primary');if(primary.length!==1)error('primary-count','groups.'+gid,'每组必须恰有一个主');else if(!pending.has(primary[0].id)&&g.primarySiteId!==null&&hosts.get(primary[0].hostId)?.siteId!==g.primarySiteId)error('primary-site','groups.'+gid,'主不在目标站点');
  if(object(g.requiredBySite))for(const sid of sites.keys())if(integer(g.requiredBySite[sid])&&(list.filter(x=>hosts.get(x.hostId)?.siteId===sid).length>g.requiredBySite[sid]||!list.some(x=>pending.has(x.id))&&list.filter(x=>hosts.get(x.hostId)?.siteId===sid).length!==g.requiredBySite[sid]))error('replica-site','groups.'+gid+'.'+sid,'站点副本数不等于目标');
 }
 for(const [hid,list]of hostRows){const h=hosts.get(hid),types=new Set(list.map(x=>x.component));if(list.length>policy.maxComponents||Number.isSafeInteger(h.maxComponents)&&list.length>h.maxComponents)error('density','hosts.'+hid,'单机组件超限');
  if(policy.managementDedicated&&types.has('MGMT')&&list.length!==1||policy.opsCnDedicated&&types.has('OPS_CN')&&list.length!==1||policy.dnDedicated&&types.has('DN')&&types.size>1)error('isolation','hosts.'+hid,'专用组件隔离不符');
  if(!policy.allowCnGtmColocation&&types.has('CN')&&types.has('GTM'))error('cn-gtm-mix','hosts.'+hid,'CN/GTM禁止混布');
  for(const [type,allowed]of [['CN',policy.allowCrossTenantCn],['DN',policy.allowCrossTenantDn]])if(!allowed&&new Set(list.filter(x=>x.component===type).map(x=>x.tenantId)).size>1)error('tenant-isolation','hosts.'+hid,'跨租户混布不允许');
  const capacity=hostBudget.get(hid);if(capacity&&list.every(x=>object(x.resourceDemand)&&DIMS.every(k=>typeof x.resourceDemand[k]==='number'&&Number.isFinite(x.resourceDemand[k])&&x.resourceDemand[k]>=0))){for(const k of DIMS){let sum=0,compensation=0;for(const x of list){const y=x.resourceDemand[k]-compensation,t=sum+y;compensation=(t-sum)-y;sum=t;}const tolerance=8*Number.EPSILON*Math.max(Math.abs(sum),Math.abs(capacity[k]));if(!Number.isFinite(sum)||sum>capacity[k]&&sum-capacity[k]>tolerance)error('capacity-exceeded','hosts.'+hid+'.'+k,'同机联合预算超限');}}
 }
 unknown('evidence','network','真实IP/VLAN、链路连通、带宽/时延、机柜故障域与安全策略未验证');
 complete=true;return finish({sites:sites.size,pools:pools.size,hosts:hosts.size,tenants:tenants.size,groups:groups.size,instances:maps.instances.size,components:Object.fromEntries(TYPES.map(t=>[t,[...maps.instances.values()].filter(x=>x.component===t).length]))});
}
root.GoldenDBBaseline={validate:input=>validateInternal(input),validateTarget:(input,newInstanceIds)=>validateInternal(input,new Set(Array.isArray(newInstanceIds)?newInstanceIds:[]))};
})(globalThis);
