// Synthetic IP packet targets, not GoldenDB packet-size recommendations.
function fillMtu(m){const source='synthetic://packet-target';m.connectivity.routing.packetTargets={schema:'goldendb-network-mtu-v1',targetVersion:m.design.targetVersion,targets:m.connectivity.links.map((l,i)=>({id:'MTU-'+i,linkId:l.id,forward:{ipPacketBytes:1500,policy:'no-fragment',transformation:'none',source},reverse:{ipPacketBytes:1500,policy:'no-fragment',transformation:'none',source}})),review:{coverage:'declared-complete',source}};return m;}
function breakFlowMtu(material){const m=structuredClone(material);m.connectivity.routing.packetTargets.targets.forEach(t=>t.forward.ipPacketBytes=9000);return m;}
module.exports={fillMtu,breakFlowMtu};
