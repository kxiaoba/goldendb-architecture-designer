import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(project);
const out = path.join(workspace, 'outputs/goldendb-remediation-20260906/evidence');
const runtime = process.env.PLAYWRIGHT_MODULE || '/Users/xiaoba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const { chromium } = await import(runtime);
fs.mkdirSync(out, { recursive: true });
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const tests = [];
async function test(id, name, fn) {
  try {
    const result = await fn();
    tests.push({ id, name, ...result });
  } catch (error) { tests.push({ id, name, pass: false, error: error.stack }); }
  console.log(id, tests.at(-1).pass ? 'PASS' : 'FAIL', name);
}
async function load(source) {
  await page.goto('file://' + path.join(source, 'index.html'));
  await page.evaluate(() => {
    window.setupCase = (parameters = {}, tenants = null) => {
      Object.entries(defaults).forEach(([key, value]) => {
        const field = $(key);
        if (field) field.type === 'checkbox' ? field.checked = value : field.value = value;
      });
      businessTenantSpecs = cloneTenantSpecs(defaultBusinessTenants);
      reverseTenantSpecs = cloneTenantSpecs(defaultReverseTenants);
      Object.entries(parameters).forEach(([key, value]) => {
        const field = $(key);
        if (field) field.type === 'checkbox' ? field.checked = value : field.value = value;
      });
      if (tenants) {
        if (parameters.designModule === 'reverse') reverseTenantSpecs = tenants;
        else businessTenantSpecs = tenants;
      }
      render();
    };
  });
}
const setup = (parameters = {}, tenants = null) => page.evaluate(({ parameters, tenants }) => setupCase(parameters, tenants), { parameters, tenants });
const field = (key, mode = 'business', index = 0) => page.locator(`.tenant-input[data-mode="${mode}"][data-index="${index}"][data-key="${key}"]`);
const state = () => page.evaluate(() => ({
  valid: !!latestDesignData,
  message: $('planningInputStatus').textContent,
  hidden: $('planningInputStatus').hidden,
  disabled: planActionIds.every(id => $(id).disabled),
  staleNodes: document.querySelectorAll('#topology .ppt-server, #serverTopology .physical-server').length
}));
const fixtures = [];
for (const module of ['business', 'reverse']) for (const environment of ['poc', 'production']) for (const mode of ['local1az', 'local2az', 'twoSiteThreeDc', 'threeSiteFiveDc']) for (const count of [2, 4]) {
  fixtures.push({
    id: `${module}-${environment}-${mode}-${count}`,
    parameters: { designModule: module, environmentType: environment, [module === 'business' ? 'deploymentMode' : 'reverseDeploymentMode']: mode, reverseServerCount: 120, businessManagementNodes: 5, reverseManagementNodes: 5, businessGtmReplicasPerGroup: 7, reverseGtmReplicasPerGroup: 7, gtmBindMode: 'dedicated', reverseGtmBindMode: 'dedicated' },
    tenants: Array.from({ length: count }, (_, i) => ({ name: `租户${i + 1}`, type: 'distributed', deploymentStrategy: i === count - 1 ? 'dedicated' : 'shared', qps: 10000 * (i + 1), dataTb: i + 1, cnPerAz: 2, cnPerAzManual: false, minShards: 2, minShardsManual: false, shardCount: 2, replicaCount: mode === 'threeSiteFiveDc' ? 7 : 4, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 }))
  });
}
for (const id of ['T1', 'T2', 'B1', 'B2']) {
  const prior = JSON.parse(fs.readFileSync(path.join(workspace, `outputs/goldendb-review-20260906/evidence/${id}.json`)));
  fixtures.push({ id, parameters: Object.fromEntries(prior.inputs.filter(i => i.id).map(i => [i.id, i.value])), tenants: prior.data.tenantPlans.map(t => ({ name: t.name, type: t.isDistributed ? 'distributed' : 'centralized', deploymentStrategy: t.deploymentStrategy, qps: t.qps, dataTb: t.dataTb, cnPerAz: t.cnPerAz, cnPerAzManual: t.cnManual, minShards: t.shardCount, minShardsManual: t.shardManual, replicaCount: t.replicasPerShard })) });
}
try {
  // Compare complete model data, not merely the headline component counts.
  const baseline = {};
  await load(path.join(out, 'baseline/goldendb-architecture-designer'));
  for (const fixture of fixtures) {
    await setup(fixture.parameters, fixture.tenants);
    baseline[fixture.id] = await page.evaluate(() => JSON.stringify(latestDesignData));
  }
  await load(project);
  for (const fixture of fixtures) await test(`REG-${fixture.id}`, '合法场景完整模型与修改前一致', async () => {
    await setup(fixture.parameters, fixture.tenants);
    const actual = await page.evaluate(() => JSON.stringify(latestDesignData));
    const digest = value => createHash('sha256').update(value).digest('hex');
    return { pass: actual === baseline[fixture.id], beforeHash: digest(baseline[fixture.id]), afterHash: digest(actual) };
  });

  await test('B1-01', '清空标定 TPS 保留草稿、清除旧方案且禁用全部导出', async () => {
    await setup();
    await page.locator('#dnReferenceTps').fill('');
    const actual = await state();
    return { pass: !actual.valid && actual.disabled && /不能为空/.test(actual.message) && await page.locator('#dnReferenceTps').inputValue() === '', actual };
  });
  await test('B1-02', '补全 TPS 后重新联动并恢复导出', async () => {
    await page.locator('#dnReferenceTps').fill('1000');
    const actual = await page.evaluate(() => ({ valid: !!latestDesignData, tps: latestDesignData?.dnReferenceTps, groups: latestDesignData?.shardCount, enabled: planActionIds.every(id => !$(id).disabled) }));
    return { pass: actual.valid && actual.tps === 1000 && actual.groups === 6 && actual.enabled, actual };
  });
  for (const [id, value] of [['sqlPerTxn', '0'], ['maxShardTb', '0'], ['cpuLimit', '1.5'], ['years', '-1'], ['cpuCores', '3.5'], ['businessReserveRatio', '1'], ['growthFactor', '1e100'], ['businessManagementNodes', '100000000'], ['businessGtmReplicasPerGroup', '100000000']]) await test(`BAD-${id}`, `${id}=${value} 不产生方案`, async () => {
    await setup();
    await page.locator('#' + id).fill(value);
    const actual = await state();
    return { pass: !actual.valid && actual.disabled && actual.message.length > 0, actual };
  });
  await test('B1-03', '租户 QPS、数据量、CN、Group、副本空值不会变为默认值', async () => {
    const actual = [];
    for (const key of ['qps', 'dataTb', 'cnPerAz', 'minShards', 'replicaCount']) {
      await setup();
      await field(key).fill('');
      await page.locator('#businessServerProfile').selectOption('performance');
      actual.push({ key, ...(await state()), raw: await field(key).inputValue(), model: await page.evaluate(key => businessTenantSpecs[0][key], key) });
    }
    return { pass: actual.every(r => !r.valid && r.disabled && r.raw === '' && r.model === ''), actual };
  });
  await test('B1-04', '恢复自动可退出手工空值状态', async () => {
    await setup();
    await field('cnPerAz').fill('');
    await page.locator('[data-action="auto-business-cn"]').click();
    const actual = await page.evaluate(() => ({ valid: !!latestDesignData, manual: businessTenantSpecs[0].cnPerAzManual, count: latestDesignData?.tenantPlans[0].cnPerAz }));
    return { pass: actual.valid && !actual.manual && actual.count === 4, actual };
  });
  await test('B1-05', '两个模块的非法草稿互不阻断', async () => {
    await setup();
    await field('qps').fill('');
    await page.locator('#designModule').selectOption('reverse');
    const reverseValid = (await state()).valid;
    await page.locator('#reverseMemoryGb').fill('');
    await page.locator('#designModule').selectOption('business');
    await field('qps').fill('100000');
    const businessValid = (await state()).valid;
    await page.locator('#designModule').selectOption('reverse');
    return { pass: reverseValid && businessValid && !(await state()).valid && await page.locator('#reverseMemoryGb').inputValue() === '', reverseValid, businessValid };
  });
  await test('B1-06', '客户机型仅在启用后校验，未勾选参数不阻断', async () => {
    await setup({ businessServerConfigMode: 'customer', customerCnEnabled: true });
    await page.locator('#customerCnCores').fill('');
    const enabledInvalid = !(await state()).valid;
    await page.locator('#customerCnEnabled').uncheck();
    const uncheckedValid = (await state()).valid;
    await page.locator('#businessServerConfigMode').selectOption('recommended');
    return { pass: enabledInvalid && uncheckedValid && (await state()).valid, enabledInvalid, uncheckedValid };
  });
  for (const [key, value] of [['reverseDiskTb', '0'], ['reverseServerCount', '100000000'], ['reverseMaxCnPerServer', '1.5'], ['reverseMaxDnPerServer', ''], ['reverseGtmReplicasPerGroup', '-1']]) await test(`BAD-${key}`, `反推 ${key} 无效输入`, async () => {
    await setup({ designModule: 'reverse' });
    await page.locator('#' + key).fill(value);
    const actual = await state();
    return { pass: !actual.valid && actual.disabled, actual };
  });
  await test('B1-07', '反推租户空规格无效且恢复后可计算', async () => {
    await setup({ designModule: 'reverse' });
    await field('dnCores', 'reverse').fill('');
    const invalid = !(await state()).valid;
    await field('dnCores', 'reverse').fill('16');
    return { pass: invalid && (await state()).valid, invalid };
  });
  await test('B1-08', '有意义的边界：规划0年、预留0、GTM自动0仍支持', async () => {
    await setup({ years: 0, businessReserveRatio: 0, businessGtmReplicasPerGroup: 0 });
    return { pass: (await state()).valid, actual: await state() };
  });
  await test('B1-09', '密度超过机型仍进入原有红线，不误当格式错误', async () => {
    await setup({ businessMaxTenantDnPerServer: 5 });
    const actual = await page.evaluate(() => ({ valid: !!latestDesignData, redlines: getResourceReductionRedlines(latestDesignData) }));
    return { pass: actual.valid && actual.redlines.some(r => r.includes('单机总实例上限')), actual };
  });
  await test('B1-10', '全部重置包含两模块租户、机型、手工标志', async () => {
    await setup({ customerCnCores: 99, customerCnModel: '测试客户机型', businessServerConfigMode: 'customer', customerCnEnabled: true });
    await field('qps').fill('220000');
    await field('cnPerAz').fill('9');
    await page.locator('#addBusinessTenantBtn').click();
    await page.locator('#designModule').selectOption('reverse');
    await page.locator('#addReverseTenantBtn').click();
    await field('cnPerAz', 'reverse').fill('7');
    await page.locator('#resetBtn').click();
    const actual = await page.evaluate(() => ({ b: businessTenantSpecs, r: reverseTenantSpecs, globalMatch: Object.entries(defaults).every(([key, value]) => !$(key) || ($(key).type === 'checkbox' ? $(key).checked === value : $(key).value === String(value))) }));
    return { pass: actual.b.length === 1 && actual.b[0].qps === 100000 && !actual.b[0].cnPerAzManual && !actual.b[0].minShardsManual && actual.r.length === 2 && actual.r[0].cnPerAz === 2 && actual.globalMatch, actual };
  });
  await test('B1-11', '异常输入时新增租户/切换集中式不抛异常', async () => {
    await setup();
    await page.locator('#sqlPerTxn').fill('');
    await page.locator('#addBusinessTenantBtn').click();
    await page.locator('#dbShape').selectOption('centralized');
    const invalid = !(await state()).valid;
    await page.locator('#sqlPerTxn').fill('20');
    const actual = await page.evaluate(() => ({ count: latestDesignData?.tenantPlans.length, groups: latestDesignData?.tenantPlans.map(t => t.shardCount) }));
    return { pass: invalid && actual.count === 2 && actual.groups.every(g => g === 1), actual };
  });
  await test('B1-12', '超大自动分片被规模保护拦截', async () => {
    await setup({ growthFactor: 100, years: 5 });
    const actual = await state();
    return { pass: !actual.valid && actual.disabled && /规模保护/.test(actual.message), actual };
  });
  await test('B1-13', '直接调用计算入口也拒绝空值/零分母', async () => {
    const actual = await page.evaluate(() => {
      setupCase(); $('sqlPerTxn').value = '';
      const attempts = [() => calculate(), () => numberValue('sqlPerTxn'), () => buildBusinessTenantPlans({ specs: [], sqlPerTxn: 0 }), () => assertPlanningScale(Infinity, 'servers')];
      return attempts.map(fn => { try { fn(); return false; } catch (error) { return error instanceof PlanningInputError; } });
    });
    return { pass: actual.every(Boolean), actual };
  });
  await test('B1-14', '无效输入直接调用下载/复制入口不产生文件', async () => {
    await setup({ sqlPerTxn: 0 });
    let downloads = 0;
    const listener = () => { downloads++; };
    page.on('download', listener);
    await page.evaluate(async () => { downloadExcelPlan(); copySummary(); await downloadTopologyImage('topology', 'downloadTopologyBtn', 'blocked'); });
    await page.waitForTimeout(200);
    page.off('download', listener);
    return { pass: downloads === 0, downloads };
  });

  await setup({ deploymentMode: 'local2az', businessManagementNodes: 4, businessGtmReplicasPerGroup: 4 });
  save('b1-export-model.json', await page.evaluate(() => latestDesignData));
  save('b1-export-sheets.json', await page.evaluate(() => buildExcelSheets(latestDesignData)));
  for (const id of ['downloadExcelBtn', 'downloadTopologyBtn', 'downloadServerTopologyBtn']) await test(`EXPORT-${id}`, '实际下载文件', async () => {
    const wait = page.waitForEvent('download', { timeout: 60000 });
    await page.locator('#' + id).click();
    const download = await wait;
    const target = path.join(out, 'b1-' + download.suggestedFilename());
    await download.saveAs(target);
    return { pass: fs.statSync(target).size > 1000, file: target, bytes: fs.statSync(target).size };
  });
  await test('B1-15', 'PNG生成期间修改参数取消旧版本下载', async () => {
    await page.waitForTimeout(1800);
    let downloads = 0;
    const listener = () => { downloads++; };
    page.on('download', listener);
    const actual = await page.evaluate(async () => {
      const original = renderElementToPng;
      let release;
      renderElementToPng = () => new Promise(resolve => { release = resolve; });
      try {
        const pending = downloadTopologyImage('topology', 'downloadTopologyBtn', 'stale');
        $('sqlPerTxn').value = '';
        render();
        release(new Blob(['test'], { type: 'image/png' }));
        await pending;
        return { invalid: !latestDesignData, label: $('downloadTopologyBtn').textContent };
      } finally { renderElementToPng = original; }
    });
    await page.waitForTimeout(1800);
    page.off('download', listener);
    return { pass: actual.invalid && downloads === 0 && (await state()).disabled, actual, downloads };
  });
  await test('B1-17', 'Excel生成失败后允许重试，非法参数时保持禁用', async () => {
    await setup();
    const actual = await page.evaluate(() => {
      const original = createExcelWorkbook;
      createExcelWorkbook = () => { throw new Error('模拟导出失败'); };
      try { downloadExcelPlan(); return $('downloadExcelBtn').textContent; }
      finally { createExcelWorkbook = original; }
    });
    await page.waitForTimeout(1500);
    const recovered = await page.locator('#downloadExcelBtn').isEnabled();
    return { pass: /失败/.test(actual) && recovered, actual, recovered };
  });
  for (const width of [390, 875, 1600]) await test(`UI-${width}`, '错误提示不覆盖页面且不造成横向溢出', async () => {
    await page.setViewportSize({ width, height: 1000 });
    await setup({ sqlPerTxn: 0 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `b1-invalid-${width}.png`) });
    const actual = await page.evaluate(() => {
      const status = $('planningInputStatus').getBoundingClientRect();
      const next = $('planningInputStatus').nextElementSibling.getBoundingClientRect();
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, statusBottom: status.bottom, nextTop: next.top, position: getComputedStyle($('planningInputStatus')).position };
    });
    return { pass: actual.scrollWidth <= width && actual.nextTop >= actual.statusBottom && actual.position === 'static', actual };
  });
  await test('B1-16', '全部重置也可恢复错误状态', async () => {
    await page.locator('#resetBtn').click();
    const actual = await state();
    return { pass: actual.valid && actual.hidden && !actual.disabled, actual };
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, 'b1-restored-1600.png') });
  tests.push({ id: 'PAGE-ERRORS', name: '浏览器未捕获异常', pass: errors.length === 0, errors });
} finally {
  save('b1-results.json', tests);
  save('b1-browser-errors.json', errors);
  save('b1-source-hashes.json', Object.fromEntries(['app.js', 'index.html', 'styles.css'].map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(project, file))).digest('hex')])));
  await browser.close();
}
console.log(`RESULT ${tests.filter(t => t.pass).length}/${tests.length}`);
if (tests.some(t => !t.pass)) process.exitCode = 1;
