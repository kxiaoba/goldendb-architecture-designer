// Synthetic FIB/adjacency data for tests. Never production defaults.
const NA='not-applicable',source='synthetic://forwarding-test';
function fixture({family=4,count=2}={}){
 const version='fixture-version',vrf='test-vrf',addr=(n,h)=>family===4?`10.${Math.floor(n/256)}.${n%256}.${h}`:`2001:db8:${n.toString(16)}::${h.toString(16)}`,cidr=n=>addr(n,0)+(family===4?'/24':'/64');
 const context={hostIds:['A','B'],components:[{id:'CA',hostId:'A'},{id:'CB',hostId:'B'}]};
 const infrastructure={networks:Array.from({length:count+1},(_,n)=>({id:'N'+n,cidr:cidr(n),vrf,mtu:1500})),interfaces:[{id:'HA',hostId:'A',networkId:'N0',address:addr(0,10)},{id:'HB',hostId:'B',networkId:'N'+count,address:addr(count,10)}]};
 const fabric={schema:'goldendb-network-fabric-v1',targetVersion:version,devices:[],interfaces:[],adjacencies:[],directPaths:[],gatewayBindings:[],review:{coverage:'declared-complete',source}};
 const forwarding={schema:'goldendb-network-forwarding-v1',targetVersion:version,tables:[],review:{coverage:'declared-complete',source}};
 const ref=(id)=>({kind:id.startsWith('H')?'host-interface':'router-interface',id});
 const edge=(a,b)=>fabric.adjacencies.push({id:'E-'+a+'-'+b,source:ref(a),target:ref(b),state:'up',evidenceSource:source});
 const pair=(a,b)=>{edge(a,b);edge(b,a);};
 for(let i=0;i<count;i++){
  const id='R'+i;fabric.devices.push({id,assetId:'ASSET-'+id,model:'test-router',osVersion:'test-os',forwarding:{ipv4:'enabled',ipv6:'enabled'},source});
  for(const [suffix,n,h]of[['L',i,1],['R',i+1,2]])fabric.interfaces.push({id:id+suffix,deviceId:id,networkId:'N'+n,address:addr(n,h),state:'up',addressRole:'unicast',source});
  forwarding.tables.push({id:'F'+i,deviceId:id,vrf,deviceOsVersion:'test-os',mode:'destination-only',coverage:'declared-complete',source,routes:[
   {id:'TO-A',destination:cidr(0),kind:i===0?'direct':'via',interfaceId:id+'L',nextHop:i===0?NA:addr(i,2)},
   {id:'TO-B',destination:cidr(count),kind:i===count-1?'direct':'via',interfaceId:id+'R',nextHop:i===count-1?NA:addr(i+1,1)}]});
  if(i>0)pair('R'+(i-1)+'R',id+'L');
 }
 pair('HA','R0L');pair('R'+(count-1)+'R','HB');
 const tables=['A','B'].map((host,i)=>({id:'T'+host,ownerType:'host',ownerId:host,vrf,mode:'destination-only',coverage:'declared-complete',source,targetVersion:version,routes:[{id:'VIA',destination:cidr(i===0?count:0),kind:'via',networkId:'N'+(i===0?0:count),interfaceId:'H'+host,nextHop:addr(i===0?0:count,i===0?1:2)}]}));
 for(const [host,iface]of[['A','R0L'],['B','R'+(count-1)+'R']])fabric.gatewayBindings.push({id:'G'+host,tableId:'T'+host,routeId:'VIA',routerInterfaceId:iface,adjacencyId:'E-H'+host+'-'+iface});
 const connectivity={endpoints:[{id:'EA',kind:'component',componentId:'CA',interfaceId:'HA'},{id:'EB',kind:'component',componentId:'CB',interfaceId:'HB'}],links:[{id:'L',sourceEndpointId:'EA',targetEndpointId:'EB'}],routing:{schema:'goldendb-network-routing-v1',tables,paths:[{id:'P',linkId:'L',forward:{tableId:'TA',routeId:'VIA'},reverse:{tableId:'TB',routeId:'VIA'}}],fabric,forwarding}};
 return require('./physical-fixture.cjs').fillPhysical({context,infrastructure,connectivity,design:{targetVersion:version},addr,cidr});
}
function makeLoopMaterial(material){
 const m=structuredClone(material),r=m.connectivity.routing,f=r.fabric,ip=require('../network-address.js');
 const p=r.paths.find(p=>r.tables.find(t=>t.id===p.forward?.tableId)?.routes.find(t=>t.id===p.forward?.routeId)?.kind==='direct');if(!p)throw Error('fixture needs a nonlocal direct route');
 const t=r.tables.find(t=>t.id===p.forward.tableId),route=t.routes.find(x=>x.id===p.forward.routeId),net=m.infrastructure.networks.find(n=>n.id===route.networkId);
 if(net.cidr!=='10.0.0.0/16')throw Error('synthetic loop requires fixture subnet');
 const src='synthetic://intentional-loop';for(let i=0;i<2;i++){f.devices.push({id:'LOOP-R'+i,assetId:'LOOP-ASSET'+i,model:'test-router',osVersion:'test-os',forwarding:{ipv4:'enabled',ipv6:'enabled'},source:src});f.interfaces.push({id:'LOOP-I'+i,deviceId:'LOOP-R'+i,networkId:net.id,address:'10.0.254.'+(253+i),state:'up',addressRole:'unicast',source:src});}
 const edge=(id,a,b)=>f.adjacencies.push({id,source:a,target:b,state:'up',evidenceSource:src});
 edge('LOOP-START',{kind:'host-interface',id:route.interfaceId},{kind:'router-interface',id:'LOOP-I0'});
 for(let i=0;i<2;i++)edge('LOOP-E'+i,{kind:'router-interface',id:'LOOP-I'+i},{kind:'router-interface',id:'LOOP-I'+(1-i)});
 Object.assign(route,{kind:'via',nextHop:'10.0.254.253'});f.gatewayBindings.push({id:'LOOP-G',tableId:t.id,routeId:route.id,routerInterfaceId:'LOOP-I0',adjacencyId:'LOOP-START'});
 r.forwarding={schema:'goldendb-network-forwarding-v1',targetVersion:m.design.targetVersion,review:{coverage:'declared-complete',source:src},tables:[0,1].map(i=>({id:'LOOP-F'+i,deviceId:'LOOP-R'+i,vrf:net.vrf,deviceOsVersion:'test-os',mode:'destination-only',coverage:'declared-complete',source:src,routes:[{id:'LOOP',destination:net.cidr,kind:'via',interfaceId:'LOOP-I'+i,nextHop:'10.0.254.'+(254-i)}]}))};return m;
}
module.exports={fixture,makeLoopMaterial};
