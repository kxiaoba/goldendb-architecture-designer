/* Directional no-fragment IP packet targets over computed routes; not PMTUD or live traffic proof. */
(function(root){'use strict';
const SCHEMA='goldendb-network-mtu-v1',obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048,bytes=x=>Number.isInteger(x)&&x>=20&&x<=65535,mtu=x=>Number.isInteger(x)&&x>=68&&x<=65535,key=(l,d)=>JSON.stringify([l,d]);
function template(){return {schema:SCHEMA,targetVersion:null,targets:[],review:{coverage:'unknown',source:null}};}
function evaluate(input,connections,targetVersion,computed){
 const issues=[],rows=[],directions=[],add=(severity,code,path,message)=>issues.push({severity,code,path,message}),err=(c,p,m)=>add('error',c,p,m),unknown=(c,p,m)=>add('unknown',c,p,m);
 const done=()=>({issues,rows,directions,status:issues.some(i=>i.severity==='error')?'阻断':issues.length?'未评估':'声明端到端MTU待实测',canDeploy:false});
 if(input==null){unknown('flow-mtu-missing','packetTargets','缺少逐业务连接的双向IP包长目标');rows.push({category:'network-mtu',label:'端到端MTU',status:'未评估',detail:'单段MTU符合不代表业务连接端到端包长目标满足'});return done();}
 const fields=(x,keys,p)=>{if(!obj(x)){err('flow-mtu-type',p,'应为对象');return false;}for(const k of Object.keys(x))if(!keys.includes(k))err('flow-mtu-field',p+'.'+k,'未建模字段；不得导入手工路径/通过结果');return true;};
 const index=(a,p,max=5000)=>{const m=new Map();if(!Array.isArray(a)||a.length>max){err('flow-mtu-list',p,'清单缺失或超过'+max+'项');return m;}for(const v of a){if(!obj(v)||!text(v.id)){err('flow-mtu-id',p,'ID无效');continue;}if(m.has(v.id))err('flow-mtu-duplicate',p,'重复ID');else m.set(v.id,v);}return m;};
 if(!fields(input,['schema','targetVersion','targets','review'],'packetTargets'))return done();if(input.schema!==SCHEMA)err('flow-mtu-schema','packetTargets','包长契约版本不支持');if(!text(input.targetVersion)||!text(targetVersion))unknown('flow-mtu-version','packetTargets','缺少准确目标版本');else if(input.targetVersion!==targetVersion)err('flow-mtu-version','packetTargets','包长资料与设计版本不符');
 if(fields(input.review,['coverage','source'],'packetTargets.review')){if(input.review.coverage==='unknown')unknown('flow-mtu-coverage','packetTargets.review','包长目标完整性未明确');else if(input.review.coverage!=='declared-complete')err('flow-mtu-coverage','packetTargets.review','仅允许unknown/declared-complete');if(!text(input.review.source))unknown('flow-mtu-source','packetTargets.review','缺少目标范围与资料来源');}
 const links=index(connections?.links,'links'),targets=index(input.targets,'targets'),byLink=new Map(),invalid=new Set();
 for(const t of targets.values()){
  const start=issues.length;fields(t,['id','linkId','forward','reverse'],t.id);if(!links.has(t.linkId))err('flow-mtu-link',t.id,'目标连接不存在');if(byLink.has(t.linkId)){err('flow-mtu-target-duplicate',t.id,'同一连接目标重复，不能任选');invalid.add(byLink.get(t.linkId).id);}else byLink.set(t.linkId,t);
  if(issues.slice(start).some(i=>i.severity==='error'))invalid.add(t.id);
  for(const side of ['forward','reverse']){const q=t[side],p=t.id+'/'+side,sideStart=issues.length;if(!fields(q,['ipPacketBytes','policy','transformation','source'],p)){invalid.add(key(t.id,side));continue;}if(q.ipPacketBytes!==null&&!bytes(q.ipPacketBytes))err('flow-mtu-packet',p,'IP总包长须20..65535整数或null；不是TCP MSS或应用负载');if(!['no-fragment','unknown'].includes(q.policy))err('flow-mtu-policy',p,'本批仅支持no-fragment或unknown');if(!['none','unknown'].includes(q.transformation))err('flow-mtu-transformation',p,'仅支持明确无转换none或unknown，不推算NAT/隧道/压缩');if(!text(q.source))unknown('flow-mtu-source',p,'缺少本方向IP包长需求来源');if(issues.slice(sideStart).some(i=>i.severity==='error'))invalid.add(key(t.id,side));}
 }
 const pairMap=(values,p)=>{const m=new Map();if(!Array.isArray(values)||values.length>10000){unknown('flow-mtu-computed',p,'缺少有效计算结果或超过预算');return m;}for(const v of values){const k=key(v?.linkId,v?.direction);if(!v||!text(v.linkId)||!['forward','reverse'].includes(v.direction)||m.has(k)){unknown('flow-mtu-computed',p,'计算方向引用无效或重复');if(m.has(k))m.set(k,null);}else m.set(k,v);}return m;};
 const routes=pairMap(computed?.routes,'routes'),forwarding=pairMap(computed?.forwarding?.traces,'forwarding'),direct=pairMap(computed?.fabric?.directTraces,'direct'),physical=new Map();
 if(!Array.isArray(computed?.physical?.rows))unknown('flow-mtu-computed','physical','缺少物理计算结果');else for(const r of computed.physical.rows){if(r.category&&r.category!=='network-physical')continue;if(!text(r.adjacencyId))continue;if(physical.has(r.adjacencyId)){unknown('flow-mtu-computed',r.adjacencyId,'物理计算结果重复');physical.set(r.adjacencyId,null);}else physical.set(r.adjacencyId,r);}
 let visited=0;
 for(const l of links.values())for(const side of ['forward','reverse']){
  const start=issues.length,p=l.id+' / '+(side==='forward'?'正向':'返回'),route=routes.get(key(l.id,side)),target=byLink.get(l.id),q=target?.[side],parts=[],limits=[];let ids=[],local=false,traceComplete=false;
  if(!route)unknown('flow-mtu-route',p,'本方向尚无有效主机选路结果');else if(route.status==='阻断')err('flow-mtu-route-blocked',p,'本方向选路已阻断，不能认定端到端MTU满足');else if(route.status!=='声明选路待实测')unknown('flow-mtu-route',p,'本方向选路尚未明确');
  else if(route.kind==='local')local=true;
  if(!local){
   if(!target||invalid.has(target.id)||invalid.has(key(target.id,side))||!obj(q))unknown('flow-mtu-target',p,'本方向包长目标缺失或无效');
   else{if(!bytes(q.ipPacketBytes)||q.policy!=='no-fragment'||q.transformation!=='none'||!text(q.source))unknown('flow-mtu-target',p,'IP包长、无分片/无转换适用性或来源未知');if(route?.family===6&&bytes(q.ipPacketBytes)&&q.ipPacketBytes<40)err('flow-mtu-ipv6-header',p,'IPv6总包长不能小于40字节基本头；小于1280的正常IPv6包仍可合法传输');}
   let trace;
   if(route?.kind==='via'){trace=forwarding.get(key(l.id,side));ids=Array.isArray(trace?.adjacencyIds)?trace.adjacencyIds:[];traceComplete=trace?.status==='声明逐跳到达待实测';}
   else if(route?.kind==='direct'){trace=direct.get(key(l.id,side));ids=text(trace?.adjacencyId)?[trace.adjacencyId]:[];traceComplete=trace?.status==='声明邻接待实测';}
   if(trace?.status==='阻断')err('flow-mtu-path-blocked',p,'本方向逻辑转发/邻接路径阻断');else if(!traceComplete)unknown('flow-mtu-path',p,'本方向路径未完整计算，不以局部路径认定满足');
   if(!ids.length)unknown('flow-mtu-adjacencies',p,'没有可对应的已计算物理邻接');
   if(ids.length>128){unknown('flow-mtu-path-budget',p,'本方向邻接超过128项预算');ids=[];}
   for(const id of ids){
    if(++visited>100000){unknown('flow-mtu-budget',p,'端到端邻接汇总超过100000次预算');break;}
    const r=physical.get(id);if(!r){unknown('flow-mtu-physical',p,'缺少邻接 '+id+' 的物理路径结果');parts.push({adjacencyId:id,knownMinimumIpMtu:null,networkMtu:null,status:'未评估'});continue;}
    const known=mtu(r.knownMinimumIpMtu)?r.knownMinimumIpMtu:null,net=mtu(r.networkMtu)?r.networkMtu:null;
    if(known!==null)limits.push({adjacencyId:id,kind:'physical',value:known});else unknown('flow-mtu-physical',p,'邻接 '+id+' 无已知物理MTU');
    if(net!==null)limits.push({adjacencyId:id,kind:'network',value:net});else unknown('flow-mtu-network',p,'邻接 '+id+' 缺少配置网段IP MTU');
    if(r.status==='阻断')err('flow-mtu-physical-blocked',p,'邻接 '+id+' 的物理路径已阻断');else if(r.status!=='声明物理路径待实测')unknown('flow-mtu-physical',p,'邻接 '+id+' 物理路径存在未知项');
    parts.push({adjacencyId:id,knownMinimumIpMtu:known,networkMtu:net,status:r.status});
   }
   if(computed?.physical?.issues?.length)unknown('flow-mtu-physical-scope',p,'物理资料整体仍有错误/未知项，单行不能替代整体评审');
  }
  const minimum=limits.length?Math.min(...limits.map(v=>v.value)):null,required=bytes(q?.ipPacketBytes)?q.ipPacketBytes:null;
  if(!local&&q?.policy==='no-fragment'&&q?.transformation==='none'&&required!==null&&minimum!==null&&minimum<required)err('flow-mtu-insufficient',p,'端到端已知IP MTU '+minimum+' 小于本方向无分片IP包长 '+required+'，局部网段通过不能代替整条连接满足');
  const localIssues=issues.slice(start),status=localIssues.some(i=>i.severity==='error')?'阻断':localIssues.length?'未评估':local?'本机通信，不适用网络MTU':'声明端到端MTU待实测',bottlenecks=minimum===null?[]:limits.filter(v=>v.value===minimum);
  const result={linkId:l.id,direction:side,status,ipPacketBytes:required,knownMinimumIpMtu:minimum,adjacencyIds:ids,parts,bottlenecks};directions.push(result);
  rows.push({category:'network-mtu',label:'端到端MTU / '+p,status,detail:'IP总包长目标：'+(required??'未知')+' B；已知最小IP MTU：'+(minimum??'不适用/未知')+' B；路径：'+ids.join(' → ')+'；瓶颈：'+bottlenecks.map(b=>b.adjacencyId+'/'+b.kind).join(',')+'。正反向独立；仅声明计算，不是PMTUD、实际业务可达或故障切换证明',...result});
 }
 if(!links.size)unknown('flow-mtu-empty','packetTargets','无业务连接，不能证明目标覆盖');return done();
}
const api={SCHEMA,template,evaluate};root.GoldenDBNetworkMtu=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
