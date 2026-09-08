import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root = process.cwd();
const out = process.env.REMEDIATION_TEST_OUTPUT || path.join(root, 'outputs/goldendb-remediation-20260906/b3a/evidence');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const results = [];
try {
  await page.goto('file://' + path.join(root, 'goldendb-architecture-designer/index.html'));
  for (const k of [25, 50, 100]) for (const limit of [0.5, 0.7]) for (const count of [1, 2, 4, 8]) {
    const result = await page.evaluate(({ k, limit, count }) => {
      $('singleCoreTps').value = k;
      $('cpuLimit').value = limit;
      businessTenantSpecs[0].cnPerAzManual = true;
      businessTenantSpecs[0].cnPerAz = count;
      render();
      const t = latestDesignData.tenantPlans[0];
      const capacity = t.cnCores * k * limit * count;
      const demand = 100000 / 20;
      return { pass: t.cnSafeTpsPerAz === capacity && t.cnTargetTps === demand
        && t.cnBelowMinimum === (count < 2 || capacity < demand)
        && t.cnCpuDemand === t.totalCn * t.cnCores,
        k, limit, count, cores: t.cnCores, capacity, demand };
    }, { k, limit, count });
    results.push(result);
  }
  results.push(await page.evaluate(() => {
    businessTenantSpecs[0].cnPerAzManual = false;
    render();
    const t = latestDesignData.tenantPlans[0];
    return { name: 'automatic-capacity', pass: !t.cnBelowMinimum && t.cnSafeTpsPerAz >= t.cnTargetTps };
  }));
  results.push(await page.evaluate(() => {
    $('growthFactor').value = '1.2';
    $('transactionGrowthFactor').value = '1.2';
    $('years').value = '2';
    const template = { ...businessTenantSpecs[0] };
    businessTenantSpecs = [10000, 50000, 100000, 240000].map((qps, i) => ({ ...template, tenantId: createTenantIdentity(), name: `租户${i + 1}`, qps, cnPerAzManual: false }));
    render();
    if (!latestDesignData) return { name: 'four-tenants-growth-capacity', pass: false, error: $('planningInputStatus').textContent };
    const tenants = latestDesignData.tenantPlans;
    return { name: 'four-tenants-growth-capacity', pass: tenants.length === 4 && tenants.every(t =>
      Math.abs(t.cnTargetTps - t.qps / 20 * 1.44) < 1e-8 && t.cnSafeTpsPerAz >= t.cnTargetTps && !t.cnBelowMinimum) };
  }));
  await page.locator('#designModule').selectOption('reverse');
  const actual = await page.evaluate(() => JSON.stringify(latestDesignData));
  await page.goto('file://' + path.join(root, 'outputs/goldendb-remediation-20260906/b3a/baseline/goldendb-architecture-designer/index.html'));
  await page.locator('#designModule').selectOption('reverse');
  const before = await page.evaluate(() => JSON.stringify(latestDesignData));
  results.push({ name: 'reverse-model-unchanged', pass: actual === before });
  results.push({ name: 'browser-errors', pass: errors.length === 0, errors });
} finally {
  fs.writeFileSync(path.join(out, 'cn-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: results.filter(x => x.pass).length, total: results.length }));
if (results.some(x => !x.pass)) process.exitCode = 1;
