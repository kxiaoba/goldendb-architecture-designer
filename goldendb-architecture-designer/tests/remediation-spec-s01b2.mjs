import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=path.resolve('outputs/goldendb-spec-remediation-20260915/s01b2a');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('file://'+path.resolve('goldendb-architecture-designer/index.html'));
 results.push(await page.evaluate(()=>({name:'default',pass:latestDesignData.safeShardTps===2000&&latestDesignData.dnSingleCoreTps===125})));
 await page.selectOption('#dnCalibrationUnit','coreQps');
 results.push(await page.evaluate(()=>({name:'missing-conversion-blocked',pass:!latestDesignData&&$('downloadExcelBtn').disabled})));
 await page.fill('#dnCalibrationSqlPerTxn','20');
 results.push(await page.evaluate(()=>({name:'explicit-20',pass:latestDesignData.safeShardTps===800&&latestDesignData.dnSingleCoreTps===50&&getResourceReductionRedlines(latestDesignData).some(r=>r.includes('标定来源未填写'))})));
 await page.fill('#dnCalibrationSource','客户POC <测试> & SQL模型20');
 results.push(await page.evaluate(()=>({name:'source-safe-text',pass:!getResourceReductionRedlines(latestDesignData).some(r=>r.includes('标定来源未填写'))&&$('dnCalibrationDescription').textContent.includes('<测试>')})));
 await page.selectOption('#dnCalibrationWaterMode','raw');
 results.push(await page.evaluate(()=>({name:'water-once',pass:latestDesignData.safeShardTps===560&&latestDesignData.dnSingleCoreTps===35})));
 await page.selectOption('#dnCalibrationWaterMode','safe');
 results.push(await page.evaluate(()=>({name:'safe-no-double-discount',pass:latestDesignData.safeShardTps===800})));
 await page.fill('#sqlPerTxn','10');
 results.push(await page.evaluate(()=>({name:'business-T-independent',pass:latestDesignData.safeShardTps===800&&latestDesignData.tenantPlans[0].shardByTps===13})));
 await page.selectOption('#dnCalibrationUnit','instanceTps');
 results.push(await page.evaluate(()=>({name:'old-TPS-draft-retained',pass:latestDesignData.safeShardTps===2000&&$('dnCalibrationSqlPerTxn').value==='20'})));
 await page.selectOption('#dnCalibrationUnit','coreQps');
 for(const [id,value] of [['dnCalibrationSqlPerTxn','0'],['dnCoreQps','-1']]){
  await page.fill('#'+id,value);
  results.push(await page.evaluate(id=>({name:'invalid-'+id,pass:!latestDesignData&&$('downloadExcelBtn').disabled}),id));
  await page.fill('#'+id,id==='dnCoreQps'?'1000':'20');
 }
 results.push(await page.evaluate(()=>{
  const d=latestDesignData;return {name:'formula-export-link',pass:$('formulaOutput').textContent.includes(d.dnCalibration.description)&&JSON.stringify(buildExcelSheets(d)).includes('有效整实例 800 TPS')};
 }));
 fs.writeFileSync(path.join(out,'sheets.json'),JSON.stringify(await page.evaluate(()=>buildExcelSheets(latestDesignData))));
 const pending=page.waitForEvent('download');await page.click('#downloadExcelBtn');await(await pending).saveAs(path.join(out,'workloads.xlsx'));
 for(const width of [390,875,1600]){
  await page.setViewportSize({width,height:1000});await page.locator('#dnCalibrationUnit').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`calibration-${width}.png`)});
  results.push({name:'inactive-hidden-'+width,pass:!await page.locator('#dnCalibrationCpuLimit').isVisible()&&!await page.locator('#dnReferenceTps').isVisible()});
  results.push({name:'layout-'+width,pass:await page.locator('.dn-planning-fields').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)});
 }
 await page.selectOption('#designModule','reverse');
 results.push(await page.evaluate(()=>({name:'reverse-unaffected',pass:!!latestDesignData&&latestDesignData.reverse&&!latestDesignData.dnCalibration})));
 await page.evaluate(()=>resetForm());
 results.push(await page.evaluate(()=>({name:'reset',pass:latestDesignData.safeShardTps===2000&&$('dnCalibrationSource').value===''&&$('dnCalibrationSqlPerTxn').disabled})));
 results.push({name:'browser-errors',pass:!errors.length,errors});
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass)}));if(results.some(r=>!r.pass))process.exitCode=1;
