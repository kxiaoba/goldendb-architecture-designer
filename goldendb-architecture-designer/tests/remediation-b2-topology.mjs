import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(path.dirname(project), 'outputs/goldendb-remediation-20260906/b2b/evidence');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = [];
const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
const payload = '<em data-b2-probe="yes">客户 & "型号"</em>';
try {
  for (const module of ['business', 'reverse']) {
    await page.goto('file://' + path.join(project, 'index.html'));
    await page.evaluate(({ module, payload }) => {
      $('designModule').value = module;
      $('environmentType').value = 'poc';
      $(module === 'reverse' ? 'reverseDeploymentMode' : 'deploymentMode').value = 'local2az';
      $('reverseServerCount').value = 12;
      $(module === 'reverse' ? 'reverseGtmBindMode' : 'gtmBindMode').value = 'dedicated';
      const tenants = [payload, '业务-Master-中心', "=1+1 ' & < >"].map(name => ({
        ...(module === 'reverse' ? defaultReverseTenants[0] : defaultBusinessTenants[0]),
        name, deploymentStrategy: 'shared', qps: 1000, dataTb: 0.1,
        minShards: 1, minShardsManual: true, shardCount: 1,
        replicaCount: 2, cnPerAz: 1, cnPerAzManual: true
      }));
      if (module === 'reverse') reverseTenantSpecs = tenants;
      else businessTenantSpecs = tenants;
      renderTenantEditors();
      render();
      if (!latestDesignData) throw new Error('No valid model');
      if (module === 'business') {
        $('businessServerConfigMode').value = 'customer';
        $('customerCnEnabled').checked = true;
        for (const suffix of ['Model', 'CpuModel', 'Network', 'SystemDisk']) $('customerCn' + suffix).value = payload;
        render();
        if (!latestDesignData) throw new Error('No valid customer model');
      }
    }, { module, payload });
    results.push(await page.evaluate(({ module, payload }) => ({
      id: `${module}-whole-page-literal`,
      pass: document.querySelectorAll('[data-b2-probe]').length === 0
        && ['topology', 'serverTopology', 'relationGraph', 'haGuide'].every(id => $(id).textContent.includes(payload)),
      markerCount: document.querySelectorAll('[data-b2-probe]').length
    }), { module, payload }));
    results.push(await page.evaluate(({ module, payload }) => {
      const title = [...document.querySelectorAll('.ppt-role-pill')].find(node => node.title === `${payload}-CN1`);
      const holder = document.createElement('div');
      holder.innerHTML = renderPptRolePill('业务-Master-中心-DN-G1-Master');
      return { id: `${module}-title-and-role-suffix`, pass: !!title
        && title.textContent === `${payload}-CN1`
        && holder.textContent === '业务-Master-中心-DN-G1-M'
        && formatExcelRole('业务-Master-中心-DN-G1-Master') === holder.textContent
        && summarizeServerRoles(['业务-Master-中心-DN-G1-Slave1']) === 'DN-S×1'
        && summarizeServerRoles(['业务-Slave-中心-DN-G1-Master']) === 'DN-M×1' };
    }, { module, payload }));
    // Exercise legacy renderers as detached DOM, without changing the active page.
    results.push(await page.evaluate(({ module, payload }) => {
      const data = latestDesignData;
      const holder = document.createElement('div');
      holder.innerHTML = data.reverse ? renderReverseTopology(data) : renderBusinessTopology(data);
      return { id: `${module}-legacy-topology`, pass: !holder.querySelector('[data-b2-probe]') && holder.textContent.includes(payload) };
    }, { module, payload }));
    save(`${module}-sheets.json`, await page.evaluate(() => buildExcelSheets(latestDesignData)));
    for (const id of ['downloadExcelBtn', 'downloadTopologyBtn', 'downloadServerTopologyBtn']) {
      const event = page.waitForEvent('download', { timeout: 120000 });
      await page.locator(`#${id}`).click();
      const download = await event;
      const file = `${module}-${id}.${id === 'downloadExcelBtn' ? 'xlsx' : 'png'}`;
      await download.saveAs(path.join(out, file));
      results.push({ id: `${module}-${id}`, pass: !(await download.failure()) && fs.statSync(path.join(out, file)).size > 1000, file });
    }
    for (const width of [390, 875, 1600]) {
      await page.setViewportSize({ width, height: 1000 });
      results.push(await page.evaluate(({ module, width }) => {
        const tokens = [...document.querySelectorAll('.ppt-role-pill, .ppt-dn-group-token')];
        return { id: `${module}-tokens-${width}`, pass: tokens.length > 0 && tokens.every(node => node.scrollWidth <= node.clientWidth + 2), tokens: tokens.length };
      }, { module, width }));
    }
    await page.locator('#topology .ppt-logical-server').first().screenshot({ path: path.join(out, `${module}-literal-server.png`) });
    const nameField = page.locator(`.tenant-input[data-mode="${module}"][data-index="0"][data-key="name"]`);
    const longName = 'LONG客户'.repeat(32);
    await nameField.fill(longName);
    await nameField.press('Tab');
    for (const width of [390, 875, 1600]) {
      await page.setViewportSize({ width, height: 1000 });
      results.push(await page.evaluate(({ module, width, longName }) => {
        const nodes = [...document.querySelectorAll('#topology .ppt-tenant-boundary b, #topology .ppt-role-pill, #topology .ppt-dn-group-token, #relationGraph .tenant-title strong')];
        return { id: `${module}-long-name-${width}`, pass: !!latestDesignData
          && latestDesignData.tenantPlans[0].name === longName
          && nodes.length > 0 && nodes.every(node => node.scrollWidth <= node.clientWidth + 2) };
      }, { module, width, longName }));
    }
  }
  results.push({ id: 'browser-errors', pass: errors.length === 0, errors });
} finally {
  await browser.close();
  save('b2b-results.json', { results });
}
console.log(`${results.filter(result => result.pass).length}/${results.length} passed`);
console.log(JSON.stringify(results.filter(result => !result.pass), null, 2));
if (results.some(result => !result.pass)) process.exitCode = 1;
