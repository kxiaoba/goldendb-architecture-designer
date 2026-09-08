import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out = process.env.REMEDIATION_TEST_OUTPUT || path.resolve('outputs/goldendb-remediation-20260906/b3b/evidence');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('file://' + path.resolve('goldendb-architecture-designer/index.html'));
  for (const dataGrowth of [1, 1.5]) for (const txnGrowth of [1, 1.2, 2]) for (const years of [0, 2]) {
    results.push(await page.evaluate(({ dataGrowth, txnGrowth, years }) => {
      $('growthFactor').value = dataGrowth;
      $('transactionGrowthFactor').value = txnGrowth;
      $('years').value = years;
      render();
      const t = latestDesignData.tenantPlans[0];
      const target = 5000 * txnGrowth ** years;
      const volume = 3 * dataGrowth ** years;
      return { dataGrowth, txnGrowth, years, pass: Math.abs(t.plannedTxnTps - target) < 1e-8
        && Math.abs(t.futureDataTb - volume) < 1e-8
        && t.cnRaw === Math.ceil(target / 1120)
        && t.shardByTps === Math.ceil(target / 2000)
        && t.shardByCapacity === Math.ceil(volume / 2)
        && t.cnPerAz === calculateSuggestedCnPerAz(businessTenantSpecs[0])
        && t.shardCount === calculateSuggestedMinShards(businessTenantSpecs[0]) };
    }, { dataGrowth, txnGrowth, years }));
  }
  for (const value of ['', '0', '-1']) {
    await page.locator('#transactionGrowthFactor').fill(value);
    results.push(await page.evaluate(() => ({ name: 'invalid-growth', pass: !latestDesignData && $('downloadExcelBtn').disabled })));
  }
  await page.locator('#transactionGrowthFactor').fill('1');
  results.push(await page.evaluate(() => ({ name: 'recovery', pass: !!latestDesignData })));
  results.push(await page.evaluate(() => {
    businessTenantSpecs[0].cnPerAzManual = true;
    businessTenantSpecs[0].cnPerAz = 2;
    businessTenantSpecs[0].minShardsManual = true;
    businessTenantSpecs[0].minShards = 1;
    $('transactionGrowthFactor').value = '3';
    $('years').value = '2';
    render();
    const t = latestDesignData.tenantPlans[0];
    return { name: 'manual-preserved-redline', pass: t.cnPerAz === 2 && t.shardCount === 1 && t.cnBelowMinimum && t.shardBelowMinimum };
  }));
  await page.locator('#resetBtn').click();
  results.push(await page.evaluate(() => ({ name: 'reset-growth', pass: $('transactionGrowthFactor').value === '1' && $('growthFactor').value === '1' && !!latestDesignData })));
  results.push({ name: 'no-errors', pass: errors.length === 0, errors });
} finally {
  fs.writeFileSync(path.join(out, 'growth-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: results.filter(x => x.pass).length, total: results.length }));
if (results.some(x => !x.pass)) process.exitCode = 1;
