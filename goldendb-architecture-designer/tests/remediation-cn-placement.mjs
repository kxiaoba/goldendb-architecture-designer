import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out = path.resolve('outputs/goldendb-remediation-20260906/b3c/evidence');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('file://' + path.resolve('goldendb-architecture-designer/index.html'));
  const inspect = () => page.evaluate(() => {
    const d = latestDesignData;
    const servers = getPlanServers(d);
    return { pass: d.serverSizing.cnPlacementAudit.complete && servers.every(s => !s.roles.some(isCnRole) || s.resourceAudit.withinWatermark)
      && getCnSameTenantHostViolations(servers).length === 0,
      cn: d.tenantPlans.map(t => ({ cores: t.cnCores, counts: t.cnByAz })),
      audit: d.serverSizing.cnPlacementAudit,
      hosts: getAzNames(d.mode, d.azCount).map(az => servers.filter(s => s.az === az && s.roles.some(isCnRole)).length) };
  });
  results.push({ name: 'default-complete', ...await inspect() });
  results.push(await page.evaluate(() => ({ name: 'default-independent-count', pass: latestDesignData.tenantPlans[0].cnCores === 32 && latestDesignData.tenantPlans[0].cnByAz.join() === '6,6,3' })));
  await page.locator('#topology').screenshot({ path: path.join(out, 'default-topology.png') });
  for (const mode of ['local2az', 'twoSiteThreeDc', 'threeSiteFiveDc']) {
    await page.locator('#deploymentMode').selectOption(mode);
    results.push({ name: mode, ...await inspect() });
  }
  results.push(await page.evaluate(() => {
    const base = businessTenantSpecs[0];
    businessTenantSpecs = [1,2,3,4].map((i) => ({ ...base, tenantId: createTenantIdentity(), name: `租户${i}`, qps: i * 25000 }));
    render();
    return { name: 'four-tenants', pass: latestDesignData.serverSizing.cnPlacementAudit.complete && latestDesignData.serverSizing.cnSameTenantHostViolations.length === 0 };
  }));
  results.push(await page.evaluate(() => {
    let rejected = false;
    try { getCnFittingCores({cores:1,memoryGb:1}, .35,64); } catch { rejected = true; }
    return { name: 'fitting-boundaries', pass: getCnFittingCores({cores:64,memoryGb:32},.35,64) === 8 && rejected };
  }));
  for (const cores of [16,32,64]) {
    await page.evaluate(cores => {
      resetForm();
      $('businessServerConfigMode').value = 'customer';
      $(componentInputId('cn','Enabled')).checked = true;
      $(componentInputId('cn','Cores')).value = cores;
      render();
    }, cores);
    results.push({ name: `customer-${cores}-cores`, ...await inspect() });
  }
  await page.locator('#resetBtn').click();
  results.push(await page.evaluate(() => {
    businessTenantSpecs[0].cnPerAzManual = true;
    businessTenantSpecs[0].cnPerAz = 2;
    render();
    const t = latestDesignData.tenantPlans[0];
    return { name: 'manual-performance-redline', pass: t.cnPerAz === 2 && t.cnBelowMinimum && latestDesignData.serverSizing.cnPlacementAudit.complete };
  }));
  results.push(await page.evaluate(() => {
    const d = latestDesignData;
    const mock = structuredClone(d);
    mock.serverSizing.serverPlan.forEach(s => { s.roles = s.roles.filter(r => !isCnRole(r)); });
    mock.serverSizing.cnPlacementAudit.complete = false;
    return { name: 'failed-placement-not-reserve', pass: renderCnPlacementSummary(mock).includes('未落位') && renderPptServerTopology(mock).includes('CN 未落位') };
  }));
  await page.locator('#resetBtn').click();
  for (const width of [390,875,1600]) {
    await page.setViewportSize({ width, height: 1000 });
    results.push(await page.evaluate(width => ({ name: `layout-${width}`, pass: [...document.querySelectorAll('.cn-placement-summary')].every(e => e.scrollWidth <= e.clientWidth + 2) }), width));
  }
  results.push({ name: 'browser-errors', pass: errors.length === 0, errors });
} finally {
  fs.writeFileSync(path.join(out, 'cn-placement-results.json'), JSON.stringify(results,null,2));
  await browser.close();
}
console.log(JSON.stringify({passed: results.filter(r=>r.pass).length,total:results.length}));
if(results.some(r=>!r.pass)) process.exitCode=1;
