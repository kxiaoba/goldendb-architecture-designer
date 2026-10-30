(function(root){
'use strict';
const api=root.GoldenDBProductionContract,states=new Map();let current=null,onChange=()=>{},generation=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function state(entry){if(!states.has(entry))states.set(entry,{input:null,error:null});return states.get(entry);}
function report(context=current){
 const s=context?state(context.entry):{input:null,error:null};const r=api.evaluate(s.input,context);
 if(s.error){r.status='阻断';r.productionStatus='未通过';r.materialsComplete=false;r.errorCount++;r.issues.unshift({severity:'error',code:'file',path:'$',message:s.error});}
 return r;
}
function html(r){return '<p class="production-summary">'+esc(api.summary(r))+'</p><details><summary>材料缺口与适用性检查（'+r.issues.length+'项）</summary><ul>'+r.issues.map(x=>'<li>'+esc(x.path+'：'+x.message)+'</li>').join('')+'</ul>'+r.rows.map(x=>'<p>'+esc(x.label+'：'+x.status+(x.detail?'；'+x.detail:''))+'</p>').join('')+'</details>';}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function paint(){const panel=document.getElementById('productionReview');if(!panel)return;panel.querySelector('[data-result]').innerHTML=html(report());for(const el of panel.querySelectorAll('[data-current]'))el.disabled=!current;}
function mount(){const panel=document.getElementById('productionReview');if(!panel||panel.dataset.ready)return;panel.dataset.ready='true';panel.innerHTML='<h3>生产设计与评审材料</h3><p>下载绑定当前规划的模板，补充逐项版本能力、故障域、库存、双栈网络、组件连接及证据后导入检查。修改规划后旧材料需重新评审；本工具不会自动批准生产部署。</p><div class="production-actions"><button type="button" data-template data-current>下载当前设计评审模板</button><label>导入评审JSON<input type="file" accept=".json,application/json" data-file data-current></label><button type="button" data-clear>清除本入口材料</button><button type="button" data-report data-current>下载门禁检查记录</button></div><div data-result aria-live="polite"></div>';
 panel.querySelector('[data-template]').onclick=()=>{if(current)download('GoldenDB-生产评审模板.json',api.template(current));};
 panel.querySelector('[data-file]').onchange=async e=>{const file=e.target.files[0],context=current,ticket=++generation;if(!file||!context)return;const s=state(context.entry);s.input=null;s.error=null;try{if(file.size>api.LIMIT)throw Error('JSON文件超过4MiB');const parsed=JSON.parse(await file.text());if(ticket!==generation)return;s.input=parsed;}catch(error){if(ticket!==generation)return;s.error=error.message==='JSON文件超过4MiB'?error.message:'文件读取或JSON解析失败';}e.target.value='';onChange();};
 panel.querySelector('[data-clear]').onclick=()=>{generation++;if(current)states.delete(current.entry);onChange();};
 panel.querySelector('[data-report]').onclick=()=>{if(current){const r=report();paint();download('GoldenDB-生产门禁检查.json',{schema:'goldendb-production-check-v1',context:current,material:state(current.entry).input,report:r});}};
}
function update(context,callback){current=context;onChange=callback;generation++;mount();paint();}
root.GoldenDBProductionView={update,report,html,summary:(context)=>api.summary(report(context))};
})(globalThis);
