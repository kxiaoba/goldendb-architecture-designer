import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.PROJECT_UNDER_TEST || project;
const out = process.env.REMEDIATION_TEST_OUTPUT || path.join(path.dirname(project), 'outputs/goldendb-remediation-20260906/b2d/evidence/xml');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
const record = (id, value) => results.push({ id, ...value });
const payload = '客户_x0041_&_x005F_x0042_<字面>';
try {
  for (const module of ['business', 'reverse']) {
    await page.goto('file://' + path.join(source, 'index.html'));
    await page.locator('#designModule').selectOption(module);
    for (const code of [0, 1, 8, 11, 12, 14, 31, 0xD800, 0xDC00, 0xFFFE, 0xFFFF]) {
      record(`${module}-reject-U${code.toString(16)}`, await page.evaluate(({ module, code }) => {
        const specs = module === 'business' ? businessTenantSpecs : reverseTenantSpecs;
        const original = specs[0].name;
        const bad = '客户' + String.fromCodePoint(code) + '系统';
        specs[0].name = bad;
        render();
        const result = { pass: !latestDesignData && specs[0].name === bad
          && planActionIds.every(id => $(id).disabled) && $('planningInputStatus').textContent.includes('U+' + code.toString(16).toUpperCase().padStart(4, '0')) };
        specs[0].name = original;
        render();
        result.pass &&= !!latestDesignData;
        return result;
      }, { module, code }));
    }
    record(`${module}-module-isolation`, await page.evaluate(module => {
      const inactive = module === 'business' ? reverseTenantSpecs : businessTenantSpecs;
      const name = inactive[0].name;
      inactive[0].name = 'invalid\u000B';
      render();
      const pass = !!latestDesignData;
      inactive[0].name = name;
      return { pass };
    }, module));
    await page.locator(`.tenant-input[data-mode="${module}"][data-index="0"][data-key="name"]`).fill(payload);
    await page.locator(`.tenant-input[data-mode="${module}"][data-index="0"][data-key="name"]`).press('Tab');
    record(`${module}-literal-ui`, await page.evaluate(payload => ({ pass: !!latestDesignData && latestDesignData.tenantPlans[0].name === payload && $('topology').textContent.includes(payload) }), payload));
    save(`${module}-sheets.json`, await page.evaluate(() => buildExcelSheets(latestDesignData)));
    for (const id of ['downloadExcelBtn', 'downloadTopologyBtn']) {
      const event = page.waitForEvent('download', { timeout: 120000 });
      await page.locator('#' + id).click();
      const download = await event;
      const file = `${module}-${id}.${id === 'downloadExcelBtn' ? 'xlsx' : 'png'}`;
      await download.saveAs(path.join(out, file));
      record(`${module}-${id}`, { pass: !(await download.failure()) && fs.statSync(path.join(out, file)).size > 1000 });
    }
    for (const width of [390, 875, 1600]) {
      await page.setViewportSize({ width, height: 1000 });
      record(`${module}-layout-${width}`, await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('#topology .ppt-role-pill, #topology .ppt-dn-group-token')];
        return { pass: nodes.length > 0 && nodes.every(n => n.scrollWidth <= n.clientWidth + 2) };
      }));
    }
  }
  await page.goto('file://' + path.join(source, 'index.html'));
  record('customer-text-fields', await page.evaluate(() => {
    $('businessServerConfigMode').value = 'customer';
    $('customerCnEnabled').checked = true;
    const checks = [];
    for (const suffix of ['Model', 'CpuModel', 'Network', 'SystemDisk']) {
      const field = $('customerCn' + suffix), old = field.value;
      field.value = 'model\u000B';
      render();
      const blocked = !latestDesignData && field.value === 'model\u000B';
      $('customerCnEnabled').checked = false;
      render();
      checks.push({ suffix, blocked, ignoredWhenDisabled: !!latestDesignData });
      $('customerCnEnabled').checked = true;
      field.value = old;
    }
    render();
    return { pass: checks.every(c => c.blocked && c.ignoredWhenDisabled) && !!latestDesignData, checks };
  }));
  record('xml-writer-rejects-invalid-input', await page.evaluate(() => {
    const checks = [0, 11, 0xD800, 0xFFFF].map(code => {
      try { createExcelWorkbook([{ name: '测试', rows: [['A' + String.fromCodePoint(code)]] }]); return false; }
      catch (e) { return e instanceof PlanningInputError; }
    });
    return { pass: checks.every(Boolean), checks };
  }));
  const values = ['_x0041_', '_x005F_', '_x005F_x0041_', '_x0041__x0042_', '_x000b_',
    '甲\r乙', '甲\r\n乙', '甲\n乙\t丙', '中文 & < > "', '=1+1', '\u{20000}\u{1F600}', '_X0041_', ' 普通文本 '];
  const sheet = { name: '字符边界', rows: [['测试序号', '原样文本'], ...values.map((value, i) => [i + 1, value])], widths: [16, 55] };
  save('boundary-sheets.json', [sheet]);
  record('xstring-encoding', await page.evaluate(() => {
    if (typeof excelTextEscape !== 'function') return { pass: false };
    return { pass: excelTextEscape('_x0041_') === '_x005F_x0041_' && excelTextEscape('甲\r乙') === '甲_x000D_乙'
      && excelTextEscape('中文 & <') === '中文 &amp; &lt;' && excelTextEscape('\u{20000}') === '\u{20000}'
      && xmlTextError('\t\r\n\u{10FFFF}') === null };
  }));
  const event = page.waitForEvent('download');
  await page.evaluate(sheet => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(createExcelWorkbook([sheet]));
    a.download = 'goldendb-b2d-character-boundary.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, sheet);
  await (await event).saveAs(path.join(out, 'goldendb-b2d-character-boundary.xlsx'));
  record('browser-errors', { pass: errors.length === 0, errors });
} finally {
  await browser.close();
  save('b2d-results.json', { results });
}
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
console.log(JSON.stringify(results.filter(r => !r.pass), null, 2));
if (results.some(r => !r.pass)) process.exitCode = 1;
