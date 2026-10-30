/* Compare a frozen planning demand with independently declared physical budgets. */
(function(root){'use strict';
const UNITS=Object.freeze({GB:1e9,GiB:2**30,TB:1e12,TiB:2**40});
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x),num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function evaluate(hosts,context,units){
 const issues=[],rows=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message});
 if(!object(units)){add('unknown','capacity-units','$planUnits','规划单位未声明，不能猜测GB/GiB或TB/TiB');return {issues,rows};}
 if(Object.keys(units).some(k=>!['cpu','memory','disk','source'].includes(k)))add('error','capacity-units','$planUnits','存在未支持的单位字段');
 if(units.cpu!=='physicalCores')add(units.cpu==null?'unknown':'error','capacity-cpu-unit','$planUnits.cpu','必须明确需求按物理核计；不能将逻辑线程直接换算为物理核');
 if(!['GB','GiB'].includes(units.memory)||!['TB','TiB'].includes(units.disk))add('unknown','capacity-units','$planUnits','须明确规划内存GB/GiB、磁盘TB/TiB的原始语义');
 if(typeof units.source!=='string'||!units.source.trim())add('unknown','capacity-unit-source','$planUnits.source','缺少单位口径来源');
 if(issues.length)return {issues,rows};
 if(!Array.isArray(hosts)){add('error','capacity-hosts','$hosts','缺少实际库存清单');return {issues,rows};}
 const demands=new Map(),list=context?.demands;
 if(Array.isArray(list))for(const d of list){if(!object(d)||typeof d.id!=='string'||demands.has(d.id)){add('error','capacity-context','$context.demands','需求主机身份缺失或重复');continue;}demands.set(d.id,d);}
 for(const h of hosts){
  const start=issues.length,p='host '+h.id,b=h.budget,d=demands.get(h.id);
  if(!object(b)){add('unknown','capacity-budget',p,'缺少实际CPU/内存预留及磁盘水位口径');}
  else{
   if(Object.keys(b).some(k=>!['cpuReserveRatio','memoryReserveRatio','diskBasis','diskWatermark'].includes(k))){add('error','capacity-budget',p,'未知预算字段；不可静默忽略扣减');}
   for(const k of ['cpuReserveRatio','memoryReserveRatio'])if(!num(b[k])||b[k]>=1){add(b[k]==null?'unknown':'error','capacity-reserve',p+'.'+k,'预留比例须为0至1之间且不含1');}
   if(!['net-before-watermark','allocatable-after-watermark'].includes(b.diskBasis)){add(b.diskBasis==null?'unknown':'error','capacity-disk-basis',p,'须声明净容量在水位前还是已扣水位，原始裸盘不能直接比较');}
   if(!num(b.diskWatermark)||b.diskWatermark<=0||b.diskWatermark>1){add(b.diskWatermark==null?'unknown':'error','capacity-watermark',p,'磁盘水位须大于0且不超过1');}
   if(b.diskBasis==='allocatable-after-watermark'&&b.diskWatermark!==1){add('error','capacity-double-watermark',p,'已扣水位的可分配容量不能再次扣水位；此口径水位应为1');}
  }
  if(d?.complete===false)add('unknown','capacity-demand-incomplete',p,'需求合计不完整，仅检查已知部分；不能作为完整承载结论');
  const inventoryValid=num(h.cpuPhysicalCores)&&Number.isInteger(h.cpuPhysicalCores)&&h.cpuPhysicalCores>0&&num(h.memoryGiB)&&h.memoryGiB>0&&num(h.dataUsableGiB);
  if(!inventoryValid)add('unknown','capacity-inventory',p,'实际规格不完整，未计算库存承载');
  const available={cpu:num(h.cpuPhysicalCores)&&Number.isInteger(h.cpuPhysicalCores)&&h.cpuPhysicalCores>0&&num(b?.cpuReserveRatio)&&b.cpuReserveRatio<1?h.cpuPhysicalCores*(1-b.cpuReserveRatio):null,
   memory:num(h.memoryGiB)&&h.memoryGiB>0&&num(b?.memoryReserveRatio)&&b.memoryReserveRatio<1?h.memoryGiB*UNITS.GiB*(1-b.memoryReserveRatio):null,
   disk:num(h.dataUsableGiB)&&num(b?.diskWatermark)&&b.diskWatermark>0&&b.diskWatermark<=1&&(b.diskBasis==='net-before-watermark'||b.diskBasis==='allocatable-after-watermark'&&b.diskWatermark===1)?h.dataUsableGiB*UNITS.GiB*b.diskWatermark:null};
  const demand={cpu:d?.cpuPhysicalCores,memory:num(d?.memoryValue)?d.memoryValue*UNITS[units.memory]:null,disk:d?.diskKnown===true&&num(d.diskValue)?d.diskValue*UNITS[units.disk]:null};
  const details=[];
  for(const key of ['cpu','memory','disk']){
   if(!num(demand[key])){add('unknown','capacity-demand-unknown',p+'.'+key,'当前规划没有明确的'+key+'需求；固定数量或未知数据量不能当作零需求');continue;}
   if(!num(available[key]))continue;
   if(!Number.isFinite(demand[key])||!Number.isFinite(available[key])||demand[key]>Number.MAX_SAFE_INTEGER||available[key]>Number.MAX_SAFE_INTEGER){add('unknown','capacity-range',p+'.'+key,'换算超过安全数值范围，未作承载判断');continue;}
   const tolerance=Math.max(1,available[key],demand[key])*Number.EPSILON*16;
   if(demand[key]-available[key]>tolerance)add('error','capacity-exceeded',p+'.'+key,'实际可分配'+key+'不足，不能承载当前规划需求');
   const unit=key==='cpu'?'物理核':'GiB',scale=key==='cpu'?1:UNITS.GiB;
   details.push(key+'需求'+Number((demand[key]/scale).toPrecision(12))+'/'+Number((available[key]/scale).toPrecision(12))+' '+unit);
  }
  const local=issues.slice(start);rows.push({hostId:h.id,status:local.some(i=>i.severity==='error')?'阻断':local.length?'未评估':'必要容量通过',detail:details.join('；')+'。仅当前已录负载的资源必要条件，不证明IO/网络或故障接管性能。'});
 }
 return {issues,rows};
}
const api={UNITS,evaluate};root.GoldenDBInventoryCapacity=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
