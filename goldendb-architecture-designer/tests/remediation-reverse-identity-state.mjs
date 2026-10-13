import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out = path.resolve(process.env.REMEDIATION_TEST_OUTPUT || 'outputs/goldendb-v1b6-20261013/reverse-identity-state');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage(), results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('file://' + path.resolve('goldendb-architecture-designer/index.html'));
  results.push(...await page.evaluate(() => {
    const results = [], check = (name, pass) => results.push({ name, pass });
    resetForm();
    $('designModule').value = 'reverse';
    $('designModule').dispatchEvent(new Event('change', { bubbles: true }));
    $('reverseServerCount').value = '100';
    const healthy = calculateReverse();
    check('healthy-baseline', healthy.resourceState !== '不足' && getPlanRoleIdentityAudit(healthy).complete);
    const original = buildServerPlan;
    for (const defect of ['cn-duplicate', 'cn-az', 'gtm-duplicate', 'pool', 'component']) {
      let changed = false, beforeCounts, afterCounts;
      try {
        buildServerPlan = config => {
          const hosts = original(config);
          const counts = () => JSON.stringify(hosts.map(h => h.roles.length));
          beforeCounts = counts();
          const predicate = defect.startsWith('gtm') ? isGtmRole : isCnRole;
          const entries = hosts.flatMap(h => h.roles.filter(predicate).map(role => ({ h, role })));
          const a = entries[0], b = entries[1];
          if (a && b) {
            if (defect.endsWith('duplicate')) b.h.roles[b.h.roles.indexOf(b.role)] = a.role;
            if (defect === 'cn-az') a.h.azIndex = (a.h.azIndex + 1) % config.azCount;
            if (defect === 'pool') a.h.tenantPool = 'invalid';
            if (defect === 'component') a.h.componentKeys = [];
            changed = true;
          }
          afterCounts = counts();
          return hosts;
        };
        const data = calculateReverse();
        check(defect + '-injected-with-equal-counts', changed && beforeCounts === afterCounts);
        check(defect + '-identity-rejected', !getPlanRoleIdentityAudit(data).complete);
        check(defect + '-resource-state', data.resourceState === '不足');
        check(defect + '-redline', getPlanRoleIdentityIssues(data).length > 0);
        if (defect === 'cn-duplicate' || defect === 'gtm-duplicate') {
          const audit = getPlanRoleIdentityAudit;
          let countOnly;
          try { getPlanRoleIdentityAudit = () => ({ complete: true }); countOnly = calculateReverse(); }
          finally { getPlanRoleIdentityAudit = audit; }
          check(defect + '-count-only-would-pass', countOnly.resourceState !== '不足');
        }
      } finally { buildServerPlan = original; }
    }
    const baseline = calculateReverse();
    const audit = getPlanRoleIdentityAudit;
    let without;
    try { getPlanRoleIdentityAudit = () => ({ complete: true }); without = calculateReverse(); }
    finally { getPlanRoleIdentityAudit = audit; }
    check('unchanged-placement', JSON.stringify(baseline.serverPlan) === JSON.stringify(without.serverPlan));
    check('unchanged-requirements', baseline.requiredServerCount === without.requiredServerCount);
    render();
    return results;
  }));
  results.push({ name: 'browser-errors', pass: errors.length === 0 });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
}
console.log(results.filter(r => !r.pass));
console.log(`${results.filter(r => r.pass).length}/${results.length}`);
if (results.some(r => !r.pass)) process.exitCode = 1;
