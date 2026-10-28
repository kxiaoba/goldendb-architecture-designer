/* Add-tenants constraint checks only. No placement search, state import or live identity certification. */
(function(root){'use strict';
const CAPS={sites:16,pools:256,hosts:2000,tenants:100,groups:1000,instances:2000},KINDS=Object.keys(CAPS),ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
function validate(input){
 const errors=[],unknowns=[];let errorCount=0,unknownCount=0,lockErrorCount=0,incomplete=false,mappingUnknown=false,locksChecked=false,mappingChecked=false,mappingFailed=false,comparisonIncomplete=false,steps=0;
 let baselineReport=null,candidateReport=null;const lockedInstances=[],renamedTenants=[],delta={};
 const error=(code,path,message,lock=false)=>{errorCount++;if(code.startsWith('mapping'))mappingFailed=true;if(code==='comparison-budget')comparisonIncomplete=true;if(lock)lockErrorCount++;if(errors.length<300)errors.push({code,path,message});};
 const unknown=(scope,path,message)=>{unknownCount++;if(['mapping','structure','capacity'].includes(scope))incomplete=true;if(scope==='mapping')mappingUnknown=true;if(unknowns.length<300)unknowns.push({scope,path,message});};
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),id=x=>typeof x==='string'&&ID.test(x);
 const finish=()=>({schema:'goldendb-incremental-validation-v1',valid:errorCount===0,structuralStatus:errorCount?(comparisonIncomplete?'未评估（比较预算超限）':'未通过'):incomplete?'部分未评估':'输入约束通过（非实施准入）',capacityStatus:candidateReport?.capacityStatus||'未评估',productionStatus:'未评估',
  existingLockStatus:!locksChecked||comparisonIncomplete?'未评估':lockErrorCount?'未通过':'逻辑锁定检查通过（文件范围）',mappingStatus:!mappingChecked?'未评估':mappingFailed?'未通过':mappingUnknown?'现网映射未评估':'映射格式已提供（真实性未核验）',placementStatus:errorCount?'候选约束未通过，未执行试排':candidateReport?.unplacedInstances?.length?`新增${candidateReport.unplacedInstances.length}个实例待落位；未执行试排`:'候选落位已提供；未执行自动试排',
  counts:candidateReport?.counts||{},baselineCounts:baselineReport?.counts||{},delta,unplacedInstances:candidateReport?.unplacedInstances||[],lockedInstances,renamedTenants,errors,unknowns,errorCount,unknownCount,
  limitation:'仅比较文件中的增量约束，未证实现网身份，也未执行有界试排、数据库操作或迁移；约束通过不等于可实施扩容。'});
 if(!object(input)||input.schema!=='goldendb-incremental-constraints-v1'||input.operation!=='add-tenants'){error('schema','$','仅支持goldendb-incremental-constraints-v1 / add-tenants');return finish();}
 for(const key of Object.keys(input))if(!['schema','operation','label','baseline','candidate','additions','baselineIdentityMap','newHostIdentityMap'].includes(key))error('unsupported-field',key,'不支持的顶层字段；不能通过自报批准标记放宽锁定');
 if(!root.GoldenDBBaseline?.validateTarget){error('dependency','$','基线校验模块不可用');return finish();}
 const merge=(prefix,r)=>{errorCount+=r.errorCount;unknownCount+=r.unknownCount;for(const e of r.errors)if(errors.length<300)errors.push({...e,path:prefix+'.'+e.path});for(const e of r.unknowns)if(unknowns.length<300)unknowns.push({...e,path:prefix+'.'+e.path});if(r.structuralStatus==='部分未评估'||r.capacityStatus==='未评估')incomplete=true;};
 baselineReport=root.GoldenDBBaseline.validate(input.baseline);merge('baseline',baselineReport);if(!baselineReport.valid)return finish();
 const oldMaps={},newMaps={};
 for(const kind of KINDS){oldMaps[kind]=new Map(input.baseline[kind].map(x=>[x.id,x]));const list=input.candidate?.[kind];if(!Array.isArray(list)||list.length>CAPS[kind]||Array.from(list).some(x=>!object(x)||!id(x.id))||new Set(list.map(x=>x.id)).size!==list.length){error('candidate-collection','candidate.'+kind,'候选清单缺失、重复或非法');return finish();}newMaps[kind]=new Map(list.map(x=>[x.id,x]));}
 const adds={};if(!object(input.additions)){error('additions','additions','必须显式列出六类新增ID清单（无新增用空数组）');return finish();}
 for(const key of Object.keys(input.additions))if(!KINDS.includes(key))error('additions','additions.'+key,'未知对象类型');
 for(const kind of KINDS){const declared=input.additions[kind];const expected=[...newMaps[kind].keys()].filter(x=>!oldMaps[kind].has(x));delta[kind]={before:oldMaps[kind].size,after:newMaps[kind].size,added:expected.length};
  if(!Array.isArray(declared)||declared.length>CAPS[kind]||Array.from(declared).some(x=>!id(x))||new Set(declared).size!==declared.length){error('additions','additions.'+kind,'新增ID清单缺失、重复或非法');adds[kind]=new Set();continue;}
  adds[kind]=new Set(declared);if(expected.length!==declared.length||expected.some(x=>!adds[kind].has(x)))error('addition-mismatch','additions.'+kind,'声明新增集合必须精确等于候选减基线，不能重用既有ID');
 }
 if(adds.sites.size)error('scope','additions.sites','add-tenants版本不支持新增站点或改变拓扑');
 candidateReport=root.GoldenDBBaseline.validateTarget(input.candidate,[...newMaps.instances.keys()].filter(x=>!oldMaps.instances.has(x)));merge('candidate',candidateReport);
 const same=(a,b)=>{const stack=[[a,b]],seen=new WeakMap();while(stack.length){if(++steps>250000){error('comparison-budget','$','比较预算超限，不能判定锁定通过',true);return false;}const [x,y]=stack.pop();if(Array.isArray(x)&&Array.isArray(y)&&x.length!==y.length)return false;if(x===y)continue;if(x===null||y===null||typeof x!=='object'||typeof y!=='object'||Array.isArray(x)!==Array.isArray(y))return false;let ys=seen.get(x);if(ys?.has(y))continue;if(!ys){ys=new WeakSet();seen.set(x,ys);}ys.add(y);const keys=Object.keys(x);if(keys.length!==Object.keys(y).length)return false;for(const k of keys){if(!Object.hasOwn(y,k))return false;stack.push([x[k],y[k]]);}}return true;};
 const record=(x,omitted=[])=>Object.fromEntries(Object.entries(x).filter(([k])=>!omitted.includes(k)).map(([k,v])=>[k,['dnGroupIds','allowedCnPoolIds','allowedPoolIds'].includes(k)&&Array.isArray(v)&&v.every(i=>typeof i==='string')?v.slice().sort():v]));
 locksChecked=true;
 if(!same(record(input.baseline,KINDS),record(input.candidate,KINDS)))error('baseline-root-change','candidate','既有策略、版本/来源或其他根元数据被修改',true);
 for(const kind of KINDS)for(const [key,before]of oldMaps[kind]){const after=newMaps[kind].get(key);if(kind==='instances')lockedInstances.push({id:key,component:before.component,tenantId:before.tenantId,groupId:before.groupId,role:before.role,hostId:before.hostId});if(!after){error('existing-removed','candidate.'+kind+'.'+key,'add-tenants禁止删除或重编号既有对象',true);continue;}
  if(kind==='groups'){
   if(!Array.isArray(after.tenantIds))error('locked-membership','candidate.groups.'+key,'既有组成员清单非法，不能确认保持',true);
   if(!same(record(before,['tenantIds']),record(after,['tenantIds'])))error('locked-group','candidate.groups.'+key,'既有组的副本目标、主中心、允许池或元数据被修改',true);
   if(Array.isArray(before.tenantIds)&&Array.isArray(after.tenantIds)){const prior=new Set(before.tenantIds),next=new Set(after.tenantIds);if(before.tenantIds.some(t=>!next.has(t))||after.tenantIds.some(t=>!prior.has(t)&&(!adds.tenants.has(t)||before.component!=='GTM')))error('locked-membership','candidate.groups.'+key,'仅允许新增租户加入原GTM组，禁止移除原成员或重绑既有租户',true);}
  }else if(kind==='tenants'){
   if(!same(record(before,['name']),record(after,['name'])))error('locked-tenant','candidate.tenants.'+key,'既有租户的绑定、CN/分片目标、允许池或元数据被修改',true);if(before.name!==after.name)renamedTenants.push({id:key,before:before.name,after:after.name});
  }else if(!same(record(before),record(after)))error('locked-'+kind,'candidate.'+kind+'.'+key,kind==='instances'?'既有实例的角色、归属、宿主机或资源需求被修改':'既有站点/资源池/主机的属性或资源预算被修改',true);
 }
 for(const gid of adds.groups){const g=newMaps.groups.get(gid);if(g&&(!['DN','GTM'].includes(g.component)||!Array.isArray(g.tenantIds)||!g.tenantIds.length||g.tenantIds.some(t=>!adds.tenants.has(t))))error('new-group-scope','candidate.groups.'+gid,'新增组只能是新增租户拥有的DN/GTM组');}
 for(const iid of adds.instances){const i=newMaps.instances.get(iid);if(i&&(!['CN','DN','GTM'].includes(i.component)||(i.component==='GTM'?!adds.groups.has(i.groupId):!adds.tenants.has(i.tenantId))))error('new-instance-scope','candidate.instances.'+iid,'新增实例必须属于新增租户或其新增GTM组；不支持扩控制面/替换旧实例');}
 mappingChecked=true;const externalHostIds=new Set(),mapping=input.baselineIdentityMap;
 if(mapping===null)unknown('mapping','baselineIdentityMap','全部现网原生ID映射未知；逻辑键不能代替物理身份');
 else if(!object(mapping)){error('mapping','baselineIdentityMap','须为六类映射对象或显式null');mappingUnknown=true;}
 else{
  for(const k of Object.keys(mapping))if(!KINDS.includes(k))error('mapping','baselineIdentityMap.'+k,'未知映射类型');
  for(const kind of KINDS){const list=mapping[kind],seen=new Set(),external=new Set();if(!Array.isArray(list)||list.length>CAPS[kind]){error('mapping','baselineIdentityMap.'+kind,'映射清单缺失或超限');mappingUnknown=true;continue;}
   for(const row of list){if(!object(row)||!id(row.id)||!oldMaps[kind].has(row.id)||seen.has(row.id)){error('mapping','baselineIdentityMap.'+kind,'映射键重复或不属于基线');continue;}seen.add(row.id);if(Object.keys(row).some(k=>!['id','externalId'].includes(k)))error('mapping','baselineIdentityMap.'+kind+'.'+row.id,'不支持的映射字段');if(row.externalId===null){unknown('mapping','baselineIdentityMap.'+kind+'.'+row.id,'原生ID未知');continue;}if(typeof row.externalId!=='string'||!row.externalId.trim()||row.externalId!==row.externalId.trim()||row.externalId.length>256||/[\u0000-\u001f\ud800-\udfff]/u.test(row.externalId)){error('mapping','baselineIdentityMap.'+kind+'.'+row.id,'原生ID须为非空有效字符串或null');continue;}if(external.has(row.externalId))error('mapping-alias','baselineIdentityMap.'+kind+'.'+row.id,'多个逻辑对象映射到同一个原生身份');external.add(row.externalId);if(kind==='hosts')externalHostIds.add(row.externalId);}
   if(seen.size!==oldMaps[kind].size)error('mapping-coverage','baselineIdentityMap.'+kind,'必须覆盖全部既有对象，不能遗漏或增加映射');
  }
 }
 const newHostMap=input.newHostIdentityMap;
 if(newHostMap===null){if(adds.hosts.size)unknown('mapping','newHostIdentityMap','新增主机的原生身份未知，不能当作已核实的新物理资源');else error('mapping-new-host','newHostIdentityMap','无新增主机时须显式使用空数组');}
 else if(!Array.isArray(newHostMap)||newHostMap.length>CAPS.hosts)error('mapping-new-host','newHostIdentityMap','新增主机映射清单缺失或非法');
 else{const seen=new Set();for(const row of newHostMap){if(!object(row)||!id(row.id)||!adds.hosts.has(row.id)||seen.has(row.id)){error('mapping-new-host','newHostIdentityMap','映射键重复或不属于新增主机');continue;}seen.add(row.id);if(Object.keys(row).some(k=>!['id','externalId'].includes(k)))error('mapping-new-host','newHostIdentityMap.'+row.id,'不支持的映射字段');if(row.externalId===null){unknown('mapping','newHostIdentityMap.'+row.id,'新增主机原生ID未知');continue;}if(typeof row.externalId!=='string'||!row.externalId.trim()||row.externalId!==row.externalId.trim()||row.externalId.length>256||/[\u0000-\u001f\ud800-\udfff]/u.test(row.externalId)){error('mapping-new-host','newHostIdentityMap.'+row.id,'原生ID须为非空有效字符串或null');continue;}if(externalHostIds.has(row.externalId))error('mapping-host-alias','newHostIdentityMap.'+row.id,'新增主机与另一主机的原生身份重复，不能重复计入物理资源');externalHostIds.add(row.externalId);}if(seen.size!==adds.hosts.size)error('mapping-new-host','newHostIdentityMap','必须精确覆盖新增主机集合');}
 if(input.baseline.source.kind!=='user-declared'||typeof input.baseline.source.reference!=='string'||!input.baseline.source.reference.trim()||typeof input.baseline.source.databaseVersion!=='string'||!input.baseline.source.databaseVersion.trim())unknown('mapping','baseline.source','真实来源/版本资料未提供，不能确认既有键映射');
 unknown('evidence','baselineIdentityMap','原生ID映射和来源仍是文件自报，未核验现网真实性');return finish();
}
root.GoldenDBIncremental={validate};
})(globalThis);
