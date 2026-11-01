/* Derived path overlap and exact inventory identity conflicts; never certifies independence. */
(function(root){'use strict';
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048,KINDS=['ports','cables','transits','owners','assets','faultDomains'];
const LABELS={ports:'端口',cables:'线缆',transits:'交换转发',owners:'归属对象',assets:'物理资产',faultDomains:'故障域'};
function display(kind,value){if(kind!=='owners')return value;try{const [type,id]=JSON.parse(value);return ({host:'服务器',router:'路由设备',switch:'交换设备',external:'外部端点'}[type]||type)+'/'+id;}catch{return value;}}
function compare(rows){
 const output=[],active=new Map();let visits=0;
 if(!Array.isArray(rows)||rows.length>20000)return [{category:'network-shared-risk',label:'路径共享风险',status:'未评估',detail:'缺少派生路径结果或超过20000行预算；不能证明独立'}];
 for(const r of rows)if(r?.category==='network-physical'&&r.selected&&text(r.pathId))active.set(r.adjacencyId,r);
 for(const b of rows){if(b?.category!=='network-physical-alternative')continue;const a=active.get(b.adjacencyId),shared=Object.fromEntries(KINDS.map(k=>[k,[]]));let limited=false,complete=!!a&&a.status==='声明物理路径待实测'&&b.status==='声明物理路径待实测';
  for(const k of KINDS){const left=a?.resources?.[k],right=b.resources?.[k];if(!Array.isArray(left)||!Array.isArray(right)){complete=false;continue;}if(left.length>5000||right.length>5000){limited=true;complete=false;continue;}const set=new Set(left.filter(text));for(const id of new Set(right.filter(text))){if(++visits>100000){limited=true;complete=false;break;}if(set.has(id))shared[k].push(id);}shared[k].sort();}
  const hasShared=KINDS.some(k=>shared[k].length),endpointPorts=shared.ports.filter(id=>(a?.endpointPortIds||[]).includes(id)||(b.endpointPortIds||[]).includes(id));
  output.push({category:'network-shared-risk',label:'共享风险 / '+(a?.pathId??'当前路径未知')+' ↔ '+b.pathId,status:hasShared?'存在已知共享，冗余未评估':'未评估',detail:'共享资源：'+KINDS.map(k=>LABELS[k]+'：'+(shared[k].length?shared[k].map(v=>display(k,v)).join('、'):'未发现已知重合')).join('；')+'；共同端点端口：'+(endpointPorts.join(',')||'未识别')+'。'+(limited?'比较预算不足；':!complete?'路径资料/计算不完整；':'')+(hasShared?'共同资源故障可能同时影响两条路径；':'未发现已知重合不能证明物理独立；')+'未校验资产别名全集、隐藏故障域、自动切换或故障容量',adjacencyId:b.adjacencyId,activePathId:a?.pathId??null,candidatePathId:b.pathId,shared,endpointPortIds:endpointPorts,comparisonComplete:complete,budgetExceeded:limited,independenceProven:false});
 }
 return output;
}
function auditAssets(topology,connections){
 const issues=[],rows=[],hosts=new Map(),networks=[],add=(code,path,message)=>issues.push({severity:'error',code,path,message});
 const lists=[['hosts',topology?.hosts,5000],['routers',connections?.routing?.fabric?.devices,1000],['switches',connections?.routing?.physical?.switches,1000]];let complete=true;
 for(const [kind,list,max] of lists){if(!Array.isArray(list)||list.length>max){complete=false;continue;}for(const v of list){const asset=kind==='hosts'?v?.physicalId:v?.assetId;if(!text(v?.id)||!text(asset)){complete=false;continue;}if(kind==='hosts'){if(!hosts.has(asset))hosts.set(asset,[]);hosts.get(asset).push(v.id);}else networks.push({kind,id:v.id,asset});}}
 const collisions=[];for(const n of networks)if(hosts.has(n.asset)){const h=hosts.get(n.asset);collisions.push({...n,hostIds:h});add('cross-catalog-asset-alias',n.kind+'/'+n.id,'网络设备与数据库主机引用同一物理资产标识 '+n.asset+'（主机 '+h.join(',')+'）；不能作为独立物理资源，应统一身份或补充共宿/虚拟化模型');}
 rows.push({category:'network-asset-identity',label:'网络与数据库物理资产核对',status:collisions.length?'阻断':!complete||!hosts.size||!networks.length?'未评估':'声明未发现同号冲突，身份待核验',detail:'精确匹配物理资产标识；数据库主机资产 '+hosts.size+' 项，网络对象 '+networks.length+' 项；同号冲突 '+collisions.length+' 项。不同标识不能证明不同物理设备；不自动合并、忽略大小写或推断别名',collisions,identityProven:false});
 return {issues,rows};
}
const api={compare,auditAssets};root.GoldenDBSharedRisk=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
