// Synthetic metadata only. These ports/specifications are NOT GoldenDB defaults.
const makeInfrastructure=(context,targetVersion='fixture-version')=>({schema:'goldendb-infrastructure-v1',targetVersion,planUnits:{cpu:'physicalCores',memory:'GiB',disk:'TiB',source:'synthetic-only'},
 hosts:context.hostIds.map(id=>({id,cpuPhysicalCores:16,memoryGiB:128,dataUsableGiB:1000,nicGbps:25,os:'synthetic-os',architecture:'synthetic-arch',budget:{cpuReserveRatio:0.1,memoryReserveRatio:0.1,diskBasis:'net-before-watermark',diskWatermark:0.9}})),
 networks:[{id:'N',cidr:'10.0.0.0/16',vrf:'synthetic',vlan:100,mtu:1500,purposes:['business','replication','management','backup'],pointToPoint:false}],
 interfaces:context.hostIds.map((hostId,i)=>({id:'I'+i,hostId,networkId:'N',nic:'fixture0',address:'10.0.'+Math.floor((i+10)/256)+'.'+((i+10)%256)})),
 acl:['business','replication','management','backup'].map((purpose,i)=>({id:'A'+i,sourceNetworkId:'N',targetNetworkId:'N',protocol:'tcp',portStart:20000+i,portEnd:20000+i,action:'allow',source:'synthetic://ports/'+purpose,targetVersion})),
 flows:['business','replication','management','backup'].map((purpose,i)=>({id:'F'+i,sourceNetworkId:'N',targetNetworkId:'N',protocol:'tcp',port:20000+i,purpose,source:'synthetic://ports/'+purpose,targetVersion}))});module.exports={makeInfrastructure};
