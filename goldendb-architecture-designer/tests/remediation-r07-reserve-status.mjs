import fs from 'node:fs';import path from 'node:path';import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve(process.env.REMEDIATION_TEST_OUTPUT||'outputs/r07');fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1600,height:1100}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
try {await p.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
results.push(...await p.evaluate(()=>{const checks=[],c=(name,pass)=>checks.push({name,pass:Boolean(pass)});resetForm();const business=structuredClone(latestDesignData);$('designModule').value='reverse';$('reverseDeploymentMode').value='local2az';$('reverseServerCount').value=120;$('reverseCpuCores').value=128;$('reverseMemoryGb').value=1024;render();const reverse=structuredClone(latestDesignData);
for(const [module,base] of [['business',business],['reverse',reverse]]){const occupied=getPlanServers(base).find(h=>h.roles.length),spec=structuredClone(occupied.spec),audit={used:{cpu:0,memory:0,disk:0},cpuPercent:0,memoryPercent:0,diskPercent:0,issues:[],withinWatermark:true,diskDemandUnknown:false};
for(const mode of ['unconfigured','unaudited','idle','nonzero','usedNonzero','bad','incomplete','diskUnknown','missingSpec','missingAudit','exceeded','partial','occupiedIncomplete','escaped']){
const d=structuredClone(base),h=getPlanServers(d).find(s=>s.roles.length);h.spec=structuredClone(spec);h.resourceAudit=structuredClone(audit);h.cpuLoad=8;h.diskLoad=0;const empty=['unconfigured','unaudited','idle','nonzero','usedNonzero','bad','incomplete','diskUnknown'].includes(mode);if(empty)h.roles=[];
if(['unconfigured','missingSpec'].includes(mode))h.spec=null;if(['unaudited','missingAudit'].includes(mode))h.resourceAudit=null;
if(mode==='nonzero')h.resourceAudit.cpuPercent=8;if(mode==='usedNonzero')h.resourceAudit.used.cpu=1;if(mode==='bad')h.resourceAudit.withinWatermark=false;
if(['incomplete','occupiedIncomplete'].includes(mode))delete h.resourceAudit.memoryPercent;
if(['diskUnknown','partial'].includes(mode))h.resourceAudit.diskDemandUnknown=true;
if(mode==='exceeded'){h.resourceAudit.withinWatermark=false;h.resourceAudit.cpuPercent=110;}
if(mode==='escaped')h.resourceAudit.issues=['未知 <bad>'];
const original=JSON.stringify(d),state=getServerAuditStatus(h),v=getServerResourceDisplay(h),sheets=buildExcelSheets(d),row=sheets.find(s=>s.name==='服务器清单').rows.find(r=>r[0]===h.id),risk=sheets.find(s=>s.name==='风险水位').rows.find(r=>r[0]==='服务器水位'&&String(r[2]).startsWith(h.id+' /')),prefix=module+'-'+mode;
const expected=empty?(mode==='unconfigured'?'预留待配置':mode==='idle'?'空闲预留':'预留未评估'):(mode==='partial'?'部分未评估':['exceeded','escaped'].includes(mode)?'未通过':'未评估');
c(prefix+'-state',state.status===expected);c(prefix+'-blocking',state.blocksDeployment===(!empty&&mode!=='partial'));
c(prefix+'-excel',row[15]===expected&&row[12]===v.cpu&&row[13]===v.memory&&row[14]===(typeof v.disk==='number'?v.disk:'未评估'));
c(prefix+'-risk',risk[1]===(state.blocksDeployment?'高风险':mode==='idle'?'提示':'未评估'));
c(prefix+'-render',renderServerPlanRow(h).includes(expected)&&renderBusinessPhysicalServerRow(h).includes(expected));
if(empty){c(prefix+'-no-redline',!getResourceReductionRedlines(d).some(t=>t.startsWith(h.id+' ')));c(prefix+'-metrics',mode==='idle'?[v.cpu,v.memory,v.disk].every(x=>x===0):[v.cpu,v.memory,v.disk].every(x=>x==='未评估'));}
else if(state.blocksDeployment)c(prefix+'-redline',getResourceReductionRedlines(d).some(t=>t.includes(h.id)&&t.includes(state.detail)));
if(mode==='exceeded')c(prefix+'-real-overload',v.cpu===110&&formatServerResourceSummary(h).includes('110%'));
if(mode==='partial')c(prefix+'-disk-unknown',String(v.disk).includes('未评估'));
if(mode==='escaped')c(prefix+'-escape',!renderBusinessPhysicalServerRow(h).includes('<bad>')&&renderBusinessPhysicalServerRow(h).includes('&lt;bad&gt;'));
if(module==='reverse'&&state.blocksDeployment)c(prefix+'-conclusion',getReverseConclusion(d).includes('不可作为可用部署方案'));
c(prefix+'-read-only',JSON.stringify(d)===original);
}}
latestDesignData=reverse;const empty=getPlanServers(reverse).filter(h=>!h.roles.length);c('actual-empty-count',empty.length===92);c('actual-identity',getPlanRoleIdentityAudit(reverse).complete);c('actual-reserve-no-redlines',!getResourceReductionRedlines(reverse).some(t=>empty.some(h=>t.startsWith(h.id+' '))));c('actual-summary',getReserveHostSummary(reverse).counts['预留待配置']===92);return checks;}));
fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await p.evaluate(()=>buildExcelSheets(latestDesignData))));fs.writeFileSync(path.join(out,'inventory.xlsx'),Buffer.from(await p.evaluate(async()=>Array.from(new Uint8Array(await createExcelWorkbook(buildExcelSheets(latestDesignData)).arrayBuffer())))));
await p.evaluate(()=>{window.r07CloneTexts=[];const original=inlineExportStyles;inlineExportStyles=function(source,target){if(source.textContent.includes('预留主机状态：')||source.textContent.includes('本图仅供排查'))window.r07CloneTexts.push(source.textContent);return original(source,target);};});
for(const [name,selector] of [['server','#reversePlan'],['network','#topology']]){const blob=await p.evaluate(async selector=>Array.from(new Uint8Array(await (await renderElementToPng(document.querySelector(selector))).arrayBuffer())),selector);fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(blob));}
results.push({name:'png-reserve-note',pass:await p.evaluate(()=>r07CloneTexts.length>=2&&r07CloneTexts.every(t=>t.includes('规格待配置92')))});
for(const width of [390,875,1600]){await p.setViewportSize({width,height:1100});await p.screenshot({path:path.join(out,'viewport-'+width+'.png'),fullPage:true});}

for(const module of ['business','reverse']){
 await p.evaluate(module=>{resetForm();if(module==='reverse'){$('designModule').value='reverse';render();}const h=getPlanServers(latestDesignData).find(h=>h.roles.length);h.resourceAudit=null;renderTopology(latestDesignData);window.r07CloneTexts=[];},module);
 const blob=await p.evaluate(async()=>Array.from(new Uint8Array(await(await renderElementToPng(document.querySelector('#topology'))).arrayBuffer())));fs.writeFileSync(path.join(out,module+'-blocked.png'),Buffer.from(blob));
 results.push({name:module+'-png-occupied-blocked',pass:await p.evaluate(()=>r07CloneTexts.some(t=>t.includes('本图仅供排查')))});
}
await p.evaluate(()=>{resetForm();$('designModule').value='reverse';$('reverseDeploymentMode').value='local2az';$('reverseServerCount').value=120;$('reverseCpuCores').value=128;$('reverseMemoryGb').value=1024;render();});
for(const width of [390,875,1600]){await p.setViewportSize({width,height:1100});await p.locator('#reversePlan').screenshot({path:path.join(out,'reserve-plan-'+width+'.png')});}
results.push(...await p.evaluate(()=>{renderReverseFormula(latestDesignData);const empty=getPlanServers(latestDesignData).filter(h=>!h.roles.length),sheets=buildExcelSheets(latestDesignData),sheet=sheets.find(s=>s.name==='服务器清单');return [
{name:'formula-reserve-count',pass:$('formulaOutput').textContent.includes('规格待配置92')},
{name:'topology-reserve-state',pass:renderTopologyServerTiles(empty.slice(0,1)).includes('预留待配置')&& !renderTopologyServerTiles(empty.slice(0,1)).includes('CPU 8%')},
{name:'excel-reserve-style',pass:empty.every(h=>{const i=sheet.rows.findIndex(r=>r[0]===h.id);return sheet.styles[i][15]===excelStyles.note;})},
{name:'png-normal-no-block',pass:!getPlanServers(latestDesignData).some(h=>getServerAuditStatus(h).blocksDeployment)}];}));
results.push({name:'browser-errors',pass:errors.length===0});
}finally{await b.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));}console.log(JSON.stringify({passed:results.filter(c=>c.pass).length,total:results.length,failed:results.filter(c=>!c.pass),errors}));if(errors.length||results.some(c=>!c.pass))process.exitCode=1;
