/* Fixed-instance, symmetric two-site structural planner. No performance/HA certification. */
(function(root){
'use strict';
const LIMIT=2000;
function number(v,name,min=1,max=LIMIT){if(v===''||v===null||typeof v==='boolean'||!Number.isInteger(Number(v))||Number(v)<min||Number(v)>max)throw new Error(name+'须为'+min+'至'+max+'的整数');return Number(v);}
function normalize(input){
 const c={serverCount:number(input.serverCount,'服务器总数',2,500),maxComponents:number(input.maxComponents,'单机组件上限',1,32),managementReplicas:number(input.managementReplicas,'管理副本数',2,100),opsCn:number(input.opsCn,'专用运维CN数',0,100),shareCn:input.shareCn===true,mixCnGtm:input.mixCnGtm===true,tenants:[]};
 if(c.serverCount%2||c.managementReplicas%2||c.opsCn%2)throw new Error('本对称两机房模式要求服务器、管理副本与运维CN总数为偶数；不会静默修改输入。');
 if(!Array.isArray(input.tenants)||!input.tenants.length||input.tenants.length>100)throw new Error('请提供1至100个租户');
 c.tenants=input.tenants.map((t,i)=>{const name=String(t.name??'').trim();if(!name||name.length>60||/[\u0000-\u001f\ud800-\udfff]/u.test(name))throw new Error('租户名称为空、过长或含非法字符');const r={id:'T'+(i+1),name,shards:number(t.shards,'分片数',1,200),cn:number(t.cn,'业务CN数',2,100),dnReplicas:number(t.dnReplicas,'DN副本数',2,100),gtmReplicas:number(t.gtmReplicas,'专属GTM副本数',2,100)};if(r.cn%2||r.dnReplicas%2||r.gtmReplicas%2)throw new Error(name+'的CN/DN副本/GTM副本须为偶数，便于两机房等量分配');return r;});
 const total=c.tenants.reduce((n,t)=>n+t.cn+t.shards*t.dnReplicas+t.gtmReplicas,0)+c.managementReplicas+c.opsCn;if(total>LIMIT)throw new Error('本地交互保护：组件总数不得超过2000；不是GoldenDB产品上限');return c;
}
function tasks(c){const out=[];function add(x){out.push(x);}
 for(const t of c.tenants){for(let i=0;i<t.cn;i++)add({id:t.id+'-CN'+(i+1),type:'CN',tenant:t.id,name:t.name,group:t.id+'-CN',site:i<t.cn/2?0:1,role:'服务'});
 for(let g=1;g<=t.shards;g++)for(let r=0;r<t.dnReplicas;r++)add({id:t.id+'-DN-G'+g+'-R'+(r+1),type:'DN',tenant:t.id,name:t.name,group:t.id+'-DN-G'+g,site:r<t.dnReplicas/2?0:1,role:r===0?'主':'从',replica:r+1});
 for(let r=0;r<t.gtmReplicas;r++)add({id:t.id+'-GTM-R'+(r+1),type:'GTM',tenant:t.id,name:t.name,group:t.id+'-GTM',site:r<t.gtmReplicas/2?0:1,role:r===0?'主':'从',replica:r+1});}
 for(let r=0;r<c.managementReplicas;r++)add({id:'MGR-R'+(r+1),type:'管理',tenant:null,name:'集群',group:'MGR',site:r<c.managementReplicas/2?0:1,role:r===0?'主':'从',replica:r+1});
 for(let i=0;i<c.opsCn;i++)add({id:'OPS-CN'+(i+1),type:'运维CN',tenant:null,name:'集群运维',group:'OPS',site:i<c.opsCn/2?0:1,role:'运维'});return out;}
function blocks(c,all,site){const local=all.filter(t=>t.site===site),result=[];function block(name,list,onePerHost=false){if(list.length)result.push({name,list,onePerHost});}
 block('DN共享池',local.filter(t=>t.type==='DN'));block('管理专用池',local.filter(t=>t.type==='管理'),true);block('运维CN专用池',local.filter(t=>t.type==='运维CN'),true);
 const sets=c.shareCn?[c.tenants.map(t=>t.id)]:c.tenants.map(t=>[t.id]);
 for(const ids of sets){const list=local.filter(t=>ids.includes(t.tenant)&&(t.type==='CN'||t.type==='GTM')),label=c.shareCn?'跨租户':ids.join('/');if(c.mixCnGtm)block(label+'CN/GTM池',list);else{block(label+'CN池',list.filter(t=>t.type==='CN'));block(label+'GTM池',list.filter(t=>t.type==='GTM'));}}
 return result;}
function minHosts(b,cap){const counts=new Map();for(const t of b.list)counts.set(t.group,(counts.get(t.group)||0)+1);return Math.max(Math.ceil(b.list.length/(b.onePerHost?1:cap)),...counts.values());}
// Integral max-flow: group->host capacity one enforces physical-host anti-affinity.
function pack(block,hosts,cap){
 const grouped=new Map();for(const t of block.list){if(!grouped.has(t.group))grouped.set(t.group,[]);grouped.get(t.group).push(t);}
 const groups=[...grouped.values()],S=0,G=1,H=G+groups.length,T=H+hosts.length,N=T+1,graph=Array.from({length:N},()=>[]);let edges=0;
 function edge(a,b,capacity){const f={to:b,rev:graph[b].length,cap:capacity,initial:capacity},r={to:a,rev:graph[a].length,cap:0,initial:0};graph[a].push(f);graph[b].push(r);return f;}
 const links=groups.map((ts,i)=>{edge(S,G+i,ts.length);return hosts.map((_,h)=>{if(++edges>250000)throw new Error('约束搜索边数超过交互保护预算；结果未评估');return edge(G+i,H+h,1);});});hosts.forEach((_,h)=>edge(H+h,T,block.onePerHost?1:cap));
 let flow=0;while(true){const prev=Array(N).fill(null),q=[S];prev[S]=[-1,-1];for(let i=0;i<q.length&&!prev[T];i++)for(let k=0;k<graph[q[i]].length;k++){const e=graph[q[i]][k];if(e.cap>0&&!prev[e.to]){prev[e.to]=[q[i],k];q.push(e.to);}}
 if(!prev[T])break;let v=T;while(v!==S){const [u,k]=prev[v],e=graph[u][k];e.cap--;graph[v][e.rev].cap++;v=u;}flow++;}
 if(flow!==block.list.length)return false;
 groups.forEach((list,i)=>{let cursor=0;links[i].forEach((e,h)=>{if(e.initial-e.cap===1)hosts[h].components.push(list[cursor++]);});});return true;
}
function audit(config,hosts){
 const c=normalize(config),expected=tasks(c),map=new Map(expected.map(t=>[t.id,t])),seen=new Map(),errors=[];
 const fail=(code,detail)=>errors.push({code,detail}),siteCounts=[0,0],safeHosts=Array.isArray(hosts)&&hosts.length<=500?hosts:[];
 const result=()=>({passed:!errors.length,errors,checkedComponents:expected.length,
   actualComponents:safeHosts.reduce((n,h)=>n+(Array.isArray(h?.components)?h.components.length:0),0),
   maxComponents:Math.max(0,...Array.from(safeHosts,h=>Array.isArray(h?.components)?h.components.length:0)),siteCounts});
 if(!Array.isArray(hosts)||hosts.length>500){fail('hosts-input','服务器清单必须为不超过500项的数组');return result();}
 if(hosts.length!==c.serverCount)fail('host-count','服务器数不等于输入');
 if(hosts.reduce((n,h)=>n+(Array.isArray(h?.components)?h.components.length:0),0)>LIMIT){fail('components-input','组件清单超过交互校验预算');return result();}
 const ids=new Set();
 for(const h of hosts){
  if(!h||typeof h!=='object'||Array.isArray(h)){fail('host-input','服务器对象为空或非法');continue;}
  if(typeof h.id!=='string'||!h.id.trim()||h.id!==h.id.trim()||h.id.length>120||/[\u0000-\u001f]/u.test(h.id))fail('host-id','服务器ID缺失或非法');
  else{if(ids.has(h.id))fail('duplicate-host',h.id);ids.add(h.id);}
  if(h.site!==0&&h.site!==1){fail('site',h.id);continue;}siteCounts[h.site]++;
  if(!Array.isArray(h.components)){fail('components',h.id);continue;}
  if(h.components.length>c.maxComponents)fail('density',h.id);
  const valid=h.components.filter(t=>t&&typeof t==='object'&&!Array.isArray(t));
  if(valid.length!==h.components.length)fail('component-input',h.id+':存在空或非法组件');
  const groups=new Set(),types=new Set(valid.map(t=>t.type)),tenants=new Set(valid.filter(t=>t.tenant).map(t=>t.tenant));
  if(types.has('管理')&&h.components.length!==1)fail('management-isolation',h.id);
  if(types.has('运维CN')&&h.components.length!==1)fail('ops-isolation',h.id);
  if(types.has('DN')&&types.size>1)fail('dn-isolation',h.id);
  if(!c.mixCnGtm&&types.has('CN')&&types.has('GTM'))fail('cn-gtm-mix',h.id);
  if(!c.shareCn&&!types.has('DN')&&tenants.size>1)fail('cn-tenant-isolation',h.id);
  for(const t of valid){
   const e=map.get(t.id);seen.set(t.id,(seen.get(t.id)||0)+1);if(!e){fail('unexpected',t.id);continue;}
   // JSON object property order is not identity. All expected primitive fields and the exact key set still matter.
   if(Object.keys(t).length!==Object.keys(e).length||Object.keys(e).some(k=>!Object.hasOwn(t,k)||t[k]!==e[k]))fail('identity',t.id);
   if(h.site!==e.site)fail('wrong-site',t.id);if(t.role==='主'&&h.site!==0)fail('primary-site',t.id);
   if(groups.has(t.group))fail('anti-affinity',h.id+':'+t.group);groups.add(t.group);
  }
 }
 for(const t of expected)if(seen.get(t.id)!==1)fail('missing-or-duplicate',t.id);
 if(siteCounts.some(n=>n!==c.serverCount/2))fail('site-count','两机房服务器应各占一半');return result();
}
function plan(input){const config=normalize(input),all=tasks(config),siteBlocks=[0,1].map(i=>blocks(config,all,i));const requirements=siteBlocks.map(bs=>bs.map(b=>({pool:b.name,components:b.list.length,hosts:minHosts(b,config.maxComponents)})));const requiredBySite=requirements.map(rs=>rs.reduce((n,r)=>n+r.hosts,0));const hosts=Array.from({length:config.serverCount},(_,i)=>({id:(i<config.serverCount/2?'A':'B')+'-'+String(i%(config.serverCount/2)+1).padStart(2,'0'),site:i<config.serverCount/2?0:1,pool:'空闲',components:[]}));
 const result={schema:'goldendb-fixed-v1',config,requiredBySite,requiredServers:requiredBySite[0]*2,requirements,hosts,structuralStatus:'未通过',productionStatus:'未评估',warnings:['这是固定数量及物理落位校验，不是性能/容量/生产准入证明。','管理6副本及3+3的仲裁、Team、复制/选主规则需按实际GoldenDB版本由厂商核验；不能直接套普通多数派结论。','业务CN是否可供运维跨租户使用、2个共用运维CN的实际授权/连接方式需核验；本结果仅预留2个独立实例。','未提供CPU/内存/净磁盘/IO/网络/数据量/负载/RPO/RTO，均未评估；机柜与真实交换机/地址由项目补齐。','同城两机房不能覆盖城市级灾害。'],missing:[]};
 if(requiredBySite.some(n=>n>config.serverCount/2)){result.missing=all.map(t=>t.id);result.audit={passed:false,errors:[{code:'insufficient-hosts',detail:'按当前隔离和密度约束至少需要'+result.requiredServers+'台，不能输出部分落位冒充完整方案。'}]};return result;}
 for(let site=0;site<2;site++){let cursor=0;const local=hosts.filter(h=>h.site===site);siteBlocks[site].forEach((b,i)=>{const hs=local.slice(cursor,cursor+requirements[site][i].hosts);cursor+=hs.length;hs.forEach(h=>h.pool=b.name);if(!pack(b,hs,config.maxComponents))throw new Error('数量下界未能构造完整落位；方案未评估，不能视为可行');});}
 result.audit=audit(config,hosts);result.structuralStatus=result.audit.passed?'通过（仅结构）':'未通过';result.summary=Object.fromEntries(['DN','CN','GTM','管理','运维CN'].map(type=>[type,all.filter(t=>t.type===type).length]));result.total=all.length;result.freeHosts=hosts.filter(h=>!h.components.length).length;
 if(!result.freeHosts)result.warnings.push(config.serverCount+'台全部占用，无空闲物理服务器；空组件槽位不等于故障重建或N+1资源。');return result;}
const defaults={serverCount:60,maxComponents:4,managementReplicas:6,opsCn:2,shareCn:true,mixCnGtm:true,tenants:[24,3,1].map((shards,i)=>({name:'租户'+(i+1),shards,cn:6,dnReplicas:6,gtmReplicas:6}))};
root.GoldenDBFixed={normalize,plan,audit,defaults};
})(globalThis);
