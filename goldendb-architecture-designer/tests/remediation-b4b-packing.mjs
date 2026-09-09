import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out = path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-remediation-20260906/b4b/evidence/packing');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const results = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('file://' + path.resolve('goldendb-architecture-designer/index.html'));
  for (const mode of ['local2az', 'twoSiteThreeDc', 'threeSiteFiveDc']) {
    for (const count of [1, 2, 3, 4]) {
      for (const dedicated of [false, true]) {
        results.push(await page.evaluate(({ mode, count, dedicated }) => {
          resetForm(); $('deploymentMode').value = mode;
          const base = businessTenantSpecs[0];
          businessTenantSpecs = Array.from({ length: count }, (_, i) => ({
            ...base, tenantId: createTenantIdentity(), name: `租户${i + 1}`,
            primaryStrategy: ['centerA', 'centerB', 'balanced'][i % 3],
            deploymentStrategy: dedicated && i ? 'dedicated' : 'shared'
          }));
          render();
          const d = latestDesignData, servers = getPlanServers(d);
          const issues = getDnPlacementIssues(d);
          const isolation = getDnTenantIsolationViolations(servers, 'isolated');
          const groupSafe = servers.every(s => {
            const keys = s.roles.filter(isDnRole).map(r => {
              const p = parseDnPlacementRole(r); return `${p.tenant}:${p.group}`;
            });
            return new Set(keys).size === keys.length;
          });
          const actual = servers.reduce((sum, s) => sum + s.roles.filter(isDnRole).length, 0);
          const expected = d.tenantPlans.reduce((sum, t) => sum + t.shardCount * t.replicasPerShard, 0);
          return { mode, count, dedicated, actual, expected, issues,
            pass: !issues.length && !isolation.length && groupSafe && actual === expected
              && servers.every(s => !s.roles.some(isDnRole) || s.resourceAudit.withinWatermark) };
        }, { mode, count, dedicated }));
      }
    }
  }
  await page.locator('#topology').screenshot({ path: path.join(out, 'four-tenants.png') });
  results.push({ name: 'browser-errors', errors, pass: !errors.length });
} finally {
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: results.filter(r => r.pass).length, total: results.length }));
if (results.some(r => !r.pass)) process.exitCode = 1;
