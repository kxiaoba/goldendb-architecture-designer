import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archive = path.join(path.dirname(project), 'outputs/goldendb-remediation-20260906/b2');
const out = path.join(archive, 'evidence');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = [];
const hash = value => createHash('sha256').update(value).digest('hex');
async function setup(source, module, environment, mode, count) {
  await page.goto('file://' + path.join(source, 'index.html'));
  return page.evaluate(({ module, environment, mode, count }) => {
    $('designModule').value = module;
    $('environmentType').value = environment;
    $(module === 'reverse' ? 'reverseDeploymentMode' : 'deploymentMode').value = mode;
    $('reverseServerCount').value = 120;
    const tenants = Array.from({ length: count }, (_, i) => ({
      ...(module === 'reverse' ? defaultReverseTenants[0] : defaultBusinessTenants[0]),
      name: `租户${i + 1}`, qps: 10000 * (i + 1), dataTb: i + 1,
      deploymentStrategy: i === count - 1 ? 'dedicated' : 'shared'
    }));
    if (module === 'reverse') reverseTenantSpecs = tenants;
    else businessTenantSpecs = tenants;
    render();
    if (!latestDesignData) throw new Error('Expected valid model');
    return JSON.stringify(latestDesignData);
  }, { module, environment, mode, count });
}
try {
  for (const module of ['business', 'reverse']) {
    for (const environment of ['poc', 'production']) {
      for (const mode of ['local1az', 'local2az', 'twoSiteThreeDc', 'threeSiteFiveDc']) {
        for (const count of [2, 4]) {
          const before = await setup(path.join(archive, 'baseline/goldendb-architecture-designer'), module, environment, mode, count);
          const after = await setup(project, module, environment, mode, count);
          results.push({ id: `${module}-${environment}-${mode}-${count}`, pass: before === after, beforeHash: hash(before), afterHash: hash(after) });
        }
      }
    }
    await setup(project, module, 'production', 'local2az', 2);
    const security = await page.evaluate(module => {
      const data = structuredClone(latestDesignData);
      const payload = '<em data-b2-probe="yes">客户 & "型号"</em>';
      data.tenantPlans[0].name = payload;
      const sizing = data.reverse ? data : data.serverSizing;
      sizing.cnTenantIsolationViolations = [{ serverId: 'Server-01', tenants: [payload, '租户2'] }];
      sizing.serverPlan[0].roles = [`${payload}-CN1`];
      sizing.serverPlan[0].tenantPoolLabel = payload;
      if (!data.reverse) {
        Object.values(sizing.componentSpecs).forEach(spec => {
          for (const field of ['model', 'cpuModel', 'network', 'systemDisk']) spec[field] = payload;
        });
        renderNodePlan(data);
        renderBusinessServerPlan(data);
      } else renderReversePlan(data);
      renderRisks(data);
      renderReductionPlan(data);
      const ids = module === 'business'
        ? ['nodePlan', 'businessServerPlan', 'riskList', 'reductionPlan']
        : ['reversePlan', 'riskList', 'reductionPlan'];
      return ids.map(id => ({ id, pass: !$(id).querySelector('[data-b2-probe]') && $(id).textContent.includes(payload) }));
    }, module);
    results.push(...security.map(result => ({ ...result, id: `${module}-literal-${result.id}` })));
    const panel = page.locator(module === 'business' ? '#businessServerPlan' : '#reversePlan');
    await panel.locator('.reverse-card-grid').screenshot({ path: path.join(out, `b2a-${module}-literal.png`) });
    await panel.locator('.server-row').first().screenshot({ path: path.join(out, `b2a-${module}-server.png`) });
  }
  results.push({ id: 'browser-errors', pass: errors.length === 0, errors });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'b2a-results.json'), JSON.stringify({ scope: 'R11 summary/risk/server-list sinks only; R10 and remaining R11 not closed', results }, null, 2));
}
console.log(`${results.filter(result => result.pass).length}/${results.length} passed`);
if (results.some(result => !result.pass)) process.exitCode = 1;
