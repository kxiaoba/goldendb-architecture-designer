import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/goldendb-v1-acceptance-20261014');
fs.mkdirSync(out,{recursive:true});
const suites=['v1-centers','role-identity','global-identity','identity-capacity','pressure-identity',
 'reverse-identity-state','identity-output','gtm-output','management-identity',
 'cn-failure','dn-failure','dn-takeover','dn-host-pressure','dn-group-tps',
 'control-fit','instance-fit','reverse-quota','workloads','primary-balance','poc-density'];
const hash=()=>createHash('sha256').update(fs.readFileSync('goldendb-architecture-designer/app.js')).digest('hex');
const report={started:new Date().toISOString(),sourceHash:hash(),suites:[],complete:false};
const save=()=>fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));
save();
for(const name of suites){
 const dir=path.join(out,name);
 fs.mkdirSync(dir,{recursive:true});
 // A stale result must never count as a successful run.
 const resultPath=path.join(dir,'results.json');
 if(fs.existsSync(resultPath))fs.unlinkSync(resultPath);
 const run=spawnSync(process.execPath,[`goldendb-architecture-designer/tests/remediation-${name}.mjs`],{
  env:{...process.env,REMEDIATION_TEST_OUTPUT:dir},encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024
 });
 fs.writeFileSync(path.join(dir,'run.log'),(run.stdout||'')+(run.stderr||'')+(run.error?.message||''));
 let checks=[],error=run.error?.message||null;
 try{const data=JSON.parse(fs.readFileSync(resultPath,'utf8'));checks=Array.isArray(data)?data:data.results;
  if(!Array.isArray(checks)||!checks.length)throw new Error('Missing test assertions');
  if(data.errors?.length)error=JSON.stringify(data.errors);
 }catch(e){error=e.message;checks=[];}
 const passed=checks.filter(c=>c.pass===true).length;
 const item={name,exitCode:run.status,total:checks.length,passed,error,
  ok:run.status===0&&!error&&checks.length>0&&passed===checks.length};
 report.suites.push(item);save();console.log(JSON.stringify(item));
}
report.finalHash=hash();report.unchanged=report.finalHash===report.sourceHash;
report.total=report.suites.reduce((n,s)=>n+s.total,0);
report.passed=report.suites.reduce((n,s)=>n+s.passed,0);
report.complete=report.unchanged&&report.suites.every(s=>s.ok);
report.finished=new Date().toISOString();save();
if(!report.complete)process.exitCode=1;
