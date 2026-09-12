import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-remediation-20260906/b4b-quota/evidence/quota');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(await page.evaluate(()=>{
  const hosts=Array.from({length:4},(_,i)=>({id:`H${i}`,azIndex:i%2,componentKeys:[],roles:[]}));
  const site=n=>({cnServers:0,dnServers:n,gtmServers:0,managementServers:0});
  assignReverseHostGroups(hosts,'dedicated',{poolSizings:[{key:'shared',label:'共享',siteSizing:[site(3),site(1)]}]},'local2az',2);
  const counts=[0,1].map(az=>hosts.filter(h=>h.azIndex===az&&h.componentKeys.length).length);
  return {name:'no-cross-center-fallback',counts,pass:counts[0]===2&&counts[1]===1&&hosts.length===4};
 }));
 for(const mode of ['local2az','twoSiteThreeDc','threeSiteFiveDc'])for(const policy of ['centerA','centerB','balanced'])
 for(const count of [1,3,4])for(const enough of [false,true]){
  results.push(await page.evaluate(({mode,policy,count,enough})=>{
   resetForm();$('designModule').value='reverse';$('designModule').dispatchEvent(new Event('change',{bubbles:true}));
   $('reverseDeploymentMode').value=mode;$('reverseServerCount').value=enough?200:6;
   const base=reverseTenantSpecs[0];reverseTenantSpecs=Array.from({length:count},(_,i)=>({...base,tenantId:createTenantIdentity(),
    name:`租户${i+1}`,primaryStrategy:policy,deploymentStrategy:i===2?'dedicated':'shared'}));
   render();const d=latestDesignData,s=d.serverPlan,q=d.centerQuotaAudit;
   const centerTargets=d.componentSizing.poolSizings.every(pool=>pool.siteComponentDemands.every(site=>{
    const expected=pool.tenantPlans.reduce((sum,t)=>{
     let n=0;for(let g=1;g<=t.shardCount;g++)for(let r=1;r<=t.replicasPerShard;r++)if(getDnReplicaAz(t,g,r,d)===site.azIndex)n++;
     return sum+n;
    },0);return expected===site.dn.instances;
   }));
   const allocation=q.every(site=>site.assigned<=site.available&&site.assigned<=site.required);
   const targetsFit=q.every(site=>Math.max(0,Math.floor((d.requiredServerCount+d.azCount-1-site.azIndex)/d.azCount))>=site.required);
   const issues=getDnPlacementIssues(d);
   const pass=s.length===(enough?200:6)&&centerTargets&&allocation&&targetsFit
    &&(enough?q.every(site=>!site.missing)&&!issues.length:d.resourceState==='不足'&&getResourceReductionRedlines(d).length>0);
   return {mode,policy,count,enough,required:d.requiredServerCount,quota:q,issues,pass};
  },{mode,policy,count,enough}));
 }
 for(const environment of ['production','poc'])for(const mixed of [false,true])for(const enough of [false,true]){
  results.push(await page.evaluate(({environment,mixed,enough})=>{
   resetForm();$('designModule').value='reverse';$('designModule').dispatchEvent(new Event('change',{bubbles:true}));
   $('environmentType').value=environment;$('reverseDeploymentMode').value='twoSiteThreeDc';
   $('reverseAllowCnDnMixed').checked=mixed;$('reverseServerCount').value=enough?100:3;
   render();const d=latestDesignData;
   const issues=getDnPlacementIssues(d);
   return {name:`${environment}-mixed-${mixed}-enough-${enough}`,issues,
    pass:d.environment===environment&&d.serverPlan.length===(enough?100:3)
      &&d.centerQuotaAudit.every(q=>q.assigned<=q.available&&q.assigned<=q.required)
      &&(enough?d.centerQuotaAudit.every(q=>!q.missing):d.resourceState==='不足')
      &&(!issues.length||d.resourceState==='不足')};
  },{environment,mixed,enough}));
 }
 results.push({name:'browser-errors',errors,pass:!errors.length});
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length}));
if(results.some(r=>!r.pass))process.exitCode=1;
