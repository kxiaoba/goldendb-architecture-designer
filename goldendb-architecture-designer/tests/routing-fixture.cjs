// Synthetic directly attached networks/local routes only; NEVER GoldenDB production routing defaults.
const ip=require('../network-address.js');
function fillRouting(m){
 const x=m.connectivity,infra=m.infrastructure,components=new Map(x.components.map(c=>[c.id,c])),networks=new Map(infra.networks.map(n=>[n.id,n]));
 const routing={schema:'goldendb-network-routing-v1',tables:[],paths:[]},owners=new Map(),endpoints=new Map();
 for(const e of x.endpoints){const c=components.get(e.componentId),i=infra.interfaces.find(i=>i.id===e.interfaceId),networkId=e.kind==='component'?i?.networkId:e.networkId,n=networks.get(networkId),address=e.kind==='component'?i?.address:e.address;if(!n||!address||e.kind==='component'&&!c)continue;
  const ownerType=e.kind==='component'?'host':'external',ownerId=ownerType==='host'?c.hostId:e.id,key=JSON.stringify([ownerType,ownerId,n.vrf]);let t=owners.get(key);
  if(!t){t={id:'TABLE-'+routing.tables.length,ownerType,ownerId,vrf:n.vrf,mode:'destination-only',coverage:'declared-complete',source:'synthetic://direct-network-only',targetVersion:m.design.targetVersion,routes:[]};
   const ifaces=ownerType==='host'?infra.interfaces.filter(v=>v.hostId===ownerId&&networks.get(v.networkId)?.vrf===n.vrf):[{id:'not-applicable',networkId,address}];const seen=new Set();
   for(const v of ifaces){const net=networks.get(v.networkId),a=ip.parse(v.address);if(!net||!a)continue;
    if(!seen.has(net.id)){t.routes.push({id:'DIRECT-'+t.routes.length,destination:net.cidr,kind:'direct',networkId:net.id,interfaceId:v.id,nextHop:'not-applicable'});seen.add(net.id);}
    t.routes.push({id:'LOCAL-'+t.routes.length,destination:v.address+'/'+(a.family===4?32:128),kind:'local',networkId:net.id,interfaceId:v.id,nextHop:'not-applicable'});
   }owners.set(key,t);routing.tables.push(t);
  }endpoints.set(e.id,{table:t,address:ip.parse(address)});
 }
 const binding=(a,b)=>{if(!a||!b)return null;const candidates=a.table.routes.map(r=>({r,p:ip.prefix(r.destination)})).filter(v=>v.p&&b.address&&v.p.family===b.address.family&&b.address.value>=v.p.start&&b.address.value<=v.p.end).sort((a,b)=>b.p.bits-a.p.bits);return {tableId:a.table.id,routeId:candidates[0]?.r.id??'MISSING'};};
 for(const l of x.links){const s=endpoints.get(l.sourceEndpointId),d=endpoints.get(l.targetEndpointId);routing.paths.push({id:'PATH-'+routing.paths.length,linkId:l.id,forward:binding(s,d),reverse:binding(d,s)});}
 x.routing=routing;return require('./fabric-fixture.cjs').fillFabric(m);
}
module.exports={fillRouting};
