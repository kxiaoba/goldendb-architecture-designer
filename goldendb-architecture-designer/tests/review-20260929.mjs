import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve('outputs/goldendb-review-20260929');fs.mkdirSync(out,{recursive:true});
const hashes=()=>Object.fromEntries(['app.js','index.html','styles.css'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/'+f)).digest('hex')]));
const before=hashes(),browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),errors=[],cases=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 for(const id of ['T1','T2','B1','B2']){
  const prior=JSON.parse(fs.readFileSync(`outputs/goldendb-review-20260906/evidence/${id}.json`));
  const parameters=Object.fromEntries(prior.inputs.filter(i=>i.id).map(i=>[i.id,i.value]));
  const tenants=prior.data.tenantPlans.map(t=>({name:t.name,type:t.isDistributed?'distributed':'centralized',deploymentStrategy:t.deploymentStrategy,qps:t.qps,dataTb:t.dataTb,cnPerAz:t.cnPerAz,cnPerAzManual:t.cnManual,minShards:t.shardCount,minShardsManual:t.shardManual,replicaCount:t.replicasPerShard}));
  const result=await page.evaluate(({parameters,tenants})=>{
   resetForm();Object.entries(parameters).forEach(([k,v])=>{const e=$(k);if(e)e.type==='checkbox'?e.checked=v:e.value=v;});businessTenantSpecs=tenants;render();
   if(!latestDesignData)return {valid:false,message:$('planningInputStatus').textContent};
   const d=latestDesignData;return {valid:true,inputs:parameters,tenants,cn:d.totalCn,dn:d.dnInstances,servers:getPlanServers(d).length,redlines:getResourceReductionRedlines(d),plans:d.tenantPlans,control:d.serverSizing.controlPlaneAudit};
  },{parameters,tenants});cases.push({id,...result});
 }
 const matrix=[];
 for(const module of ['business','reverse'])for(const env of ['production','poc'])for(const mode of ['local1az','local2az','twoSiteThreeDc','threeSiteFiveDc'])for(const count of [2,4]){
  matrix.push(await page.evaluate(({module,env,mode,count})=>{
   resetForm();$('designModule').value=module;$('environmentType').value=env;$(module==='business'?'deploymentMode':'reverseDeploymentMode').value=mode;$('reverseServerCount').value=120;
   const tenants=Array.from({length:count},(_,i)=>({name:`检查租户${i+1}`,type:'distributed',deploymentStrategy:i===count-1?'dedicated':'shared',qps:10000*(i+1),dataTb:i+1,cnPerAz:2,cnPerAzManual:false,minShards:2,minShardsManual:false,shardCount:2,replicaCount:mode==='threeSiteFiveDc'?7:4,cnCores:8,cnMemoryGb:32,dnCores:16,dnMemoryGb:64}));
   if(module==='business')businessTenantSpecs=tenants;else reverseTenantSpecs=tenants;render();
   const d=latestDesignData;return {module,env,mode,count,valid:!!d,message:!d?$('planningInputStatus').textContent:'',redlines:d?getResourceReductionRedlines(d):[],servers:d?getPlanServers(d).length:0};
  },{module,env,mode,count}));
 }
 const probes=await page.evaluate(()=>{
  resetForm();const spec={cores:8,memoryGb:32,diskTb:1,maxInstances:2};
  const estimate=calculateComponentRequirement({instances:1,cpuCores:16,memoryGb:32,diskTb:0},spec,0);
  const t={id:'probe',name:'探针',cnCores:8,cnMemoryGb:32,cnByAz:[0,1],deploymentStrategy:'shared'};
  const h={id:'A-only',azIndex:0,tenantPool:'shared',componentKeys:['cn'],roles:[],cnCount:0,spec:{...spec,cores:64,memoryGb:256}};
  placeTenantCnRolesByPool([h],{tenantPlans:[t],azCount:2,maxCnPerServer:2,maxTenantCnPerServer:2,environment:'production',cnTenantPlacement:'shared',reserveRatio:0});
  const key=getTenantKey(t),invalidRole=key+'-CN999';
  return {oversizeEstimate:estimate,crossAzCn:{expectedAz:1,hostAz:h.azIndex,roles:h.roles},invalidCn:getRoleResourceDemand(invalidRole,[t]),invalidCnAllowed:canPlaceRoleWithinWatermark({...h,roles:[]},invalidRole,{tenantPlans:[t],reserveRatio:0}),helperMissingAudit:getServerAuditStatus({roles:[],spec:null})};
 });
 fs.writeFileSync(path.join(out,'scenarios-replay.json'),JSON.stringify(cases,null,2));fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify(matrix,null,2));fs.writeFileSync(path.join(out,'probes.json'),JSON.stringify(probes,null,2));
 console.log(JSON.stringify({scenarios:cases.map(c=>({id:c.id,valid:c.valid,servers:c.servers,redlines:c.redlines?.length,message:c.message})),matrix:{total:matrix.length,valid:matrix.filter(c=>c.valid).length,withRedlines:matrix.filter(c=>c.redlines.length).length},probes},null,2));
}finally{await browser.close();const after=hashes();fs.writeFileSync(path.join(out,'source-verification.json'),JSON.stringify({before,after,unchanged:JSON.stringify(before)===JSON.stringify(after),errors},null,2));}
