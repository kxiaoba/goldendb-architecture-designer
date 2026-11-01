// Synthetic ports only; not GoldenDB port recommendations.
function fillListeners(m){
 const x=m.connectivity,infra=m.infrastructure,components=new Map(x.components.map(c=>[c.id,c]));
 const services={schema:'goldendb-service-listeners-v1',listeners:[],bindings:[],review:{coverage:'declared-complete',source:'synthetic://test-only/listeners'}};
 const used=new Map(),byTarget=new Map();
 for(const link of x.links){
  const e=x.endpoints.find(e=>e.id===link.targetEndpointId);if(e?.kind!=='component')continue;
  const c=components.get(e.componentId),iface=infra.interfaces.find(i=>i.id===e.interfaceId),flow=infra.flows.find(f=>f.id===link.flowId);if(!c||!iface||!flow)continue;
  let f=flow;const key=[c.id,f.protocol,f.port].join('|');let listener=byTarget.get(key);
  if(!listener){
   let port=f.port;while(used.has([c.hostId,f.protocol,port].join('|')))port++;
   if(port!==f.port){f={...f,id:'LISTENER-FLOW-'+services.listeners.length,port};infra.flows.push(f);const acl=infra.acl.find(a=>a.protocol===flow.protocol&&a.portStart<=flow.port&&a.portEnd>=flow.port);if(acl)infra.acl.push({...acl,id:'LISTENER-ACL-'+services.listeners.length,portStart:port,portEnd:port});link.flowId=f.id;}
   listener={id:'SERVICE-'+services.listeners.length,componentId:c.id,protocol:f.protocol,port:f.port,bindAddress:iface.address,namespaceId:'host',ipv6Only:iface.address.includes(':')?true:'not-applicable',reusePolicy:'exclusive',source:'synthetic://listener-config',targetVersion:m.design.targetVersion};services.listeners.push(listener);byTarget.set(key,listener);used.set([c.hostId,f.protocol,port].join('|'),true);
  }else if(listener.port!==f.port){const existing=infra.flows.find(v=>v.port===listener.port&&v.protocol===f.protocol&&v.purpose===f.purpose);if(existing)link.flowId=existing.id;}
  services.bindings.push({id:'BIND-'+services.bindings.length,linkId:link.id,listenerId:listener.id});
 }
 x.services=services;return require('./routing-fixture.cjs').fillRouting(m);
}
module.exports={fillListeners};
