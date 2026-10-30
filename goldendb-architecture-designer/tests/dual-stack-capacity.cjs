const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{execFileSync}=require('node:child_process');
const address=require('../network-address.js'),capacity=require('../inventory-capacity.js'),infra=require('../infrastructure-contract.js'),{makeInfrastructure}=require('./infrastructure-fixture.cjs');
const out=process.env.REMEDIATION_TEST_OUTPUT||'outputs/dual-stack-capacity';fs.mkdirSync(out,{recursive:true});const results=[];
const check=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack});}};
const values=['::','::1','2001:db8::1','2001:DB8:0000:0:0:0:0:1','1:2:3:4:5:6:7:8','::ffff:192.0.2.1','1:2:3:4:5:6:192.0.2.1','1:2:3:4:5::192.0.2.1','fe80::ffff','ff02::1','::192.0.2.1','1:2:3:4:5:6:7::8','1:2:3:4:5:6:7','1:2:3:4:5:6:7:8:9','2001:db8:::1','1::2::3',':1:2:3:4:5:6:7','1:2:3:4:5:6:7:','::ffff:192.168.00.1','::ffff:256.1.1.1',':::','[::1]',' ::1','::g','00000::1','::ffff:1.2.3','1::2:3:4:5:6:7','1::2:3:4:5:6:7:8'];
for(const s of values)check('node-address-oracle-'+s,()=>assert.equal(address.parse(s)?.family||0,net.isIP(s)));
for(const s of ['fe80::1%eth0','fe80::1%2','2001:db8::/64'])check('explicit-unsupported-syntax-'+s,()=>assert.equal(address.parse(s),null));
const oracle=JSON.parse(execFileSync('python3',['-c',`import ipaddress,random,json
r=random.Random(421013)
rows=[]
for i in range(512):
 a=ipaddress.IPv6Address(r.getrandbits(128));b=i%129;n=ipaddress.ip_network(str(a)+'/'+str(b),strict=False)
 rows.append(dict(address=str(a) if i%2 else a.exploded.upper(),value=str(int(a)),bits=b,start=str(int(n.network_address)),end=str(int(n.broadcast_address)),canonical=int(a)==int(n.network_address)))
print(json.dumps(rows))`],{encoding:'utf8'}));
for(const [i,o]of oracle.entries())check('python-ipaddress-prefix-'+i,()=>{assert.equal(address.parse(o.address).value.toString(),o.value);const p=address.prefix(o.address+'/'+o.bits);assert.equal(p.start.toString(),o.start);assert.equal(p.end.toString(),o.end);assert.equal(p.canonical,o.canonical);});
for(const s of ['2001:db8::/129','2001:db8::/-1','2001:db8::/01','2001:db8::/64/1','2001:db8::/64 ','2001:db8::/NaN'])check('bad-prefix-'+s,()=>assert.equal(address.prefix(s),null));
const context={hostIds:['A','B'],demands:['A','B'].map(id=>({id,cpuPhysicalCores:1,memoryValue:1,diskValue:0.1,diskKnown:true}))},fixture=()=>makeInfrastructure(context);
const v6=()=>{const x=fixture();x.networks[0].cidr='2001:db8::/64';x.interfaces.forEach((v,i)=>v.address='2001:db8::'+(i+1));return x;};
const evaluate=x=>infra.evaluate(x,context,'fixture-version');
const mutations=[
 ['normalized-duplicate',x=>x.interfaces[1].address='2001:0DB8:0000:0000:0000:0000:0000:0001','duplicate-ip','阻断'],
 ['prefix-outside',x=>x.interfaces[1].address='2001:db8:1::2','outside-subnet','阻断'],
 ['family-mismatch',x=>x.interfaces[1].address='10.0.0.1','address-family','阻断'],
 ['v6-overlap',x=>x.networks.push({...x.networks[0],id:'N2',cidr:'2001:db8::/80'}),'overlapping-segments','阻断'],
 ['v6-mtu',x=>x.networks[0].mtu=1279,'mtu','阻断'],
 ['v6-anycast',x=>x.interfaces[0].address='2001:db8::','subnet-router-anycast','未评估'],
 ['v6-127',x=>{x.networks[0].cidr='2001:db8::/127';x.networks[0].pointToPoint=true;x.interfaces[0].address='2001:db8::';x.interfaces[1].address='2001:db8::1';},'ipv6-inter-router','未评估'],
 ['cross-family',x=>{x.networks.push({...x.networks[0],id:'N4',cidr:'10.0.0.0/24'});x.flows[0].targetNetworkId='N4';},'cross-family-flow','未评估'],
 ['special-linklocal',x=>{x.networks[0].cidr='fe80::/64';x.interfaces.forEach((v,i)=>v.address='fe80::'+(i+1));},'address-special','未评估'],
 ['mapped',x=>{x.networks[0].cidr='::ffff:192.0.2.0/120';x.interfaces.forEach((v,i)=>v.address='::ffff:192.0.2.'+(i+1));},'address-special','未评估'],
 ['loopback',x=>x.interfaces[0].address='::1','non-unicast','阻断'],
 ['multicast',x=>x.interfaces[0].address='ff02::1','non-unicast','阻断']
];
for(const [name,mutate,code,status] of mutations)check(name,()=>{const x=v6();mutate(x);const r=evaluate(x);assert.equal(r.status,status);assert(r.issues.some(i=>i.code===code));assert.equal(r.canDeploy,false);JSON.stringify(r);});
check('v6-no-broadcast',()=>{const x=v6();x.interfaces[0].address='2001:db8::ffff:ffff:ffff:ffff';assert.equal(evaluate(x).status,'结构一致待实测');});
check('dual-stack-no-overlap',()=>{const x=v6();x.networks.push({...x.networks[0],id:'N4',cidr:'10.0.0.0/16'});x.interfaces.push({...x.interfaces[0],id:'I4',networkId:'N4',address:'10.0.0.1'});assert.equal(evaluate(x).status,'结构一致待实测');});
check('v6-128-not-anycast',()=>{const c={hostIds:['A'],demands:context.demands.slice(0,1)},x=makeInfrastructure(c);x.networks[0].cidr='2001:db8::1/128';x.interfaces[0].address='2001:db8::1';assert.equal(infra.evaluate(x,c,'fixture-version').status,'结构一致待实测');});
const capFixture=()=>({hosts:[{id:'A',cpuPhysicalCores:10,memoryGiB:10,dataUsableGiB:1024,budget:{cpuReserveRatio:0.2,memoryReserveRatio:0.2,diskBasis:'net-before-watermark',diskWatermark:0.8}}],context:{demands:[{id:'A',cpuPhysicalCores:8,memoryValue:8,diskValue:0.8,diskKnown:true}]},units:{cpu:'physicalCores',memory:'GiB',disk:'TiB',source:'synthetic://unit-contract'}});
const cap=x=>capacity.evaluate(x.hosts,x.context,x.units);
check('exact-capacity-boundary',()=>{assert.equal(cap(capFixture()).rows[0].status,'必要容量通过');});
const capCases=[
 ['cpu-exceeded',x=>x.context.demands[0].cpuPhysicalCores=8.01,'capacity-exceeded','阻断'],
 ['memory-exceeded',x=>x.context.demands[0].memoryValue=8.01,'capacity-exceeded','阻断'],
 ['disk-exceeded',x=>x.context.demands[0].diskValue=0.801,'capacity-exceeded','阻断'],
 ['cpu-still-fails-unknown-disk',x=>{x.context.demands[0].cpuPhysicalCores=9;x.context.demands[0].diskKnown=false;},'capacity-exceeded','阻断'],
 ['cpu-still-fails-unknown-memory-budget',x=>{x.context.demands[0].cpuPhysicalCores=9;x.hosts[0].budget.memoryReserveRatio=null;},'capacity-exceeded','阻断'],
 ['incomplete-demand-no-green',x=>x.context.demands[0].complete=false,'capacity-demand-incomplete','未评估'],
 ['incomplete-known-cpu-blocked',x=>{x.context.demands[0].complete=false;x.context.demands[0].cpuPhysicalCores=9;},'capacity-exceeded','阻断'],
 ['fixed-counts-not-zero',x=>x.context.demands=[],'capacity-demand-unknown','未评估'],
 ['unknown-disk-not-zero',x=>x.context.demands[0].diskKnown=false,'capacity-demand-unknown','未评估'],
 ['double-watermark',x=>x.hosts[0].budget.diskBasis='allocatable-after-watermark','capacity-double-watermark','阻断'],
 ['missing-budget',x=>delete x.hosts[0].budget,'capacity-budget','未评估'],
 ['no-reserve-default',x=>x.hosts[0].budget.cpuReserveRatio=null,'capacity-reserve','未评估'],
 ['bad-reserve',x=>x.hosts[0].budget.cpuReserveRatio=1,'capacity-reserve','阻断'],
 ['bad-negative-reserve',x=>x.hosts[0].budget.memoryReserveRatio=-0.1,'capacity-reserve','阻断'],
 ['bad-zero-watermark',x=>x.hosts[0].budget.diskWatermark=0,'capacity-watermark','阻断'],
 ['no-raw-disk-guess',x=>x.hosts[0].budget.diskBasis='raw','capacity-disk-basis','阻断'],
 ['no-logical-thread-guess',x=>x.units.cpu='threads','capacity-cpu-unit',null],
 ['missing-units',x=>x.units=null,'capacity-units',null],
 ['missing-unit-source',x=>x.units.source=null,'capacity-unit-source',null],
 ['duplicate-demand',x=>x.context.demands.push({...x.context.demands[0]}),'capacity-context',null],
 ['safe-number-range',x=>x.hosts[0].memoryGiB=1e15,'capacity-range','未评估']
];
for(const [name,mutate,code,status]of capCases)check(name,()=>{const x=capFixture();mutate(x);const r=cap(x);assert(r.issues.some(i=>i.code===code));if(status)assert.equal(r.rows[0].status,status);});
check('gb-vs-gib',()=>{const x=capFixture();x.context.demands[0].memoryValue=8.5;x.units.memory='GB';assert.equal(cap(x).rows[0].status,'必要容量通过');x.units.memory='GiB';assert.equal(cap(x).rows[0].status,'阻断');});
check('tb-vs-tib',()=>{const x=capFixture();x.context.demands[0].diskValue=0.85;x.units.disk='TB';assert.equal(cap(x).rows[0].status,'必要容量通过');x.units.disk='TiB';assert.equal(cap(x).rows[0].status,'阻断');});
check('already-allocatable-no-double-discount',()=>{const x=capFixture();x.hosts[0].dataUsableGiB=819.2;x.hosts[0].budget.diskBasis='allocatable-after-watermark';x.hosts[0].budget.diskWatermark=1;assert.equal(cap(x).rows[0].status,'必要容量通过');});
check('explicit-zero-disk-demand',()=>{const x=capFixture();x.context.demands[0].diskValue=0;x.hosts[0].dataUsableGiB=0;assert.equal(cap(x).rows[0].status,'必要容量通过');x.context.demands[0].diskValue=1e-10;assert.equal(cap(x).rows[0].status,'阻断');});
check('input-unmodified',()=>{const x=capFixture(),before=JSON.stringify(x);cap(x);assert.equal(JSON.stringify(x),before);});
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,oracle:'Python ipaddress + Node net.isIP'},null,2));console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass)}));if(results.some(r=>!r.pass))process.exitCode=1;
