// Synthetic declared detour. Shared endpoint switch/cables: no independence or STP proof.
function addAlternative(m,adjacencyId){
 const p=m.connectivity.routing.physical,original=p.paths.find(x=>x.adjacencyId===(adjacencyId||p.paths[0].adjacencyId)),middle=original.segments.find(s=>s.kind==='transit'),t=p.transits.find(x=>x.id===middle.id),prefix='ALT-'+original.id,source='synthetic://selection',net=t.networkId;
 const sw={id:prefix+'-SW',assetId:prefix+'-ASSET',model:'synthetic',source,faultDomainIds:['SYNTHETIC-DOMAIN']};p.switches.push(sw);
 const ids=['OUT','IN','RETURN','BACK'].map(x=>prefix+'-'+x),port=(id,owner)=>({id,owner:{kind:'switch',id:owner},name:id,networkId:net,mode:'dedicated-l2',state:'up',ipMtuBytes:9000,source,faultDomainIds:['SYNTHETIC-DOMAIN']});
 p.ports.push(port(ids[0],t.switchId),port(ids[1],sw.id),port(ids[2],sw.id),port(ids[3],t.switchId));
 for(const [i,a,b] of [[1,ids[0],ids[1]],[2,ids[2],ids[3]]])p.cables.push({id:prefix+'-C'+i,aPortId:a,bPortId:b,state:'up',ipMtuBytes:9000,source,faultDomainIds:['SYNTHETIC-DOMAIN']});
 const trans=[[t.switchId,t.fromPortId,ids[0]],[sw.id,ids[1],ids[2]],[t.switchId,ids[3],t.toPortId]].map(([switchId,fromPortId,toPortId],i)=>({id:prefix+'-T'+i,switchId,fromPortId,toPortId,networkId:net,state:'up',ipMtuBytes:9000,source}));p.transits.push(...trans);
 const seg=(kind,id,fromPortId,toPortId)=>({kind,id,fromPortId,toPortId}),detour=[seg('transit',trans[0].id,t.fromPortId,ids[0]),seg('cable',prefix+'-C1',ids[0],ids[1]),seg('transit',trans[1].id,ids[1],ids[2]),seg('cable',prefix+'-C2',ids[2],ids[3]),seg('transit',trans[2].id,ids[3],t.toPortId)];
 const candidate={...structuredClone(original),id:prefix,source,segments:original.segments.flatMap(s=>s===middle?detour:[structuredClone(s)])};p.paths.push(candidate);p.selections??=[];p.selections.push({id:prefix+'-SELECT',adjacencyId:original.adjacencyId,activePathId:original.id,mode:'declared-single-active',source});return {original,candidate,selection:p.selections.at(-1),cable:p.cables.find(c=>c.id===prefix+'-C1')};
}
module.exports={addAlternative};
