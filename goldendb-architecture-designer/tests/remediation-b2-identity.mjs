import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.REMEDIATION_TEST_OUTPUT || path.join(path.dirname(project), 'outputs/goldendb-remediation-20260906/b2c/evidence/identity');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const record = (id, value) => results.push({ id, ...value });
try {
  for (const module of ['business', 'reverse']) {
    await page.goto('file://' + path.join(project, 'index.html'));
    await page.evaluate(module => {
      $('designModule').value = module;
      $('environmentType').value = 'production';
      $(module === 'business' ? 'deploymentMode' : 'reverseDeploymentMode').value = 'local2az';
      $(module === 'business' ? 'gtmBindMode' : 'reverseGtmBindMode').value = 'dedicated';
      $(`${module}GtmReplicasPerGroup`).value = 4;
      $('reverseServerCount').value = 120;
      const tenants = Array.from({ length: 4 }, (_, i) => ({
        ...(module === 'business' ? defaultBusinessTenants[0] : defaultReverseTenants[0]),
        name: i < 2 ? '同名客户' : i === 2 ? '同名客户-CN1' : '<em data-r10="1">客户四</em>',
        deploymentStrategy: i === 0 ? 'shared' : 'dedicated',
        qps: (i + 1) * 20000, dataTb: i + 1,
        cnCores: (i + 1) * 8, cnMemoryGb: (i + 1) * 16,
        dnCores: (i + 1) * 16, dnMemoryGb: (i + 1) * 64,
        cnPerAz: 2, cnPerAzManual: false, shardCount: 2, replicaCount: 4
      }));
      if (module === 'business') businessTenantSpecs = tenants;
      else reverseTenantSpecs = tenants;
      render();
    }, module);
    record(`${module}-ownership-and-demand`, await page.evaluate(() => {
      const data = latestDesignData;
      const sizing = data.reverse ? data : data.serverSizing;
      const tenants = data.tenantPlans;
      const servers = getPlanServers(data);
      const roles = servers.flatMap(s => s.roles).filter(r => /^TID/.test(r));
      const demands = tenants.map(t => ({ id: t.tenantId, cn: getRoleResourceDemand(`${t.tenantId}-CN1`, tenants), dn: getRoleResourceDemand(`${t.tenantId}-DN-G1-Master`, tenants) }));
      window.identityBefore = { ids: tenants.map(t => t.tenantId), pools: tenants.map(getTenantResourcePoolKey), gtmLabels: tenants.map(t => t.gtmGroupText), allocation: servers.map(s => [s.id, s.tenantPool, s.roles, s.resourceAudit]) };
      return { pass: new Set(tenants.map(t => t.tenantId)).size === 4 && new Set(roles).size === roles.length
        && demands.every((d, i) => d.cn.cpu === tenants[i].cnCores && d.cn.memory === tenants[i].cnMemoryGb
          && d.dn.cpu === tenants[i].dnCores && d.dn.memory === tenants[i].dnMemoryGb && d.dn.disk === tenants[i].futureDataTb / tenants[i].shardCount)
        && sizing.tenantResourcePoolAudit.complete && sizing.cnSameTenantHostViolations.length === 0,
        demands, pools: sizing.tenantResourcePoolAudit, roleCount: roles.length };
    }));
    record(`${module}-gtm-per-group`, await page.evaluate(() => {
      const audit = (latestDesignData.reverse ? latestDesignData : latestDesignData.serverSizing).gtmGroupPlacementAudit;
      return { pass: audit.complete && audit.groups.length === 4 && audit.groups.every(g => g.expected === 4 && g.actual === 4), audit };
    }));
    record(`${module}-same-name-display`, await page.evaluate(() => ({
      pass: document.querySelectorAll('[data-r10]').length === 0 && latestDesignData.tenantPlans.slice(0, 2).every(t => ['topology', 'serverTopology', 'relationGraph', latestDesignData.reverse ? 'reversePlan' : 'nodePlan'].every(id => $(id).textContent.includes(`同名客户 [${t.tenantId}]`)))
    })));
    for (const width of [390, 875, 1600]) {
      await page.setViewportSize({ width, height: 1000 });
      record(`${module}-layout-${width}`, await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('#topology .ppt-role-pill, #topology .ppt-dn-group-token, #topology .ppt-tenant-boundary b')];
        return { pass: nodes.length > 0 && nodes.every(n => n.scrollWidth <= n.clientWidth + 2), count: nodes.length };
      }));
    }
    await page.locator('#topology .ppt-logical-server').first().screenshot({ path: path.join(out, `${module}-duplicate-server.png`) });
    save(`${module}-sheets.json`, await page.evaluate(() => buildExcelSheets(latestDesignData)));
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#downloadExcelBtn').click();
    const download = await downloadEvent;
    await download.saveAs(path.join(out, `${module}-downloadExcelBtn.xlsx`));
    record(`${module}-excel-download`, { pass: !(await download.failure()) });
    const nameField = page.locator(`.tenant-input[data-mode="${module}"][data-index="0"][data-key="name"]`);
    await nameField.fill('改名后客户');
    await nameField.press('Tab');
    record(`${module}-rename-keeps-allocation`, await page.evaluate(() => {
      const data = latestDesignData;
      const current = getPlanServers(data).map(s => [s.id, s.tenantPool, s.roles, s.resourceAudit]);
      return { pass: data.tenantPlans[0].name === '改名后客户' && JSON.stringify(current) === JSON.stringify(identityBefore.allocation)
        && JSON.stringify(data.tenantPlans.map(t => t.tenantId)) === JSON.stringify(identityBefore.ids)
        && $('topology').textContent.includes('改名后客户-CN1') };
    }));
    // Export formatting must use the supplied model even if the UI has another name.
    record(`${module}-export-model-context`, await page.evaluate(() => {
      const clone = structuredClone(latestDesignData);
      clone.tenantPlans[0].name = '离线导出名称';
      const sheets = buildExcelSheets(clone);
      const instance = sheets.find(s => s.name === '组件实例');
      const rows = instance.rows.slice(2).filter(r => String(r[7]).startsWith(clone.tenantPlans[0].tenantId + '-'));
      return { pass: rows.length > 0 && rows.every(r => r[4] === '离线导出名称' && r[6].startsWith('离线导出名称-'))
        && JSON.stringify(sheets.find(s => s.name === '组网规划')).includes('离线导出名称-CN1') };
    }));
    await page.locator(`[data-action="remove-${module}-tenant"][data-index="1"]`).click();
    await page.locator(module === 'business' ? '#addBusinessTenantBtn' : '#addReverseTenantBtn').click();
    record(`${module}-delete-middle-add`, await page.evaluate(() => {
      const ids = latestDesignData.tenantPlans.map(t => t.tenantId);
      return { pass: ids.length === 4 && ids[0] === identityBefore.ids[0] && ids[1] === identityBefore.ids[2] && ids[2] === identityBefore.ids[3]
        && !identityBefore.ids.includes(ids[3]) && !getPlanServers(latestDesignData).some(s => s.roles.some(r => r.startsWith(identityBefore.ids[1] + '-'))), ids };
    }));
    await page.locator(`[data-action="remove-${module}-tenant"][data-index="0"]`).click();
    record(`${module}-delete-first-preserves-pool`, await page.evaluate(module => {
      const t = latestDesignData.tenantPlans[0];
      const field = document.querySelector(`.tenant-input[data-mode="${module}"][data-index="0"][data-key="deploymentStrategy"]`);
      const audit = (latestDesignData.reverse ? latestDesignData : latestDesignData.serverSizing).tenantResourcePoolAudit;
      return { pass: t.tenantId === identityBefore.ids[2] && t.deploymentStrategy === 'dedicated' && getTenantResourcePoolKey(t) === identityBefore.pools[2]
        && t.gtmGroupText === identityBefore.gtmLabels[2] && field.value === 'dedicated' && !field.disabled && audit.complete, audit };
    }, module));
    record(`${module}-identity-invalid-blocks-output`, await page.evaluate(module => {
      const specs = module === 'business' ? businessTenantSpecs : reverseTenantSpecs;
      specs[1].tenantId = specs[0].tenantId;
      render();
      return { pass: !latestDesignData && $('planningInputStatus').textContent.includes('标识无效或重复') && planActionIds.every(id => $(id).disabled) };
    }, module));
    await page.locator('#resetBtn').click();
    await page.waitForFunction(() => planActionIds.every(id => $(id).dataset.busy !== 'true'));
    record(`${module}-reset-recovers`, await page.evaluate(() => ({ pass: !!latestDesignData && planActionIds.every(id => !$(id).disabled) })));
  }
  record('missing-id-reserves-existing', await page.evaluate(() => {
    const specs = [{ name: 'missing' }, { name: 'existing', tenantId: `TID${nextTenantIdentity}` }];
    ensureTenantIdentities(specs);
    let rejected = false;
    try { ensureTenantIdentities([{ tenantId: 'TID9007199254740992' }]); } catch (e) { rejected = e instanceof PlanningInputError; }
    return { pass: specs[0].tenantId !== specs[1].tenantId && rejected, specs };
  }));
  record('resource-redlines-use-correct-identity', await page.evaluate(() => {
    const tenants = [
      { tenantId: 'TID900', name: '同名', cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64, futureDataTb: 2, shardCount: 2 },
      { tenantId: 'TID901', name: '同名', cnCores: 64, cnMemoryGb: 256, dnCores: 32, dnMemoryGb: 128, futureDataTb: 8, shardCount: 2 }
    ];
    const server = { spec: { cores: 64, memoryGb: 256, diskTb: 8 }, roles: ['TID900-CN1', 'TID901-CN1', 'TID901-DN-G1-Master'] };
    const audit = getServerResourceAudit(server, { tenantPlans: tenants, reserveRatio: 0.25 });
    return { pass: audit.used.cpu === 104 && audit.used.memory === 400 && audit.used.disk === 4 && !audit.withinWatermark, audit };
  }));
  record('browser-errors', { pass: errors.length === 0, errors });
} finally {
  await browser.close();
  save('b2c-results.json', { results });
}
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
console.log(JSON.stringify(results.filter(r => !r.pass), null, 2));
if (results.some(r => !r.pass)) process.exitCode = 1;
