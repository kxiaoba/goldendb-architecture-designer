const $ = (id) => document.getElementById(id);

const componentServerDefinitions = [
  { key: "cn", label: "CN 计算节点", purpose: "CPU 与内存优先，承载 SQL 解析、路由和执行", sockets: 2, cores: 64, memoryGb: 256, dataDiskTb: 1.92, dataDiskCount: 1, maxInstances: 2 },
  { key: "dn", label: "DN 数据节点", purpose: "磁盘容量、IOPS 与内存优先，承载分片及副本", sockets: 2, cores: 64, memoryGb: 512, dataDiskTb: 3.82, dataDiskCount: 4, maxInstances: 2 },
  { key: "gtm", label: "GTM 事务节点", purpose: "低时延与高可用优先，承载全局事务管理", sockets: 2, cores: 32, memoryGb: 128, dataDiskTb: 1.92, dataDiskCount: 1, maxInstances: 2 },
  { key: "management", label: "管理节点", purpose: "稳定性优先，承载 CM/PM/MDS/Insight 等管理组件", sockets: 2, cores: 32, memoryGb: 128, dataDiskTb: 1.92, dataDiskCount: 1, maxInstances: 1 }
];

function componentInputId(key, field) {
  return `customer${key.charAt(0).toUpperCase()}${key.slice(1)}${field}`;
}

const componentServerInputIds = componentServerDefinitions.flatMap(({ key }) => [
  componentInputId(key, "Enabled"),
  componentInputId(key, "Model"),
  componentInputId(key, "CpuModel"),
  componentInputId(key, "Arch"),
  componentInputId(key, "Os"),
  componentInputId(key, "Sockets"),
  componentInputId(key, "Cores"),
  componentInputId(key, "MemoryGb"),
  componentInputId(key, "Network"),
  componentInputId(key, "SystemDisk"),
  componentInputId(key, "DataDiskTb"),
  componentInputId(key, "DataDiskCount"),
  componentInputId(key, "MaxInstances")
]);

const inputs = [
  "designModule",
  "environmentType",
  "deploymentMode",
  "dbShape",
  "gtmBindMode",
  "sqlPerTxn",
  "singleCoreTps",
  "cpuCores",
  "cpuLimit",
  "years",
  "growthFactor",
  "maxShardTb",
  "safeShardTps",
  "dnReferenceCores",
  "dnReferenceMemoryGb",
  "dnReferenceTps",
  "forceEven",
  "businessServerProfile",
  "businessReductionPreset",
  "businessComponentLayout",
  "businessManagementNodes",
  "businessGtmReplicasPerGroup",
  "businessGtmAffinity",
  "businessMaxTenantDnPerServer",
  "businessCnTenantPlacement",
  "businessDnTenantPlacement",
  "businessAllowShardColocation",
  "businessAllowCnDnMixed",
  "businessAllowGtmManagementMixed",
  "businessAllowGtmGroupColocation",
  "businessAllowAllMixed",
  "businessServerConfigMode",
  "businessReserveRatio",
  "businessDrCapacityRatio",
  "reverseDeploymentMode",
  "reverseGoal",
  "reverseServerCount",
  "reverseServerType",
  "reverseCpuCores",
  "reverseMemoryGb",
  "reverseDiskTb",
  "reverseReserveRatio",
  "reverseMaxDnPerServer",
  "reverseMaxCnPerServer",
  "reverseGtmBindMode",
  "reverseReductionPreset",
  "reverseComponentLayout",
  "reverseManagementNodes",
  "reverseGtmReplicasPerGroup",
  "reverseGtmAffinity",
  "reverseMaxTenantDnPerServer",
  "reverseCnTenantPlacement",
  "reverseDnTenantPlacement",
  "reverseAllowShardColocation",
  "reverseAllowCnDnMixed",
  "reverseAllowGtmManagementMixed",
  "reverseAllowGtmGroupColocation",
  "reverseAllowAllMixed",
  ...componentServerInputIds
];

const modeLabels = {
  local1az: "本地单机房（POC）",
  local2az: "同城本地两机房",
  twoSiteThreeDc: "同城异地两地三中心",
  threeSiteFiveDc: "三地五中心"
};

const modeSubtitles = {
  local1az: "本地单机房适合 POC、功能验证和演示环境，不作为核心生产高可用方案。",
  local2az: "同城两个机房构成强一致高可用域，适合核心交易本地容灾。",
  twoSiteThreeDc: "同城双中心强一致，异地中心用于灾备接管。",
  threeSiteFiveDc: "三地五中心属于多集群、多灾备域设计，页面仅给规划建议。"
};

const shapeLabels = {
  distributed: "分布式",
  centralized: "集中式"
};

const environmentLabels = {
  poc: "POC测试环境",
  production: "生产环境"
};

const goalLabels = {
  balanced: "均衡推荐",
  performance: "性能优先",
  availability: "可用性优先"
};

const serverProfileLabels = {
  balanced: "均衡推荐",
  performance: "性能优先",
  storage: "容量优先"
};

const componentLayoutLabels = {
  auto: "自动推荐",
  dedicated: "独立部署",
  gtmMgrMixed: "GTM + 管理节点合设",
  cnDnMixed: "CN + DN 混合部署",
  cnDnGtmMgrMixed: "CN + DN、GTM + 管理分组混部",
  allMixed: "CN + DN + GTM + 管理全混布"
};

const gtmAffinityLabels = {
  auto: "自动推荐",
  dedicated: "GTM 独立服务器部署",
  management: "GTM 与管理节点混部",
  tenantPool: "GTM 随租户组件全混布（仅 POC）"
};

const reductionPresetLabels = {
  current: "默认稳健规则",
  safe: "稳健缩减",
  balanced: "均衡缩减",
  maximum: "最大缩减",
  custom: "自定义"
};

const cnTenantPlacementLabels = {
  isolated: "租户独立 CN 服务器",
  shared: "不同租户 CN 共享服务器"
};

const dnTenantPlacementLabels = {
  isolated: "租户独立 DN 服务器",
  shared: "不同租户 DN 共享服务器"
};

const defaults = {
  designModule: "business",
  environmentType: "production",
  deploymentMode: "twoSiteThreeDc",
  dbShape: "distributed",
  gtmBindMode: "auto",
  sqlPerTxn: 20,
  singleCoreTps: 50,
  cpuCores: 64,
  cpuLimit: 0.7,
  years: 1,
  growthFactor: 1,
  maxShardTb: 2,
  safeShardTps: 2000,
  dnReferenceCores: 16,
  dnReferenceMemoryGb: 64,
  dnReferenceTps: 2000,
  forceEven: true,
  businessServerProfile: "balanced",
  businessReductionPreset: "current",
  businessComponentLayout: "auto",
  businessManagementNodes: 3,
  businessGtmReplicasPerGroup: 0,
  businessGtmAffinity: "auto",
  businessMaxTenantDnPerServer: 2,
  businessCnTenantPlacement: "auto",
  businessDnTenantPlacement: "auto",
  businessAllowShardColocation: true,
  businessAllowCnDnMixed: false,
  businessAllowGtmManagementMixed: true,
  businessAllowGtmGroupColocation: true,
  businessAllowAllMixed: false,
  businessServerConfigMode: "recommended",
  businessReserveRatio: 0.35,
  businessDrCapacityRatio: 0.5,
  reverseDeploymentMode: "twoSiteThreeDc",
  reverseGoal: "balanced",
  reverseServerCount: 20,
  reverseServerType: "general",
  reverseCpuCores: 64,
  reverseMemoryGb: 256,
  reverseDiskTb: 8,
  reverseReserveRatio: 0.35,
  reverseMaxDnPerServer: 2,
  reverseMaxCnPerServer: 2,
  reverseGtmBindMode: "auto",
  reverseReductionPreset: "current",
  reverseComponentLayout: "auto",
  reverseManagementNodes: 3,
  reverseGtmReplicasPerGroup: 0,
  reverseGtmAffinity: "auto",
  reverseMaxTenantDnPerServer: 2,
  reverseCnTenantPlacement: "auto",
  reverseDnTenantPlacement: "auto",
  reverseAllowShardColocation: true,
  reverseAllowCnDnMixed: false,
  reverseAllowGtmManagementMixed: true,
  reverseAllowGtmGroupColocation: true,
  reverseAllowAllMixed: false
};

componentServerDefinitions.forEach((definition) => {
  defaults[componentInputId(definition.key, "Enabled")] = false;
  defaults[componentInputId(definition.key, "Model")] = "";
  defaults[componentInputId(definition.key, "CpuModel")] = "国产 x86/ARM 处理器";
  defaults[componentInputId(definition.key, "Arch")] = "x86_64";
  defaults[componentInputId(definition.key, "Os")] = "kylin";
  defaults[componentInputId(definition.key, "Sockets")] = definition.sockets;
  defaults[componentInputId(definition.key, "Cores")] = definition.cores;
  defaults[componentInputId(definition.key, "MemoryGb")] = definition.memoryGb;
  defaults[componentInputId(definition.key, "Network")] = "2 x 10GbE";
  defaults[componentInputId(definition.key, "SystemDisk")] = "2 x 480GB SATA RAID1";
  defaults[componentInputId(definition.key, "DataDiskTb")] = definition.dataDiskTb;
  defaults[componentInputId(definition.key, "DataDiskCount")] = definition.dataDiskCount;
  defaults[componentInputId(definition.key, "MaxInstances")] = definition.maxInstances;
});

const defaultBusinessTenants = [
  { name: "租户1", type: "distributed", deploymentStrategy: "shared", qps: 100000, dataTb: 3, cnPerAz: 2, cnPerAzManual: false, minShards: 2, minShardsManual: false, replicaCount: 4, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 }
];

const defaultReverseTenants = [
  { name: "租户1", type: "distributed", deploymentStrategy: "shared", cnPerAz: 2, shardCount: 4, replicaCount: 4, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 },
  { name: "租户2", type: "distributed", deploymentStrategy: "dedicated", cnPerAz: 2, shardCount: 2, replicaCount: 4, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 }
];

let businessTenantSpecs = cloneTenantSpecs(defaultBusinessTenants);
let reverseTenantSpecs = cloneTenantSpecs(defaultReverseTenants);
let latestDesignData = null;
const planActionIds = ["copyBtn", "downloadExcelBtn", "downloadTopologyBtn", "downloadServerTopologyBtn"];
const planningLimits = Object.freeze({ tenants: 100, instances: 2000, servers: 2000 });

class PlanningInputError extends Error {}

function numericInputError(raw, label, { min = 1, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return `${label}不能为空`;
  const value = Number(raw);
  if (!Number.isFinite(value)) return `${label}必须是有限数值`;
  if (value < min) return `${label}不得小于 ${min}`;
  if (value > max) return `${label}不得大于 ${max}`;
  if (integer && !Number.isSafeInteger(value)) return `${label}必须是整数`;
  return null;
}

function getPlanningInputIssues(module = $("designModule").value) {
  const issues = [];
  const panel = $(module === "reverse" ? "reverseParams" : "businessParams");
  panel.querySelectorAll('input[type="number"][id]').forEach((field) => {
    if (field.readOnly || field.disabled) return;
    const label = field.closest("label")?.querySelector("span")?.textContent || field.id;
    const error = numericInputError(field.value, label, {
      min: field.min === "" ? 1 : Number(field.min),
      // The density ceiling is a deployment redline, not a malformed input.
      max: field.id.endsWith("MaxTenantDnPerServer") || field.max === "" ? Number.MAX_SAFE_INTEGER : Number(field.max),
      integer: field.step === "" || field.step === "1"
    });
    if (error) issues.push(error);
  });
  const specs = module === "reverse" ? reverseTenantSpecs : businessTenantSpecs;
  if (!specs.length || specs.length > planningLimits.tenants) issues.push(`本地规划支持 1 至 ${planningLimits.tenants} 个租户（浏览器规模保护，非产品限制）`);
  specs.forEach((tenant, index) => {
    const rules = module === "reverse"
      ? { cnPerAz: [1, true], cnCores: [1, true], cnMemoryGb: [1, true], dnCores: [1, true], dnMemoryGb: [1, true] }
      : { qps: [1, true], dataTb: [0.1, false] };
    if (module === "reverse" && tenant.type !== "centralized") rules.shardCount = [1, true];
    if (module === "business" && tenant.cnPerAzManual) rules.cnPerAz = [1, true];
    if (module === "business" && tenant.minShardsManual && $("dbShape").value === "distributed" && tenant.type === "distributed") rules.minShards = [1, true];
    rules.replicaCount = [1, true, 7];
    const labels = { qps: "SQL QPS", dataTb: "数据量 TB", cnPerAz: "CN/AZ", minShards: "DN Group", shardCount: "DN Group", replicaCount: "每分片副本数", cnCores: "CN 核数", cnMemoryGb: "CN 内存", dnCores: "DN 核数", dnMemoryGb: "DN 内存" };
    Object.entries(rules).forEach(([key, [min, integer, max]]) => {
      const error = numericInputError(tenant[key], `租户 ${index + 1} ${labels[key]}`, { min, integer, max });
      if (error) issues.push(error);
    });
  });
  return issues;
}

function assertPlanningInputs(module) {
  const issues = getPlanningInputIssues(module);
  if (issues.length) throw new PlanningInputError(issues.join("；"));
}

function assertPlanningScale(count, kind) {
  if (!Number.isSafeInteger(count) || count < 0 || count > planningLimits[kind]) {
    throw new PlanningInputError(`方案超出本地浏览器规模保护范围：${kind === "servers" ? "服务器" : "组件实例"}最多 ${planningLimits[kind]} 个。请缩小单次规划范围；这不是 GoldenDB 产品容量限制。`);
  }
}

function syncPlanActionAvailability() {
  planActionIds.forEach((id) => {
    $(id).disabled = !latestDesignData || $(id).dataset.busy === "true";
  });
}

function invalidatePlanningResult(messages) {
  latestDesignData = null;
  const message = `参数未通过，当前方案已失效。${messages.join("；")}`;
  $("planningInputStatus").hidden = false;
  $("planningInputStatus").textContent = message;
  ["topology", "serverTopology", "relationGraph", "formulaOutput", "businessServerPlan", "reversePlan", "reductionPlan", "haGuide"].forEach((id) => { $(id).textContent = "参数未通过，暂无有效方案。"; });
  $("nodePlan").replaceChildren();
  const risk = document.createElement("li");
  risk.className = "risk-high";
  risk.textContent = message;
  $("riskList").replaceChildren(risk);
  ["summaryCn", "summaryShard", "cnPerAz", "tenantCount", "shardCount", "replicasPerShard", "dnInstances"].forEach((id) => { $(id).textContent = "—"; });
  $("summaryMode").textContent = "参数未通过";
  $("summaryShape").textContent = "方案已失效";
  $("excelExportStats").textContent = "参数未通过，无法导出。";
  $("excelExportSubtitle").textContent = "暂无有效规划数据。";
  $("topologySubtitle").textContent = "参数未通过，暂无有效规划数据。";
  syncPlanActionAvailability();
}

function getCurrentPlanForAction() {
  const issues = getPlanningInputIssues();
  if (issues.length) invalidatePlanningResult(issues);
  return issues.length ? null : latestDesignData;
}

function cloneTenantSpecs(specs) {
  return specs.map((item) => ({ ...item }));
}

const tenantDeploymentStrategyLabels = {
  shared: "复用现有服务器资源池",
  dedicated: "新增独立服务器资源池"
};

function getTenantDeploymentStrategy(spec, index) {
  if (index === 0) return "shared";
  return spec.deploymentStrategy === "shared" ? "shared" : "dedicated";
}

function getTenantResourcePoolKey(tenant) {
  return tenant.deploymentStrategy === "dedicated" ? `tenant-${tenant.tenantNo}` : "shared";
}

function getTenantResourcePoolLabel(tenant) {
  return tenant.deploymentStrategy === "dedicated"
    ? `${tenant.name}新增独立服务器`
    : "现有集群共享服务器";
}

function numberValue(id) {
  const raw = $(id).value;
  if (raw.trim() === "" || !Number.isFinite(Number(raw))) {
    throw new PlanningInputError(`${$(id).closest("label")?.querySelector("span")?.textContent || id}不能为空且必须是有限数值`);
  }
  return Number(raw);
}

function integerValue(id, min = 0) {
  return Math.max(min, Math.floor(numberValue(id)));
}

function evenUp(value) {
  const n = Math.ceil(value);
  return n % 2 === 0 ? n : n + 1;
}

function maybeEven(value, forceEven) {
  return forceEven ? evenUp(value) : Math.ceil(value);
}

function getResourceReductionConfig(prefix, environment, maxDnPerServer) {
  const preset = $(`${prefix}ReductionPreset`).value;
  const configuredCnTenantPlacement = $(`${prefix}CnTenantPlacement`).value;
  const cnTenantPlacement = configuredCnTenantPlacement === "auto"
    ? (environment === "production" ? "isolated" : "shared")
    : configuredCnTenantPlacement;
  const configuredDnTenantPlacement = $(`${prefix}DnTenantPlacement`).value;
  const dnTenantPlacement = configuredDnTenantPlacement === "auto"
    ? (environment === "production" ? "isolated" : "shared")
    : configuredDnTenantPlacement;
  const allowShardColocation = $(`${prefix}AllowShardColocation`).checked;
  const allowCnDnMixed = $(`${prefix}AllowCnDnMixed`).checked;
  const allowGtmManagementMixed = $(`${prefix}AllowGtmManagementMixed`).checked;
  const allowGtmGroupColocation = $(`${prefix}AllowGtmGroupColocation`).checked;
  const allowAllMixed = $(`${prefix}AllowAllMixed`).checked;
  const configuredTenantLimit = allowShardColocation ? integerValue(`${prefix}MaxTenantDnPerServer`, 1) : 1;
  let requestedComponentLayout = "dedicated";
  let requestedGtmAffinity = "dedicated";
  if (allowAllMixed) {
    requestedComponentLayout = "allMixed";
    requestedGtmAffinity = "auto";
  } else {
    if (allowCnDnMixed) requestedComponentLayout = "cnDnMixed";
    if (allowGtmManagementMixed) requestedGtmAffinity = "management";
  }
  const effectiveTenantLimit = allowShardColocation
    ? Math.min(maxDnPerServer, configuredTenantLimit)
    : 1;
  const productionMaximumRedline = environment === "production" && allowAllMixed;

  return {
    preset,
    presetLabel: reductionPresetLabels[preset] || reductionPresetLabels.custom,
    requestedComponentLayout,
    requestedGtmAffinity,
    configuredCnTenantPlacement,
    cnTenantPlacement,
    cnTenantPlacementLabel: cnTenantPlacementLabels[cnTenantPlacement],
    allowCnTenantColocation: cnTenantPlacement === "shared",
    configuredDnTenantPlacement,
    dnTenantPlacement,
    dnTenantPlacementLabel: dnTenantPlacementLabels[dnTenantPlacement],
    allowDnTenantColocation: dnTenantPlacement === "shared",
    allowShardColocation,
    allowCnDnMixed,
    allowGtmManagementMixed,
    allowGtmGroupColocation,
    allowAllMixed,
    configuredTenantLimit,
    maxDnPerServer,
    maxTenantDnPerServer: effectiveTenantLimit,
    densityCapped: allowShardColocation && configuredTenantLimit > maxDnPerServer,
    productionMaximumRedline,
    note: productionMaximumRedline
      ? "生产环境触发全混布红线，请取消全组件混部或切换为 POC 环境。"
      : "资源缩减只调整物理服务器装箱，不改变 CN、分片和副本的业务计算结果。"
  };
}

function getDnPlacementFloors(tenantPlans, maxTenantDnPerServer, dnTenantPlacement) {
  const perTenantFloors = tenantPlans.map((tenant) =>
    Math.ceil(tenant.dnInstances / Math.max(1, maxTenantDnPerServer))
  );
  return {
    antiAffinityFloor: Math.max(0, ...tenantPlans.map((tenant) => tenant.replicasPerShard)),
    tenantHostFloor: dnTenantPlacement === "isolated"
      ? perTenantFloors.reduce((sum, count) => sum + count, 0)
      : Math.max(0, ...perTenantFloors)
  };
}

function getCnPlacementFloors(tenantPlans, azCount, maxCnPerServer, cnTenantPlacement, environment) {
  const tenantTotals = tenantPlans.map((tenant) => tenant.cnByAz
    ? tenant.cnByAz.reduce((sum, count) => sum + count, 0)
    : tenant.cnPerAz * azCount);
  if (environment === "production") {
    return {
      isolationFloor: cnTenantPlacement === "isolated"
        ? tenantTotals.reduce((sum, count) => sum + count, 0)
        : Math.max(0, ...tenantTotals)
    };
  }
  if (cnTenantPlacement !== "isolated") return {};
  return {
    isolationFloor: tenantPlans.reduce(
      (sum, tenant) => sum + Math.ceil(tenant.cnPerAz / Math.max(1, maxCnPerServer)) * azCount,
      0
    )
  };
}

function calculate() {
  assertPlanningInputs("business");
  const environment = $("environmentType").value;
  const mode = $("deploymentMode").value;
  const shape = $("dbShape").value;
  const gtmBindMode = $("gtmBindMode").value;
  const sqlPerTxn = numberValue("sqlPerTxn");
  const singleCoreTps = numberValue("singleCoreTps");
  const cpuCores = numberValue("cpuCores");
  const cpuLimit = numberValue("cpuLimit");
  const years = numberValue("years");
  const growthFactor = numberValue("growthFactor");
  const maxShardTb = numberValue("maxShardTb");
  const dnReferenceCores = Math.max(1, numberValue("dnReferenceCores"));
  const dnReferenceMemoryGb = Math.max(1, numberValue("dnReferenceMemoryGb"));
  const dnReferenceTps = Math.max(1, numberValue("dnReferenceTps"));
  const dnSingleCoreTps = dnReferenceTps / dnReferenceCores;
  const safeShardTps = dnReferenceTps;
  syncDnPlanningOutputs({ dnSingleCoreTps, safeShardTps });
  const forceEven = $("forceEven").checked;
  const serverProfile = $("businessServerProfile").value;
  const serverConfigMode = $("businessServerConfigMode").value;
  const reserveRatio = Math.min(0.8, Math.max(0, numberValue("businessReserveRatio")));
  const drCapacityRatio = Math.min(1, Math.max(0.25, numberValue("businessDrCapacityRatio")));
  const componentSpecs = getBusinessComponentSpecs({ serverConfigMode, cpuCores, serverProfile });
  const resourceReduction = getResourceReductionConfig("business", environment, componentSpecs.dn.maxInstances);
  const requestedComponentLayout = resourceReduction.requestedComponentLayout;
  const requestedGtmAffinity = resourceReduction.requestedGtmAffinity;

  const growthPower = Math.pow(growthFactor, years);
  const cnSingleNodeTps = singleCoreTps * cpuCores * cpuLimit;
  const azCount = getAzCount(mode);
  const siteCapacityFactors = getSiteCapacityFactors(mode, drCapacityRatio);
  const managementNodes = integerValue("businessManagementNodes", 1);
  const recommendedManagementNodes = getRecommendedManagementNodes(environment, mode);
  const tenantPlans = buildBusinessTenantPlans({
    shape,
    specs: businessTenantSpecs,
    sqlPerTxn,
    cnSingleNodeTps,
    cpuLimit,
    growthPower,
    maxShardTb,
    safeShardTps,
    dnSingleCoreTps,
    dnReferenceCores,
    dnReferenceMemoryGb,
    dnReferenceTps,
    mode,
    environment,
    azCount,
    siteCapacityFactors,
    forceEven
  });
  const businessTenants = tenantPlans.length;
  const distributedTenants = tenantPlans.filter((tenant) => tenant.isDistributed).length;
  const totalQps = tenantPlans.reduce((sum, tenant) => sum + tenant.qps, 0);
  const businessTxnTps = tenantPlans.reduce((sum, tenant) => sum + tenant.businessTxnTps, 0);
  const dataTb = tenantPlans.reduce((sum, tenant) => sum + tenant.dataTb, 0);
  const futureDataTb = tenantPlans.reduce((sum, tenant) => sum + tenant.futureDataTb, 0);
  const cnPerAz = tenantPlans.reduce((sum, tenant) => sum + tenant.cnPerAz, 0);
  const shardCount = tenantPlans.reduce((sum, tenant) => sum + tenant.shardCount, 0);
  const dnInstances = tenantPlans.reduce((sum, tenant) => sum + tenant.dnInstances, 0);
  const replicasPerShard = Math.max(...tenantPlans.map((tenant) => tenant.replicasPerShard));
  const totalCn = tenantPlans.reduce((sum, tenant) => sum + tenant.totalCn, 0);
  const shardByCapacity = tenantPlans.reduce((sum, tenant) => sum + tenant.shardByCapacity, 0);
  const shardByTps = tenantPlans.reduce((sum, tenant) => sum + tenant.shardByTps, 0);
  const minShards = tenantPlans.reduce((sum, tenant) => sum + tenant.minShards, 0);
  const cnRaw = tenantPlans.reduce((sum, tenant) => sum + tenant.cnRaw, 0);
  const hasDedicatedDistributedTenant = tenantPlans.some((tenant) => tenant.isDistributed && tenant.deploymentStrategy === "dedicated");
  const effectiveGtmBindMode = gtmBindMode === "auto" && hasDedicatedDistributedTenant ? "dedicated" : gtmBindMode;
  const gtmBinding = getGtmBinding(shape, distributedTenants, effectiveGtmBindMode);
  const recommendedGtmReplicasPerGroup = getRecommendedBusinessGtmReplicas(environment, mode);
  const configuredGtmReplicasPerGroup = integerValue("businessGtmReplicasPerGroup", 0);
  const gtmReplicasPerGroup = configuredGtmReplicasPerGroup || recommendedGtmReplicasPerGroup;
  const gtmNodes = shape === "distributed" && gtmBinding.kind !== "none"
    ? gtmBinding.groupCount * gtmReplicasPerGroup
    : 0;
  assertPlanningScale(totalCn + dnInstances + gtmNodes + managementNodes, "instances");
  applyGtmLabels(tenantPlans, gtmBinding, gtmNodes);
  const gtmPerPrimaryAz = shape === "distributed" && distributedTenants > 0
    ? Math.max(1, Math.ceil(gtmNodes / Math.max(1, azCount - 1)))
    : 0;
  const businessServerPlan = buildBusinessServerSizing({
    environment,
    mode,
    shape,
    serverProfile,
    requestedComponentLayout,
    requestedGtmAffinity,
    serverConfigMode,
    componentSpecs,
    reserveRatio,
    drCapacityRatio,
    siteCapacityFactors,
    azCount,
    totalCn,
    dnInstances,
    gtmNodes,
    gtmReplicasPerGroup,
    gtmBinding,
    managementNodes,
    futureDataTb,
    maxShardTb,
    tenantPlans,
    resourceReduction
  });

  return {
    environment,
    mode,
    shape,
    gtmBindMode,
    qps: totalQps,
    sqlPerTxn,
    singleCoreTps,
    cpuCores,
    cpuLimit,
    years,
    growthFactor,
    growthPower,
    dataTb,
    maxShardTb,
    minShards,
    safeShardTps,
    dnSingleCoreTps,
    dnReferenceCores,
    dnReferenceMemoryGb,
    dnReferenceTps,
    businessTenants,
    requestedDistributedTenants: distributedTenants,
    distributedTenants,
    forceEven,
    businessTxnTps,
    cnSingleNodeTps,
    cnRaw,
    cnPerAz,
    futureDataTb,
    shardByCapacity,
    shardByTps,
    shardCount,
    replicasPerShard,
    dnInstances,
    azCount,
    managementNodes,
    recommendedManagementNodes,
    requestedGtmAffinity,
    gtmPerPrimaryAz,
    totalCn,
    gtmBinding,
    gtmNodes,
    gtmReplicasPerGroup,
    configuredGtmReplicasPerGroup,
    recommendedGtmReplicasPerGroup,
    tenantPlans,
    serverProfile,
    serverConfigMode,
    componentSpecs,
    reserveRatio,
    drCapacityRatio,
    siteCapacityFactors,
    resourceReduction,
    serverSizing: businessServerPlan
  };
}

function calculateReverse() {
  assertPlanningInputs("reverse");
  const environment = $("environmentType").value;
  const mode = $("reverseDeploymentMode").value;
  const goal = $("reverseGoal").value;
  const serverCount = integerValue("reverseServerCount", 1);
  const serverType = $("reverseServerType").value;
  const cpuCores = numberValue("reverseCpuCores");
  const memoryGb = numberValue("reverseMemoryGb");
  const diskTb = numberValue("reverseDiskTb");
  const reserveRatio = Math.min(0.8, Math.max(0, numberValue("reverseReserveRatio")));
  const maxDnPerServer = integerValue("reverseMaxDnPerServer", 1);
  const maxCnPerServer = integerValue("reverseMaxCnPerServer", 1);
  const azCount = getAzCount(mode);
  const minReplica = getMinimumReplicaCount(environment, mode);
  const tenantPlans = buildReverseTenantPlans({
    specs: reverseTenantSpecs,
    environment,
    minReplica,
    azCount
  });
  const businessTenants = tenantPlans.length;
  const distributedTenants = tenantPlans.filter((tenant) => tenant.isDistributed).length;
  const requestedDistributedTenants = distributedTenants;
  const requestedReplicas = Math.min(...tenantPlans.map((tenant) => tenant.requestedReplicas));
  const replicasPerShard = Math.max(...tenantPlans.map((tenant) => tenant.replicasPerShard));
  const shardCount = tenantPlans.reduce((sum, tenant) => sum + tenant.shardCount, 0);
  const dnInstances = shardCount * replicasPerShard;
  const actualDnInstances = tenantPlans.reduce((sum, tenant) => sum + tenant.dnInstances, 0);
  const managementNodes = integerValue("reverseManagementNodes", 1);
  const recommendedManagementNodes = getRecommendedManagementNodes(environment, mode);
  const configuredGtmBindMode = $("reverseGtmBindMode").value;
  const hasDedicatedDistributedTenant = tenantPlans.some((tenant) => tenant.isDistributed && tenant.deploymentStrategy === "dedicated");
  const effectiveGtmBindMode = configuredGtmBindMode === "auto" && hasDedicatedDistributedTenant ? "dedicated" : configuredGtmBindMode;
  const gtmBinding = getGtmBinding("distributed", distributedTenants, effectiveGtmBindMode);
  const recommendedGtmReplicasPerGroup = getRecommendedReverseGtmReplicas(environment, mode);
  const configuredGtmReplicasPerGroup = integerValue("reverseGtmReplicasPerGroup", 0);
  const gtmReplicasPerGroup = configuredGtmReplicasPerGroup || recommendedGtmReplicasPerGroup;
  const gtmNodes = gtmBinding.kind === "none" ? 0 : gtmBinding.groupCount * gtmReplicasPerGroup;
  assertPlanningScale(tenantPlans.reduce((sum, tenant) => sum + tenant.totalCn + tenant.dnInstances, 0) + gtmNodes + managementNodes, "instances");
  applyGtmLabels(tenantPlans, gtmBinding, gtmNodes);
  const cnPerAz = tenantPlans.reduce((sum, tenant) => sum + tenant.cnPerAz, 0);
  const totalCn = cnPerAz * azCount;
  const gtmPerPrimaryAz = distributedTenants > 0 ? Math.max(1, Math.ceil(gtmNodes / Math.max(1, azCount - 1))) : 0;
  const usedSlots = totalCn + actualDnInstances + gtmNodes + managementNodes;
  const usableServerCount = Math.max(1, Math.floor(serverCount * (1 - reserveRatio)));
  const cpuDemandCores = tenantPlans.reduce(
    (sum, tenant) => sum + tenant.cnCpuDemand + tenant.dnCpuDemand,
    0
  ) + gtmNodes * 4 + managementNodes * 4;
  const memoryDemandGb = tenantPlans.reduce(
    (sum, tenant) => sum + tenant.cnMemoryDemand + tenant.dnMemoryDemand,
    0
  ) + gtmNodes * 8 + managementNodes * 8;
  const reverseComponentSpecs = Object.fromEntries(componentServerDefinitions.map(({ key, label, purpose }) => [key, {
    key,
    label,
    purpose,
    source: "customer",
    sourceLabel: "资源约束机型",
    model: getServerTypeLabel(serverType),
    arch: "other",
    archLabel: "客户服务器平台",
    os: "other",
    osLabel: "按版本兼容清单复核",
    sockets: 1,
    cores: cpuCores,
    memoryGb,
    network: "按客户资源池配置",
    systemDisk: "系统盘与数据盘隔离",
    dataDiskTb: diskTb,
    dataDiskCount: 1,
    diskTb,
    maxInstances: key === "cn" ? maxCnPerServer : key === "dn" ? maxDnPerServer : key === "gtm" ? 2 : 1
  }]));
  const resourceReduction = getResourceReductionConfig("reverse", environment, maxDnPerServer);
  const requestedComponentLayout = resourceReduction.requestedComponentLayout;
  const requestedGtmAffinity = resourceReduction.requestedGtmAffinity;
  const dnPlacementFloors = getDnPlacementFloors(
    tenantPlans,
    resourceReduction.maxTenantDnPerServer,
    resourceReduction.dnTenantPlacement
  );
  const cnPlacementFloors = getCnPlacementFloors(
    tenantPlans,
    azCount,
    maxCnPerServer,
    resourceReduction.cnTenantPlacement,
    environment
  );
  const reverseComponentDemands = {
    cn: {
      instances: totalCn,
      cpuCores: tenantPlans.reduce((sum, tenant) => sum + tenant.cnCpuDemand, 0),
      memoryGb: tenantPlans.reduce((sum, tenant) => sum + tenant.cnMemoryDemand, 0),
      diskTb: 0,
      ...cnPlacementFloors
    },
    dn: {
      instances: actualDnInstances,
      cpuCores: tenantPlans.reduce((sum, tenant) => sum + tenant.dnCpuDemand, 0),
      memoryGb: tenantPlans.reduce((sum, tenant) => sum + tenant.dnMemoryDemand, 0),
      diskTb: 0,
      ...dnPlacementFloors
    },
    gtm: {
      instances: gtmNodes,
      cpuCores: gtmNodes * 4,
      memoryGb: gtmNodes * 8,
      diskTb: 0,
      antiAffinityFloor: resourceReduction.allowGtmGroupColocation && gtmBinding.groupCount
        ? Math.ceil(gtmNodes / gtmBinding.groupCount)
        : gtmNodes
    },
    management: { instances: managementNodes, cpuCores: managementNodes * 4, memoryGb: managementNodes * 8, diskTb: 0 }
  };
  const reverseLayoutResolution = resolveBusinessComponentLayout(
    requestedComponentLayout,
    requestedGtmAffinity,
    environment,
    reverseComponentSpecs,
    "customer"
  );
  const effectiveReverseLayout = reverseLayoutResolution.effectiveLayout;
  const baseComponentSizing = calculateComponentServerCounts({
    environment,
    effectiveLayout: effectiveReverseLayout,
    layoutResolution: reverseLayoutResolution,
    azCount,
    componentSpecs: reverseComponentSpecs,
    componentDemands: reverseComponentDemands,
    reserveRatio
  });
  const reverseResourcePools = buildTenantResourcePools({ tenantPlans, managementNodes, gtmNodes, gtmBinding, azCount });
  const poolSizings = reverseResourcePools.map((pool) => {
    const poolDemands = buildReversePoolDemands(pool, {
      azCount,
      maxCnPerServer,
      environment,
      resourceReduction
    });
    const sizing = calculateComponentServerCounts({
      environment,
      effectiveLayout: effectiveReverseLayout,
      layoutResolution: reverseLayoutResolution,
      azCount,
      componentSpecs: reverseComponentSpecs,
      componentDemands: poolDemands,
      reserveRatio
    });
    return { ...pool, componentDemands: poolDemands, sizing };
  });
  const componentSizing = aggregateSiteComponentSizing(baseComponentSizing, poolSizings.map((pool) => pool.sizing));
  componentSizing.poolSizings = poolSizings;
  const allowColocation = componentSizing.effectiveLayout !== "dedicated" && componentSizing.effectiveLayout !== "gtmMgrMixed";
  const requiredDedicatedServers = componentSizing.dedicatedServers;
  const requiredServerCount = componentSizing.recommendedServers;
  const resourceState = getResourceState(serverCount, requiredServerCount, usableServerCount, environment);
  const serverPlan = buildServerPlan({
    serverCount,
    azCount,
    mode,
    environment,
    allowColocation,
    componentLayout: componentSizing.effectiveLayout,
    componentSizing,
    componentSpecs: reverseComponentSpecs,
    reserveRatio,
    totalCn,
    dnInstances: actualDnInstances,
    tenantPlans,
    gtmNodes,
    gtmBinding,
    managementNodes,
    maxDnPerServer,
    maxCnPerServer,
    maxTenantDnPerServer: resourceReduction.maxTenantDnPerServer,
    allowShardColocation: resourceReduction.allowShardColocation,
    allowGtmGroupColocation: resourceReduction.allowGtmGroupColocation,
    cnTenantPlacement: resourceReduction.cnTenantPlacement,
    dnTenantPlacement: resourceReduction.dnTenantPlacement
  });
  const cnTenantIsolationViolations = getCnTenantIsolationViolations(serverPlan, resourceReduction.cnTenantPlacement);
  const cnSameTenantHostViolations = getCnSameTenantHostViolations(serverPlan);
  const cnPlacementAudit = getCnPlacementAudit(serverPlan, tenantPlans, azCount);
  const dnTenantIsolationViolations = getDnTenantIsolationViolations(serverPlan, resourceReduction.dnTenantPlacement);
  const dnReplicaHostViolations = getDnReplicaHostViolations(serverPlan);
  const gtmReplicaHostViolations = getGtmReplicaHostViolations(serverPlan);
  const managementHostViolations = getManagementHostViolations(serverPlan);
  const controlPlaneAudit = getControlPlanePlacementAudit(serverPlan, managementNodes, gtmNodes);
  const tenantResourcePoolAudit = getTenantResourcePoolAudit(serverPlan, tenantPlans);
  const gtmGroupPlacementAudit = getGtmGroupPlacementAudit(serverPlan, { tenantPlans, gtmNodes, gtmBinding, azCount });
  const capacityViolations = serverPlan.filter((server) => server.resourceAudit && !server.resourceAudit.withinWatermark);
  const dnCenterDistribution = getDnCenterDistribution(serverPlan, mode, azCount);
  const scores = scoreReversePlan({
    environment,
    goal,
    resourceState,
    serverCount,
    requiredServerCount,
    allowColocation,
    cnPerAz,
    shardCount,
    replicasPerShard,
    serverPlan
  });
  const futureDataTb = Math.max(1, shardCount * 2);

  return {
    reverse: true,
    environment,
    goal,
    serverCount,
    serverType,
    cpuCores,
    memoryGb,
    diskTb,
    reserveRatio,
    cpuDemandCores,
    memoryDemandGb,
    requestedComponentLayout,
    componentLayout: componentSizing.effectiveLayout,
    componentLayoutLabel: componentSizing.effectiveLabel,
    requestedGtmAffinity,
    gtmAffinity: componentSizing.gtmAffinity,
    gtmAffinityLabel: componentSizing.gtmAffinityLabel,
    componentSizing,
    maxDnPerServer,
    maxCnPerServer,
    resourceReduction,
    cnTenantIsolationViolations,
    cnSameTenantHostViolations,
    cnPlacementAudit,
    dnTenantIsolationViolations,
    dnReplicaHostViolations,
    gtmReplicaHostViolations,
    managementHostViolations,
    controlPlaneAudit,
    tenantResourcePoolAudit,
    gtmGroupPlacementAudit,
    capacityViolations,
    dnCenterDistribution,
    allowColocation,
    requestedReplicas,
    requestedDistributedTenants,
    mode,
    shape: "distributed",
    businessTenants,
    distributedTenants,
    cnPerAz,
    shardCount,
    replicasPerShard,
    dnInstances: actualDnInstances,
    azCount,
    managementNodes,
    recommendedManagementNodes,
    gtmPerPrimaryAz,
    totalCn,
    gtmBinding,
    gtmNodes,
    gtmReplicasPerGroup,
    configuredGtmReplicasPerGroup,
    recommendedGtmReplicasPerGroup,
    tenantPlans,
    requiredServerCount,
    requiredDedicatedServers,
    usableServerCount,
    usedSlots,
    resourceState,
    scores,
    serverPlan,
    futureDataTb,
    maxShardTb: 2,
    minShards: 2
  };
}

function getMinimumReplicaCount(environment, mode) {
  if (environment === "poc" && mode === "local1az") return 1;
  if (environment === "poc") return mode === "local2az" ? 2 : 3;
  if (mode === "threeSiteFiveDc") return 5;
  if (mode === "twoSiteThreeDc") return 4;
  return 4;
}

function getReverseDefaultShardCount(goal, businessTenants, distributedTenants, azCount) {
  const base = Math.max(2, distributedTenants || businessTenants);
  if (goal === "performance") return maybeEven(Math.max(base, azCount * 2), true);
  if (goal === "availability") return maybeEven(Math.max(base, azCount), true);
  return maybeEven(Math.max(base, azCount + 1), true);
}

function getRecommendedManagementNodes(environment, mode) {
  if (mode === "local1az" && environment === "poc") return 1;
  if (mode === "threeSiteFiveDc") return 5;
  return 3;
}

function getRecommendedReverseGtmReplicas(environment, mode) {
  return getRecommendedBusinessGtmReplicas(environment, mode);
}

function getReverseGtmNodes(environment, mode, binding) {
  if (binding.kind === "none") return 0;
  return binding.groupCount * getRecommendedReverseGtmReplicas(environment, mode);
}

function getReverseCnPerAz(environment, goal, serverCount, azCount) {
  const base = environment === "poc" ? 1 : 2;
  if (goal === "performance") return Math.max(base, Math.ceil(serverCount * 0.28 / azCount));
  if (goal === "availability") return base;
  return Math.max(base, Math.ceil(serverCount * 0.2 / azCount));
}

function getResourceState(serverCount, requiredServerCount, usableServerCount, environment) {
  if (serverCount < requiredServerCount) return "不足";
  if (environment === "production" && usableServerCount < requiredServerCount) return "临界";
  return "充足";
}

const componentArchLabels = {
  x86_64: "x86_64 国产平台",
  arm64: "ARM64 国产平台",
  other: "其他 / 待确认"
};

const componentOsLabels = {
  kylin: "银河麒麟",
  bclinux: "BC-Linux for Euler",
  uos: "统信 UOS",
  newstart: "中兴新支点",
  other: "其他 / 待确认"
};

function getBusinessComponentSpecs(config) {
  const profileAdjust = getBusinessProfileAdjust(config.serverProfile);
  return Object.fromEntries(componentServerDefinitions.map((definition) => {
    const customEnabled = config.serverConfigMode === "customer" && $(componentInputId(definition.key, "Enabled")).checked;
    const recommendedMax = definition.key === "cn"
      ? Math.max(1, Math.floor(definition.maxInstances * profileAdjust.cn))
      : definition.key === "dn"
        ? Math.max(1, Math.floor(definition.maxInstances * profileAdjust.dn))
        : definition.maxInstances;
    const recommended = {
      model: `推荐${definition.label}国产服务器`,
      cpuModel: "以 GoldenDB 版本兼容清单及客户信创目录为准",
      arch: "other",
      os: "other",
      sockets: definition.sockets,
      cores: definition.key === "cn" ? config.cpuCores : definition.cores,
      memoryGb: definition.memoryGb,
      network: "至少双业务/管理冗余链路，带宽按压测复核",
      systemDisk: "系统盘 RAID1，与数据盘隔离",
      dataDiskTb: definition.dataDiskTb,
      dataDiskCount: definition.dataDiskCount,
      diskTb: definition.dataDiskTb * definition.dataDiskCount,
      maxInstances: recommendedMax
    };
    const spec = customEnabled ? {
      model: $(componentInputId(definition.key, "Model")).value.trim() || "客户机型未填写",
      cpuModel: $(componentInputId(definition.key, "CpuModel")).value.trim() || "CPU 型号未填写",
      arch: $(componentInputId(definition.key, "Arch")).value,
      os: $(componentInputId(definition.key, "Os")).value,
      sockets: integerValue(componentInputId(definition.key, "Sockets"), 1),
      cores: integerValue(componentInputId(definition.key, "Cores"), 1),
      memoryGb: numberValue(componentInputId(definition.key, "MemoryGb")),
      network: $(componentInputId(definition.key, "Network")).value.trim() || "网络规格未填写",
      systemDisk: $(componentInputId(definition.key, "SystemDisk")).value.trim() || "系统盘规格未填写",
      dataDiskTb: numberValue(componentInputId(definition.key, "DataDiskTb")),
      dataDiskCount: integerValue(componentInputId(definition.key, "DataDiskCount"), 1),
      maxInstances: integerValue(componentInputId(definition.key, "MaxInstances"), 1)
    } : recommended;
    if (customEnabled) spec.diskTb = spec.dataDiskTb * spec.dataDiskCount;

    return [definition.key, {
      key: definition.key,
      label: definition.label,
      purpose: definition.purpose,
      source: customEnabled ? "customer" : "recommended",
      sourceLabel: customEnabled ? "客户机型" : "推荐规格",
      ...spec,
      archLabel: componentArchLabels[spec.arch],
      osLabel: componentOsLabels[spec.os]
    }];
  }));
}

function buildBusinessSiteDemands(config) {
  const sites = Array.from({ length: config.azCount }, (_, azIndex) => ({
    azIndex,
    factor: config.siteCapacityFactors[azIndex] || 1,
    cn: { instances: 0, cpuCores: 0, memoryGb: 0, diskTb: 0 },
    dn: { instances: 0, cpuCores: 0, memoryGb: 0, diskTb: 0 },
    gtm: { instances: 0, cpuCores: 0, memoryGb: 0, diskTb: 0 },
    management: { instances: 0, cpuCores: 0, memoryGb: 0, diskTb: 0 }
  }));

  config.tenantPlans.forEach((tenant) => {
    tenant.cnByAz.forEach((count, azIndex) => {
      const demand = sites[azIndex].cn;
      demand.instances += count;
      demand.cpuCores += count * tenant.cnCores;
      demand.memoryGb += count * tenant.cnMemoryGb;
    });
    for (let group = 1; group <= tenant.shardCount; group += 1) {
      for (let replica = 1; replica <= tenant.replicasPerShard; replica += 1) {
        const azIndex = (group + replica - 2) % config.azCount;
        const demand = sites[azIndex].dn;
        demand.instances += 1;
        demand.cpuCores += tenant.dnCores;
        demand.memoryGb += tenant.dnMemoryGb;
        demand.diskTb += tenant.futureDataTb / Math.max(1, tenant.shardCount);
      }
    }
  });

  const gtmPlacements = config.gtmPlacements || getGtmRolePlacements(config);
  gtmPlacements.forEach((placement) => {
    const demand = sites[placement.azIndex].gtm;
    demand.instances += 1;
    demand.cpuCores += 4;
    demand.memoryGb += 8;
  });
  for (let index = 0; index < config.managementNodes; index += 1) {
    const demand = sites[index % config.azCount].management;
    demand.instances += 1;
    demand.cpuCores += 4;
    demand.memoryGb += 8;
  }

  sites.forEach((site) => {
    const localCnByTenant = config.tenantPlans.map((tenant) => tenant.cnByAz[site.azIndex] || 0);
    if (config.environment === "production") {
      site.cn.isolationFloor = config.resourceReduction.cnTenantPlacement === "isolated"
        ? localCnByTenant.reduce((sum, count) => sum + count, 0)
        : Math.max(0, ...localCnByTenant);
    } else if (config.resourceReduction.cnTenantPlacement === "isolated") {
      site.cn.isolationFloor = localCnByTenant.reduce((sum, count) =>
        sum + Math.ceil(count / Math.max(1, config.componentSpecs.cn.maxInstances)), 0);
    }
    const localDnByTenant = config.tenantPlans.map((tenant) => {
      let count = 0;
      let maxSameGroup = 0;
      for (let group = 1; group <= tenant.shardCount; group += 1) {
        let sameGroup = 0;
        for (let replica = 1; replica <= tenant.replicasPerShard; replica += 1) {
          if ((group + replica - 2) % config.azCount === site.azIndex) {
            count += 1;
            sameGroup += 1;
          }
        }
        maxSameGroup = Math.max(maxSameGroup, sameGroup);
      }
      return { count, maxSameGroup };
    });
    site.dn.antiAffinityFloor = Math.max(0, ...localDnByTenant.map((item) => item.maxSameGroup));
    site.dn.tenantHostFloor = config.resourceReduction.dnTenantPlacement === "isolated"
      ? localDnByTenant.reduce((sum, item) => sum + Math.ceil(item.count / Math.max(1, config.resourceReduction.maxTenantDnPerServer)), 0)
      : Math.max(0, ...localDnByTenant.map((item) => Math.ceil(item.count / Math.max(1, config.resourceReduction.maxTenantDnPerServer))));
    const localGtmGroupCounts = new Map();
    gtmPlacements
      .filter((placement) => placement.azIndex === site.azIndex)
      .forEach((placement) => localGtmGroupCounts.set(
        placement.groupKey,
        (localGtmGroupCounts.get(placement.groupKey) || 0) + 1
      ));
    site.gtm.antiAffinityFloor = config.resourceReduction.allowGtmGroupColocation
      ? Math.max(0, ...localGtmGroupCounts.values())
      : site.gtm.instances;
    site.management.antiAffinityFloor = site.management.instances;
  });
  return sites;
}

function buildTenantResourcePools(config) {
  const gtmPlacements = getGtmRolePlacements(config);
  const sharedTenants = config.tenantPlans.filter((tenant) => getTenantResourcePoolKey(tenant) === "shared");
  const pools = [{
    key: "shared",
    label: "现有集群共享服务器",
    tenantPlans: sharedTenants,
    managementNodes: config.managementNodes,
    gtmPlacements: gtmPlacements.filter((placement) => placement.resourcePoolKey === "shared")
  }];

  config.tenantPlans
    .filter((tenant) => getTenantResourcePoolKey(tenant) !== "shared")
    .forEach((tenant) => {
      const key = getTenantResourcePoolKey(tenant);
      pools.push({
        key,
        label: getTenantResourcePoolLabel(tenant),
        tenantPlans: [tenant],
        managementNodes: 0,
        gtmPlacements: gtmPlacements.filter((placement) => placement.resourcePoolKey === key)
      });
    });
  return pools;
}

function getGtmAntiAffinityFloor(placements, allowGroupColocation) {
  if (!placements.length) return 0;
  if (!allowGroupColocation) return placements.length;
  const groups = new Map();
  placements.forEach((placement) => groups.set(placement.groupKey, (groups.get(placement.groupKey) || 0) + 1));
  return Math.max(0, ...groups.values());
}

function buildReversePoolDemands(pool, config) {
  const tenantPlans = pool.tenantPlans;
  const totalCn = tenantPlans.reduce((sum, tenant) => sum + tenant.totalCn, 0);
  const totalDn = tenantPlans.reduce((sum, tenant) => sum + tenant.dnInstances, 0);
  const cnFloors = getCnPlacementFloors(
    tenantPlans,
    config.azCount,
    config.maxCnPerServer,
    config.resourceReduction.cnTenantPlacement,
    config.environment
  );
  const dnFloors = getDnPlacementFloors(
    tenantPlans,
    config.resourceReduction.maxTenantDnPerServer,
    config.resourceReduction.dnTenantPlacement
  );
  return {
    cn: {
      instances: totalCn,
      cpuCores: tenantPlans.reduce((sum, tenant) => sum + tenant.cnCpuDemand, 0),
      memoryGb: tenantPlans.reduce((sum, tenant) => sum + tenant.cnMemoryDemand, 0),
      diskTb: 0,
      ...cnFloors
    },
    dn: {
      instances: totalDn,
      cpuCores: tenantPlans.reduce((sum, tenant) => sum + tenant.dnCpuDemand, 0),
      memoryGb: tenantPlans.reduce((sum, tenant) => sum + tenant.dnMemoryDemand, 0),
      diskTb: 0,
      ...dnFloors
    },
    gtm: {
      instances: pool.gtmPlacements.length,
      cpuCores: pool.gtmPlacements.length * 4,
      memoryGb: pool.gtmPlacements.length * 8,
      diskTb: 0,
      antiAffinityFloor: getGtmAntiAffinityFloor(pool.gtmPlacements, config.resourceReduction.allowGtmGroupColocation)
    },
    management: {
      instances: pool.managementNodes,
      cpuCores: pool.managementNodes * 4,
      memoryGb: pool.managementNodes * 8,
      diskTb: 0,
      antiAffinityFloor: pool.managementNodes
    }
  };
}

function aggregateSiteComponentSizing(base, siteSizing) {
  const countFields = [
    "cnServers", "dnServers", "dnServersByDensity", "dnServersByCapacity", "gtmServers",
    "managementServers", "gtmManagementHostServers", "cnDnHostServers", "allComponentHostServers",
    "dedicatedServers", "strictBaselineServers", "gtmMgrMixedServers", "cnDnMixedServers",
    "cnDnGtmMgrMixedServers", "allMixedServers", "layoutServers", "cpuServers", "memoryServers"
  ];
  const result = { ...base, siteSizing };
  countFields.forEach((field) => {
    result[field] = siteSizing.reduce((sum, site) => sum + (site[field] || 0), 0);
  });
  result.requirements = Object.fromEntries(componentServerDefinitions.map(({ key }) => {
    const first = siteSizing[0].requirements[key];
    const summed = { ...first };
    ["servers", "byInstances", "byCpu", "byMemory", "byDisk", "byAffinity"].forEach((field) => {
      summed[field] = siteSizing.reduce((sum, site) => sum + site.requirements[key][field], 0);
    });
    return [key, summed];
  }));
  result.recommendedServers = result.layoutServers;
  result.savedServers = Math.max(0, result.strictBaselineServers - result.recommendedServers);
  result.savingRatio = result.strictBaselineServers ? result.savedServers / result.strictBaselineServers : 0;
  result.mixedServers = result.allMixedServers;
  result.mixedAnalyses = {
    gtmManagement: { ...base.mixedAnalyses.gtmManagement, servers: result.gtmManagementHostServers, bottleneck: "逐中心容量水位", detail: `逐中心独立计算后合计 ${result.gtmManagementHostServers} 台。` },
    cnDn: { ...base.mixedAnalyses.cnDn, servers: result.cnDnHostServers, bottleneck: "逐中心容量水位", detail: `逐中心独立计算后合计 ${result.cnDnHostServers} 台。` },
    all: { ...base.mixedAnalyses.all, servers: result.allMixedServers, bottleneck: "逐中心容量水位", detail: `逐中心独立计算后合计 ${result.allMixedServers} 台。` }
  };
  return result;
}

function buildBusinessServerSizing(config) {
  const storedDataTb = config.tenantPlans.reduce(
    (sum, tenant) => sum + tenant.futureDataTb * tenant.replicasPerShard,
    0
  );
  const dnPlacementFloors = getDnPlacementFloors(
    config.tenantPlans,
    config.resourceReduction.maxTenantDnPerServer,
    config.resourceReduction.dnTenantPlacement
  );
  const maxCnPerServer = config.componentSpecs.cn.maxInstances;
  const maxDnPerServer = config.componentSpecs.dn.maxInstances;
  const cnPlacementFloors = getCnPlacementFloors(
    config.tenantPlans,
    config.azCount,
    maxCnPerServer,
    config.resourceReduction.cnTenantPlacement,
    config.environment
  );
  const componentDemands = {
    cn: {
      instances: config.totalCn,
      cpuCores: config.tenantPlans.reduce((sum, tenant) => sum + tenant.cnCpuDemand, 0),
      memoryGb: config.tenantPlans.reduce((sum, tenant) => sum + tenant.cnMemoryDemand, 0),
      diskTb: 0,
      ...cnPlacementFloors
    },
    dn: {
      instances: config.dnInstances,
      cpuCores: config.tenantPlans.reduce((sum, tenant) => sum + tenant.dnCpuDemand, 0),
      memoryGb: config.tenantPlans.reduce((sum, tenant) => sum + tenant.dnMemoryDemand, 0),
      diskTb: storedDataTb,
      ...dnPlacementFloors
    },
    gtm: {
      instances: config.gtmNodes,
      cpuCores: config.gtmNodes * 4,
      memoryGb: config.gtmNodes * 8,
      diskTb: 0,
      antiAffinityFloor: config.resourceReduction.allowGtmGroupColocation && config.gtmBinding.groupCount
        ? Math.ceil(config.gtmNodes / config.gtmBinding.groupCount)
        : config.gtmNodes
    },
    management: { instances: config.managementNodes, cpuCores: config.managementNodes * 4, memoryGb: config.managementNodes * 8, diskTb: 0 }
  };
  const layoutResolution = resolveBusinessComponentLayout(
    config.requestedComponentLayout,
    config.requestedGtmAffinity,
    config.environment,
    config.componentSpecs,
    config.serverConfigMode
  );
  const resourcePools = buildTenantResourcePools(config);
  const siteComponentDemands = buildBusinessSiteDemands(config);
  const baseComponentSizing = calculateComponentServerCounts({
    environment: config.environment,
    effectiveLayout: layoutResolution.effectiveLayout,
    layoutResolution,
    azCount: config.azCount,
    componentSpecs: config.componentSpecs,
    componentDemands,
    reserveRatio: config.reserveRatio
  });
  const poolSizings = resourcePools.map((pool) => {
    const poolConfig = {
      ...config,
      tenantPlans: pool.tenantPlans,
      managementNodes: pool.managementNodes,
      gtmNodes: pool.gtmPlacements.length,
      gtmPlacements: pool.gtmPlacements
    };
    const poolSiteDemands = buildBusinessSiteDemands(poolConfig);
    const poolSiteSizing = poolSiteDemands.map((site) => calculateComponentServerCounts({
      environment: config.environment,
      effectiveLayout: layoutResolution.effectiveLayout,
      layoutResolution,
      azCount: 1,
      componentSpecs: config.componentSpecs,
      componentDemands: site,
      reserveRatio: config.reserveRatio
    }));
    return { ...pool, siteComponentDemands: poolSiteDemands, siteSizing: poolSiteSizing };
  });
  const componentSizing = aggregateSiteComponentSizing(
    baseComponentSizing,
    poolSizings.flatMap((pool) => pool.siteSizing)
  );
  componentSizing.poolSizings = poolSizings;
  const serverPlan = buildBusinessPhysicalServerPlan({
    azCount: config.azCount,
    mode: config.mode,
    environment: config.environment,
    componentLayout: componentSizing.effectiveLayout,
    componentSizing,
    componentSpecs: config.componentSpecs,
    totalCn: config.totalCn,
    dnInstances: config.dnInstances,
    tenantPlans: config.tenantPlans,
    gtmNodes: config.gtmNodes,
    gtmBinding: config.gtmBinding,
    managementNodes: config.managementNodes,
    maxDnPerServer,
    maxCnPerServer,
    maxTenantDnPerServer: config.resourceReduction.maxTenantDnPerServer,
    reserveRatio: config.reserveRatio,
    allowShardColocation: config.resourceReduction.allowShardColocation,
    allowGtmGroupColocation: config.resourceReduction.allowGtmGroupColocation,
    cnTenantPlacement: config.resourceReduction.cnTenantPlacement,
    dnTenantPlacement: config.resourceReduction.dnTenantPlacement
  });
  const cnTenantIsolationViolations = getCnTenantIsolationViolations(serverPlan, config.resourceReduction.cnTenantPlacement);
  const cnSameTenantHostViolations = getCnSameTenantHostViolations(serverPlan);
  const cnPlacementAudit = getCnPlacementAudit(serverPlan, config.tenantPlans, config.azCount);
  const dnTenantIsolationViolations = getDnTenantIsolationViolations(serverPlan, config.resourceReduction.dnTenantPlacement);
  const dnReplicaHostViolations = getDnReplicaHostViolations(serverPlan);
  const gtmReplicaHostViolations = getGtmReplicaHostViolations(serverPlan);
  const managementHostViolations = getManagementHostViolations(serverPlan);
  const controlPlaneAudit = getControlPlanePlacementAudit(serverPlan, config.managementNodes, config.gtmNodes);
  const tenantResourcePoolAudit = getTenantResourcePoolAudit(serverPlan, config.tenantPlans);
  const gtmGroupPlacementAudit = getGtmGroupPlacementAudit(serverPlan, config);
  const dnCenterDistribution = getDnCenterDistribution(serverPlan, config.mode, config.azCount);
  const capacityViolations = serverPlan.filter((server) => server.resourceAudit && !server.resourceAudit.withinWatermark);

  return {
    profile: config.serverProfile,
    profileLabel: serverProfileLabels[config.serverProfile],
    serverConfigMode: config.serverConfigMode,
    componentSpecs: config.componentSpecs,
    componentDemands,
    siteComponentDemands,
    requestedComponentLayout: config.requestedComponentLayout,
    requestedGtmAffinity: config.requestedGtmAffinity,
    resourceReduction: config.resourceReduction,
    componentLayout: componentSizing.effectiveLayout,
    componentLayoutLabel: componentSizing.effectiveLabel,
    componentLayoutNote: componentSizing.note,
    gtmAffinity: componentSizing.gtmAffinity,
    gtmAffinityLabel: componentSizing.gtmAffinityLabel,
    serverSpec: config.serverConfigMode === "customer" ? "客户机型与推荐规格混合" : "按组件推荐规格",
    usableSpec: "各组件规格扣除统一预留比例后分别计算",
    reserveRatio: config.reserveRatio,
    maxCnPerServer,
    maxDnPerServer,
    storedDataTb,
    cpuDemandCores: Object.values(componentDemands).reduce((sum, demand) => sum + demand.cpuCores, 0),
    memoryDemandGb: Object.values(componentDemands).reduce((sum, demand) => sum + demand.memoryGb, 0),
    ...componentSizing,
    serverPlan,
    cnTenantIsolationViolations,
    cnSameTenantHostViolations,
    cnPlacementAudit,
    dnTenantIsolationViolations,
    dnReplicaHostViolations,
    gtmReplicaHostViolations,
    managementHostViolations,
    controlPlaneAudit,
    tenantResourcePoolAudit,
    gtmGroupPlacementAudit,
    dnCenterDistribution,
    capacityViolations,
    perAzServers: getServerCountByAz(serverPlan, config.mode, config.azCount),
    deploymentStyle: componentSizing.effectiveLabel
  };
}

function calculateComponentServerCounts(config) {
  const requirements = Object.fromEntries(componentServerDefinitions.map(({ key }) => [
    key,
    calculateComponentRequirement(config.componentDemands[key], config.componentSpecs[key], config.reserveRatio)
  ]));
  const effectiveLayout = config.effectiveLayout;
  const cnServers = requirements.cn.servers;
  const dnServersByDensity = requirements.dn.byInstances;
  const dnServersByCapacity = requirements.dn.byDisk;
  const dnServers = requirements.dn.servers;
  const gtmServers = requirements.gtm.servers;
  const managementServers = requirements.management.servers;
  const dedicatedServers = cnServers + dnServers + gtmServers + managementServers;
  const strictDnRequirement = calculateComponentRequirement(
    config.componentDemands.dn,
    { ...config.componentSpecs.dn, maxInstances: 1 },
    config.reserveRatio
  );
  const strictBaselineServers = Math.max(
    config.azCount,
    cnServers + strictDnRequirement.servers + gtmServers + managementServers
  );
  const gtmManagementAnalysis = calculateMixedServerAnalysis(["gtm", "management"], config);
  const cnDnAnalysis = calculateMixedServerAnalysis(["cn", "dn"], config);
  const allComponentAnalysis = calculateMixedServerAnalysis(["cn", "dn", "gtm", "management"], config);
  const gtmManagementHostServers = gtmManagementAnalysis.servers;
  const cnDnHostServers = cnDnAnalysis.servers;
  const allComponentHostServers = allComponentAnalysis.servers;
  const gtmMgrMixedServers = cnServers + dnServers + gtmManagementHostServers;
  const cnDnMixedServers = cnDnHostServers + gtmServers + managementServers;
  const cnDnGtmMgrMixedServers = cnDnHostServers + gtmManagementHostServers;
  const allMixedServers = allComponentHostServers;
  const layoutServers = {
    dedicated: dedicatedServers,
    gtmMgrMixed: gtmMgrMixedServers,
    cnDnMixed: cnDnMixedServers,
    cnDnGtmMgrMixed: cnDnGtmMgrMixedServers,
    allMixed: allMixedServers
  }[effectiveLayout];
  const recommendedServers = Math.max(config.azCount, layoutServers);
  const savedServers = Math.max(0, strictBaselineServers - recommendedServers);
  const savingRatio = strictBaselineServers ? savedServers / strictBaselineServers : 0;

  return {
    effectiveLayout,
    effectiveLabel: componentLayoutLabels[effectiveLayout],
    note: config.layoutResolution.note,
    gtmAffinity: getEffectiveGtmAffinity(effectiveLayout),
    gtmAffinityLabel: gtmAffinityLabels[getEffectiveGtmAffinity(effectiveLayout)],
    requirements,
    cnServers,
    dnServers,
    dnServersByDensity,
    dnServersByCapacity,
    gtmServers,
    managementServers,
    gtmManagementHostServers,
    cnDnHostServers,
    allComponentHostServers,
    dedicatedServers,
    strictBaselineServers,
    savedServers,
    savingRatio,
    gtmMgrMixedServers,
    cnDnMixedServers,
    cnDnGtmMgrMixedServers,
    allMixedServers,
    mixedAnalyses: {
      gtmManagement: gtmManagementAnalysis,
      cnDn: cnDnAnalysis,
      all: allComponentAnalysis
    },
    mixedServers: allMixedServers,
    layoutServers,
    cpuServers: requirements.cn.byCpu + requirements.dn.byCpu + requirements.gtm.byCpu + requirements.management.byCpu,
    memoryServers: requirements.cn.byMemory + requirements.dn.byMemory + requirements.gtm.byMemory + requirements.management.byMemory,
    recommendedServers
  };
}

function calculateComponentRequirement(demand, spec, reserveRatio) {
  if (!demand.instances) {
    return { servers: 0, byInstances: 0, byCpu: 0, byMemory: 0, byDisk: 0, byAffinity: 0, usableCores: 0, usableMemoryGb: 0, usableDiskTb: 0 };
  }
  const usableCores = Math.max(1, Math.floor(spec.cores * (1 - reserveRatio)));
  const usableMemoryGb = Math.max(1, Math.floor(spec.memoryGb * (1 - reserveRatio)));
  const usableDiskTb = Math.max(0.1, spec.diskTb * (1 - reserveRatio));
  const cpuPerInstance = demand.cpuCores / Math.max(1, demand.instances);
  const memoryPerInstance = demand.memoryGb / Math.max(1, demand.instances);
  const diskPerInstance = demand.diskTb / Math.max(1, demand.instances);
  const effectiveMaxInstances = Math.max(1, Math.min(
    spec.maxInstances,
    cpuPerInstance ? Math.floor(usableCores / cpuPerInstance) : spec.maxInstances,
    memoryPerInstance ? Math.floor(usableMemoryGb / memoryPerInstance) : spec.maxInstances,
    diskPerInstance ? Math.floor(usableDiskTb / diskPerInstance) : spec.maxInstances
  ));
  const byInstances = Math.ceil(demand.instances / effectiveMaxInstances);
  const byCpu = Math.ceil(demand.cpuCores / usableCores);
  const byMemory = Math.ceil(demand.memoryGb / usableMemoryGb);
  const byDisk = demand.diskTb ? Math.ceil(demand.diskTb / usableDiskTb) : 0;
  const byAffinity = Math.max(
    demand.antiAffinityFloor || 0,
    demand.tenantHostFloor || 0,
    demand.isolationFloor || 0
  );
  return {
    servers: Math.max(byInstances, byCpu, byMemory, byDisk, byAffinity),
    byInstances,
    byCpu,
    byMemory,
    byDisk,
    byAffinity,
    usableCores,
    usableMemoryGb,
    usableDiskTb,
    effectiveMaxInstances
  };
}

function calculateMixedServerCount(keys, config) {
  return calculateMixedServerAnalysis(keys, config).servers;
}

function calculateMixedServerAnalysis(keys, config) {
  if (!areComponentSpecsCompatible(config.componentSpecs, keys)) {
    const servers = keys.reduce((sum, key) => sum + calculateComponentRequirement(
      config.componentDemands[key],
      config.componentSpecs[key],
      config.reserveRatio
    ).servers, 0);
    return {
      servers,
      compatible: false,
      bottleneck: "机型不兼容",
      detail: "组件录入的机型/架构/资源规格不同，不能按同一物理服务器装箱，台数等于分层部署之和。"
    };
  }
  const hostSpec = keys
    .map((key) => config.componentSpecs[key])
    .sort((a, b) => (b.cores + b.memoryGb + b.diskTb) - (a.cores + a.memoryGb + a.diskTb))[0];
  const demand = keys.reduce((total, key) => ({
    cpuCores: total.cpuCores + config.componentDemands[key].cpuCores,
    memoryGb: total.memoryGb + config.componentDemands[key].memoryGb,
    diskTb: total.diskTb + config.componentDemands[key].diskTb
  }), { cpuCores: 0, memoryGb: 0, diskTb: 0 });
  const usableCores = Math.max(1, Math.floor(hostSpec.cores * (1 - config.reserveRatio)));
  const usableMemoryGb = Math.max(1, Math.floor(hostSpec.memoryGb * (1 - config.reserveRatio)));
  const usableDiskTb = Math.max(0.1, hostSpec.diskTb * (1 - config.reserveRatio));
  const densityFloor = Math.max(...keys.map((key) => Math.ceil(config.componentDemands[key].instances / config.componentSpecs[key].maxInstances)));
  const affinityFloor = Math.max(...keys.map((key) => Math.max(
    config.componentDemands[key].antiAffinityFloor || 0,
    config.componentDemands[key].tenantHostFloor || 0,
    config.componentDemands[key].isolationFloor || 0
  )));
  const byCpu = Math.ceil(demand.cpuCores / usableCores);
  const byMemory = Math.ceil(demand.memoryGb / usableMemoryGb);
  const byDisk = demand.diskTb ? Math.ceil(demand.diskTb / usableDiskTb) : 0;
  const dimensions = [
    ["实例密度", densityFloor],
    ["副本反亲和/租户隔离", affinityFloor],
    ["CPU", byCpu],
    ["内存", byMemory],
    ["磁盘", byDisk]
  ];
  const servers = Math.max(...dimensions.map(([, count]) => count));
  const bottlenecks = dimensions.filter(([, count]) => count === servers && count > 0).map(([name]) => name);
  return {
    servers,
    compatible: true,
    bottleneck: bottlenecks.join("+") || "无实例",
    detail: `共享主机按 Max(实例密度 ${densityFloor}, 反亲和/隔离 ${affinityFloor}, CPU ${byCpu}, 内存 ${byMemory}, 磁盘 ${byDisk}) = ${servers} 台；混部只在不同组件的剩余资源可互补时减少台数。`
  };
}

function resolveBusinessComponentLayout(requested, requestedGtmAffinity, environment, specs, serverConfigMode) {
  const baseLayout = resolveComponentLayout(requested, environment);
  const affinity = requestedGtmAffinity === "auto" ? "auto" : requestedGtmAffinity;
  let preferred = baseLayout;
  let affinityNote = "";

  if (affinity === "dedicated") {
    if (baseLayout === "gtmMgrMixed") preferred = "dedicated";
    if (baseLayout === "allMixed") preferred = "cnDnMixed";
    affinityNote = "已按 GTM 独立部署优先级拆分 GTM 与管理节点。";
  } else if (affinity === "management") {
    preferred = ["cnDnMixed", "allMixed"].includes(baseLayout) ? "cnDnGtmMgrMixed" : "gtmMgrMixed";
    affinityNote = "已按 GTM 亲和策略建立 GTM + 管理节点主机组。";
  }

  const needsCnDnMix = ["cnDnMixed", "cnDnGtmMgrMixed", "allMixed"].includes(preferred);
  const needsGtmManagementMix = ["gtmMgrMixed", "cnDnGtmMgrMixed", "allMixed"].includes(preferred);
  const cnDnCompatible = !needsCnDnMix || areComponentSpecsCompatible(specs, ["cn", "dn"]);
  const gtmManagementCompatible = !needsGtmManagementMix || areComponentSpecsCompatible(specs, ["gtm", "management"]);
  const allComponentsCompatible = preferred !== "allMixed" || areComponentSpecsCompatible(specs, ["cn", "dn", "gtm", "management"]);

  if (serverConfigMode === "customer" && (!cnDnCompatible || !gtmManagementCompatible || !allComponentsCompatible)) {
    if (cnDnCompatible && gtmManagementCompatible) preferred = "cnDnGtmMgrMixed";
    if (cnDnCompatible && !gtmManagementCompatible) preferred = needsCnDnMix ? "cnDnMixed" : "dedicated";
    if (!cnDnCompatible && gtmManagementCompatible) preferred = needsGtmManagementMix ? "gtmMgrMixed" : "dedicated";
    if (!cnDnCompatible && !gtmManagementCompatible) preferred = "dedicated";
    affinityNote += " 客户机型不兼容的混部组已自动拆分。";
  }

  return {
    effectiveLayout: preferred,
    note: `${affinityNote} ${getComponentLayoutNote(preferred, environment)}`.trim()
  };
}

function getEffectiveGtmAffinity(layout) {
  if (["gtmMgrMixed", "cnDnGtmMgrMixed"].includes(layout)) return "management";
  if (layout === "allMixed") return "tenantPool";
  return "dedicated";
}

function areComponentSpecsCompatible(specs, keys) {
  const selected = keys.map((key) => specs[key]).filter(Boolean);
  if (selected.every((spec) => spec.source === "recommended")) return true;
  if (!selected.length || selected.some((spec) => spec.source !== "customer")) return false;
  const first = selected[0];
  return selected.every((spec) =>
    spec.model === first.model &&
    spec.arch === first.arch &&
    spec.os === first.os &&
    spec.cpuModel === first.cpuModel &&
    spec.sockets === first.sockets &&
    spec.cores === first.cores &&
    spec.memoryGb === first.memoryGb &&
    spec.network === first.network &&
    spec.systemDisk === first.systemDisk &&
    spec.diskTb === first.diskTb
  );
}

function resolveComponentLayout(requested, environment) {
  if (requested && requested !== "auto") return requested;
  return environment === "poc" ? "allMixed" : "gtmMgrMixed";
}

function getComponentLayoutNote(layout, environment) {
  if (layout === "dedicated") return "CN、DN、GTM、管理节点分别部署，隔离性最好，服务器成本最高。";
  if (layout === "gtmMgrMixed") return "参考公开核心系统案例，GTM 可与管理节点合设，CN 与 DN 仍保持分层。";
  if (layout === "cnDnMixed") return "CN 与 DN 合设可降低服务器数量，但计算、存储和 IO 会互相影响，生产需压测确认。";
  if (layout === "cnDnGtmMgrMixed") return "CN+DN 与 GTM+管理分成两个混部主机组，分别计算资源并隔离故障域。";
  if (layout === "allMixed") return environment === "poc"
    ? "适合 POC、功能验证或非核心库，公开案例中非核心库存在管理/GTM 与 CN/DN 合设方式。"
    : "全混布会放大故障域，核心生产不建议直接采用。";
  return "自动按环境推荐组件组合方式。";
}

function getBusinessProfileAdjust(profile) {
  if (profile === "performance") return { cn: 1.25, dn: 0.8 };
  if (profile === "storage") return { cn: 0.8, dn: 1.25 };
  return { cn: 1, dn: 1 };
}

function distributeCount(total, buckets) {
  return Array.from({ length: buckets }, (_, index) => {
    const base = Math.floor(total / buckets);
    return base + (index < total % buckets ? 1 : 0);
  });
}

function distributeHostGroupCount(total, buckets, mode, componentKeys) {
  if (mode !== "twoSiteThreeDc" || buckets !== 3 || !componentKeys.includes("dn") || total < 3) {
    return distributeCount(total, buckets);
  }
  const candidates = [];
  for (let disasterCount = 1; disasterCount <= total - 2; disasterCount += 1) {
    const primaryTotal = total - disasterCount;
    if (primaryTotal % 2 !== 0) continue;
    candidates.push({
      disasterCount,
      primaryCount: primaryTotal / 2,
      distance: Math.abs(disasterCount - total / 3)
    });
  }
  const selected = candidates.sort((a, b) => a.distance - b.distance || a.disasterCount - b.disasterCount)[0];
  return selected
    ? [selected.primaryCount, selected.primaryCount, selected.disasterCount]
    : distributeCount(total, buckets);
}

function buildBusinessPhysicalServerPlan(config) {
  assertPlanningScale(config.componentSizing.recommendedServers, "servers");
  const azNames = getAzNames(config.mode, config.azCount);
  const groupedByAz = azNames.map(() => []);

  const poolSizings = config.componentSizing.poolSizings || [{
    key: "shared",
    label: "现有集群共享服务器",
    siteSizing: config.componentSizing.siteSizing
  }];
  poolSizings.forEach((pool) => {
    pool.siteSizing.forEach((siteSizing, azIndex) => {
      getBusinessHostGroups(config.componentLayout, siteSizing).forEach((group) => {
        assertPlanningScale(groupedByAz.reduce((sum, sites) => sum + sites.length, 0) + group.count, "servers");
        for (let index = 0; index < group.count; index += 1) {
          groupedByAz[azIndex].push({
            ...group,
            tenantPool: pool.key,
            tenantPoolLabel: pool.label
          });
        }
      });
    });
  });

  const allocated = groupedByAz.reduce((sum, list) => sum + list.length, 0);
  distributeCount(Math.max(0, config.componentSizing.recommendedServers - allocated), config.azCount)
    .forEach((count, azIndex) => {
      for (let index = 0; index < count; index += 1) {
        groupedByAz[azIndex].push({ key: "reserve", label: "故障接管预留", componentKeys: [], count: 1, tenantPool: "shared", tenantPoolLabel: "现有集群共享服务器" });
      }
    });

  let serverNo = 0;
  const servers = groupedByAz.flatMap((groupsInAz, azIndex) => groupsInAz.map((group, localIndex) => {
    serverNo += 1;
    const spec = getHostSpecForKeys(group.componentKeys, config.componentSpecs);
    return {
      id: `Server-${String(serverNo).padStart(2, "0")}`,
      az: azNames[azIndex],
      azIndex,
      rack: `机柜${azIndex + 1}-${Math.floor(localIndex / 3) + 1}`,
      hostGroup: group.label,
      tenantPool: group.tenantPool || "shared",
      tenantPoolLabel: group.tenantPoolLabel || "现有集群共享服务器",
      componentKeys: group.componentKeys,
      spec,
      roles: [],
      dnCount: 0,
      cnCount: 0
    };
  }));

  placeTenantCnRolesByPool(servers, config);
  placeDnRolesByPool(servers, config);
  placeGtmRolesByPool(servers, config);
  placeManagementRolesByPool(servers, config);

  return servers.map((server) => {
    const resourceAudit = getServerResourceAudit(server, config);
    return {
      ...server,
      resourceAudit,
      cpuLoad: resourceAudit ? resourceAudit.cpuPercent : estimateServerCpu(server, config.environment),
      diskLoad: resourceAudit ? resourceAudit.diskPercent : estimateServerDisk(server, config)
    };
  });
}

function getBusinessHostGroups(layout, sizing) {
  if (layout === "gtmMgrMixed") {
    return [
      { key: "cn", label: "CN 计算服务器", componentKeys: ["cn"], count: sizing.cnServers },
      { key: "dn", label: "DN 存储服务器", componentKeys: ["dn"], count: sizing.dnServers },
      { key: "gtmManagement", label: "GTM + 管理服务器", componentKeys: ["gtm", "management"], count: sizing.gtmManagementHostServers }
    ];
  }
  if (layout === "cnDnMixed") {
    return [
      { key: "cnDn", label: "CN + DN 混合服务器", componentKeys: ["cn", "dn"], count: sizing.cnDnHostServers },
      { key: "gtm", label: "GTM 事务服务器", componentKeys: ["gtm"], count: sizing.gtmServers },
      { key: "management", label: "管理服务器", componentKeys: ["management"], count: sizing.managementServers }
    ];
  }
  if (layout === "cnDnGtmMgrMixed") {
    return [
      { key: "cnDn", label: "CN + DN 混合服务器", componentKeys: ["cn", "dn"], count: sizing.cnDnHostServers },
      { key: "gtmManagement", label: "GTM + 管理服务器", componentKeys: ["gtm", "management"], count: sizing.gtmManagementHostServers }
    ];
  }
  if (layout === "allMixed") {
    return [{
      key: "all",
      label: "CN + DN + GTM + 管理混合服务器",
      componentKeys: ["cn", "dn", "gtm", "management"],
      count: sizing.allComponentHostServers
    }];
  }
  return [
    { key: "cn", label: "CN 计算服务器", componentKeys: ["cn"], count: sizing.cnServers },
    { key: "dn", label: "DN 存储服务器", componentKeys: ["dn"], count: sizing.dnServers },
    { key: "gtm", label: "GTM 事务服务器", componentKeys: ["gtm"], count: sizing.gtmServers },
    { key: "management", label: "管理服务器", componentKeys: ["management"], count: sizing.managementServers }
  ];
}

function getHostSpecForKeys(keys, specs) {
  if (!keys.length) return null;
  return keys
    .map((key) => specs[key])
    .filter(Boolean)
    .sort((a, b) => (b.cores + b.memoryGb + b.diskTb) - (a.cores + a.memoryGb + a.diskTb))[0] || null;
}

function getEligibleServers(servers, componentKey, azIndex, tenantPool = null) {
  const eligible = servers.filter((server) =>
    server.componentKeys.includes(componentKey) && (!tenantPool || server.tenantPool === tenantPool)
  );
  const local = eligible.filter((server) => server.azIndex === azIndex);
  return local.length ? local : eligible;
}

function countTenantDnRoles(server, tenantName) {
  return server.roles.filter((role) => role.startsWith(`${tenantName}-DN-G`)).length;
}

function getServerDnTenants(server) {
  return [...new Set(server.roles.map(parseDnPlacementRole).filter(Boolean).map((item) => item.tenant))];
}

function hasDnGroupRole(server, tenantName, group) {
  return server.roles.some((role) => role.startsWith(`${tenantName}-DN-G${group}-`));
}

function parseCnTenant(role) {
  const match = role.match(/^(.*)-CN\d+$/);
  return match ? match[1] : null;
}

function getServerCnTenants(server) {
  return [...new Set(server.roles.map(parseCnTenant).filter(Boolean))];
}

function getRoleResourceDemand(role, tenantPlans) {
  const cnTenant = parseCnTenant(role);
  const dnRole = parseDnPlacementRole(role);
  const tenantName = cnTenant || dnRole?.tenant;
  const tenant = tenantPlans.find((item) => item.name === tenantName);
  if (cnTenant && tenant) return { cpu: tenant.cnCores, memory: tenant.cnMemoryGb, disk: 0 };
  if (dnRole && tenant) return {
    cpu: tenant.dnCores,
    memory: tenant.dnMemoryGb,
    disk: tenant.futureDataTb / Math.max(1, tenant.shardCount)
  };
  if (isGtmRole(role)) return { cpu: 4, memory: 8, disk: 0 };
  if (role === "管理节点") return { cpu: 4, memory: 8, disk: 0 };
  return { cpu: 0, memory: 0, disk: 0 };
}

function getServerResourceAudit(server, config, extraDemand = null) {
  if (!server.spec) return null;
  const used = server.roles.reduce((total, role) => {
    const demand = getRoleResourceDemand(role, config.tenantPlans);
    return { cpu: total.cpu + demand.cpu, memory: total.memory + demand.memory, disk: total.disk + demand.disk };
  }, { cpu: 0, memory: 0, disk: 0 });
  if (extraDemand) {
    used.cpu += extraDemand.cpu;
    used.memory += extraDemand.memory;
    used.disk += extraDemand.disk;
  }
  const reserveRatio = Math.min(0.8, Math.max(0, config.reserveRatio || 0));
  const usable = {
    cpu: Math.max(1, server.spec.cores * (1 - reserveRatio)),
    memory: Math.max(1, server.spec.memoryGb * (1 - reserveRatio)),
    disk: Math.max(0.1, server.spec.diskTb * (1 - reserveRatio))
  };
  return {
    used,
    usable,
    cpuPercent: Math.round((used.cpu / server.spec.cores) * 100),
    memoryPercent: Math.round((used.memory / server.spec.memoryGb) * 100),
    diskPercent: Math.round((used.disk / server.spec.diskTb) * 100),
    withinWatermark: used.cpu <= usable.cpu && used.memory <= usable.memory && used.disk <= usable.disk
  };
}

function canPlaceRoleWithinWatermark(server, role, config) {
  const audit = getServerResourceAudit(server, config, getRoleResourceDemand(role, config.tenantPlans));
  return !audit || audit.withinWatermark;
}

function placeTenantCnRolesByPool(servers, config) {
  config.tenantPlans.forEach((tenant) => {
    let roleIndex = 0;
    const cnByAz = tenant.cnByAz || Array.from({ length: config.azCount }, () => tenant.cnPerAz);
    cnByAz.forEach((siteCount, azIndex) => {
      for (let index = 0; index < siteCount; index += 1) {
        roleIndex += 1;
      const candidates = getEligibleServers(servers, "cn", azIndex, getTenantResourcePoolKey(tenant));
      const comparePlacement = (a, b) => {
        const aTenants = getServerCnTenants(a);
        const bTenants = getServerCnTenants(b);
        const sameTenantDelta = a.roles.filter((role) => parseCnTenant(role) === tenant.name).length
          - b.roles.filter((role) => parseCnTenant(role) === tenant.name).length;
        if (config.cnTenantPlacement === "isolated") {
          const existingTenantDelta = Number(!aTenants.includes(tenant.name)) - Number(!bTenants.includes(tenant.name));
          return existingTenantDelta || sameTenantDelta || a.cnCount - b.cnCount || a.roles.length - b.roles.length || a.id.localeCompare(b.id);
        }
        const tenantVarietyDelta = aTenants.length - bTenants.length;
        return sameTenantDelta || a.cnCount - b.cnCount || tenantVarietyDelta || a.roles.length - b.roles.length || a.id.localeCompare(b.id);
      };
      const roleName = `${tenant.name}-CN${roleIndex}`;
      const capacityCandidates = candidates
        .filter((server) => server.cnCount < config.maxCnPerServer && canPlaceRoleWithinWatermark(server, roleName, config));
      const antiAffinityCandidates = capacityCandidates
        .filter((server) => config.environment !== "production"
          || !server.roles.some((role) => parseCnTenant(role) === tenant.name));
      const policyCandidates = antiAffinityCandidates
        .filter((server) => config.cnTenantPlacement === "shared"
          || getServerCnTenants(server).every((name) => name === tenant.name))
        .sort(comparePlacement);
      const target = config.environment === "production"
        ? policyCandidates[0]
        : policyCandidates[0]
          || capacityCandidates.sort(comparePlacement)[0]
          || candidates.sort(comparePlacement)[0];
      if (!target) continue;
      target.roles.push(roleName);
      target.cnCount += 1;
      }
    });
  });
}

function getCnTenantIsolationViolations(serverPlan, cnTenantPlacement) {
  if (cnTenantPlacement !== "isolated") return [];
  return serverPlan
    .map((server) => ({ serverId: server.id, tenants: getServerCnTenants(server) }))
    .filter((item) => item.tenants.length > 1);
}

function getCnSameTenantHostViolations(serverPlan) {
  const violations = [];
  serverPlan.forEach((server) => {
    const counts = new Map();
    server.roles.map(parseCnTenant).filter(Boolean).forEach((tenant) => {
      counts.set(tenant, (counts.get(tenant) || 0) + 1);
    });
    counts.forEach((count, tenant) => {
      if (count > 1) violations.push({ serverId: server.id, tenant, count });
    });
  });
  return violations;
}

function getCnPlacementAudit(serverPlan, tenantPlans, azCount) {
  const tenants = tenantPlans.map((tenant) => {
    const requested = tenant.cnByAz
      ? tenant.cnByAz.reduce((sum, count) => sum + count, 0)
      : tenant.cnPerAz * azCount;
    const actual = serverPlan.reduce((sum, server) =>
      sum + server.roles.filter((role) => parseCnTenant(role) === tenant.name).length, 0);
    return { tenant: tenant.name, requested, actual, complete: actual === requested };
  });
  return {
    requested: tenants.reduce((sum, tenant) => sum + tenant.requested, 0),
    actual: tenants.reduce((sum, tenant) => sum + tenant.actual, 0),
    tenants,
    complete: tenants.every((tenant) => tenant.complete)
  };
}

function placeDnRolesByPool(servers, config) {
  config.tenantPlans.forEach((tenant) => {
    for (let group = 1; group <= tenant.shardCount; group += 1) {
      for (let replica = 1; replica <= tenant.replicasPerShard; replica += 1) {
        const role = replica === 1 ? "Master" : `Slave${replica - 1}`;
        const azIndex = (group + replica - 2) % config.azCount;
        const tenantPool = getTenantResourcePoolKey(tenant);
        const candidates = servers.filter((server) => server.componentKeys.includes("dn") && server.tenantPool === tenantPool);
        const withoutSameGroup = candidates.filter((server) => !hasDnGroupRole(server, tenant.name, group));
        const comparePlacement = (a, b) => {
          const azDelta = Number(b.azIndex === azIndex) - Number(a.azIndex === azIndex);
          if (azDelta) return azDelta;
          const aTenantDn = countTenantDnRoles(a, tenant.name);
          const bTenantDn = countTenantDnRoles(b, tenant.name);
          if (config.dnTenantPlacement === "shared") {
            const aCrossTenant = getServerDnTenants(a).some((name) => name !== tenant.name);
            const bCrossTenant = getServerDnTenants(b).some((name) => name !== tenant.name);
            const crossTenantDelta = Number(bCrossTenant) - Number(aCrossTenant);
            if (crossTenantDelta) return crossTenantDelta;
          }
          if (config.allowShardColocation) {
            if (config.environment === "production" && aTenantDn !== bTenantDn) {
              return aTenantDn - bTenantDn;
            }
            const tenantPresenceDelta = Number(bTenantDn > 0) - Number(aTenantDn > 0);
            if (tenantPresenceDelta) return tenantPresenceDelta;
            if (aTenantDn !== bTenantDn) return bTenantDn - aTenantDn;
          }
          return a.dnCount - b.dnCount || a.roles.length - b.roles.length;
        };
        const roleName = `${tenant.name}-DN-G${group}-${role}`;
        const eligible = withoutSameGroup
          .filter((server) =>
            server.dnCount < config.maxDnPerServer &&
            countTenantDnRoles(server, tenant.name) < config.maxTenantDnPerServer &&
            canPlaceRoleWithinWatermark(server, roleName, config) &&
            (config.dnTenantPlacement === "shared"
              || getServerDnTenants(server).every((name) => name === tenant.name))
          )
          .sort(comparePlacement);
        const capacityFallback = withoutSameGroup
          .filter((server) => server.dnCount < config.maxDnPerServer)
          .sort(comparePlacement);
        const target = eligible[0]
          || capacityFallback[0]
          || withoutSameGroup.sort(comparePlacement)[0]
          || candidates.sort(comparePlacement)[0];
        if (!target) continue;
        target.roles.push(roleName);
        target.dnCount += 1;
      }
    }
  });
}

function getDnTenantIsolationViolations(serverPlan, dnTenantPlacement) {
  if (dnTenantPlacement !== "isolated") return [];
  return serverPlan
    .map((server) => ({ serverId: server.id, tenants: getServerDnTenants(server) }))
    .filter((item) => item.tenants.length > 1);
}

function getControlPlanePlacementAudit(serverPlan, managementNodes, gtmNodes) {
  const actualManagementNodes = serverPlan.reduce(
    (sum, server) => sum + server.roles.filter((role) => role === "管理节点").length,
    0
  );
  const actualGtmNodes = serverPlan.reduce(
    (sum, server) => sum + server.roles.filter(isGtmRole).length,
    0
  );
  return {
    requestedManagementNodes: managementNodes,
    actualManagementNodes,
    requestedGtmNodes: gtmNodes,
    actualGtmNodes,
    complete: actualManagementNodes === managementNodes && actualGtmNodes === gtmNodes
  };
}

function getTenantResourcePoolAudit(serverPlan, tenantPlans) {
  const tenantByName = new Map(tenantPlans.map((tenant) => [tenant.name, tenant]));
  const violations = [];
  serverPlan.forEach((server) => {
    server.roles.forEach((role) => {
      const tenantName = parseCnTenant(role)
        || parseDnPlacementRole(role)?.tenant
        || (/^(.*)-GTM\d+$/.exec(role)?.[1]);
      const tenant = tenantByName.get(tenantName);
      const expectedPool = tenant ? getTenantResourcePoolKey(tenant) : "shared";
      if (server.tenantPool !== expectedPool) {
        violations.push({ serverId: server.id, role, expectedPool, actualPool: server.tenantPool || "shared" });
      }
    });
  });
  return {
    complete: violations.length === 0,
    violations,
    dedicatedPools: tenantPlans
      .filter((tenant) => tenant.deploymentStrategy === "dedicated")
      .map((tenant) => ({
        tenant: tenant.name,
        poolKey: getTenantResourcePoolKey(tenant),
        servers: serverPlan.filter((server) => server.tenantPool === getTenantResourcePoolKey(tenant)).length
      }))
  };
}

function getGtmGroupPlacementAudit(serverPlan, config) {
  const expected = new Map();
  getGtmRolePlacements(config).forEach((placement) => {
    expected.set(placement.groupKey, (expected.get(placement.groupKey) || 0) + 1);
  });
  const actual = new Map();
  serverPlan.forEach((server) => server.roles.forEach((role) => {
    const groupKey = getGtmRoleGroupKey(role);
    if (groupKey) actual.set(groupKey, (actual.get(groupKey) || 0) + 1);
  }));
  const groups = [...new Set([...expected.keys(), ...actual.keys()])].map((groupKey) => ({
    groupKey,
    expected: expected.get(groupKey) || 0,
    actual: actual.get(groupKey) || 0
  }));
  return { groups, complete: groups.every((group) => group.actual === group.expected) };
}

function getDnCenterDistribution(serverPlan, mode, azCount) {
  const centers = getAzNames(mode, azCount).map((az) => {
    const servers = serverPlan.filter((server) => server.az === az);
    return {
      az,
      instances: servers.reduce((sum, server) => sum + server.roles.filter(isDnRole).length, 0),
      hosts: servers.filter((server) => server.roles.some(isDnRole)).length
    };
  });
  const primaryDelta = centers.length >= 2 ? Math.abs(centers[0].hosts - centers[1].hosts) : 0;
  return {
    centers,
    primaryDelta,
    balanced: primaryDelta <= 1,
    explanation: primaryDelta
      ? "DN 副本和物理服务器均为整数；总 DN 主机数无法整除生产中心数时，A/B 会出现 1 台取整差。Group 角色按中心轮转，应同时核对副本实例分布与反亲和。"
      : "同城生产中心 A/B 的 DN 物理主机数已对称；异地中心按灾备副本和接管能力单独规划。"
  };
}

function getDnReplicaHostViolations(serverPlan) {
  const groupHosts = new Map();
  serverPlan.forEach((server) => {
    server.roles.forEach((role) => {
      const match = role.match(/^(.*)-DN-G(\d+)-/);
      if (!match) return;
      const key = `${match[1]}-G${match[2]}`;
      if (!groupHosts.has(key)) groupHosts.set(key, []);
      groupHosts.get(key).push(server.id);
    });
  });
  return [...groupHosts.entries()]
    .filter(([, hosts]) => new Set(hosts).size !== hosts.length)
    .map(([group, hosts]) => ({ group, hosts }));
}

function placeGtmRolesByPool(servers, config) {
  const allowGroupColocation = Boolean(config.allowGtmGroupColocation);
  const maxPerServer = Math.max(1, config.componentSpecs?.gtm?.maxInstances || 2);
  getGtmRolePlacements(config).forEach((placement) => {
    const candidates = servers
      .filter((server) => server.componentKeys.includes("gtm") && server.tenantPool === placement.resourcePoolKey);
    const withoutSameGroup = candidates.filter((server) =>
      !server.roles.some((role) => getGtmRoleGroupKey(role) === placement.groupKey)
    );
    const policyCandidates = withoutSameGroup
      .filter((server) => allowGroupColocation || countMatchingRole(server, isGtmRole) === 0)
      .sort((a, b) => {
        const azDelta = Number(b.azIndex === placement.azIndex) - Number(a.azIndex === placement.azIndex);
        if (azDelta) return azDelta;
        const aCount = countMatchingRole(a, isGtmRole);
        const bCount = countMatchingRole(b, isGtmRole);
        const packingDelta = allowGroupColocation
          ? Number(aCount === 0) - Number(bCount === 0) || bCount - aCount
          : aCount - bCount;
        return packingDelta || a.roles.length - b.roles.length || a.id.localeCompare(b.id);
      });
    const target = policyCandidates.find((server) =>
      countMatchingRole(server, isGtmRole) < maxPerServer &&
      canPlaceRoleWithinWatermark(server, placement.label, config)
    )
      || policyCandidates.find((server) => countMatchingRole(server, isGtmRole) < maxPerServer);
    if (target) target.roles.push(placement.label);
  });
}

function getGtmRolePlacements(config) {
  if (!config.gtmNodes) return [];
  const binding = config.gtmBinding || { kind: "shared", groupCount: 1 };
  const groupCount = Math.max(1, binding.groupCount || 1);
  const distributedTenants = (config.tenantPlans || []).filter((tenant) => tenant.isDistributed);
  const baseCount = Math.floor(config.gtmNodes / groupCount);
  const remainder = config.gtmNodes % groupCount;
  const placements = [];
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const replicas = baseCount + (groupIndex < remainder ? 1 : 0);
    const tenant = distributedTenants[groupIndex];
    const groupKey = binding.kind === "dedicated" && tenant ? `${tenant.name}-GTM` : "GTM-SYS";
    for (let replica = 1; replica <= replicas; replica += 1) {
      placements.push({
        groupKey,
        label: groupKey === "GTM-SYS" ? `GTM-SYS${replica}` : `${tenant.name}-GTM${replica}`,
        tenantName: binding.kind === "dedicated" && tenant ? tenant.name : null,
        resourcePoolKey: binding.kind === "dedicated" && tenant
          ? getTenantResourcePoolKey(tenant)
          : "shared",
        azIndex: (replica - 1) % config.azCount
      });
    }
  }
  return placements;
}

function getGtmRoleGroupKey(role) {
  if (/^GTM-SYS\d+$/.test(role)) return "GTM-SYS";
  const tenantMatch = role.match(/^(.*)-GTM\d+$/);
  return tenantMatch ? `${tenantMatch[1]}-GTM` : null;
}

function getGtmReplicaHostViolations(serverPlan) {
  const groupHosts = new Map();
  serverPlan.forEach((server) => {
    server.roles.forEach((role) => {
      const groupKey = getGtmRoleGroupKey(role);
      if (!groupKey) return;
      if (!groupHosts.has(groupKey)) groupHosts.set(groupKey, []);
      groupHosts.get(groupKey).push(server.id);
    });
  });
  return [...groupHosts.entries()]
    .filter(([, hosts]) => new Set(hosts).size !== hosts.length)
    .map(([group, hosts]) => ({ group, hosts }));
}

function getManagementHostViolations(serverPlan) {
  return serverPlan
    .filter((server) => server.roles.filter((role) => role === "管理节点").length > 1)
    .map((server) => server.id);
}

function placeManagementRolesByPool(servers, config) {
  for (let index = 0; index < config.managementNodes; index += 1) {
    const azIndex = index % config.azCount;
    const candidates = getEligibleServers(servers, "management", azIndex, "shared")
      .sort((a, b) => {
        const managementDelta = countRole(a, "管理节点") - countRole(b, "管理节点");
        if (managementDelta) return managementDelta;
        const aMixedWithGtm = a.componentKeys.includes("gtm") && a.roles.some(isGtmRole);
        const bMixedWithGtm = b.componentKeys.includes("gtm") && b.roles.some(isGtmRole);
        return Number(bMixedWithGtm) - Number(aMixedWithGtm) || a.roles.length - b.roles.length || a.id.localeCompare(b.id);
      });
    const target = candidates.find((server) => countRole(server, "管理节点") < 1 && canPlaceRoleWithinWatermark(server, "管理节点", config))
      || candidates.find((server) => countRole(server, "管理节点") < 1);
    if (target) target.roles.push("管理节点");
  }
}

function getServerCountByAz(serverPlan, mode, azCount) {
  const azNames = getAzNames(mode, azCount);
  return azNames.map((az) => serverPlan.filter((server) => server.az === az).length);
}

function buildServerPlan(config) {
  assertPlanningScale(config.serverCount, "servers");
  const azNames = getAzNames(config.mode, config.azCount);
  const servers = Array.from({ length: config.serverCount }, (_, index) => ({
    id: `Server-${String(index + 1).padStart(2, "0")}`,
    az: azNames[index % azNames.length],
    azIndex: index % azNames.length,
    rack: `机柜${(index % azNames.length) + 1}-${Math.floor(index / Math.max(1, azNames.length * 3)) + 1}`,
    hostGroup: "故障接管预留",
    tenantPool: "shared",
    tenantPoolLabel: "现有集群共享服务器",
    componentKeys: [],
    roles: [],
    dnCount: 0,
    cnCount: 0
  }));

  assignReverseHostGroups(servers, config.componentLayout, config.componentSizing, config.mode, config.azCount);
  servers.forEach((server) => {
    server.spec = getHostSpecForKeys(server.componentKeys, config.componentSpecs || {});
  });
  placeTenantCnRolesByPool(servers, config);
  placeDnRolesByPool(servers, config);
  placeGtmRolesByPool(servers, config);
  placeManagementRolesByPool(servers, config);

  return servers.map((server) => {
    const resourceAudit = getServerResourceAudit(server, config);
    return {
      ...server,
      resourceAudit,
      cpuLoad: resourceAudit ? resourceAudit.cpuPercent : estimateServerCpu(server, config.environment),
      diskLoad: resourceAudit ? resourceAudit.diskPercent : estimateServerDisk(server, config)
    };
  });
}

function assignReverseHostGroups(servers, layout, sizing, mode, azCount) {
  const groups = sizing.poolSizings
    ? sizing.poolSizings.flatMap((pool) => getBusinessHostGroups(layout, pool.sizing)
      .filter((group) => group.count > 0)
      .map((group) => ({ ...group, tenantPool: pool.key, tenantPoolLabel: pool.label })))
    : getBusinessHostGroups(layout, sizing)
      .filter((group) => group.count > 0)
      .map((group) => ({ ...group, tenantPool: "shared", tenantPoolLabel: "现有集群共享服务器" }));
  const counts = allocateReverseHostGroupCounts(groups, servers.length);
  groups.forEach((group, groupIndex) => {
    const byAz = distributeHostGroupCount(counts[groupIndex], azCount, mode, group.componentKeys);
    byAz.forEach((count, azIndex) => {
      for (let index = 0; index < count; index += 1) {
        const server = servers.find((item) => !item.componentKeys.length && item.azIndex === azIndex)
          || servers.find((item) => !item.componentKeys.length);
        if (!server) return;
        server.hostGroup = group.label;
        server.componentKeys = [...group.componentKeys];
        server.tenantPool = group.tenantPool;
        server.tenantPoolLabel = group.tenantPoolLabel;
      }
    });
  });
}

function allocateReverseHostGroupCounts(groups, serverCount) {
  const desired = groups.map((group) => group.count);
  const desiredTotal = desired.reduce((sum, count) => sum + count, 0);
  if (desiredTotal <= serverCount) return desired;

  const allocated = desired.map(() => 0);
  for (let index = 0; index < Math.min(serverCount, groups.length); index += 1) {
    allocated[index] = 1;
  }
  while (allocated.reduce((sum, count) => sum + count, 0) < serverCount) {
    const next = desired
      .map((count, index) => ({ index, gap: count - allocated[index], ratio: allocated[index] / count }))
      .filter((item) => item.gap > 0)
      .sort((a, b) => a.ratio - b.ratio || b.gap - a.gap)[0];
    if (!next) break;
    allocated[next.index] += 1;
  }
  return allocated;
}

function placeGtmManagementMixed(servers, config) {
  const pairs = Math.max(config.managementNodes, Math.ceil(config.gtmNodes / 2));
  for (let i = 0; i < pairs; i += 1) {
    const target = servers
      .slice()
      .sort((a, b) => a.roles.length - b.roles.length || a.dnCount - b.dnCount)[0];
    if (!target) return;
    if (i < config.managementNodes) target.roles.push("管理节点");
    const remainingGtm = config.gtmNodes - countAllMatchingRoles(servers, isGtmRole);
    const gtmToPlace = Math.min(2, Math.max(0, remainingGtm));
    for (let j = 0; j < gtmToPlace; j += 1) {
      target.roles.push(getNextGtmRoleLabel(config, countAllMatchingRoles(servers, isGtmRole)));
    }
  }
}

function placeCnDnMixed(servers, config) {
  placeTenantCnRoles(servers, config);
  placeDnRoles(servers, config);
}

function placeTenantCnRoles(servers, config) {
  const tenants = config.tenantPlans && config.tenantPlans.length
    ? config.tenantPlans
    : [{ name: "租户", cnPerAz: Math.ceil(config.totalCn / config.azCount) }];

  tenants.forEach((tenant) => {
    const totalTenantCn = tenant.cnPerAz * config.azCount;
    for (let i = 0; i < totalTenantCn; i += 1) {
      const azOffset = i % config.azCount;
      const candidates = servers
        .filter((server, index) => index % config.azCount === azOffset)
        .sort((a, b) => a.cnCount - b.cnCount || a.roles.length - b.roles.length);
      const target = candidates.find((server) => server.cnCount < config.maxCnPerServer) || candidates[0] || servers[0];
      if (!target) return;
      target.roles.push(`${tenant.name}-CN${i + 1}`);
      target.cnCount += 1;
    }
  });
}

function placeTenantGtmRoles(servers, config, maxPerServer) {
  for (let i = 0; i < config.gtmNodes; i += 1) {
    const label = getNextGtmRoleLabel(config, i);
    const target = servers
      .slice()
      .sort((a, b) => countMatchingRole(a, isGtmRole) - countMatchingRole(b, isGtmRole) || a.roles.length - b.roles.length)[0];
    if (!target) return;
    if (countMatchingRole(target, isGtmRole) >= maxPerServer) {
      const fallback = servers.find((server) => countMatchingRole(server, isGtmRole) < maxPerServer) || target;
      fallback.roles.push(label);
    } else {
      target.roles.push(label);
    }
  }
}

function getNextGtmRoleLabel(config, index) {
  const distributedTenants = (config.tenantPlans || []).filter((tenant) => tenant.isDistributed);
  if (!distributedTenants.length) return `GTM${index + 1}`;
  if (distributedTenants.length > 1) return `GTM-SYS${index + 1}`;
  return `${distributedTenants[0].name}-GTM${index + 1}`;
}

function getAzNames(mode, azCount) {
  if (mode === "local1az") return ["本地机房"];
  if (mode === "local2az") return ["中心A", "中心B"];
  if (mode === "twoSiteThreeDc") return ["中心A", "中心B", "中心C"];
  return Array.from({ length: azCount }, (_, index) => `中心${index + 1}`);
}

function placeRoles(servers, role, count, maxPerServer) {
  for (let i = 0; i < count; i += 1) {
    const target = servers
      .slice()
      .sort((a, b) => countRole(a, role) - countRole(b, role) || a.roles.length - b.roles.length)[0];
    if (!target) return;
    if (role === "CN" && countRole(target, "CN") >= maxPerServer) {
      const fallback = servers.find((server) => countRole(server, "CN") < maxPerServer) || target;
      fallback.roles.push(role);
      fallback.cnCount += 1;
    } else {
      target.roles.push(role);
      if (role === "CN") target.cnCount += 1;
    }
  }
}

function placeDnRoles(servers, config) {
  const tenants = config.tenantPlans && config.tenantPlans.length
    ? config.tenantPlans
    : [{ name: "租户", shardCount: config.shardCount || 0, replicasPerShard: config.replicasPerShard || 0 }];

  tenants.forEach((tenant) => {
    for (let group = 1; group <= tenant.shardCount; group += 1) {
      for (let replica = 1; replica <= tenant.replicasPerShard; replica += 1) {
        const role = replica === 1 ? "Master" : "Slave";
        const label = `${tenant.name}-DN-G${group}-${role}`;
        const azOffset = (group + replica - 2) % config.azCount;
        const candidates = servers
          .filter((server, index) => index % config.azCount === azOffset)
          .sort((a, b) => a.dnCount - b.dnCount || a.roles.length - b.roles.length);
        const target = candidates.find((server) => server.dnCount < config.maxDnPerServer) || candidates[0] || servers[0];
        if (!target) return;
        target.roles.push(label);
        target.dnCount += 1;
      }
    }
  });
}

function countRole(server, role) {
  return server.roles.filter((item) => item === role).length;
}

function countAllRoles(servers, role) {
  return servers.reduce((sum, server) => sum + countRole(server, role), 0);
}

function countMatchingRole(server, predicate) {
  return server.roles.filter(predicate).length;
}

function countAllMatchingRoles(servers, predicate) {
  return servers.reduce((sum, server) => sum + countMatchingRole(server, predicate), 0);
}

function isCnRole(role) {
  return role === "CN" || /-CN\d+$/.test(role);
}

function isGtmRole(role) {
  return role === "GTM" || role.startsWith("GTM-") || /-GTM\d+$/.test(role);
}

function isDnRole(role) {
  return role.startsWith("DN") || /-DN-G\d+-(Master|Slave\d*|Slave)$/.test(role);
}

function estimateServerCpu(server, environment) {
  const roleWeight = server.roles.reduce((sum, role) => {
    if (isCnRole(role)) return sum + 18;
    if (isDnRole(role)) return sum + 16;
    if (isGtmRole(role)) return sum + 8;
    return sum + 5;
  }, 0);
  const envReserve = environment === "production" ? 8 : 0;
  return Math.min(96, roleWeight + envReserve);
}

function estimateServerDisk(server, config) {
  const dnWeight = server.dnCount * Math.min(42, 100 / Math.max(1, config.maxDnPerServer + 0.5));
  return Math.min(96, Math.round(dnWeight));
}

function scoreReversePlan(data) {
  const availabilityBase = data.serverPlan.some((server) => server.dnCount > 1 && data.environment === "production") ? 72 : 88;
  const performance = clampScore(65 + data.cnPerAz * 6 + data.shardCount * 2 - (data.resourceState === "不足" ? 30 : 0));
  const availability = clampScore(availabilityBase + data.replicasPerShard * 4 - (data.allowColocation && data.environment === "production" ? 18 : 0));
  const capacity = clampScore(80 + Math.min(12, data.serverCount - data.requiredServerCount) * 2 - (data.resourceState === "临界" ? 12 : 0));
  const weighted = data.goal === "performance"
    ? Math.round(performance * 0.5 + availability * 0.25 + capacity * 0.25)
    : data.goal === "availability"
      ? Math.round(performance * 0.25 + availability * 0.5 + capacity * 0.25)
      : Math.round((performance + availability + capacity) / 3);

  return { performance, availability, capacity, weighted };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getGtmBinding(shape, distributedTenants, mode) {
  if (shape !== "distributed" || distributedTenants === 0) {
    return {
      kind: "none",
      groupCount: 0,
      label: "集中式或单分片租户通常不配置专属 GTM",
      note: "CN 可直连单分片 DN，GTM 不在主路径"
    };
  }

  const effectiveMode = mode === "auto"
    ? (distributedTenants <= 1 ? "dedicated" : "shared")
    : mode;
  const groupCount = effectiveMode === "dedicated" ? distributedTenants : 1;

  return {
    kind: effectiveMode,
    groupCount,
    label: effectiveMode === "dedicated"
      ? `租户专属 GTM：${distributedTenants} 个租户绑定 ${groupCount} 个 GTM Group`
      : `系统级共享 GTM：${distributedTenants} 个租户共享 ${groupCount} 个 GTM Group`,
    note: effectiveMode === "dedicated"
      ? "适合强隔离、核心系统、独立变更窗口"
      : "适合多租户资源池，统一管控全局事务资源"
  };
}

function getRecommendedBusinessGtmReplicas(environment, mode) {
  return environment === "poc"
    ? (mode === "local1az" ? 1 : 2)
    : mode === "local1az"
      ? 3
      : mode === "local2az"
        ? 4
        : mode === "twoSiteThreeDc"
          ? 5
          : 5;
}

function getBusinessGtmNodes(shape, mode, binding, environment) {
  if (shape !== "distributed" || binding.kind === "none") return 0;
  return binding.groupCount * getRecommendedBusinessGtmReplicas(environment, mode);
}

function buildBusinessTenantPlans(data) {
  ["sqlPerTxn", "cnSingleNodeTps", "growthPower", "maxShardTb", "safeShardTps"].forEach((key) => {
    const error = numericInputError(data[key], key, { min: Number.MIN_VALUE });
    if (error) throw new PlanningInputError(error);
  });
  const plans = data.specs.map((spec, index) => {
    const tenantNo = index + 1;
    const deploymentStrategy = getTenantDeploymentStrategy(spec, index);
    const isDistributed = data.shape === "distributed" && spec.type === "distributed";
    const qps = Math.max(1, Number(spec.qps) || 1);
    const dataTb = Math.max(0.1, Number(spec.dataTb) || 0.1);
    const configuredMinShards = Math.max(1, Math.floor(Number(spec.minShards) || 1));
    const futureDataTb = dataTb * data.growthPower;
    const businessTxnTps = qps / data.sqlPerTxn;
    const cnRaw = Math.ceil(businessTxnTps / data.cnSingleNodeTps) * data.growthPower;
    const recommendedCnPerAz = maybeEven(Math.max(2, cnRaw), data.forceEven);
    const cnPerAz = spec.cnPerAzManual
      ? Math.max(1, Math.floor(Number(spec.cnPerAz) || 1))
      : recommendedCnPerAz;
    const shardByCapacity = Math.ceil(futureDataTb / data.maxShardTb);
    const shardByTps = Math.ceil(businessTxnTps / data.safeShardTps);
    const recommendedShardCount = isDistributed
      ? maybeEven(Math.max(1, shardByCapacity, shardByTps), data.forceEven)
      : 1;
    const shardCount = isDistributed && spec.minShardsManual
      ? configuredMinShards
      : recommendedShardCount;
    const minShards = recommendedShardCount;
    const requestedReplicas = Math.max(1, Math.floor(Number(spec.replicaCount) || 1));
    const recommendedReplicas = getReplicaCount(data.mode, isDistributed ? "distributed" : "centralized", data.environment);
    const replicasPerShard = requestedReplicas;
    const dnInstances = shardCount * replicasPerShard;
    const cnByAz = data.siteCapacityFactors.map((factor) => Math.max(1, Math.ceil(cnPerAz * factor)));
    const totalTenantCn = cnByAz.reduce((sum, count) => sum + count, 0);
    const cnSpec = recommendCnNodeSpec({
      tenantTxnTps: businessTxnTps,
      cnPerAz,
      cpuLimit: data.cpuLimit
    });
    const dnSpec = recommendDnNodeSpec({
      tenantTxnTps: businessTxnTps,
      futureDataTb,
      shardCount,
      safeShardTps: data.safeShardTps,
      maxShardTb: data.maxShardTb,
      referenceCores: data.dnReferenceCores,
      referenceMemoryGb: data.dnReferenceMemoryGb,
      referenceTps: data.dnReferenceTps
    });

    return {
      tenantNo,
      name: normalizeTenantName(spec.name, tenantNo),
      deploymentStrategy,
      deploymentStrategyLabel: tenantDeploymentStrategyLabels[deploymentStrategy],
      isDistributed,
      type: isDistributed ? "分布式租户" : "集中式/单分片租户",
      qps,
      dataTb,
      futureDataTb,
      minShards,
      businessTxnTps,
      cnRaw,
      recommendedCnPerAz,
      cnPerAz,
      cnByAz,
      cnManual: Boolean(spec.cnPerAzManual),
      cnBelowMinimum: cnPerAz < recommendedCnPerAz,
      totalCn: totalTenantCn,
      cnCores: cnSpec.cores,
      cnMemoryGb: cnSpec.memoryGb,
      cnSpecLabel: cnSpec.label,
      cnSpecReason: cnSpec.reason,
      cnCpuDemand: totalTenantCn * cnSpec.cores,
      cnMemoryDemand: totalTenantCn * cnSpec.memoryGb,
      shardByCapacity,
      shardByTps,
      recommendedShardCount,
      shardCount,
      shardManual: Boolean(spec.minShardsManual),
      shardBelowMinimum: shardCount < recommendedShardCount,
      requestedReplicas,
      recommendedReplicas,
      replicasPerShard,
      dnInstances,
      dnCores: dnSpec.cores,
      dnMemoryGb: dnSpec.memoryGb,
      dnSpecLabel: dnSpec.label,
      dnSpecReason: dnSpec.reason,
      dnTpsPerCore: dnSpec.tpsPerCore,
      dnPerShardTps: dnSpec.perShardTps,
      dnPerShardTb: dnSpec.perShardTb,
      dnSpecFormula: dnSpec.formula,
      dnCpuDemand: dnInstances * dnSpec.cores,
      dnMemoryDemand: dnInstances * dnSpec.memoryGb,
      masterCount: shardCount,
      slaveCount: shardCount * Math.max(0, replicasPerShard - 1),
      gtmLabel: "待绑定",
      gtmGroupText: "待绑定"
    };
  });
  assertPlanningScale(plans.reduce((sum, tenant) => sum + tenant.totalCn + tenant.dnInstances, 0), "instances");
  return plans;
}

function buildReverseTenantPlans(data) {
  const plans = data.specs.map((spec, index) => {
    const tenantNo = index + 1;
    const deploymentStrategy = getTenantDeploymentStrategy(spec, index);
    const isDistributed = spec.type !== "centralized";
    const requestedReplicas = Math.max(1, Math.floor(Number(spec.replicaCount) || 1));
    const replicasPerShard = data.environment === "production"
      ? Math.max(requestedReplicas, data.minReplica)
      : requestedReplicas;
    const shardCount = isDistributed
      ? maybeEven(Math.max(1, Number(spec.shardCount) || 1), true)
      : 1;
    const cnPerAz = Math.max(1, Math.floor(Number(spec.cnPerAz) || 1));
    const dnInstances = shardCount * replicasPerShard;
    const cnCores = Math.max(1, Number(spec.cnCores) || 8);
    const cnMemoryGb = Math.max(1, Number(spec.cnMemoryGb) || 16);
    const dnCores = Math.max(1, Number(spec.dnCores) || 16);
    const dnMemoryGb = Math.max(1, Number(spec.dnMemoryGb) || 64);
    const totalTenantCn = cnPerAz * data.azCount;

    return {
      tenantNo,
      name: normalizeTenantName(spec.name, tenantNo),
      deploymentStrategy,
      deploymentStrategyLabel: tenantDeploymentStrategyLabels[deploymentStrategy],
      isDistributed,
      type: isDistributed ? "分布式租户" : "集中式/单分片租户",
      qps: 0,
      dataTb: 0,
      futureDataTb: 0,
      requestedReplicas,
      cnPerAz,
      totalCn: totalTenantCn,
      cnCores,
      cnMemoryGb,
      cnCpuDemand: totalTenantCn * cnCores,
      cnMemoryDemand: totalTenantCn * cnMemoryGb,
      shardCount,
      replicasPerShard,
      dnInstances,
      dnCores,
      dnMemoryGb,
      dnCpuDemand: dnInstances * dnCores,
      dnMemoryDemand: dnInstances * dnMemoryGb,
      masterCount: shardCount,
      slaveCount: shardCount * Math.max(0, replicasPerShard - 1),
      gtmLabel: "待绑定",
      gtmGroupText: "待绑定"
    };
  });
  assertPlanningScale(plans.reduce((sum, tenant) => sum + tenant.totalCn + tenant.dnInstances, 0), "instances");
  return plans;
}

function recommendCnNodeSpec(data) {
  const perCnTps = data.tenantTxnTps / Math.max(1, data.cnPerAz);
  if (perCnTps <= 800) {
    return {
      cores: 8,
      memoryGb: 16,
      label: "8C / 16GB",
      reason: `单 CN 约 ${round(perCnTps)} TPS，适合轻量交易入口`
    };
  }
  if (perCnTps <= 1600) {
    return {
      cores: 16,
      memoryGb: 32,
      label: "16C / 32GB",
      reason: `单 CN 约 ${round(perCnTps)} TPS，适合中等并发`
    };
  }
  if (perCnTps <= 3200) {
    return {
      cores: 32,
      memoryGb: 64,
      label: "32C / 64GB",
      reason: `单 CN 约 ${round(perCnTps)} TPS，适合高并发 SQL 路由与执行`
    };
  }
  return {
    cores: 64,
    memoryGb: 128,
    label: "64C / 128GB",
    reason: `单 CN 约 ${round(perCnTps)} TPS，建议高规格并配合压测拆分入口`
  };
}

function recommendDnNodeSpec(data) {
  const perShardTps = data.tenantTxnTps / Math.max(1, data.shardCount);
  const perShardTb = data.futureDataTb / Math.max(1, data.shardCount);
  const referenceCores = Math.max(1, data.referenceCores || 16);
  const referenceMemoryGb = Math.max(1, data.referenceMemoryGb || 64);
  const referenceTps = Math.max(1, data.referenceTps || 2000);
  const tpsPerCore = referenceTps / referenceCores;
  const memoryPerCore = referenceMemoryGb / referenceCores;
  const minimumCores = Math.min(8, referenceCores);
  const rawCores = Math.max(minimumCores, Math.ceil(perShardTps / tpsPerCore));
  const supportedCoreTiers = [...new Set([8, 16, 32, 64, referenceCores])]
    .filter((cores) => cores >= minimumCores && cores <= referenceCores)
    .sort((a, b) => a - b);
  const standardCores = supportedCoreTiers.find((cores) => cores >= rawCores) || referenceCores;
  const minimumMemoryGb = Math.min(32, referenceMemoryGb);
  const memoryGb = Math.max(minimumMemoryGb, Math.ceil((standardCores * memoryPerCore) / 16) * 16);
  const exceedsCalibrationRange = rawCores > referenceCores || perShardTb > Math.max(0.1, data.maxShardTb || 2);
  return {
    cores: standardCores,
    memoryGb,
    label: `${standardCores}C / ${memoryGb}GB`,
    tpsPerCore,
    perShardTps,
    perShardTb,
    formula: `单核TPS=${referenceTps}/${referenceCores}=${round(tpsPerCore)}；CEIL(${round(perShardTps)}TPS / ${round(tpsPerCore)}TPS/物理核) = ${Math.ceil(perShardTps / tpsPerCore)} 核，向上取不超过标定范围的档位 ${standardCores}C；内存按 ${round(memoryPerCore)}GB/核初算为 ${memoryGb}GB`,
    reason: exceedsCalibrationRange
      ? `单 Group 约 ${round(perShardTps)} TPS / ${round(perShardTb)}TB，超出当前 ${referenceCores}C/${referenceMemoryGb}GB=${referenceTps}TPS 标定范围，建议增加分片并做同机型 POC`
      : `单 Group 约 ${round(perShardTps)} TPS / ${round(perShardTb)}TB；规格由 ${referenceCores}C/${referenceMemoryGb}GB=${referenceTps}TPS 标定点反推`
  };
}

function applyGtmLabels(tenantPlans, binding, totalGtmNodes = 0) {
  const perGroupReplicas = binding.groupCount > 0
    ? Math.max(1, Math.ceil(totalGtmNodes / binding.groupCount))
    : 0;
  tenantPlans.forEach((tenant) => {
    tenant.gtmLabel = getTenantGtmLabel(tenant.tenantNo, tenant.isDistributed, binding);
    tenant.gtmGroupText = getTenantGtmGroupText(tenant.tenantNo, tenant.isDistributed, binding, perGroupReplicas);
  });
}

function getTenantGtmLabel(tenantNo, isDistributed, binding) {
  if (!isDistributed) return "GTM 可选/不在主路径";
  if (binding.kind === "dedicated") return `GTM-${tenantNo} 专属`;
  return "GTM-SYS 共享";
}

function getTenantGtmGroupText(tenantNo, isDistributed, binding, replicas) {
  if (!isDistributed) return "无专属 GTM Group";
  const groupName = binding.kind === "dedicated" ? `GTM Group ${tenantNo}` : "GTM-SYS Group";
  return `${groupName} · ${replicas} 实例副本`;
}

function normalizeTenantName(name, tenantNo) {
  const text = String(name || "").trim();
  return text || `租户${tenantNo}`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getAzCount(mode) {
  if (mode === "local1az") return 1;
  if (mode === "threeSiteFiveDc") return 5;
  if (mode === "twoSiteThreeDc") return 3;
  return 2;
}

function getSiteCapacityFactors(mode, drCapacityRatio = 0.5) {
  const drRatio = Math.min(1, Math.max(0.25, Number(drCapacityRatio) || 0.5));
  if (mode === "local1az") return [1];
  if (mode === "local2az") return [1, 1];
  if (mode === "twoSiteThreeDc") return [1, 1, drRatio];
  return [1, 1, drRatio, drRatio, drRatio];
}

function getReplicaCount(mode, shape, environment = "production") {
  if (mode === "local1az") {
    return environment === "poc" ? 1 : 2;
  }
  if (shape === "centralized") {
    return mode === "local2az" ? 2 : 3;
  }
  if (mode === "local2az") return 4;
  if (mode === "twoSiteThreeDc") return 5;
  return 5;
}

function render(options = {}) {
  const shouldRenderTenantEditors = options.tenantEditors !== false;
  syncParameterPanels();
  const issues = getPlanningInputIssues();
  if (!issues.length && $("designModule").value === "business") syncBusinessTenantAutoValues();
  if (shouldRenderTenantEditors) {
    renderTenantEditors();
  }
  if (issues.length) {
    invalidatePlanningResult(issues);
    return;
  }
  const isReverse = $("designModule").value === "reverse";
  let data;
  try {
    data = isReverse ? calculateReverse() : calculate();
  } catch (error) {
    if (!(error instanceof PlanningInputError)) throw error;
    invalidatePlanningResult([error.message]);
    return;
  }
  latestDesignData = data;
  $("planningInputStatus").hidden = true;
  $("planningInputStatus").textContent = "";
  syncPlanActionAvailability();
  renderSummary(data);
  renderMetrics(data);
  renderNodePlan(data);
  renderReductionPlan(data);
  renderRisks(data);
  renderHaGuide(data);
  if (isReverse) {
    renderReverseFormula(data);
    renderReversePlan(data);
    $("businessServerBlock").classList.add("hidden");
  } else {
    renderFormula(data);
    renderBusinessServerPlan(data);
    $("reversePlanBlock").classList.add("hidden");
    $("businessServerBlock").classList.remove("hidden");
  }
  renderTopology(data);
  renderExcelExportSummary(data);
  renderRelationGraph(data);
}

function renderTenantEditors() {
  renderBusinessTenantEditor();
  renderReverseTenantEditor();
}

function renderComponentMachineEditor() {
  $("componentMachineGrid").innerHTML = componentServerDefinitions.map((definition) => {
    const prefix = `customer${definition.key.charAt(0).toUpperCase()}${definition.key.slice(1)}`;
    return `
      <article class="component-config-card" data-component-config="${definition.key}">
        <label class="component-config-toggle">
          <input id="${prefix}Enabled" type="checkbox">
          <span><strong>${definition.label}</strong><small>${definition.purpose}</small></span>
        </label>
        <div class="component-config-fields">
          <label class="field compact-field component-model-field">
            <span>国产服务器厂商 / 型号</span>
            <input id="${prefix}Model" placeholder="例如：客户提供的服务器型号">
          </label>
          <label class="field compact-field component-model-field">
            <span>CPU 厂商 / 型号</span>
            <input id="${prefix}CpuModel" value="国产 x86/ARM 处理器" placeholder="例如：海光，两路 32 核">
          </label>
          <label class="field compact-field">
            <span>CPU 架构</span>
            <select id="${prefix}Arch">
              <option value="x86_64">x86_64 国产平台</option>
              <option value="arm64">ARM64 国产平台</option>
              <option value="other">其他 / 待确认</option>
            </select>
          </label>
          <label class="field compact-field">
            <span>国产操作系统</span>
            <select id="${prefix}Os">
              <option value="kylin">银河麒麟</option>
              <option value="bclinux">BC-Linux for Euler</option>
              <option value="uos">统信 UOS</option>
              <option value="newstart">中兴新支点</option>
              <option value="other">其他 / 待确认</option>
            </select>
          </label>
          <label class="field compact-field">
            <span>CPU 路数</span>
            <input id="${prefix}Sockets" type="number" min="1" value="${definition.sockets}">
          </label>
          <label class="field compact-field">
            <span>总物理核</span>
            <input id="${prefix}Cores" type="number" min="1" value="${definition.cores}">
          </label>
          <label class="field compact-field">
            <span>内存 GB</span>
            <input id="${prefix}MemoryGb" type="number" min="1" value="${definition.memoryGb}">
          </label>
          <label class="field compact-field">
            <span>网络配置</span>
            <input id="${prefix}Network" value="2 x 10GbE" placeholder="例如：2 x 10GbE">
          </label>
          <label class="field compact-field">
            <span>系统盘 / RAID</span>
            <input id="${prefix}SystemDisk" value="2 x 480GB SATA RAID1" placeholder="例如：2 x 480GB SATA RAID1">
          </label>
          <label class="field compact-field">
            <span>单块数据盘 TB</span>
            <input id="${prefix}DataDiskTb" type="number" min="0.1" step="0.01" value="${definition.dataDiskTb}">
          </label>
          <label class="field compact-field">
            <span>数据盘数量</span>
            <input id="${prefix}DataDiskCount" type="number" min="1" value="${definition.dataDiskCount}">
          </label>
          <label class="field compact-field">
            <span>单机最大该组件实例</span>
            <input id="${prefix}MaxInstances" type="number" min="1" value="${definition.maxInstances}">
          </label>
        </div>
      </article>
    `;
  }).join("");
}

function renderBusinessTenantEditor() {
  const globalShape = $("dbShape") ? $("dbShape").value : "distributed";
  $("businessTenantEditor").innerHTML = businessTenantSpecs.map((tenant, index) => {
    const effectiveType = globalShape === "centralized" ? "centralized" : tenant.type;
    return `
      <article class="tenant-editor-card" data-tenant-index="${index}" data-tenant-mode="business">
      <div class="tenant-editor-title">
        <strong>${escapeAttr(normalizeTenantName(tenant.name, index + 1))}</strong>
        <button class="ghost-btn icon-btn tenant-remove-btn" type="button" data-action="remove-business-tenant" data-index="${index}" ${businessTenantSpecs.length === 1 ? "disabled" : ""}>删除</button>
      </div>
      <label class="field compact-field">
        <span>租户名称</span>
        <input class="tenant-input" data-mode="business" data-index="${index}" data-key="name" value="${escapeAttr(tenant.name)}">
      </label>
      <label class="field compact-field tenant-deployment-field">
        <span>${index === 0 ? "基础租户服务器策略" : "新增租户服务器策略"}</span>
        <select class="tenant-input" data-mode="business" data-index="${index}" data-key="deploymentStrategy" ${index === 0 ? "disabled" : ""}>
          <option value="shared" ${getTenantDeploymentStrategy(tenant, index) === "shared" ? "selected" : ""}>${index === 0 ? "现有集群基础资源池" : "复用现有服务器（允许按混部策略装箱）"}</option>
          ${index === 0 ? "" : `<option value="dedicated" ${getTenantDeploymentStrategy(tenant, index) === "dedicated" ? "selected" : ""}>新增独立服务器（不与存量租户混部）</option>`}
        </select>
        <small>${index === 0 ? "作为现有集群资源基线。" : "独立模式为该租户建立物理服务器资源池；共享模式仍受水位、反亲和和组件混部规则约束。"}</small>
      </label>
      <div class="grid-two">
        <label class="field compact-field">
          <span>租户形态</span>
          <select class="tenant-input" data-mode="business" data-index="${index}" data-key="type" ${globalShape === "centralized" ? "disabled" : ""}>
            <option value="distributed" ${effectiveType === "distributed" ? "selected" : ""}>分布式租户</option>
            <option value="centralized" ${effectiveType === "centralized" ? "selected" : ""}>集中式/单分片租户${globalShape === "centralized" ? "（全局锁定）" : ""}</option>
          </select>
        </label>
        <label class="field compact-field">
          <span>租户 SQL QPS</span>
          <input class="tenant-input" data-mode="business" data-index="${index}" data-key="qps" type="number" min="1" value="${tenant.qps}">
        </label>
        <label class="field compact-field">
          <span>数据量 TB（业务预计体量）</span>
          <input class="tenant-input" data-mode="business" data-index="${index}" data-key="dataTb" type="number" min="0.1" step="0.1" value="${tenant.dataTb}">
        </label>
        <label class="field compact-field tenant-node-field">
          <span>CN 节点/单生产 AZ（${tenant.cnPerAzManual ? "手工" : "自动"}）</span>
          <div class="tenant-stepper">
            <button type="button" aria-label="减少 CN" data-action="adjust-business-cn" data-index="${index}" data-delta="-1">−</button>
            <input class="tenant-input" data-mode="business" data-index="${index}" data-key="cnPerAz" type="number" min="1" value="${tenant.cnPerAz}">
            <button type="button" aria-label="增加 CN" data-action="adjust-business-cn" data-index="${index}" data-delta="1">+</button>
            <button class="tenant-auto-btn" type="button" data-action="auto-business-cn" data-index="${index}">自动</button>
          </div>
        </label>
        ${effectiveType === "distributed" ? `
          <label class="field compact-field tenant-node-field">
            <span>DN Group 数（${tenant.minShardsManual ? "手工" : "自动"}）</span>
            <div class="tenant-stepper">
              <button type="button" aria-label="减少 DN Group" data-action="adjust-business-shards" data-index="${index}" data-delta="-1">−</button>
              <input class="tenant-input" data-mode="business" data-index="${index}" data-key="minShards" type="number" min="1" value="${tenant.minShards}">
              <button type="button" aria-label="增加 DN Group" data-action="adjust-business-shards" data-index="${index}" data-delta="1">+</button>
              <button class="tenant-auto-btn" type="button" data-action="auto-business-shards" data-index="${index}">自动</button>
            </div>
          </label>
        ` : ""}
        <label class="field compact-field">
          <span>每分片副本数（含 1 个主副本）</span>
          <input class="tenant-input" data-mode="business" data-index="${index}" data-key="replicaCount" type="number" min="1" max="7" value="${tenant.replicaCount}">
        </label>
      </div>
    </article>
    `;
  }).join("");
}

function renderReverseTenantEditor() {
  $("reverseTenantEditor").innerHTML = reverseTenantSpecs.map((tenant, index) => `
    <article class="tenant-editor-card" data-tenant-index="${index}" data-tenant-mode="reverse">
      <div class="tenant-editor-title">
        <strong>${escapeAttr(normalizeTenantName(tenant.name, index + 1))}</strong>
        <button class="ghost-btn icon-btn tenant-remove-btn" type="button" data-action="remove-reverse-tenant" data-index="${index}" ${reverseTenantSpecs.length === 1 ? "disabled" : ""}>删除</button>
      </div>
      <label class="field compact-field">
        <span>租户名称</span>
        <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="name" value="${escapeAttr(tenant.name)}">
      </label>
      <label class="field compact-field tenant-deployment-field">
        <span>${index === 0 ? "基础租户服务器策略" : "新增租户服务器策略"}</span>
        <select class="tenant-input" data-mode="reverse" data-index="${index}" data-key="deploymentStrategy" ${index === 0 ? "disabled" : ""}>
          <option value="shared" ${getTenantDeploymentStrategy(tenant, index) === "shared" ? "selected" : ""}>${index === 0 ? "现有集群基础资源池" : "复用现有服务器（允许按混部策略装箱）"}</option>
          ${index === 0 ? "" : `<option value="dedicated" ${getTenantDeploymentStrategy(tenant, index) === "dedicated" ? "selected" : ""}>新增独立服务器（不与存量租户混部）</option>`}
        </select>
        <small>${index === 0 ? "作为现有集群资源基线。" : "资源反推时，独立模式仍计入客户服务器总量，并进行资源池容量红线检查。"}</small>
      </label>
      <div class="grid-two">
        <label class="field compact-field">
          <span>租户形态</span>
          <select class="tenant-input" data-mode="reverse" data-index="${index}" data-key="type">
            <option value="distributed" ${tenant.type === "distributed" ? "selected" : ""}>分布式租户</option>
            <option value="centralized" ${tenant.type === "centralized" ? "selected" : ""}>集中式/单分片租户</option>
          </select>
        </label>
        <label class="field compact-field">
          <span>CN/AZ</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="cnPerAz" type="number" min="1" value="${tenant.cnPerAz}">
        </label>
        <label class="field compact-field">
          <span>分片数</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="shardCount" type="number" min="1" value="${tenant.shardCount}">
        </label>
        <label class="field compact-field">
          <span>每分片副本数</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="replicaCount" type="number" min="1" max="7" value="${tenant.replicaCount}">
        </label>
        <label class="field compact-field">
          <span>CN规格 CPU核</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="cnCores" type="number" min="1" value="${tenant.cnCores}">
        </label>
        <label class="field compact-field">
          <span>CN规格 内存GB</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="cnMemoryGb" type="number" min="1" value="${tenant.cnMemoryGb}">
        </label>
        <label class="field compact-field">
          <span>DN规格 CPU核</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="dnCores" type="number" min="1" value="${tenant.dnCores}">
        </label>
        <label class="field compact-field">
          <span>DN规格 内存GB</span>
          <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="dnMemoryGb" type="number" min="1" value="${tenant.dnMemoryGb}">
        </label>
      </div>
    </article>
  `).join("");
}

function syncParameterPanels() {
  const isReverse = $("designModule").value === "reverse";
  $("businessParams").classList.toggle("hidden", isReverse);
  $("reverseParams").classList.toggle("hidden", !isReverse);
  $("reversePlanBlock").classList.toggle("hidden", !isReverse);
  $("businessServerBlock").classList.toggle("hidden", isReverse);
  syncBusinessServerConfigPanel();
  syncResourceReductionControls();
}

function syncResourceReductionControls() {
  ["business", "reverse"].forEach((prefix) => {
    const tenantLimitInput = $(`${prefix}MaxTenantDnPerServer`);
    tenantLimitInput.disabled = !$(`${prefix}AllowShardColocation`).checked;
    const machineLimit = prefix === "business"
      ? ($("businessServerConfigMode").value === "customer" && $(componentInputId("dn", "Enabled")).checked
        ? Number($(componentInputId("dn", "MaxInstances")).value)
        : componentServerDefinitions.find((item) => item.key === "dn").maxInstances)
      : Number($("reverseMaxDnPerServer").value);
    tenantLimitInput.max = String(machineLimit);
    const configured = Number(tenantLimitInput.value);
    const status = $(`${prefix}DnDensityStatus`);
    if (!status) return;
    const valid = Number.isSafeInteger(configured) && configured >= 1 && Number.isSafeInteger(machineLimit) && machineLimit >= 1 && configured <= machineLimit;
    status.className = `density-status ${valid ? "valid" : "invalid"}`;
    status.textContent = valid
      ? `密度校验通过：单机同租户 DN 上限 ${configured} ≤ 当前 DN 机型单机总实例上限 ${machineLimit}。`
      : `密度校验不通过：单机同租户 DN 上限 ${configured} > 当前 DN 机型单机总实例上限 ${machineLimit}，请修改后重新计算。`;
  });
}

function syncBusinessServerConfigPanel() {
  const customerMode = $("businessServerConfigMode").value === "customer";
  $("customerServerConfig").classList.toggle("hidden", !customerMode);
  componentServerDefinitions.forEach(({ key }) => {
    const enabled = customerMode && $(componentInputId(key, "Enabled")).checked;
    const card = document.querySelector(`[data-component-config="${key}"]`);
    if (!card) return;
    card.classList.toggle("component-config-inactive", !enabled);
    card.querySelectorAll(".component-config-fields input, .component-config-fields select").forEach((field) => {
      field.disabled = !enabled;
    });
  });
}

function renderSummary(data) {
  $("summaryMode").textContent = modeLabels[data.mode];
  $("summaryShape").textContent = data.reverse ? `${environmentLabels[data.environment]} · ${goalLabels[data.goal]}` : shapeLabels[data.shape];
  $("summaryCn").textContent = `${data.cnPerAz}/AZ`;
  $("summaryShard").textContent = String(data.shardCount);
  $("excelExportSubtitle").textContent = data.reverse
    ? `${environmentLabels[data.environment]}，按 ${data.serverCount} 台服务器生成可编辑的机房、机柜和组件落位表。`
    : `${modeSubtitles[data.mode]} Excel 将按中心、层级、机柜和服务器展开。`;
}

function renderMetrics(data) {
  $("cnPerAz").textContent = data.totalCn;
  $("tenantCount").textContent = data.businessTenants;
  $("shardCount").textContent = data.shardCount;
  $("replicasPerShard").textContent = data.replicasPerShard;
  $("dnInstances").textContent = data.dnInstances;
}

function formatComponentMachineLine(sizing, key) {
  const spec = sizing.componentSpecs[key];
  const requirement = sizing.requirements[key];
  const role = getComponentPlacementLabel(sizing.componentLayout, key);
  return `${spec.sourceLabel}：${spec.model}，${spec.cpuModel}，${spec.sockets} 路 / ${spec.cores} 总物理核 / ${spec.memoryGb}GB；${spec.network}；系统盘 ${spec.systemDisk}；数据盘 ${spec.dataDiskTb}TB × ${spec.dataDiskCount}（合计 ${round(spec.diskTb)}TB）。单机最多 ${spec.maxInstances} 个实例；独立部署口径 ${requirement.servers} 台，当前为${role}。`;
}

function getComponentPlacementLabel(layout, key) {
  if (layout === "gtmMgrMixed" && ["gtm", "management"].includes(key)) return "GTM + 管理节点合设";
  if (layout === "cnDnMixed" && ["cn", "dn"].includes(key)) return "CN + DN 合设";
  if (layout === "cnDnGtmMgrMixed" && ["cn", "dn"].includes(key)) return "CN + DN 合设主机组";
  if (layout === "cnDnGtmMgrMixed" && ["gtm", "management"].includes(key)) return "GTM + 管理节点合设主机组";
  if (layout === "allMixed") return "四类组件混合部署";
  return "独立部署";
}

function getDeploymentArchitectureText(sizing) {
  if (sizing.componentLayout === "gtmMgrMixed") {
    return `CN 独立 ${sizing.cnServers} 台 + DN 独立 ${sizing.dnServers} 台 + GTM/管理合设 ${sizing.gtmManagementHostServers} 台`;
  }
  if (sizing.componentLayout === "cnDnMixed") {
    return `CN/DN 合设 ${sizing.cnDnHostServers} 台 + GTM 独立 ${sizing.gtmServers} 台 + 管理独立 ${sizing.managementServers} 台`;
  }
  if (sizing.componentLayout === "cnDnGtmMgrMixed") {
    return `CN/DN 合设 ${sizing.cnDnHostServers} 台 + GTM/管理合设 ${sizing.gtmManagementHostServers} 台`;
  }
  if (sizing.componentLayout === "allMixed") {
    return `CN/DN/GTM/管理全混布 ${sizing.allComponentHostServers} 台`;
  }
  return `CN ${sizing.cnServers} 台 + DN ${sizing.dnServers} 台 + GTM ${sizing.gtmServers} 台 + 管理 ${sizing.managementServers} 台`;
}

function renderNodePlan(data) {
  const rows = data.reverse ? [
    ["设计模式", `${environmentLabels[data.environment]} · ${goalLabels[data.goal]} · ${data.componentLayoutLabel}`],
    ["服务器资源", `${data.serverCount} 台 ${getServerTypeLabel(data.serverType)}，每台 ${data.cpuCores}C/${data.memoryGb}GB/${data.diskTb}TB，预留 ${round(data.reserveRatio * 100)}%。`],
    ["CN 计算节点", `每 AZ ${data.cnPerAz} 个，总计 ${data.totalCn} 个；${data.environment === "production" ? "同一租户按一机一 CN 反亲和部署" : `单机最多 ${data.maxCnPerServer} 个 CN`}。`],
    ["CN 租户部署", `${data.resourceReduction.cnTenantPlacementLabel}；${data.resourceReduction.configuredCnTenantPlacement === "auto" ? "由环境自动选择" : "用户手工指定"}。`],
    ["DN 数据节点", `${data.shardCount} 个分片 × ${data.replicasPerShard} 副本 = ${data.dnInstances} 个 DN 实例；单机最多 ${data.maxDnPerServer} 个 DN。`],
    ["DN 租户部署", `${data.resourceReduction.dnTenantPlacementLabel}；单机同租户上限 ${data.resourceReduction.maxTenantDnPerServer}，同一 Group 副本强制跨主机。`],
    ["GTM", `${data.gtmBinding.label}；${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes} 个 GTM 实例${data.configuredGtmReplicasPerGroup ? "（手工指定）" : "（自动推荐）"}。`],
    ["GTM 部署亲和", `${data.gtmAffinityLabel}；${data.componentSizing.note}`],
    ["管理节点", `${data.managementNodes} 个；当前环境建议不少于 ${data.recommendedManagementNodes} 个。${data.environment === "production" ? "生产按 HA 管理面规划。" : "POC 可简化，建议保留恢复验证能力。"}`],
    ["控制面核对", `管理实际落位 ${data.controlPlaneAudit.actualManagementNodes}/${data.controlPlaneAudit.requestedManagementNodes}；GTM 实际落位 ${data.controlPlaneAudit.actualGtmNodes}/${data.controlPlaneAudit.requestedGtmNodes}。`],
    ["资源结论", `${data.resourceState}：当前组合预计需要 ${data.requiredServerCount} 台，当前 ${data.serverCount} 台，可用口径约 ${data.usableServerCount} 台。`]
  ] : [
    ["CN 计算节点", `按单租户、单 AZ 独立满足性能后汇总：${data.tenantPlans.map((tenant) => `${tenant.name} ${tenant.cnPerAz}/生产AZ${tenant.cnManual ? "（手工）" : "（自动）"}`).join("；")}；跨站点总计 ${data.totalCn} 个。${data.environment === "production" ? "同一租户按一机一 CN 反亲和部署。" : ""}`],
    ["CN 租户部署", `${data.resourceReduction.cnTenantPlacementLabel}；${data.resourceReduction.configuredCnTenantPlacement === "auto" ? "由环境自动选择" : "用户手工指定"}。`],
    ["DN 数据节点", `租户分片汇总 ${data.shardCount} 个 Group，副本实例合计 ${data.dnInstances} 个 DN；${data.tenantPlans.map((tenant) => `${tenant.name} 为 1 主 + ${Math.max(0, tenant.replicasPerShard - 1)} 从`).join("，")}。`],
    ["DN 规格公式", data.tenantPlans.map((tenant) => `${tenant.name} ${tenant.dnSpecLabel}：${tenant.dnSpecFormula}`).join("；")],
    ["DN 租户部署", `${data.resourceReduction.dnTenantPlacementLabel}；单机同租户上限 ${data.resourceReduction.maxTenantDnPerServer}，同一 Group 副本强制跨主机。`],
    ["GTM", data.shape === "distributed" ? `${data.gtmBinding.label}；${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes} 个 GTM 实例${data.configuredGtmReplicasPerGroup ? "（手工指定）" : "（自动推荐）"}。` : "集中式单分片事务通常不把 GTM 作为主路径。"],
    ["GTM 部署亲和", `${data.serverSizing.gtmAffinityLabel}；${data.serverSizing.componentLayoutNote}`],
    ["管理节点", `${data.managementNodes} 个；当前环境建议不少于 ${data.recommendedManagementNodes} 个，管理网络与业务网络隔离。`],
    ["控制面核对", `管理实际落位 ${data.serverSizing.controlPlaneAudit.actualManagementNodes}/${data.serverSizing.controlPlaneAudit.requestedManagementNodes}；GTM 实际落位 ${data.serverSizing.controlPlaneAudit.actualGtmNodes}/${data.serverSizing.controlPlaneAudit.requestedGtmNodes}。`],
    ["租户", `${data.businessTenants} 个租户实例，其中 ${data.distributedTenants} 个分布式租户；CN、DN 先按租户计算，再按站点容量与组件水位汇总服务器。`],
    ["部署形态", `${data.serverSizing.componentLayoutLabel}：${getDeploymentArchitectureText(data.serverSizing)}，合计 ${data.serverSizing.recommendedServers} 台。`],
    ["CN服务器", formatComponentMachineLine(data.serverSizing, "cn")],
    ["DN服务器", formatComponentMachineLine(data.serverSizing, "dn")],
    ["GTM服务器", formatComponentMachineLine(data.serverSizing, "gtm")],
    ["管理服务器", formatComponentMachineLine(data.serverSizing, "management")],
    ["容灾策略", getDisasterText(data.mode)]
  ];

  $("nodePlan").innerHTML = rows
    .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
    .join("");
}

function getDisasterText(mode) {
  if (mode === "local1az") {
    return "本地单机房用于 POC 或演示验证，不具备跨机房容灾能力。";
  }
  if (mode === "local2az") {
    return "同城两个机房同步/快同步，目标是本地高可用和同城 RPO=0。";
  }
  if (mode === "twoSiteThreeDc") {
    return "同城双中心强一致，异地中心异步灾备，异地 RPO 取决于复制延迟。";
  }
  return "三地五中心按多集群、多灾备域、多级复制规划，不作为单集群简单拉长。";
}

function renderRisks(data) {
  const risks = [];
  if (data.reverse) {
    if (data.mode === "local1az" && data.environment === "production") {
      risks.push(["risk-high", "生产环境选择了本地单机房模式，无法覆盖机房级故障，核心业务不建议采用。"]);
    }
    if (data.mode === "local1az" && data.environment === "poc") {
      risks.push(["risk-ok", "本地单机房模式适合 POC、功能验证和演示环境，可用较少服务器快速搭建。"]);
    }
    if (data.resourceState === "不足") {
      risks.push(["risk-high", `服务器不足：当前 ${data.serverCount} 台，按 ${goalLabels[data.goal]} 至少建议 ${data.requiredServerCount} 台。`]);
    } else if (data.resourceState === "临界") {
      risks.push(["risk-mid", "资源处于临界状态：扣除预留资源后接近最低部署要求，生产建议扩容或降低分片/副本密度。"]);
    } else {
      risks.push(["risk-ok", "服务器数量满足当前反推方案，仍需通过 POC 压测确认真实负载。"]);
    }
    if (data.environment === "production" && data.componentLayout === "allMixed") {
      risks.push(["risk-high", "生产环境选择了全混布，CN/DN/GTM/管理节点可能互相干扰，核心业务不建议直接采用。"]);
    }
    if (data.environment === "production" && data.componentLayout === "cnDnMixed") {
      risks.push(["risk-mid", "生产环境选择 CN+DN 混合部署，计算、存储和 IO 会共享故障域，建议仅用于非核心库或压测确认后采用。"]);
    }
    if (data.componentLayout === "gtmMgrMixed") {
      risks.push(["risk-ok", "GTM 与管理节点合设具备公开核心系统案例参考，适合在保持 CN/DN 分层的前提下降低服务器数量。"]);
    }
    if (data.componentLayout === "cnDnGtmMgrMixed") {
      risks.push(["risk-mid", "当前分为 CN+DN、GTM+管理两个混部主机组；GTM 未与租户计算/存储组件同机，但 CN 与 DN 的资源竞争仍需压测验证。"]);
    }
    if (data.managementNodes < data.recommendedManagementNodes) {
      risks.push(["risk-high", `管理节点仅 ${data.managementNodes} 个，低于当前环境建议的 ${data.recommendedManagementNodes} 个；请补足故障域覆盖或取得厂商方案确认。`]);
    }
    if (data.cnTenantIsolationViolations.length) {
      risks.push(["risk-high", `CN 租户隔离未满足：${data.cnTenantIsolationViolations.map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("、")} 同时承载多个租户 CN；请增加 CN 服务器或改为跨租户混部策略。`]);
    } else if (data.environment === "production" && data.resourceReduction.allowCnTenantColocation) {
      risks.push(["risk-mid", "生产环境选择了跨租户 CN 混部，必须使用容器/cgroup 等机制设置 CPU、内存资源边界，并验证单机故障时多个租户的接管余量。"]);
    }
    if (data.environment === "production" && data.cnSameTenantHostViolations.length) {
      risks.push(["risk-high", `生产同租户 CN 反亲和未满足：${data.cnSameTenantHostViolations.map((item) => `${item.serverId}[${item.tenant}×${item.count}]`).join("、")}；每台物理服务器只能承载该租户 1 个 CN。`]);
    } else if (data.environment === "production") {
      risks.push(["risk-ok", "已校验当前已落位的生产 CN：同一租户按一机一实例分散部署。"]);
    }
    if (data.environment === "production" && !data.cnPlacementAudit.complete) {
      risks.push(["risk-high", `CN 实际落位 ${data.cnPlacementAudit.actual}/${data.cnPlacementAudit.requested}，服务器不足时未突破同租户 CN 反亲和；请增加 CN 主机。`]);
    }
    if (data.dnTenantIsolationViolations.length) {
      risks.push(["risk-high", `DN 租户隔离未满足：${data.dnTenantIsolationViolations.map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("、")} 同时承载多个租户 DN；请增加 DN 服务器或选择跨租户 DN 混部。`]);
    } else if (data.environment === "production" && data.resourceReduction.allowDnTenantColocation) {
      risks.push(["risk-mid", "生产环境选择了跨租户 DN 混部；必须设置 CPU、内存、IOPS 配额，并验证多租户峰值与单机故障接管余量。"]);
    }
    if (!data.controlPlaneAudit.complete) {
      risks.push(["risk-high", `控制面实际落位不完整：管理 ${data.controlPlaneAudit.actualManagementNodes}/${data.controlPlaneAudit.requestedManagementNodes}，GTM ${data.controlPlaneAudit.actualGtmNodes}/${data.controlPlaneAudit.requestedGtmNodes}。`]);
    }
    if (data.configuredGtmReplicasPerGroup > 0 && data.gtmReplicasPerGroup < data.recommendedGtmReplicasPerGroup) {
      risks.push(["risk-high", `每个 GTM Group 手工设置 ${data.gtmReplicasPerGroup} 副本，低于当前环境推荐的 ${data.recommendedGtmReplicasPerGroup} 副本；请增加副本或恢复为 0 自动推荐。`]);
    }
    if (data.gtmAffinity === "tenantPool" && data.environment === "production") {
      risks.push(["risk-high", "GTM 随 CN/DN/管理组件全混布会扩大事务控制面的故障影响，生产核心系统不建议采用。"]);
    }
    if (data.requestedReplicas < getMinimumReplicaCount(data.environment, data.mode)) {
      risks.push(["risk-mid", `输入副本数为 ${data.requestedReplicas}，已按 ${environmentLabels[data.environment]} 和部署方式修正为 ${data.replicasPerShard} 副本。`]);
    }
    if (data.serverPlan.some((server) => server.diskLoad >= 90)) {
      risks.push(["risk-mid", "部分服务器 DN 密度较高，磁盘或 IO 可能成为瓶颈，建议降低单机 DN 上限或增加服务器。"]);
    }
    if (data.dnReplicaHostViolations.length) {
      risks.push(["risk-high", `副本反亲和不满足：${data.dnReplicaHostViolations.map((item) => item.group).join("、")} 存在同一 Group 多副本同机，请增加服务器或降低其他组件占用。`]);
    } else {
      risks.push(["risk-ok", "已校验同一 Group 的 Master/Slave 均分布在不同物理服务器。"]);
    }
    if (data.gtmReplicaHostViolations.length) {
      risks.push(["risk-high", `GTM 反亲和不满足：${data.gtmReplicaHostViolations.map((item) => item.group).join("、")} 存在同组实例同机，请增加 GTM 可用主机。`]);
    } else {
      risks.push(["risk-ok", "已校验同一 GTM Group 的实例均跨物理服务器部署。"]);
    }
    if (data.environment === "production" && data.resourceReduction.allowShardColocation) {
      risks.push(["risk-mid", `同租户不同 Group 允许共宿，单机上限 ${data.resourceReduction.maxTenantDnPerServer} 个 DN；生产需设置 CPU、内存、IOPS 和磁盘水位及故障接管余量。`]);
    }
    if (data.resourceReduction.productionMaximumRedline) {
      risks.push(["risk-high", "生产环境触发全组件混部红线，请取消该勾选项后重新计算。"]);
    }
    risks.push(["risk-ok", data.environment === "poc" ? "POC 方案用于功能、兼容性和性能趋势验证，不建议直接照搬生产。" : "生产方案优先副本隔离、管理面 HA、GTM 主备和资源预留。"]);
    $("riskList").innerHTML = risks
      .map(([cls, text]) => `<li class="${cls}">${text}</li>`)
      .join("");
    return;
  }

  if (data.shape === "distributed" && data.shardCount < 2) {
    risks.push(["risk-high", "分布式租户分片数过低，建议至少 2 个分片并取偶数。"]);
  }
  if (data.mode === "local1az" && data.environment === "production") {
    risks.push(["risk-high", "生产环境选择了本地单机房模式，缺少跨机房容灾能力，建议改为同城两机房或两地三中心。"]);
  }
  if (data.mode === "local1az" && data.environment === "poc") {
    risks.push(["risk-ok", "本地单机房 POC 模式已按单 AZ、低副本、轻量管理节点口径计算。"]);
  }
  if (data.cnPerAz <= 2 && data.qps > 50000) {
    risks.push(["risk-mid", "CN 计算节点较少且 QPS 较高，建议结合真实 SQL 回放压测。"]);
  }
  if (data.mode === "threeSiteFiveDc") {
    risks.push(["risk-mid", "三地五中心公开细节有限，页面仅提供设计建议，需厂商方案评审。"]);
  }
  data.tenantPlans.forEach((tenant) => {
    if (tenant.cnBelowMinimum) {
      risks.push(["risk-high", `${tenant.name} 手工设置每生产 AZ ${tenant.cnPerAz} 个 CN，低于性能公式建议的 ${tenant.recommendedCnPerAz} 个；单 AZ 无法独立满足当前租户性能目标。`]);
    }
    if (tenant.shardBelowMinimum) {
      risks.push(["risk-high", `${tenant.name} 手工设置 ${tenant.shardCount} 个 DN Group，低于容量/TPS 水位建议的 ${tenant.recommendedShardCount} 个；请增加 Group 或用同机型 POC 证明可承载。`]);
    }
    if (!tenant.isDistributed && (tenant.shardByCapacity > 1 || tenant.shardByTps > 1)) {
      risks.push(["risk-mid", `${tenant.name} 当前为集中式/单分片，但容量口径需要 ${tenant.shardByCapacity} 分片、TPS 口径需要 ${tenant.shardByTps} 分片；建议评估改为分布式，或以单机 POC 证明集中式可承载。`]);
    }
    if (tenant.replicasPerShard < tenant.recommendedReplicas) {
      risks.push(["risk-mid", `${tenant.name} 手动设置 ${tenant.replicasPerShard} 副本（1 主 + ${Math.max(0, tenant.replicasPerShard - 1)} 从），低于当前环境建议的 ${tenant.recommendedReplicas} 副本；POC 可简化，生产需评估故障域、RPO/RTO 和多数派策略。`]);
    }
  });
  if (data.growthFactor === 1 && data.years > 1) {
    risks.push(["risk-mid", "规划年限大于 1 但增长系数为 1，请确认是否无需容量增长预留。"]);
  }
  if (data.gtmBinding.kind === "shared" && data.distributedTenants > 1) {
    risks.push(["risk-mid", "多个分布式租户共享系统级 GTM 时，需评估 GTM 容量、隔离性和变更窗口。"]);
  }
  if (data.environment === "production" && data.serverSizing.componentLayout === "allMixed") {
    risks.push(["risk-high", "生产环境全混布会放大故障影响面，核心交易建议改为独立部署或 GTM+管理节点合设。"]);
  }
  if (["twoSiteThreeDc", "threeSiteFiveDc"].includes(data.mode) && data.drCapacityRatio < 1) {
    risks.push(["risk-mid", `异地灾备按 ${round(data.drCapacityRatio * 100)}% 接管容量规划，不能承诺全量业务立即接管；需明确异地降级范围、RTO 和扩容时长。`]);
  }
  if (data.environment === "production" && data.serverSizing.componentLayout === "cnDnMixed") {
    risks.push(["risk-mid", "CN+DN 混合部署可节省服务器，但核心生产需验证 CPU、IO、网络和故障切换互相影响。"]);
  }
  if (data.serverSizing.componentLayout === "gtmMgrMixed") {
    risks.push(["risk-ok", "当前采用 GTM+管理节点合设，符合公开核心账务案例中的管理面部署方式。"]);
  }
  if (data.serverSizing.componentLayout === "cnDnGtmMgrMixed") {
    risks.push(["risk-mid", "当前采用两个混部主机组：CN+DN 与 GTM+管理相互隔离；CN/DN 共享 CPU、内存和 IO，生产需做故障与峰值叠加压测。"]);
  }
  if (data.managementNodes < data.recommendedManagementNodes) {
    risks.push(["risk-high", `管理节点指定为 ${data.managementNodes} 个，低于当前环境建议的 ${data.recommendedManagementNodes} 个；服务器数仍按输入计算，但高可用结论不通过。`]);
  }
  if (data.serverSizing.cnTenantIsolationViolations.length) {
    risks.push(["risk-high", `CN 租户隔离未满足：${data.serverSizing.cnTenantIsolationViolations.map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("、")} 同时承载多个租户 CN；请增加 CN 服务器或改为跨租户混部策略。`]);
  } else if (data.environment === "production" && data.resourceReduction.allowCnTenantColocation) {
    risks.push(["risk-mid", "生产环境选择了跨租户 CN 混部。CN 仍归属各自租户，但共享物理故障域；需设置资源配额并完成多租户峰值叠加与故障接管压测。"]);
  }
  if (data.environment === "production" && data.serverSizing.cnSameTenantHostViolations.length) {
    risks.push(["risk-high", `生产同租户 CN 反亲和未满足：${data.serverSizing.cnSameTenantHostViolations.map((item) => `${item.serverId}[${item.tenant}×${item.count}]`).join("、")}；每台物理服务器只能承载该租户 1 个 CN。`]);
  } else if (data.environment === "production") {
    risks.push(["risk-ok", "已校验当前已落位的生产 CN：同一租户按一机一实例分散部署。"]);
  }
  if (data.environment === "production" && !data.serverSizing.cnPlacementAudit.complete) {
    risks.push(["risk-high", `CN 实际落位 ${data.serverSizing.cnPlacementAudit.actual}/${data.serverSizing.cnPlacementAudit.requested}，服务器不足时未突破同租户 CN 反亲和；请增加 CN 主机。`]);
  }
  if (data.serverSizing.dnTenantIsolationViolations.length) {
    risks.push(["risk-high", `DN 租户隔离未满足：${data.serverSizing.dnTenantIsolationViolations.map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("、")} 同时承载多个租户 DN；请增加 DN 服务器或选择跨租户 DN 混部。`]);
  } else if (data.environment === "production" && data.resourceReduction.allowDnTenantColocation) {
    risks.push(["risk-mid", "生产环境选择跨租户 DN 共宿。租户逻辑归属不变，但共享物理故障域；需设置资源配额并验证多租户峰值、IOPS 和故障接管余量。"]);
  }
  if (!data.serverSizing.controlPlaneAudit.complete) {
    risks.push(["risk-high", `控制面实际落位不完整：管理 ${data.serverSizing.controlPlaneAudit.actualManagementNodes}/${data.serverSizing.controlPlaneAudit.requestedManagementNodes}，GTM ${data.serverSizing.controlPlaneAudit.actualGtmNodes}/${data.serverSizing.controlPlaneAudit.requestedGtmNodes}。`]);
  }
  if (data.shape === "distributed" && data.configuredGtmReplicasPerGroup > 0 && data.gtmReplicasPerGroup < data.recommendedGtmReplicasPerGroup) {
    risks.push(["risk-high", `每个 GTM Group 手工设置 ${data.gtmReplicasPerGroup} 副本，低于当前环境推荐的 ${data.recommendedGtmReplicasPerGroup} 副本；请增加副本或恢复为 0 自动推荐。`]);
  }
  if (data.serverSizing.gtmAffinity === "tenantPool" && data.environment === "production") {
    risks.push(["risk-high", "GTM 与 CN/DN/管理节点全混布只适合 POC 或非核心验证，不应作为核心生产部署基线。"]);
  }
  if (data.serverSizing.dnServersByCapacity > data.serverSizing.dnServersByDensity) {
    risks.push(["risk-mid", `DN 台数由容量决定：副本落盘约 ${round(data.serverSizing.storedDataTb)}TB，高于实例密度口径。`]);
  }
  if (data.serverSizing.dnReplicaHostViolations.length) {
    risks.push(["risk-high", `副本反亲和不满足：${data.serverSizing.dnReplicaHostViolations.map((item) => item.group).join("、")} 存在同一 Group 多副本同机，当前方案不可用于生产。`]);
  } else {
    risks.push(["risk-ok", "已校验同一 Group 的 Master/Slave 均跨物理服务器部署。"]);
  }
  if (data.serverSizing.capacityViolations.length) {
    risks.push(["risk-high", `服务器安全水位未满足：${data.serverSizing.capacityViolations.map((server) => `${server.id}(CPU ${server.resourceAudit.cpuPercent}%/内存 ${server.resourceAudit.memoryPercent}%/磁盘 ${server.resourceAudit.diskPercent}%)`).join("、")} 超过预留后可用容量，请增加对应主机组服务器或降低单机实例数。`]);
  } else {
    risks.push(["risk-ok", `逐台服务器 CPU、内存、磁盘均未超过扣除 ${round(data.serverSizing.reserveRatio * 100)}% 预留后的安全水位。`]);
  }
  if (data.serverSizing.gtmReplicaHostViolations.length) {
    risks.push(["risk-high", `GTM 反亲和不满足：${data.serverSizing.gtmReplicaHostViolations.map((item) => item.group).join("、")} 存在同组实例同机，当前方案不可用于生产。`]);
  } else {
    risks.push(["risk-ok", "已校验同一 GTM Group 的实例均跨物理服务器部署。"]);
  }
  if (data.environment === "production" && data.resourceReduction.allowShardColocation) {
    risks.push(["risk-mid", `同租户不同 Group 允许共宿，单机上限 ${data.resourceReduction.maxTenantDnPerServer} 个 DN；上线前需完成峰值叠加和单机故障接管压测。`]);
  }
  if (data.resourceReduction.productionMaximumRedline) {
    risks.push(["risk-high", "生产环境触发全组件混部红线，请取消该勾选项并改用 CN+DN、GTM+管理分组混部或独立部署。"]);
  }
  if (data.resourceReduction.densityCapped) {
    risks.push(["risk-high", `单机同租户 DN 上限 ${data.resourceReduction.configuredTenantLimit} 超过该 DN 机型单机总实例上限 ${data.resourceReduction.maxDnPerServer}，请修改后重新计算。`]);
  }
  if (data.environment === "production" && data.serverSizing.dedicatedServers > data.serverSizing.mixedServers) {
    risks.push(["risk-ok", "生产环境按分层隔离口径推荐服务器数，POC 可参考混布口径节省资源。"]);
  }
  risks.push(["risk-ok", "浙江移动公开案例可作为参考：每侧 20 CN、20 分片、核心库 1 主 3 备。"]);
  risks.push(["risk-ok", "Team/Group、高低水位属于版本相关配置，生产实施需回查 GoldenDB 版本手册。"]);

  $("riskList").innerHTML = risks
    .map(([cls, text]) => `<li class="${cls}">${text}</li>`)
    .join("");
}

function renderHaGuide(data) {
  const teamCount = getRecommendedTeamCount(data);
  const lowWater = getLowWater(data, teamCount);
  const highWater = teamCount;
  const tenantReplicaText = data.tenantPlans
    .map((tenant) => `${tenant.name}：${tenant.replicasPerShard} 副本（1 Master + ${Math.max(0, tenant.replicasPerShard - 1)} Slave）`)
    .join("；");
  const gtmLine = data.shape === "distributed"
    ? `${data.gtmBinding.label}；部署亲和为 ${data.reverse ? data.gtmAffinityLabel : data.serverSizing.gtmAffinityLabel}。GTM 本身按主备多机部署，CN 在跨分片事务中申请/释放全局事务标识。`
    : "集中式/单分片场景通常不配置专属 GTM；如果后续改为多分片租户，再补齐 GTM 绑定。";

  $("haGuide").innerHTML = `
    <article class="ha-item">
      <strong>Group 分片组</strong>
      <span>每个 Group 对应一个数据分片，并由 1 个主 DN 和若干从 DN 组成。${tenantReplicaText}。当前共 ${data.shardCount} 个 Group、${data.dnInstances} 个 DN 实例。</span>
    </article>
    <article class="ha-item">
      <strong>Team 同步域</strong>
      <span>把同一 Group 内的主、备 DN 按机房/故障域划入不同 Team；Team 内达到响应阈值才算同步正常，正常 Team 数再与水位比较。</span>
    </article>
    <article class="ha-item">
      <strong>高/低水位</strong>
      <span>建议高水位=${highWater}，低水位=${lowWater}。高水位表示所有关键 Team 正常；低于低水位时按公开资料会告警并进入只读保护，停止写业务。</span>
    </article>
    <article class="ha-item">
      <strong>GTM 关系</strong>
      <span>${gtmLine}</span>
    </article>
    <article class="ha-item">
      <strong>二次校验</strong>
      <span>已按架构资料核对 CN/DN/GTM/管理节点职责，并按租户管理与安装参数资料核对 Group、Team、M/S/L 角色、GTM 绑定和水位规则。</span>
    </article>
  `;
}

function getRecommendedTeamCount(data) {
  if (data.mode === "local1az") return 1;
  if (data.mode === "threeSiteFiveDc") return 3;
  if (data.mode === "twoSiteThreeDc") return 3;
  return 2;
}

function getLowWater(data, teamCount) {
  if (data.mode === "local1az") return 1;
  if (data.mode === "local2az") return 1;
  if (data.mode === "twoSiteThreeDc") return 2;
  return Math.ceil(teamCount / 2);
}

function renderFormula(data) {
  const evenNote = data.forceEven ? "，取偶数" : "";
  const text = [
    "CN 计算节点公式：",
    `每 AZ CN = Max(2, ROUNDUP((QPS / T) / (K × 单台 CN 物理核数 × C)) × POWER(增长系数, 年限))${evenNote}`,
    `业务事务量 = ${data.qps} / ${data.sqlPerTxn} = ${round(data.businessTxnTps)} TPS`,
    `单 CN 安全事务能力 = ${data.singleCoreTps} × ${data.cpuCores} × ${data.cpuLimit} = ${round(data.cnSingleNodeTps)} TPS`,
    `基础 CN = ROUNDUP(${round(data.businessTxnTps)} / ${round(data.cnSingleNodeTps)}) × ${round(data.growthPower)} = ${round(data.cnRaw)}`,
    `生产中心 CN = ${data.cnPerAz} / 单 AZ；各站点 = ${getAzNames(data.mode, data.azCount).map((az, index) => `${az}:${data.tenantPlans.reduce((sum, tenant) => sum + tenant.cnByAz[index], 0)}`).join("，")}；总计 ${data.totalCn}`,
    `CN 租户部署 = ${data.resourceReduction.cnTenantPlacementLabel}${data.resourceReduction.configuredCnTenantPlacement === "auto" ? "（环境自动）" : "（手工指定）"}`,
    "",
    "DN 分片规划（按租户分别计算后汇总）：",
    `规划总数据量 = ${data.dataTb}TB × POWER(${data.growthFactor}, ${data.years}) = ${round(data.futureDataTb)}TB`,
    `容量维度分片 = SUM(ROUNDUP(租户规划数据量 / 单主分片 ${data.maxShardTb}TB)) = ${data.shardByCapacity}`,
    `DN 单核 TPS 工程值 = ${data.dnReferenceTps} / ${data.dnReferenceCores} = ${round(data.dnSingleCoreTps)} TPS/物理核`,
    `单主 DN 性能规划上限 = 当前标定 TPS = ${data.safeShardTps} TPS`,
    `性能维度分片 = SUM(ROUNDUP(租户事务 TPS / 标定单主 DN ${data.safeShardTps}TPS)) = ${data.shardByTps}`,
    `推荐 Group = SUM(Max(容量分片, 性能分片))${evenNote}；手工调整低于推荐值时触发红线；当前 Group 合计 ${data.shardCount}`,
    `DN 标定点 = ${data.dnReferenceCores}物理核 / ${data.dnReferenceMemoryGb}GB / ${data.dnReferenceTps}TPS；性能分片与 DN 规格均引用该标定点`,
    ...data.tenantPlans.map((tenant) => `${tenant.name} DN规格：${tenant.dnSpecFormula}；${tenant.dnSpecReason}`),
    `说明：官方指南按总 TPS/QPS 与单节点经验性能、数据量共同确定分片数。页面的单核线性折算仅用于规格初算；SQL 复杂度、热点、日志同步、存储延迟会破坏线性关系，生产必须 POC 校准。`,
    `DN 实例 = 租户内分片 × 各租户副本数汇总 = ${data.dnInstances}`,
    `DN 跨租户部署 = ${data.resourceReduction.dnTenantPlacementLabel}${data.resourceReduction.configuredDnTenantPlacement === "auto" ? "（环境自动）" : "（手工指定）"}`,
    `副本角色 = ${data.tenantPlans.map((tenant) => `${tenant.name} ${tenant.replicasPerShard}副本（1主+${Math.max(0, tenant.replicasPerShard - 1)}从）`).join("；")}`,
    `GTM 实例 = ${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes}${data.configuredGtmReplicasPerGroup ? "（手工指定）" : "（自动推荐）"}；当前环境推荐每 Group ${data.recommendedGtmReplicasPerGroup} 副本`,
    `管理节点 = ${data.managementNodes} 个；当前环境建议不少于 ${data.recommendedManagementNodes} 个`,
    `控制面实际落位 = 管理 ${data.serverSizing.controlPlaneAudit.actualManagementNodes}/${data.serverSizing.controlPlaneAudit.requestedManagementNodes}，GTM ${data.serverSizing.controlPlaneAudit.actualGtmNodes}/${data.serverSizing.controlPlaneAudit.requestedGtmNodes}`,
    "",
    "服务器配置与个数推算：",
    `规格来源 = ${data.serverSizing.serverSpec}；统一预留 ${round(data.serverSizing.reserveRatio * 100)}% 后，按“单站点、单租户”需求分别计算再汇总`,
    `站点容量系数 = ${getAzNames(data.mode, data.azCount).map((az, index) => `${az}:${round(data.siteCapacityFactors[index] * 100)}%`).join("，")}；同城生产中心固定对等，异地比例 ${round(data.drCapacityRatio * 100)}%`,
    `组件总量 = ${data.totalCn} CN + ${data.dnInstances} DN + ${data.gtmNodes} GTM + ${data.managementNodes} 管理节点`,
    `副本落盘容量 = SUM(租户规划数据量 × 副本数) = ${round(data.serverSizing.storedDataTb)}TB`,
    ...componentServerDefinitions.map(({ key, label }) => {
      const spec = data.serverSizing.componentSpecs[key];
      const requirement = data.serverSizing.requirements[key];
      return `${label} = ${spec.model} ${spec.sockets}路/${spec.cores}总物理核/${spec.memoryGb}GB/数据盘${spec.dataDiskTb}TB×${spec.dataDiskCount}，Max(实例 ${requirement.byInstances}, CPU ${requirement.byCpu}, 内存 ${requirement.byMemory}, 数据盘 ${requirement.byDisk}, 反亲和/租户密度 ${requirement.byAffinity}) = ${requirement.servers} 台`;
    }),
    `严格隔离基线（组件分层、单机 1 DN）= ${data.serverSizing.strictBaselineServers} 台；当前装箱估算缩减 ${data.serverSizing.savedServers} 台（${round(data.serverSizing.savingRatio * 100)}%）`,
    `独立部署 = ${data.serverSizing.dedicatedServers} 台；GTM+管理合设 = ${data.serverSizing.gtmMgrMixedServers} 台；CN+DN混合 = ${data.serverSizing.cnDnMixedServers} 台；全混布 = ${data.serverSizing.allMixedServers} 台`,
    `CN+DN混部判定：${data.serverSizing.mixedAnalyses.cnDn.detail}`,
    `GTM+管理混部判定：${data.serverSizing.mixedAnalyses.gtmManagement.detail}`,
    `双主机组混部 = CN+DN、GTM+管理 ${data.serverSizing.cnDnGtmMgrMixedServers} 台；GTM 亲和结果 = ${data.serverSizing.gtmAffinityLabel}`,
    `当前组件组合 = ${data.serverSizing.componentLayoutLabel}；${getDeploymentArchitectureText(data.serverSizing)}；最终推荐 = ${data.serverSizing.recommendedServers} 台`
  ].join("\n");
  $("formulaOutput").textContent = text;
}

function renderReverseFormula(data) {
  const text = [
    "资源约束反推公式：",
    `环境类型 = ${environmentLabels[data.environment]}，设计目标 = ${goalLabels[data.goal]}`,
    `可用服务器口径 = FLOOR(${data.serverCount} × (1 - ${data.reserveRatio})) = ${data.usableServerCount} 台`,
    `CN 实例 = ${data.cnPerAz}/AZ × ${data.azCount} AZ = ${data.totalCn}`,
    `CN 租户部署 = ${data.resourceReduction.cnTenantPlacementLabel}${data.resourceReduction.configuredCnTenantPlacement === "auto" ? "（环境自动）" : "（手工指定）"}`,
    `DN 租户部署 = ${data.resourceReduction.dnTenantPlacementLabel}${data.resourceReduction.configuredDnTenantPlacement === "auto" ? "（环境自动）" : "（手工指定）"}`,
    `DN 实例 = ${data.shardCount} 分片 × ${data.replicasPerShard} 副本 = ${data.dnInstances}`,
    `GTM 实例 = ${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes}${data.configuredGtmReplicasPerGroup ? "（手工指定）" : "（自动推荐）"}，管理节点 = ${data.managementNodes}`,
    `独立部署最少服务器 = CN ${data.componentSizing.cnServers} + DN ${data.componentSizing.dnServers} + GTM ${data.componentSizing.gtmServers} + 管理 ${data.componentSizing.managementServers} = ${data.requiredDedicatedServers} 台（已纳入资源水位及 DN/GTM 副本反亲和）`,
    `组件组合对比 = 独立 ${data.componentSizing.dedicatedServers} 台 / GTM+管理 ${data.componentSizing.gtmMgrMixedServers} 台 / CN+DN ${data.componentSizing.cnDnMixedServers} 台 / 双主机组 ${data.componentSizing.cnDnGtmMgrMixedServers} 台 / 全混布 ${data.componentSizing.allMixedServers} 台`,
    `严格隔离基线（组件分层、单机 1 DN）= ${data.componentSizing.strictBaselineServers} 台；当前组合估算缩减 ${data.componentSizing.savedServers} 台（${round(data.componentSizing.savingRatio * 100)}%）`,
    `GTM 部署亲和 = ${data.gtmAffinityLabel}；每 Group 副本推荐值 = ${data.recommendedGtmReplicasPerGroup}，当前采用 = ${data.gtmReplicasPerGroup}；管理节点建议值 = ${data.recommendedManagementNodes}，当前输入 = ${data.managementNodes}`,
    `控制面实际落位 = 管理 ${data.controlPlaneAudit.actualManagementNodes}/${data.controlPlaneAudit.requestedManagementNodes}，GTM ${data.controlPlaneAudit.actualGtmNodes}/${data.controlPlaneAudit.requestedGtmNodes}`,
    `CN+DN混部判定：${data.componentSizing.mixedAnalyses.cnDn.detail}`,
    `当前组件组合 = ${data.componentLayoutLabel}，最少服务器 = ${data.requiredServerCount}`,
    `资源状态 = ${data.resourceState}`,
    "",
    "评分：",
    `综合评分 ${data.scores.weighted}/100，性能 ${data.scores.performance}/100，可用性 ${data.scores.availability}/100，容量 ${data.scores.capacity}/100`
  ].join("\n");
  $("formulaOutput").textContent = text;
}

function renderReversePlan(data) {
  const conclusion = getReverseConclusion(data);
  const cards = [
    ["推荐类型", `${environmentLabels[data.environment]} · ${goalLabels[data.goal]}`],
    ["资源状态", `${data.resourceState}，${conclusion}`],
    ["组件组合", `${data.componentLayoutLabel} · ${data.componentSizing.note}`],
    ["资源缩减", `${data.resourceReduction.presetLabel} · 基线 ${data.componentSizing.strictBaselineServers} 台，估算缩减 ${data.componentSizing.savedServers} 台`],
    ["GTM 部署亲和", data.gtmAffinityLabel],
    ["新增租户服务器策略", data.tenantPlans.map((tenant) => `${tenant.name}: ${tenant.deploymentStrategyLabel}`).join("；")],
    ["CN 租户部署", data.resourceReduction.cnTenantPlacementLabel],
    ["CN 反亲和核对", data.environment === "production"
      ? `同租户一机一 CN；实际落位 ${data.cnPlacementAudit.actual}/${data.cnPlacementAudit.requested}`
      : `POC 按机型密度部署；实际落位 ${data.cnPlacementAudit.actual}/${data.cnPlacementAudit.requested}`],
    ["DN 租户部署", data.resourceReduction.dnTenantPlacementLabel],
    ["GTM Group 副本", `${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes} 实例（推荐每组 ${data.recommendedGtmReplicasPerGroup}）`],
    ["GTM 逐组核对", data.gtmGroupPlacementAudit.groups.map((group) => `${group.groupKey} ${group.actual}/${group.expected}`).join("；") || "无 GTM Group"],
    ["控制面落位核对", `管理 ${data.controlPlaneAudit.actualManagementNodes}/${data.controlPlaneAudit.requestedManagementNodes}；GTM ${data.controlPlaneAudit.actualGtmNodes}/${data.controlPlaneAudit.requestedGtmNodes}`],
    ["服务器使用", `${data.serverPlan.filter((server) => server.roles.length > 0).length}/${data.serverCount} 台有部署组件`],
    ["推荐资源总量", `${data.totalCn} CN / ${data.businessTenants} 租户 / ${data.dnInstances} DN / ${data.gtmNodes} GTM / ${data.managementNodes} 管理`],
    ["租户分片与副本", data.tenantPlans.map((tenant) => `${tenant.name}: ${tenant.shardCount}分片×${tenant.replicasPerShard}副本`).join("；")],
    ["DN 中心分布", `${data.dnCenterDistribution.centers.map((item) => `${item.az} ${item.instances}实例/${item.hosts}机`).join("；")}。${data.dnCenterDistribution.explanation}`],
    ["综合评分", `${data.scores.weighted}/100`]
  ];
  $("reversePlan").innerHTML = `
    <div class="reverse-card-grid">
      ${cards.map(([key, value]) => `<div class="reverse-card"><span>${key}</span><strong>${value}</strong></div>`).join("")}
    </div>
    <div class="server-plan-list">
      ${data.serverPlan.map(renderServerPlanRow).join("")}
    </div>
  `;
}

function renderReductionPlan(data) {
  const reduction = data.resourceReduction;
  const sizing = data.reverse ? data.componentSizing : data.serverSizing;
  const selectedServers = data.reverse ? data.requiredServerCount : sizing.recommendedServers;
  const redlines = getResourceReductionRedlines(data);
  const statusClass = redlines.length ? "risk-high" : "risk-ok";
  const statusText = redlines.length
    ? `不通过：触发 ${redlines.length} 项红线，请修改勾选项或补充资源后重新计算`
      : "通过：当前多项缩减组合未触达硬红线";
  const selectedMeasures = getSelectedReductionMeasures(reduction);
  const colocation = getShardColocationState(data);
  const cnColocation = getCnTenantColocationState(data);
  const dnTenantColocation = getDnTenantColocationState(data);
  const gtmGroupColocation = getGtmGroupColocationState(data);
  const gtmManagementColocation = getGtmManagementColocationState(data);
  const advice = [
    reduction.allowCnTenantColocation
      ? cnColocation.serverCount
        ? `跨租户 CN 共宿已实际命中 ${cnColocation.serverCount} 台服务器：${cnColocation.hits.slice(0, 6).map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("；")}。`
        : "跨租户 CN 混部已启用，但当前租户数量、CN 密度或服务器数量未产生实际共宿。"
      : "CN 按租户独立服务器落位，降低单机故障同时影响多个租户的范围。",
    reduction.allowDnTenantColocation
      ? dnTenantColocation.serverCount
        ? `跨租户 DN 共宿已实际命中 ${dnTenantColocation.serverCount} 台服务器：${dnTenantColocation.hits.slice(0, 6).map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("；")}。同一 Group 副本反亲和仍是硬约束。`
        : "跨租户 DN 混部已启用，但当前租户数量、DN 密度或服务器数量未产生实际共宿。"
      : "DN 按租户独立物理服务器落位，避免单机故障同时影响多个租户。",
    reduction.allowShardColocation
      ? colocation.serverCount
        ? `不同 Group 共宿已实际命中 ${colocation.serverCount} 台服务器：${colocation.hits.slice(0, 6).map((item) => `${item.serverId} ${item.tenant}[${item.groups.map((group) => `G${group}`).join("+")}]`).join("；")}。`
        : `不同 Group 共宿策略已启用，但当前参数未产生实际共宿；单机同租户 DN 上限为 ${reduction.maxTenantDnPerServer}。`
      : "不同 Group 也按单机单 DN 隔离，服务器节省较少但故障域最清晰。",
    ["cnDnMixed", "cnDnGtmMgrMixed"].includes(sizing.effectiveLayout)
      ? "CN 与 DN 共享主机：适合 POC、非核心或已完成峰值叠加及故障切换压测的资源池。"
      : "CN 与 DN 当前保持主机隔离，计算和存储资源边界更清晰。",
    sizing.gtmAffinity === "management"
      ? gtmManagementColocation.serverCount
        ? `GTM 与管理节点合设已实际命中 ${gtmManagementColocation.serverCount} 台服务器：${gtmManagementColocation.hits.slice(0, 6).map((item) => `${item.serverId}[${item.gtmRoles.join("+")}+管理]`).join("；")}。各副本仍按站点和物理服务器分散。`
        : "已选择 GTM 与管理节点合设，但当前服务器水位或站点约束未形成实际共宿，请检查控制面服务器规格与数量。"
      : sizing.gtmAffinity === "tenantPool"
        ? "GTM 随租户组件全混布：仅限 POC，不作为核心生产基线。"
        : "GTM 独立部署：事务控制面隔离性最高。",
    reduction.allowGtmGroupColocation
      ? gtmGroupColocation.serverCount
        ? `不同 GTM Group 共宿已实际命中 ${gtmGroupColocation.serverCount} 台服务器：${gtmGroupColocation.hits.slice(0, 6).map((item) => `${item.serverId}[${item.groups.join("+")}]`).join("；")}。同一 GTM Group 副本仍保持物理服务器反亲和。`
        : "不同 GTM Group 共宿已启用；当前仅有一个 GTM Group，或资源与站点约束未产生实际共宿。"
      : "不同 GTM Group 按物理服务器隔离部署。",
    "可继续缩减的前提是单机 CPU、内存、数据盘、IOPS 和网络均低于规划水位；页面结果是初步装箱估算，最终以版本兼容清单、实测和厂商评审为准。"
  ];

  $("reductionPlan").innerHTML = `
    <div class="reduction-summary">
      <div class="reduction-stat"><span>已选缩减措施</span><strong>${selectedMeasures.join(" + ") || "独立部署"}</strong></div>
      <div class="reduction-stat"><span>严格隔离基线</span><strong>${sizing.strictBaselineServers} 台</strong></div>
      <div class="reduction-stat"><span>当前规划口径</span><strong>${selectedServers} 台</strong></div>
      <div class="reduction-stat"><span>估算缩减</span><strong>${sizing.savedServers} 台 / ${round(sizing.savingRatio * 100)}%</strong></div>
    </div>
    <p class="reduction-status ${statusClass}">${statusText}</p>
    ${redlines.length ? `<div class="redline-output"><strong>必须修改</strong><ul>${redlines.map((item) => `<li>${item}</li>`).join("")}</ul></div>` : ""}
    <ul class="reduction-advice">${advice.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

function getSelectedReductionMeasures(reduction) {
  const measures = [];
  if (reduction.allowCnTenantColocation) measures.push("跨租户 CN 共宿");
  if (reduction.allowDnTenantColocation) measures.push("跨租户 DN 共宿");
  if (reduction.allowShardColocation) measures.push("不同 Group 共宿");
  if (reduction.allowCnDnMixed) measures.push("CN/DN 混部");
  if (reduction.allowGtmManagementMixed) measures.push("GTM/管理混部");
  if (reduction.allowGtmGroupColocation) measures.push("不同 GTM Group 共宿");
  if (reduction.allowAllMixed) measures.push("全组件混部");
  return measures;
}

function getResourceReductionRedlines(data) {
  const redlines = [];
  const sizing = data.reverse ? data : data.serverSizing;
  const dnViolations = data.reverse ? data.dnReplicaHostViolations : data.serverSizing.dnReplicaHostViolations;
  const gtmViolations = data.reverse ? data.gtmReplicaHostViolations : data.serverSizing.gtmReplicaHostViolations;
  const managementViolations = data.reverse ? data.managementHostViolations : data.serverSizing.managementHostViolations;
  const cnTenantIsolationViolations = data.reverse ? data.cnTenantIsolationViolations : data.serverSizing.cnTenantIsolationViolations;
  const cnSameTenantHostViolations = data.reverse ? data.cnSameTenantHostViolations : data.serverSizing.cnSameTenantHostViolations;
  const cnPlacementAudit = data.reverse ? data.cnPlacementAudit : data.serverSizing.cnPlacementAudit;
  const dnTenantIsolationViolations = data.reverse ? data.dnTenantIsolationViolations : data.serverSizing.dnTenantIsolationViolations;
  const controlPlaneAudit = data.reverse ? data.controlPlaneAudit : data.serverSizing.controlPlaneAudit;
  const tenantResourcePoolAudit = data.reverse ? data.tenantResourcePoolAudit : data.serverSizing.tenantResourcePoolAudit;
  const gtmGroupPlacementAudit = data.reverse ? data.gtmGroupPlacementAudit : data.serverSizing.gtmGroupPlacementAudit;
  if (!data.reverse) {
    data.tenantPlans.filter((tenant) => tenant.cnBelowMinimum).forEach((tenant) => {
      redlines.push(`${tenant.name} 单 AZ CN=${tenant.cnPerAz}，低于性能建议 ${tenant.recommendedCnPerAz}；请增加 CN 或重新压测标定。`);
    });
    data.tenantPlans.filter((tenant) => tenant.shardBelowMinimum).forEach((tenant) => {
      redlines.push(`${tenant.name} DN Group=${tenant.shardCount}，低于容量/TPS 水位建议 ${tenant.recommendedShardCount}；请增加 Group。`);
    });
  }
  if (cnTenantIsolationViolations.length) {
    redlines.push(`CN 租户隔离冲突：${cnTenantIsolationViolations.map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("、")}；请增加 CN 服务器或选择跨租户 CN 混部。`);
  }
  if (data.environment === "production" && cnSameTenantHostViolations.length) {
    redlines.push(`生产 CN 同租户同机：${cnSameTenantHostViolations.map((item) => `${item.serverId}[${item.tenant}×${item.count}]`).join("、")}；同一租户每台物理服务器最多部署 1 个 CN。`);
  }
  if (data.environment === "production" && !cnPlacementAudit.complete) {
    redlines.push(`CN 落位不完整：实际 ${cnPlacementAudit.actual}/${cnPlacementAudit.requested}；${cnPlacementAudit.tenants.filter((tenant) => !tenant.complete).map((tenant) => `${tenant.tenant} ${tenant.actual}/${tenant.requested}`).join("、")}。请增加 CN 可用服务器，不能以同租户 CN 同机规避资源不足。`);
  }
  if (dnTenantIsolationViolations.length) {
    redlines.push(`DN 租户隔离冲突：${dnTenantIsolationViolations.map((item) => `${item.serverId}[${item.tenants.join("+")}]`).join("、")}；请增加 DN 服务器或明确选择跨租户 DN 混部。`);
  }
  if (!controlPlaneAudit.complete) {
    redlines.push(`控制面落位不完整：管理节点 ${controlPlaneAudit.actualManagementNodes}/${controlPlaneAudit.requestedManagementNodes}，GTM ${controlPlaneAudit.actualGtmNodes}/${controlPlaneAudit.requestedGtmNodes}；请增加可用主机或调整组件组合。`);
  }
  if (gtmGroupPlacementAudit && !gtmGroupPlacementAudit.complete) {
    redlines.push(`GTM Group 副本不完整：${gtmGroupPlacementAudit.groups.filter((group) => group.actual !== group.expected).map((group) => `${group.groupKey} ${group.actual}/${group.expected}`).join("、")}；必须按每 Group 副本数补齐实例并保持副本反亲和。`);
  }
  if (tenantResourcePoolAudit && !tenantResourcePoolAudit.complete) {
    redlines.push(`新增租户资源池隔离冲突：${tenantResourcePoolAudit.violations.slice(0, 8).map((item) => `${item.serverId}[${item.role}]`).join("、")}；独立部署租户的 CN、DN、专属 GTM 不得落入现有集群服务器。`);
  }
  const dedicatedDistributedTenants = data.tenantPlans.filter((tenant) => tenant.isDistributed && tenant.deploymentStrategy === "dedicated");
  if (dedicatedDistributedTenants.length && data.gtmBinding.kind === "shared") {
    redlines.push(`${dedicatedDistributedTenants.map((tenant) => tenant.name).join("、")}选择新增独立服务器，但当前为系统级共享 GTM；若要求 GTM 也物理隔离，请将 GTM 绑定模式改为“每租户专属”。`);
  }
  if (dnViolations.length) {
    redlines.push(`DN 副本同机：${dnViolations.map((item) => item.group).join("、")}；请增加 DN 可用服务器或降低共宿密度。`);
  }
  if (gtmViolations.length) {
    redlines.push(`GTM 副本同机：${gtmViolations.map((item) => item.group).join("、")}；请增加 GTM/管理主机或改为 GTM 独立部署。`);
  }
  if (managementViolations.length) {
    redlines.push(`管理节点同机：${managementViolations.join("、")} 承载多个管理节点副本；请增加管理主机并保持一机一副本。`);
  }
  const capacityViolations = data.reverse ? data.capacityViolations : sizing.capacityViolations;
  if (capacityViolations.length) {
    redlines.push(`服务器安全水位超限：${capacityViolations.map((server) => server.id).join("、")}；请增加服务器或下调单机组件密度。`);
  }
  if (data.resourceReduction.productionMaximumRedline) {
    redlines.push("生产环境禁止 CN、DN、GTM、管理节点全混布；请取消“全组件混部”，改用分组混部或独立部署。");
  }
  if (data.resourceReduction.densityCapped) {
    redlines.push(`单机同租户 DN 上限 ${data.resourceReduction.configuredTenantLimit} 超过该 DN 机型的单机总实例上限 ${data.resourceReduction.maxDnPerServer}；请下调输入或修改服务器规格。`);
  }
  if (data.managementNodes < data.recommendedManagementNodes) {
    redlines.push(`管理节点 ${data.managementNodes} 个低于当前环境建议的 ${data.recommendedManagementNodes} 个；请增加管理节点。`);
  }
  if (data.gtmNodes > 0 && data.configuredGtmReplicasPerGroup > 0 && data.gtmReplicasPerGroup < data.recommendedGtmReplicasPerGroup) {
    redlines.push(`每个 GTM Group 设置 ${data.gtmReplicasPerGroup} 副本，低于当前环境推荐的 ${data.recommendedGtmReplicasPerGroup} 副本；请增加副本或输入 0 恢复自动推荐。`);
  }
  if (data.environment === "production" && data.mode === "local1az") {
    redlines.push("生产环境仅部署本地单机房，无法覆盖机房级故障；请改为同城双机房或更高容灾模式。");
  }
  if (data.reverse && data.resourceState === "不足") {
    redlines.push(`当前 ${data.serverCount} 台服务器少于组件装箱所需 ${data.requiredServerCount} 台；请增加服务器或降低非高可用资源需求。`);
  }
  if (!data.reverse && sizing.serverPlan.filter((server) => server.roles.length).length > sizing.recommendedServers) {
    redlines.push("物理落位数量超过推荐服务器数，请增加服务器并重新生成拓扑。");
  }
  return redlines;
}

function renderBusinessServerPlan(data) {
  const sizing = data.serverSizing;
  const azNames = getAzNames(data.mode, data.azCount);
  const cards = [
    ["服务器规格来源", `${sizing.serverSpec} · ${sizing.profileLabel}`],
    ["组件组合方式", `${sizing.componentLayoutLabel} · ${sizing.componentLayoutNote}`],
    ["CN 租户部署", data.resourceReduction.cnTenantPlacementLabel],
    ["CN 反亲和核对", data.environment === "production"
      ? `同租户一机一 CN；实际落位 ${sizing.cnPlacementAudit.actual}/${sizing.cnPlacementAudit.requested}`
      : `POC 按机型密度部署；实际落位 ${sizing.cnPlacementAudit.actual}/${sizing.cnPlacementAudit.requested}`],
    ["DN 租户部署", data.resourceReduction.dnTenantPlacementLabel],
    ["GTM 部署亲和", sizing.gtmAffinityLabel],
    ["新增租户服务器策略", data.tenantPlans.map((tenant) => `${tenant.name}: ${tenant.deploymentStrategyLabel}`).join("；")],
    ["GTM Group 副本", `${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes} 实例（推荐每组 ${data.recommendedGtmReplicasPerGroup}）`],
    ["GTM 逐组核对", sizing.gtmGroupPlacementAudit.groups.map((group) => `${group.groupKey} ${group.actual}/${group.expected}`).join("；") || "无 GTM Group"],
    ["控制面落位核对", `管理 ${sizing.controlPlaneAudit.actualManagementNodes}/${sizing.controlPlaneAudit.requestedManagementNodes}；GTM ${sizing.controlPlaneAudit.actualGtmNodes}/${sizing.controlPlaneAudit.requestedGtmNodes}`],
    ["推荐资源总量", `${data.totalCn} CN / ${data.businessTenants} 租户 / ${data.dnInstances} DN / ${data.gtmNodes} GTM / ${data.managementNodes} 管理`],
    ["站点容量关系", `${azNames.map((az, index) => `${az} ${round(data.siteCapacityFactors[index] * 100)}%`).join("；")}。同城生产侧按对等容量，异地侧按显式灾备比例。`],
    ["租户分片与副本", data.tenantPlans.map((tenant) => `${tenant.name}: ${tenant.shardCount}分片×${tenant.replicasPerShard}副本`).join("；")],
    ["资源预留后可用", `${sizing.usableSpec}，预留 ${round(sizing.reserveRatio * 100)}%`],
    ["推荐服务器数", `${sizing.recommendedServers} 台 · ${sizing.deploymentStyle}`],
    ["资源缩减对比", `严格隔离 ${sizing.strictBaselineServers} 台 → 当前 ${sizing.recommendedServers} 台，估算减少 ${sizing.savedServers} 台`],
    ["最终部署组成", getDeploymentArchitectureText(sizing)],
    ["独立部署口径", `${sizing.dedicatedServers} 台：CN ${sizing.cnServers} / DN ${sizing.dnServers} / GTM ${sizing.gtmServers} / 管理 ${sizing.managementServers}`],
    ["推荐混布口径", `GTM+管理 ${sizing.gtmMgrMixedServers} 台 / CN+DN ${sizing.cnDnMixedServers} 台 / 双主机组 ${sizing.cnDnGtmMgrMixedServers} 台 / 全混布 ${sizing.allMixedServers} 台`],
    ["混部台数判定", `CN+DN：${sizing.mixedAnalyses.cnDn.bottleneck}，${sizing.mixedAnalyses.cnDn.detail} GTM+管理：${sizing.mixedAnalyses.gtmManagement.bottleneck}，${sizing.mixedAnalyses.gtmManagement.detail}`],
    ["DN 中心分布", `${sizing.dnCenterDistribution.centers.map((item) => `${item.az} ${item.instances}实例/${item.hosts}机`).join("；")}。${sizing.dnCenterDistribution.explanation}`],
    ["副本落盘容量", `${round(sizing.storedDataTb)}TB，DN 容量口径需 ${sizing.dnServersByCapacity} 台`]
  ];

  $("businessServerPlan").innerHTML = `
    <div class="reverse-card-grid">
      ${cards.map(([key, value]) => `<div class="reverse-card"><span>${key}</span><strong>${value}</strong></div>`).join("")}
    </div>
    <div class="component-spec-output">
      ${componentServerDefinitions.map(({ key, label }) => {
        const spec = sizing.componentSpecs[key];
        const requirement = sizing.requirements[key];
        return `
          <article class="component-spec-row">
            <div><strong>${label}</strong><span>${spec.sourceLabel} · ${getComponentPlacementLabel(sizing.componentLayout, key)}</span></div>
            <b>${requirement.servers} 台</b>
            <small>${spec.model} · ${spec.cpuModel} · ${spec.archLabel} · ${spec.osLabel}</small>
            <i>${spec.sockets}路 / ${spec.cores}总物理核 / ${spec.memoryGb}GB · 数据盘 ${spec.dataDiskTb}TB×${spec.dataDiskCount}=${round(spec.diskTb)}TB · 单机≤${spec.maxInstances}实例</i>
            <i>网络 ${spec.network} · 系统盘 ${spec.systemDisk}</i>
            <em>独立口径 Max(实例 ${requirement.byInstances}, CPU ${requirement.byCpu}, 内存 ${requirement.byMemory}, 磁盘 ${requirement.byDisk}, 反亲和/租户密度 ${requirement.byAffinity})</em>
          </article>
        `;
      }).join("")}
    </div>
    <div class="server-plan-list">
      ${sizing.perAzServers.map((count, index) => `
        <article class="server-row">
          <strong>${azNames[index] || `AZ-${index + 1}`}</strong>
          <span>${count} 台</span>
          <small>${data.environment === "poc" ? "CN/DN/GTM/管理节点可混布验证" : "生产建议 CN、DN、GTM、管理节点分层隔离"}</small>
          <i>${data.mode === "twoSiteThreeDc" && index === 2 ? "异地灾备侧按接管能力预留" : "承载本中心租户资源与副本"}</i>
        </article>
      `).join("")}
    </div>
    <div class="physical-server-output">
      <div class="tenant-board-head">
        <strong>物理服务器配置及个数</strong>
        <span>按机房、主机组和组件实例逐台展开</span>
      </div>
      <div class="server-plan-list">${sizing.serverPlan.map(renderBusinessPhysicalServerRow).join("")}</div>
    </div>
  `;
}

function renderBusinessPhysicalServerRow(server) {
  const spec = server.spec;
  const audit = server.resourceAudit;
  const specText = spec
    ? `${spec.model} · ${spec.sockets}路/${spec.cores}物理核 · ${spec.memoryGb}GB · 数据盘${spec.dataDiskTb}TB×${spec.dataDiskCount}${audit ? ` · 水位 CPU ${audit.cpuPercent}% / 内存 ${audit.memoryPercent}% / 磁盘 ${audit.diskPercent}%${audit.withinWatermark ? "（通过）" : "（超限）"}` : ""}`
    : "预留机型待确认";
  return `
    <article class="server-row physical-output-row">
      <strong>${server.id}</strong>
      <span>${server.az} / ${server.rack}</span>
      <small>${server.tenantPoolLabel || "现有集群共享服务器"} / ${server.hostGroup}：${server.roles.length ? server.roles.join(" / ") : "故障接管与扩容预留"}</small>
      <i>${specText}</i>
    </article>
  `;
}

function renderServerPlanRow(server) {
  const roleText = server.roles.length ? server.roles.join(" / ") : "预留";
  return `
    <article class="server-row">
      <strong>${server.id}</strong>
      <span>${server.az}</span>
      <small>${server.tenantPoolLabel || "现有集群共享服务器"}：${roleText}</small>
      <i>CPU ${server.cpuLoad}% / 磁盘 ${server.diskLoad}%</i>
    </article>
  `;
}

function getReverseConclusion(data) {
  if (data.resourceState === "不足") return "需增加服务器或降低分片/副本/隔离要求";
  if (data.environment === "poc") return "可用于 POC 验证，生产需重新按隔离规则评审";
  if (data.resourceState === "临界") return "可做生产初评，建议扩容后上线";
  return "可作为生产架构初稿，仍需厂商评审和压测确认";
}

function getServerTypeLabel(type) {
  if (type === "compute") return "计算型";
  if (type === "storage") return "存储型";
  return "通用型";
}

function round(value) {
  return Number(value).toFixed(value >= 100 ? 0 : 2).replace(/\.00$/, "");
}

function renderTopology(data) {
  $("topology").classList.toggle("business-topology", !data.reverse);
  $("topology").classList.toggle("reverse-topology", data.reverse);
  $("topology").innerHTML = renderPptNetworkPlan(data);
  $("serverTopology").innerHTML = renderPptServerTopology(data);
}

function renderExcelExportSummary(data) {
  const servers = getPlanServers(data);
  const dedicatedServers = servers.filter((server) => server.tenantPool && server.tenantPool !== "shared").length;
  $("excelExportStats").innerHTML = [
    `${data.azCount} 个中心 / AZ`,
    `${servers.length} 台服务器`,
    `${data.businessTenants} 个租户`,
    dedicatedServers ? `${dedicatedServers} 台新增租户服务器` : "现有集群资源池"
  ].map((item) => `<span>${item}</span>`).join("");
}

function getPlanServers(data) {
  return data.reverse ? data.serverPlan : data.serverSizing.serverPlan;
}

function parseDnPlacementRole(role) {
  const match = role.match(/^(.*)-DN-G(\d+)-(Master|Slave\d*|Slave)$/);
  if (!match) return null;
  return {
    tenant: match[1],
    group: Number(match[2]),
    role: match[3] === "Master" ? "M" : `S${match[3].replace("Slave", "") || "1"}`
  };
}

function getTenantDnPlacements(server, tenantName) {
  return server.roles
    .map(parseDnPlacementRole)
    .filter((item) => item && item.tenant === tenantName)
    .sort((a, b) => a.group - b.group || a.role.localeCompare(b.role));
}

function getShardColocationState(data) {
  const servers = getPlanServers(data);
  const hits = [];
  servers.forEach((server) => {
    data.tenantPlans.forEach((tenant) => {
      const placements = getTenantDnPlacements(server, tenant.name);
      const groups = [...new Set(placements.map((item) => item.group))];
      if (groups.length > 1) hits.push({ serverId: server.id, tenant: tenant.name, groups });
    });
  });
  return {
    enabled: data.resourceReduction.allowShardColocation,
    hits,
    serverCount: new Set(hits.map((item) => item.serverId)).size
  };
}

function getCnTenantColocationState(data) {
  const hits = getPlanServers(data)
    .map((server) => ({ serverId: server.id, tenants: getServerCnTenants(server) }))
    .filter((item) => item.tenants.length > 1);
  return {
    enabled: data.resourceReduction.allowCnTenantColocation,
    hits,
    serverCount: hits.length
  };
}

function getDnTenantColocationState(data) {
  const hits = getPlanServers(data)
    .map((server) => ({ serverId: server.id, tenants: getServerDnTenants(server) }))
    .filter((item) => item.tenants.length > 1);
  return {
    enabled: data.resourceReduction.allowDnTenantColocation,
    hits,
    serverCount: hits.length
  };
}

function getGtmGroupColocationState(data) {
  const hits = getPlanServers(data)
    .map((server) => ({
      serverId: server.id,
      groups: [...new Set(server.roles.map(getGtmRoleGroupKey).filter(Boolean))]
    }))
    .filter((item) => item.groups.length > 1);
  return {
    enabled: data.resourceReduction.allowGtmGroupColocation,
    hits,
    serverCount: hits.length
  };
}

function getGtmManagementColocationState(data) {
  const hits = getPlanServers(data)
    .filter((server) => server.roles.some(isGtmRole) && server.roles.includes("管理节点"))
    .map((server) => ({
      serverId: server.id,
      gtmRoles: server.roles.filter(isGtmRole)
    }));
  return {
    enabled: data.resourceReduction.allowGtmManagementMixed,
    hits,
    serverCount: hits.length
  };
}

function renderTenantDnPlacement(placements) {
  if (!placements.length) return "";
  const uniqueGroups = [...new Set(placements.map((item) => item.group))];
  return `
    <div class="ppt-dn-placement ${uniqueGroups.length > 1 ? "is-colocated" : ""}">
      ${uniqueGroups.length > 1 ? `<span class="group-colocation-badge">同租户多 Group 共宿 · ${uniqueGroups.map((group) => `G${group}`).join(" + ")}</span>` : ""}
      <div class="ppt-dn-group-list">
        ${placements.map((item) => `<span class="ppt-dn-group-token">${item.tenant}-DN-G${item.group}-${item.role}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderPptNetworkPlan(data) {
  const servers = getPlanServers(data);
  const colocation = getShardColocationState(data);
  const azNames = getAzNames(data.mode, data.azCount);
  const siteColumns = azNames.map((az, azIndex) => {
    const siteServers = servers.filter((server) => server.az === az);
    const grouped = groupServersByHostGroup(siteServers);
    return `
      <section class="ppt-site-column ${isDisasterSite(data.mode, azIndex) ? "disaster" : ""}">
        <header><strong>${az}</strong><span>${getSiteRole(data.mode, azIndex)}</span></header>
        <div class="ppt-site-apps">
          ${data.tenantPlans.slice(0, 4).map((tenant) => `<span>${tenant.name}业务接入</span>`).join("")}
        </div>
        <div class="ppt-host-groups">
          ${grouped.map(([groupName, groupServers]) => `
            <section class="ppt-host-group">
              <div class="ppt-host-group-title"><strong>${groupName}</strong><span>${groupServers.length} 台</span></div>
              <div class="ppt-logical-server-grid">
                ${groupServers.map((server) => renderPptLogicalServer(server, data)).join("")}
              </div>
            </section>
          `).join("") || `<div class="ppt-empty-site">本中心按灾备接管策略预留资源</div>`}
        </div>
      </section>
    `;
  }).join("");

  return `
    ${renderTopologyOverview(data)}
    <div class="ppt-network-board" style="--site-count:${data.azCount}">
      <div class="ppt-workload-row">
        <strong>业务系统</strong>
        ${data.tenantPlans.slice(0, 6).map((tenant) => `<span>${tenant.name} · ${tenant.type}</span>`).join("")}
      </div>
      <div class="ppt-site-grid">${siteColumns}</div>
      <div class="ppt-link-band ${data.mode === "local1az" ? "single" : ""}">
        <i></i><span>${getNetworkLinkText(data.mode)}</span><i></i>
      </div>
      <div class="ppt-plan-note">
        <strong>${data.reverse ? data.componentLayoutLabel : data.serverSizing.componentLayoutLabel}</strong>
        <span>租户边界跨 Server 展开；DN 按 Group 展示 M/S 角色。${colocation.enabled ? `同租户多 Group 共宿实际命中 ${colocation.serverCount} 台。` : "同租户不同 Group 未启用共宿。"}</span>
      </div>
    </div>
  `;
}

function renderPptLogicalServer(server, data) {
  const tenantGroups = data.tenantPlans.map((tenant, tenantIndex) => {
    const roles = server.roles.filter((role) => role.startsWith(`${tenant.name}-`));
    if (!roles.length) return "";
    const dnPlacements = getTenantDnPlacements(server, tenant.name);
    const nonDnRoles = roles.filter((role) => !isDnRole(role));
    return `
      <div class="ppt-tenant-boundary tenant-${tenantIndex % 4}">
        <b>${tenant.name}</b>
        ${nonDnRoles.length ? `<div>${nonDnRoles.slice(0, 6).map(renderPptRolePill).join("")}${nonDnRoles.length > 6 ? `<span class="role-more">+${nonDnRoles.length - 6}</span>` : ""}</div>` : ""}
        ${renderTenantDnPlacement(dnPlacements)}
      </div>
    `;
  }).join("");
  const systemRoles = server.roles.filter((role) => !data.tenantPlans.some((tenant) => role.startsWith(`${tenant.name}-`)));
  const systemGroup = systemRoles.length ? `
    <div class="ppt-system-boundary">
      <b>集群管理域</b>
      <div>${systemRoles.slice(0, 8).map(renderPptRolePill).join("")}</div>
    </div>
  ` : "";

  return `
    <article class="ppt-logical-server ${server.roles.length ? "" : "reserve"}">
      <div class="ppt-server-head"><strong>${server.id}</strong><span>${server.tenantPoolLabel || "现有集群共享服务器"} · ${server.rack || server.az}</span></div>
      ${tenantGroups}${systemGroup || (!tenantGroups ? `<p>故障接管 / 扩容预留</p>` : "")}
    </article>
  `;
}

function renderPptRolePill(role) {
  const type = isCnRole(role) ? "cn" : isDnRole(role) ? "dn" : isGtmRole(role) ? "gtm" : "management";
  const label = role
    .replace("-Master", "-M")
    .replace(/-Slave(\d*)$/, (_, no) => `-S${no || "1"}`);
  return `<span class="ppt-role-pill ${type}" title="${role}">${label}</span>`;
}

function renderPptServerTopology(data) {
  const servers = getPlanServers(data);
  const azNames = getAzNames(data.mode, data.azCount);
  return `
    <div class="physical-topology-board" style="--site-count:${data.azCount}">
      <div class="physical-site-grid">
        ${azNames.map((az, azIndex) => {
          const siteServers = servers.filter((server) => server.az === az);
          const racks = groupServersByRack(siteServers);
          return `
            <section class="physical-site ${isDisasterSite(data.mode, azIndex) ? "disaster" : ""}">
              <header><strong>${az}</strong><span>${getSiteRole(data.mode, azIndex)}</span></header>
              <div class="rack-grid">
                ${racks.map(([rack, rackServers]) => `
                  <section class="rack-group">
                    <div class="rack-title"><strong>${rack}</strong><span>${rackServers.length} 台</span></div>
                    <div class="physical-server-grid">${rackServers.map((server) => renderPhysicalServer(server, data)).join("")}</div>
                  </section>
                `).join("") || `<div class="ppt-empty-site">异地侧服务器按实际接管比例补充</div>`}
              </div>
            </section>
          `;
        }).join("")}
      </div>
      <div class="physical-link-row"><span>${getNetworkLinkText(data.mode)}</span></div>
    </div>
  `;
}

function renderPhysicalServer(server, data) {
  const spec = server.spec;
  const specText = spec
    ? `${spec.model} · ${spec.sockets}路/${spec.cores}物理核 · ${spec.memoryGb}GB · 数据盘${spec.dataDiskTb}TB×${spec.dataDiskCount}`
    : `${data.cpuCores || "-"}核 · ${data.memoryGb || "-"}GB · ${data.diskTb || "-"}TB`;
  return `
    <article class="physical-server ${server.roles.length ? "" : "reserve"}">
      <div class="server-chassis" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="physical-server-info">
        <div><strong>${server.id}</strong><span>${server.tenantPoolLabel || "现有集群共享服务器"} / ${server.hostGroup || "通用资源池"}</span></div>
        <p>${summarizeServerRoles(server.roles)}</p>
        ${renderServerCnTenantMap(server.roles)}
        ${renderServerDnGroupMap(server.roles)}
        ${renderServerGtmGroupMap(server.roles)}
        <small>${renderServerRoleDetail(server.roles)}</small>
        <em>${specText}</em>
      </div>
    </article>
  `;
}

function groupServersByHostGroup(servers) {
  const groups = new Map();
  servers.forEach((server) => {
    const key = server.hostGroup || "通用服务器";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(server);
  });
  return [...groups.entries()];
}

function groupServersByRack(servers) {
  const groups = new Map();
  servers.forEach((server, index) => {
    const key = server.rack || `机柜${Math.floor(index / 3) + 1}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(server);
  });
  return [...groups.entries()];
}

function getSiteRole(mode, index) {
  if (mode === "local1az") return "POC / 本地验证中心";
  if (mode === "local2az") return index === 0 ? "生产机房" : "同城高可用机房";
  if (mode === "twoSiteThreeDc") return ["生产中心", "同城中心", "异地灾备中心"][index] || "灾备中心";
  return ["生产中心", "生产同城中心", "异地中心", "异地同城中心", "远程兜底中心"][index] || "容灾中心";
}

function isDisasterSite(mode, index) {
  if (mode === "twoSiteThreeDc") return index === 2;
  if (mode === "threeSiteFiveDc") return index >= 2;
  return false;
}

function getNetworkLinkText(mode) {
  if (mode === "local1az") return "单机房内部业务网 / 管理网 / 存储网隔离";
  if (mode === "local2az") return "同城中心间同步/快同步复制，双向业务接入与管理心跳";
  if (mode === "twoSiteThreeDc") return "同城双中心同步/快同步；异地中心异步复制与灾备接管";
  return "同城域内同步/快同步；跨地域异步复制，按多集群灾备域规划";
}

function renderBusinessTopology(data) {
  const layout = getBusinessLayout(data.mode);
  const svg = renderLinks(layout.links);
  const overview = renderTopologyOverview(data);
  const sites = layout.sites.map((site) => renderBusinessSite(site, data)).join("");
  const haMatrix = renderBusinessHaMatrix(data);

  return `${svg}${overview}${sites}${haMatrix}`;
}

function getBusinessLayout(mode) {
  if (mode === "local1az") {
    return {
      sites: [
        { id: "local", name: "本地机房", role: "POC/验证中心", x: 18, y: 12, w: 64, h: 38 }
      ],
      links: []
    };
  }
  if (mode === "local2az") {
    return {
      sites: [
        { id: "a", name: "AZ-A", role: "生产机房", x: 5, y: 12, w: 42, h: 42 },
        { id: "b", name: "AZ-B", role: "同城机房", x: 53, y: 12, w: 42, h: 42 }
      ],
      links: [["a", "b", "sync"]]
    };
  }
  if (mode === "twoSiteThreeDc") {
    return {
      sites: [
        { id: "a", name: "中心 A", role: "生产中心", x: 4, y: 10, w: 29, h: 43 },
        { id: "b", name: "中心 B", role: "同城中心", x: 36, y: 10, w: 29, h: 43 },
        { id: "c", name: "中心 C", role: "异地灾备", x: 69, y: 16, w: 27, h: 37, disaster: true }
      ],
      links: [
        ["a", "b", "sync"],
        ["b", "c", "async"],
        ["a", "c", "async"]
      ]
    };
  }
  return {
    sites: [
      { id: "a1", name: "A1", role: "生产中心", x: 3, y: 9, w: 27, h: 25 },
      { id: "a2", name: "A2", role: "同城中心", x: 3, y: 39, w: 27, h: 23 },
      { id: "b1", name: "B1", role: "异地热备", x: 37, y: 9, w: 27, h: 25 },
      { id: "b2", name: "B2", role: "异地同城备", x: 37, y: 39, w: 27, h: 23 },
      { id: "c1", name: "C1", role: "远程兜底", x: 71, y: 24, w: 26, h: 28, disaster: true }
    ],
    links: [
      ["a1", "a2", "sync"],
      ["b1", "b2", "sync"],
      ["a1", "b1", "async"],
      ["a2", "b2", "async"],
      ["b1", "c1", "async"]
    ]
  };
}

function renderBusinessSite(site, data) {
  const cnText = `${data.cnPerAz} CN/AZ`;
  const dnText = site.disaster && data.mode !== "threeSiteFiveDc"
    ? "灾备副本"
    : `${data.shardCount} Group`;
  const gtmText = data.shape === "distributed"
    ? `${site.disaster ? "备" : data.gtmPerPrimaryAz} GTM`
    : "GTM 可选";
  const mgrText = site.disaster ? "管理备" : "管理节点";
  const tenantBrief = data.tenantPlans
    .slice(0, 3)
    .map((tenant) => `<span>${tenant.name}: CN ${tenant.cnPerAz}/AZ · DN ${tenant.shardCount}G×${tenant.replicasPerShard}</span>`)
    .join("");

  return `
    <section class="site business-site ${site.disaster ? "disaster-site" : ""}" style="left:${site.x}%;top:${site.y}%;width:${site.w}%;height:${site.h}%">
      <div class="site-title"><span>${site.name}</span><small>${site.role}</small></div>
      <div class="node-grid">
        <div class="node cn"><strong>${cnText}</strong><small>租户计算入口，多 CN 负载均衡</small></div>
        <div class="node dn"><strong>${dnText}</strong><small>${getDnRoleText(site, data)}</small></div>
        <div class="node gtm"><strong>${gtmText}</strong><small>${data.gtmBinding.kind === "shared" ? "共享事务域" : "租户事务域"}</small></div>
        <div class="node mgr"><strong>${mgrText}</strong><small>OMM/Insight 管理面 HA</small></div>
      </div>
      <div class="site-tenant-strip">${tenantBrief}</div>
    </section>
  `;
}

function renderBusinessHaMatrix(data) {
  const tenantCards = data.tenantPlans
    .slice(0, 4)
    .map((tenant) => `
      <article class="business-ha-tenant">
        <div>
          <strong>${tenant.name}</strong>
          <span>${tenant.type}</span>
        </div>
        <p>CN：${tenant.cnPerAz}/AZ，单 CN 推荐 ${tenant.cnSpecLabel || `${tenant.cnCores}C/${tenant.cnMemoryGb}GB`}；DN：${tenant.shardCount} Group，单 DN 推荐 ${tenant.dnSpecLabel || `${tenant.dnCores}C/${tenant.dnMemoryGb}GB`}。</p>
        <small>GTM：${tenant.gtmGroupText}；管理节点：${data.managementNodes} 个实例管控租户拓扑、监控、切换。</small>
      </article>
    `)
    .join("");

  return `
    <section class="business-ha-matrix">
      <div class="business-ha-head">
        <strong>地域 / 租户 / 组件高可用架构</strong>
        <span>${modeLabels[data.mode]} · ${data.serverSizing.recommendedServers} 台服务器建议 · ${data.serverSizing.componentLayoutLabel}</span>
      </div>
      <div class="business-ha-grid">${tenantCards}</div>
    </section>
  `;
}

function renderReverseTopology(data) {
  const servers = data.serverPlan.slice(0, 24);
  const hiddenServerCount = Math.max(0, data.serverPlan.length - servers.length);
  const tenantMap = data.tenantPlans
    .slice(0, 8)
    .map((tenant) => `
      <article class="reverse-tenant-map-card">
        <strong>${tenant.name}</strong>
        <span>${tenant.type}</span>
        <small>CN ${tenant.cnPerAz}/AZ · DN ${tenant.shardCount} Group × ${tenant.replicasPerShard} 副本 = ${tenant.dnInstances} 实例</small>
        <small>${tenant.gtmGroupText}</small>
      </article>
    `)
    .join("");
  const tenantRelationChains = data.tenantPlans
    .slice(0, 6)
    .map((tenant) => renderTenantComponentChain(tenant, data.serverPlan))
    .join("");
  const serverTiles = renderTopologyServerTiles(servers);

  return `
    ${renderTopologyOverview(data)}
    <div class="reverse-topology-board">
      <section class="reverse-cluster-summary">
        <div class="reverse-summary-card cluster">
          <strong>${data.serverCount}</strong>
          <span>服务器节点</span>
          <small>${data.resourceState} · 当前组合至少 ${data.requiredServerCount} 台</small>
        </div>
        <div class="reverse-summary-card tenant">
          <strong>${data.businessTenants}</strong>
          <span>租户实例</span>
          <small>${data.distributedTenants} 个分布式租户</small>
        </div>
        <div class="reverse-summary-card cn">
          <strong>${data.totalCn}</strong>
          <span>CN 总实例</span>
          <small>${data.cnPerAz}/AZ</small>
        </div>
        <div class="reverse-summary-card dn">
          <strong>${data.dnInstances}</strong>
          <span>DN 副本实例</span>
          <small>${data.shardCount} Group · ${data.replicasPerShard} 最大副本</small>
        </div>
        <div class="reverse-summary-card gtm">
          <strong>${data.gtmNodes}</strong>
          <span>GTM 实例</span>
          <small>${data.gtmBinding.groupCount} 个 GTM Group</small>
        </div>
        <div class="reverse-summary-card mgr">
          <strong>${data.managementNodes}</strong>
          <span>管理节点</span>
          <small>OMM / Insight</small>
        </div>
      </section>

      <section class="reverse-server-section">
        <div class="reverse-section-title">
          <strong>服务器节点与组件分布</strong>
          <span>${data.componentLayoutLabel} · ${modeLabels[data.mode]}</span>
        </div>
        <div class="reverse-server-grid">${serverTiles}</div>
        ${hiddenServerCount ? `<div class="tenant-overflow">其余 ${hiddenServerCount} 台服务器按同一规则继续分布</div>` : ""}
      </section>

      <section class="reverse-tenant-map">
        <div class="reverse-section-title">
          <strong>租户资源映射</strong>
          <span>租户包含 CN、DN Group、副本与 GTM 绑定</span>
        </div>
        <div class="reverse-tenant-map-grid">${tenantMap}</div>
      </section>

      <section class="reverse-tenant-chain-section">
        <div class="reverse-section-title">
          <strong>租户 / CN / DN / GTM 关系链</strong>
          <span>按租户命名组件，明确租户资源归属与访问路径</span>
        </div>
        <div class="tenant-chain-list">${tenantRelationChains}</div>
      </section>
    </div>
  `;
}

function renderTopologyServerTiles(servers) {
  return servers.map((server) => {
    const roleGroups = summarizeServerRoles(server.roles);
    return `
      <article class="reverse-server-node ${server.roles.length ? "" : "reserve"}">
        <div>
          <strong>${server.id}</strong>
          <span>${server.az}</span>
        </div>
        <p>${roleGroups}</p>
        <small class="reverse-server-detail">${renderServerRoleDetail(server.roles)}</small>
        <small>CPU ${server.cpuLoad}% · 磁盘 ${server.diskLoad}% · ${server.roles.length ? `${server.roles.length} 组件实例` : "预留节点"}</small>
      </article>
    `;
  }).join("");
}

function renderTenantComponentChain(tenant, serverPlan) {
  const tenantCnRoles = getTenantRolesFromServers(tenant.name, serverPlan, isCnRole);
  const cnNodes = (tenantCnRoles.length
    ? tenantCnRoles
    : Array.from({ length: tenant.cnPerAz }, (_, index) => `${tenant.name}-CN${index + 1}`))
    .slice(0, 8);
  const dnNodes = [];
  for (let group = 1; group <= Math.min(tenant.shardCount, 4); group += 1) {
    dnNodes.push(`${tenant.name}-DN-G${group}-Master`);
    const slaveCount = Math.min(Math.max(0, tenant.replicasPerShard - 1), 2);
    for (let slave = 1; slave <= slaveCount; slave += 1) {
      dnNodes.push(`${tenant.name}-DN-G${group}-Slave${slave}`);
    }
  }
  const hiddenDn = tenant.shardCount > 4 || tenant.replicasPerShard > 3
    ? `<span class="tenant-chain-more">其余 DN：${tenant.shardCount} Group × ${tenant.replicasPerShard} 副本继续展开</span>`
    : "";
  const tenantGtmRoles = getTenantGtmRolesFromServers(tenant, serverPlan);
  const gtmNodes = tenantGtmRoles.length ? tenantGtmRoles : tenant.isDistributed
    ? [tenant.gtmLabel.includes("共享") ? "GTM-SYS" : `${tenant.name}-GTM1`]
    : ["GTM 可选"];
  const cnServerText = renderComponentServerMap(cnNodes, serverPlan, "cn");
  const dnServerText = renderComponentServerMap(dnNodes, serverPlan, "dn");
  const gtmServerText = renderComponentServerMap(gtmNodes, serverPlan, "gtm");

  return `
    <article class="tenant-chain-card">
      <div class="tenant-chain-root">
        <strong>${tenant.name}</strong>
        <small>${tenant.type}</small>
      </div>
      <div class="tenant-chain-arrow">应用连接</div>
      <div class="tenant-chain-group cn">
        <b>CN 计算入口</b>
        <div>${cnNodes.map((node) => `<span>${node}</span>`).join("")}</div>
        <small class="tenant-chain-server-map">${cnServerText}</small>
      </div>
      <div class="tenant-chain-arrow">路由访问</div>
      <div class="tenant-chain-group dn">
        <b>DN 分片与副本</b>
        <div>${dnNodes.map((node) => `<span>${node}</span>`).join("")}${hiddenDn}</div>
        <small class="tenant-chain-server-map">${dnServerText}</small>
      </div>
      <div class="tenant-chain-arrow">全局事务</div>
      <div class="tenant-chain-group gtm">
        <b>GTM 绑定</b>
        <div>${gtmNodes.map((node) => `<span>${node}</span>`).join("")}<small>${tenant.gtmGroupText}</small></div>
        <small class="tenant-chain-server-map">${gtmServerText}</small>
      </div>
    </article>
  `;
}

function getTenantRolesFromServers(tenantName, serverPlan, predicate) {
  const roles = [];
  serverPlan.forEach((server) => {
    server.roles.forEach((role) => {
      if (role.startsWith(`${tenantName}-`) && predicate(role) && !roles.includes(role)) {
        roles.push(role);
      }
    });
  });
  return roles;
}

function getTenantGtmRolesFromServers(tenant, serverPlan) {
  const roles = [];
  serverPlan.forEach((server) => {
    server.roles.forEach((role) => {
      const matchesDedicated = role.startsWith(`${tenant.name}-GTM`);
      const matchesShared = tenant.gtmLabel.includes("共享") && role.startsWith("GTM-SYS");
      if ((matchesDedicated || matchesShared) && !roles.includes(role)) {
        roles.push(role);
      }
    });
  });
  return roles.slice(0, 4);
}

function renderComponentServerMap(nodes, serverPlan, type) {
  const pairs = nodes
    .map((node) => {
      const server = findServerForComponent(node, serverPlan, type);
      return server ? `${node}@${server.id}` : `${node}@待分配`;
    })
    .slice(0, 5);
  const more = nodes.length > 5 ? ` / +${nodes.length - 5} 项` : "";
  return `服务器关联：${pairs.join(" / ")}${more}`;
}

function findServerForComponent(node, serverPlan, type) {
  if (type === "gtm" && node === "GTM-SYS") {
    return serverPlan.find((server) => server.roles.some((role) => role.startsWith("GTM-SYS") || role === "GTM"));
  }
  return serverPlan.find((server) => server.roles.some((role) => {
    if (type === "dn") return role === `DN ${node}` || role.includes(node);
    return role === node || role.includes(node);
  }));
}

function summarizeServerRoles(roles) {
  if (!roles.length) return "预留资源";
  const cn = roles.filter(isCnRole).length;
  const gtm = roles.filter(isGtmRole).length;
  const mgr = roles.filter((role) => role === "管理节点").length;
  const dnMaster = roles.filter((role) => isDnRole(role) && role.includes("Master")).length;
  const dnSlave = roles.filter((role) => isDnRole(role) && role.includes("Slave")).length;
  const parts = [];
  if (cn) parts.push(`CN×${cn}`);
  if (dnMaster) parts.push(`DN-M×${dnMaster}`);
  if (dnSlave) parts.push(`DN-S×${dnSlave}`);
  if (gtm) parts.push(`GTM×${gtm}`);
  if (mgr) parts.push(`管理×${mgr}`);
  return parts.join(" / ") || roles.join(" / ");
}

function renderServerDnGroupMap(roles) {
  const tenants = new Map();
  roles.map(parseDnPlacementRole).filter(Boolean).forEach((item) => {
    if (!tenants.has(item.tenant)) tenants.set(item.tenant, []);
    tenants.get(item.tenant).push(item);
  });
  if (!tenants.size) return "";
  return `
    <div class="physical-dn-group-map">
      ${[...tenants.entries()].map(([tenant, placements]) => {
        const groups = [...new Set(placements.map((item) => item.group))];
        return `<span class="${groups.length > 1 ? "is-colocated" : ""}">${placements
          .sort((a, b) => a.group - b.group || a.role.localeCompare(b.role))
          .map((item) => `${tenant}-DN-G${item.group}-${item.role}`)
          .join(" + ")}${groups.length > 1 ? " · 多Group共宿" : ""}</span>`;
      }).join("")}
    </div>
  `;
}

function renderServerCnTenantMap(roles) {
  const tenants = [...new Set(roles.map(parseCnTenant).filter(Boolean))];
  if (!tenants.length) return "";
  return `<div class="physical-cn-tenant-map ${tenants.length > 1 ? "is-shared" : ""}"><b>CN 租户</b><span>${tenants.join(" + ")}${tenants.length > 1 ? " · 跨租户共宿" : " · 独立"}</span></div>`;
}

function renderServerGtmGroupMap(roles) {
  const groups = [...new Set(roles.map(getGtmRoleGroupKey).filter(Boolean))];
  if (groups.length < 2) return "";
  return `<div class="physical-gtm-group-map"><b>GTM Group</b><span>${groups.join(" + ")} · 跨组共宿</span></div>`;
}

function renderServerRoleDetail(roles) {
  if (!roles.length) return "无组件，作为扩容或故障接管预留";
  const visible = roles.slice(0, 4).join(" / ");
  const hidden = roles.length > 4 ? ` / +${roles.length - 4} 项` : "";
  return `${visible}${hidden}`;
}

function renderTopologyOverview(data) {
  const tenantText = data.reverse
    ? `${data.businessTenants} 租户 / ${data.serverCount} 台服务器`
    : data.shape === "distributed"
    ? `${data.businessTenants} 业务租户 / ${data.distributedTenants} 分布式租户`
    : `${data.businessTenants} 业务租户 / 集中式租户为主`;
  const shapeText = data.reverse ? goalLabels[data.goal] : shapeLabels[data.shape];

  return `
    <div class="topology-ribbon">
      <span class="topology-chip cluster">集群：${modeLabels[data.mode]}</span>
      <span class="topology-chip tenant">租户：${tenantText}</span>
      <span class="topology-chip shape">${data.reverse ? "目标" : "形态"}：${shapeText}</span>
    </div>
  `;
}

function renderRelationGraph(data) {
  const tenantCards = data.tenantPlans
    .slice(0, 8)
    .map(renderTenantCard)
    .join("");
  const overflow = data.tenantPlans.length > 8
    ? `<div class="tenant-overflow">其余 ${data.tenantPlans.length - 8} 个租户按同一规格继续规划</div>`
    : "";
  const gtmText = data.shape === "distributed"
    ? `${data.gtmBinding.groupCount} 个 GTM Group · ${data.gtmBinding.kind === "dedicated" ? "1:1" : "1:n"}`
    : "集中式/单分片租户可不配置专属 GTM";
  const serverBoard = data.reverse ? renderServerBoard(data) : renderBusinessServerBoard(data);

  $("relationGraph").innerHTML = `
    <div class="relation-line">
      <div class="relation-node cluster">
        <strong>GoldenDB 集群</strong>
        <small>${modeLabels[data.mode]} · ${shapeLabels[data.shape]}<br>${data.azCount} 个中心/AZ，管理 ${data.businessTenants} 个业务租户</small>
      </div>
      <div class="relation-arrow">管控</div>
      <div class="relation-node mgr">
        <strong>管理节点 / OMM / Insight</strong>
        <small>${data.managementNodes} 个实例，维护元数据、拓扑、监控告警、扩缩容、主备切换</small>
      </div>
      <div class="relation-arrow">分配资源</div>
      <div class="relation-node gtm">
        <strong>GTM 全局事务域</strong>
        <small>${gtmText} · ${data.gtmNodes || 0} 个 GTM 实例副本<br>${data.gtmBinding.note}</small>
      </div>
    </div>

      <div class="tenant-board">
        <div class="tenant-board-head">
          <strong>租户资源视图</strong>
        <span>按总指标等比例估算租户份额，生产可按 SLA 权重调整</span>
        </div>
      <div class="tenant-grid">${tenantCards}${overflow}</div>
    </div>

    <div class="relation-notes">
      <span>应用连接 CN，CN 负责 SQL 解析、路由、优化与分布式执行。</span>
      <span>CN 访问租户内 DN Group，DN Group 内保持 1 主多备副本。</span>
      <span>管理节点管控租户、CN、DN、GTM、拓扑元数据和故障切换。</span>
    </div>

    ${serverBoard}
  `;
}

function renderServerBoard(data) {
  return `
      <div class="tenant-board server-board">
        <div class="tenant-board-head">
          <strong>服务器部署视图</strong>
        <span>${data.resourceState} · ${data.componentLayoutLabel} · ${data.scores.weighted}/100</span>
        </div>
      <div class="server-board-grid">
        ${data.serverPlan.map((server) => `
          <article class="server-tile">
            <div><strong>${server.id}</strong><span>${server.az}</span></div>
            <p>${server.roles.length ? server.roles.join(" / ") : "预留资源"}</p>
            <small>CPU ${server.cpuLoad}% · 磁盘 ${server.diskLoad}%</small>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBusinessServerBoard(data) {
  const sizing = data.serverSizing;
  const azNames = getAzNames(data.mode, data.azCount);
  return `
    <div class="tenant-board server-board">
      <div class="tenant-board-head">
        <strong>服务器资源汇总视图</strong>
        <span>${sizing.serverSpec} · 推荐 ${sizing.recommendedServers} 台 · ${sizing.deploymentStyle}</span>
      </div>
      <div class="server-board-grid">
        ${sizing.perAzServers.map((count, index) => `
          <article class="server-tile">
            <div><strong>${azNames[index] || `AZ-${index + 1}`}</strong><span>${count} 台</span></div>
            <p>CN、DN、GTM、管理节点按租户资源汇总后部署；${data.environment === "production" ? "生产建议分层隔离。" : "POC 可按混布验证。"}</p>
            <small>可用规格 ${sizing.usableSpec}</small>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderTenantCard(tenant) {
  return `
    <article class="tenant-card">
      <div class="tenant-title">
        <strong>${tenant.name}</strong>
        <span>${tenant.type}</span>
      </div>
      <div class="tenant-resource-grid">
        <div class="tenant-resource cn"><b>CN</b><span>${tenant.cnPerAz}/生产AZ · ${tenant.totalCn} 总实例${tenant.cnManual ? " · 手工" : ""}</span></div>
        <div class="tenant-resource dn"><b>DN</b><span>${tenant.shardCount} Group · ${tenant.dnInstances} 实例${tenant.shardManual ? " · 手工" : ""}</span></div>
        <div class="tenant-resource gtm"><b>GTM</b><span>${tenant.gtmLabel}</span></div>
      </div>
      <div class="replica-strip spec-strip">
        <b>节点规格</b>
        <span>CN ${tenant.cnSpecLabel || `${tenant.cnCores}C/${tenant.cnMemoryGb}GB`}</span>
        <span>DN ${tenant.dnSpecLabel || `${tenant.dnCores}C/${tenant.dnMemoryGb}GB`}</span>
      </div>
      <div class="replica-strip">
        <b>DN副本</b>
        <span class="master">M × ${tenant.masterCount}</span>
        <span>S × ${tenant.slaveCount}</span>
        <small>${tenant.replicasPerShard} 副本/Group</small>
        <small>${round(tenant.dataTb)}TB 份额</small>
      </div>
      <div class="replica-strip gtm-replica-strip">
        <b>GTM副本</b>
        <span>${tenant.gtmGroupText}</span>
      </div>
    </article>
  `;
}

function getLayout(mode) {
  if (mode === "local1az") {
    return {
      sites: [
        { id: "local", name: "本地机房", role: "POC/验证中心", x: 18, y: 18, w: 64, h: 58 }
      ],
      links: []
    };
  }
  if (mode === "local2az") {
    return {
      sites: [
        { id: "a", name: "AZ-A", role: "生产机房", x: 6, y: 14, w: 40, h: 66 },
        { id: "b", name: "AZ-B", role: "同城机房", x: 54, y: 14, w: 40, h: 66 }
      ],
      links: [
        ["a", "b", "sync"]
      ]
    };
  }
  if (mode === "twoSiteThreeDc") {
    return {
      sites: [
        { id: "a", name: "中心 A", role: "生产中心", x: 4, y: 12, w: 29, h: 66 },
        { id: "b", name: "中心 B", role: "同城中心", x: 36, y: 12, w: 29, h: 66 },
        { id: "c", name: "中心 C", role: "异地灾备", x: 69, y: 20, w: 27, h: 52, disaster: true }
      ],
      links: [
        ["a", "b", "sync"],
        ["b", "c", "async"],
        ["a", "c", "async"]
      ]
    };
  }
  return {
    sites: [
      { id: "a1", name: "A1", role: "生产中心", x: 3, y: 10, w: 27, h: 38 },
      { id: "a2", name: "A2", role: "同城中心", x: 3, y: 55, w: 27, h: 36 },
      { id: "b1", name: "B1", role: "异地热备", x: 37, y: 10, w: 27, h: 38 },
      { id: "b2", name: "B2", role: "异地同城备", x: 37, y: 55, w: 27, h: 36 },
      { id: "c1", name: "C1", role: "远程兜底", x: 71, y: 31, w: 26, h: 40, disaster: true }
    ],
    links: [
      ["a1", "a2", "sync"],
      ["b1", "b2", "sync"],
      ["a1", "b1", "async"],
      ["a2", "b2", "async"],
      ["b1", "c1", "async"]
    ]
  };
}

function renderSite(site, data) {
  const cn = `${data.cnPerAz} CN`;
  const dn = site.disaster && data.mode !== "threeSiteFiveDc"
    ? "灾备副本"
    : `${data.shardCount} Group`;
  const dnRole = getDnRoleText(site, data);
  const gtm = data.shape === "distributed"
    ? `${site.disaster ? "备" : data.gtmPerPrimaryAz} GTM`
    : "GTM 可选";
  const mgr = site.disaster ? "管理备" : "管理节点";

  return `
    <section class="site ${site.disaster ? "disaster-site" : ""}" style="left:${site.x}%;top:${site.y}%;width:${site.w}%;height:${site.h}%">
      <div class="site-title"><span>${site.name}</span><small>${site.role}</small></div>
      <div class="node-grid">
        <div class="node cn"><strong>${cn}</strong><small>计算入口</small></div>
        <div class="node dn"><strong>${dn}</strong><small>${dnRole}</small></div>
        <div class="node gtm"><strong>${gtm}</strong><small>事务控制</small></div>
        <div class="node mgr"><strong>${mgr}</strong><small>OMM/Insight</small></div>
      </div>
    </section>
  `;
}

function getDnRoleText(site, data) {
  const slaveCount = Math.max(0, data.replicasPerShard - 1);
  if (site.id === "local") {
    return `Master × ${data.shardCount}${slaveCount ? ` / 本地备副本 × ${slaveCount}` : ""}`;
  }
  if (site.disaster && data.mode !== "threeSiteFiveDc") {
    return `L/S 灾备 · ${data.replicasPerShard}副本`;
  }
  if (site.id === "a" || site.id === "a1") {
    return `Master × ${data.shardCount} / Slave × ${slaveCount}`;
  }
  if (site.id === "b" || site.id === "a2") {
    return `同城 Slave · ${data.replicasPerShard}副本`;
  }
  return `备域副本 · ${data.replicasPerShard}副本`;
}

function renderLinks(links) {
  const positions = {
    local: [50, 48],
    a: [26, 47],
    b: [74, 47],
    c: [82, 46],
    a1: [16, 30],
    a2: [16, 73],
    b1: [50, 30],
    b2: [50, 73],
    c1: [84, 52]
  };

  const lines = links.map(([from, to, type]) => {
    const [x1, y1] = positions[from];
    const [x2, y2] = positions[to];
    const color = type === "sync" ? "#42e8c4" : "#ffc857";
    const dash = type === "sync" ? "" : "stroke-dasharray=\"8 8\"";
    return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="${color}" stroke-width="2.5" ${dash} />`;
  }).join("");

  return `
    <svg class="link-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      ${lines}
    </svg>
  `;
}

function copySummary() {
  const data = getCurrentPlanForAction();
  if (!data) return;
  const isReverse = $("designModule").value === "reverse";
  const summary = isReverse ? [
    `GoldenDB 资源约束反推架构`,
    `环境/目标：${environmentLabels[data.environment]} · ${goalLabels[data.goal]}`,
    `部署方式：${modeLabels[data.mode]}`,
    `服务器：${data.serverCount} 台，资源状态：${data.resourceState}`,
    `CN：${data.cnPerAz}/AZ，总计 ${data.totalCn}`,
    `CN 租户部署：${data.resourceReduction.cnTenantPlacementLabel}`,
    `DN：${data.shardCount} Group × ${data.replicasPerShard} 副本 = ${data.dnInstances} 实例`,
    `GTM：${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes} 实例，${data.gtmBinding.label}`,
    `GTM 部署亲和：${data.gtmAffinityLabel}`,
    `管理节点：${data.managementNodes} 个（建议不少于 ${data.recommendedManagementNodes} 个）`,
    `综合评分：${data.scores.weighted}/100`,
    `结论：${getReverseConclusion(data)}`
  ].join("\n") : [
    `GoldenDB ${modeLabels[data.mode]} ${shapeLabels[data.shape]} 部署建议`,
    `每 AZ CN：${data.cnPerAz}`,
    `CN 租户部署：${data.resourceReduction.cnTenantPlacementLabel}`,
    `推荐分片数：${data.shardCount}`,
    `每分片副本：${data.replicasPerShard}`,
    `DN 实例数：${data.dnInstances}`,
    `GTM：${data.shape === "distributed" ? `${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本 = ${data.gtmNodes} 实例，${data.gtmBinding.label}` : "集中式场景可选"}`,
    `GTM 部署亲和：${data.serverSizing.gtmAffinityLabel}`,
    `管理节点：${data.managementNodes} 个（建议不少于 ${data.recommendedManagementNodes} 个）`,
    `租户关系：租户实例包含 CN 与 DN；分布式租户绑定 GTM，支持 1:1 或 1:n。`,
    `说明：该结果为预评估建议，生产需结合版本手册、厂商评审和 POC 压测。`
  ].join("\n");

  navigator.clipboard?.writeText(summary).then(() => {
    $("copyBtn").textContent = "已复制";
    setTimeout(() => {
      $("copyBtn").textContent = "复制摘要";
    }, 1200);
  });
}

const excelStyles = Object.freeze({
  default: 0,
  title: 1,
  site: 2,
  info: 3,
  header: 4,
  body: 5,
  rack: 6,
  managementLayer: 7,
  computeLayer: 8,
  dataLayer: 9,
  mixedLayer: 10,
  managementComponent: 11,
  cnComponent: 12,
  dnComponent: 13,
  gtmComponent: 14,
  risk: 15,
  pass: 16,
  note: 17,
  dedicatedServer: 18,
  sharedServer: 19,
  reserve: 20
});

function formatExcelRole(role) {
  return role
    .replace("-Master", "-M")
    .replace(/-Slave(\d*)$/, (_, no) => `-S${no || "1"}`);
}

function getExcelServerLayer(server) {
  const hasManagement = server.roles.includes("管理节点");
  const hasCn = server.roles.some(isCnRole);
  const hasDn = server.roles.some(isDnRole);
  const hasGtm = server.roles.some(isGtmRole);
  if (hasManagement) return "management";
  if (hasDn && (hasCn || hasGtm)) return "mixed";
  if (hasDn) return "data";
  if (hasCn || hasGtm) return "compute";
  return "reserve";
}

function getExcelComponentStyle(server) {
  const hasManagement = server.roles.includes("管理节点");
  const hasCn = server.roles.some(isCnRole);
  const hasDn = server.roles.some(isDnRole);
  const hasGtm = server.roles.some(isGtmRole);
  if (hasDn && (hasCn || hasGtm)) return excelStyles.mixedLayer;
  if (hasDn) return excelStyles.dnComponent;
  if (hasManagement) return excelStyles.managementComponent;
  if (hasCn) return excelStyles.cnComponent;
  if (hasGtm) return excelStyles.gtmComponent;
  return excelStyles.reserve;
}

function chunkExcelItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function buildNetworkPlanningSheet(data, servers, azNames) {
  const rows = [];
  const styles = [];
  const merges = [];
  const rowHeights = {};
  const siteWidth = 6;
  const width = 1 + azNames.length * siteWidth;
  const siteStartColumn = (azIndex) => 1 + azIndex * siteWidth;
  const addRow = (values, style = excelStyles.body, height = 22) => {
    const row = Array.from({ length: width }, (_, index) => values[index] ?? "");
    rows.push(row);
    styles.push(Array.from({ length: width }, () => style));
    rowHeights[rows.length] = height;
    return rows.length;
  };
  const styleRow = (rowNumber, style) => {
    styles[rowNumber - 1] = Array.from({ length: width }, () => style);
  };
  const setCell = (rowNumber, column, value, style) => {
    rows[rowNumber - 1][column] = value;
    if (style !== undefined) styles[rowNumber - 1][column] = style;
  };
  const mergeColumns = (rowNumber, startColumn, endColumn) => {
    if (endColumn > startColumn) {
      merges.push(`${excelColumnName(startColumn)}${rowNumber}:${excelColumnName(endColumn)}${rowNumber}`);
    }
  };

  let row = addRow(["GoldenDB 架构及组网规划"]);
  styleRow(row, excelStyles.title);
  merges.push(`A${row}:${excelColumnName(width - 1)}${row}`);
  rowHeights[row] = 32;
  row = addRow(["规划口径", `${environmentLabels[data.environment]} · ${modeLabels[data.mode]} · ${data.reverse ? "资源约束反推" : shapeLabels[data.shape]} · ${data.businessTenants} 个租户 · ${servers.length} 台服务器`], excelStyles.info, 28);
  merges.push(`B${row}:${excelColumnName(width - 1)}${row}`);

  const layerDefinitions = [
    { key: "management", label: "管理层", style: excelStyles.managementLayer },
    { key: "compute", label: "计算层", style: excelStyles.computeLayer },
    { key: "data", label: "数据层", style: excelStyles.dataLayer },
    { key: "mixed", label: "融合层", style: excelStyles.mixedLayer },
    { key: "reserve", label: "预留层", style: excelStyles.reserve }
  ];

  addRow([""], excelStyles.default, 8);
  row = addRow(["中心 / AZ"]);
  setCell(row, 0, "中心 / AZ", excelStyles.header);
  azNames.forEach((az, azIndex) => {
    const start = siteStartColumn(azIndex);
    const end = start + siteWidth - 1;
    for (let column = start; column <= end; column += 1) styles[row - 1][column] = excelStyles.site;
    setCell(row, start, `${az} · ${getSiteRole(data.mode, azIndex)}`, excelStyles.site);
    mergeColumns(row, start, end);
  });
  rowHeights[row] = 30;

  row = addRow(["中心摘要"], excelStyles.info, 38);
  setCell(row, 0, "中心摘要", excelStyles.header);
  azNames.forEach((az, azIndex) => {
    const siteServers = servers.filter((server) => server.azIndex === azIndex);
    const capacityText = data.reverse
      ? "容量口径：按客户服务器资源反推"
      : `容量口径：${round((data.siteCapacityFactors?.[azIndex] ?? 1) * 100)}%`;
    const summary = `${capacityText}\n服务器 ${siteServers.length} 台 · CN ${siteServers.reduce((sum, server) => sum + server.roles.filter(isCnRole).length, 0)} · DN ${siteServers.reduce((sum, server) => sum + server.roles.filter(isDnRole).length, 0)} · GTM ${siteServers.reduce((sum, server) => sum + server.roles.filter(isGtmRole).length, 0)} · 管理 ${siteServers.reduce((sum, server) => sum + server.roles.filter((role) => role === "管理节点").length, 0)}`;
    const start = siteStartColumn(azIndex);
    const end = start + siteWidth - 1;
    setCell(row, start, summary, excelStyles.info);
    for (let column = start; column <= end; column += 1) styles[row - 1][column] = excelStyles.info;
    mergeColumns(row, start, end);
  });

  row = addRow(["层级"]);
  styleRow(row, excelStyles.header);
  azNames.forEach((_, azIndex) => {
    const start = siteStartColumn(azIndex);
    ["服务器 / IP", "组件实例", "服务器 / IP", "组件实例", "服务器 / IP", "组件实例"]
      .forEach((label, offset) => setCell(row, start + offset, label, excelStyles.header));
  });
  rowHeights[row] = 28;

  const siteLayerEntries = azNames.map((_, azIndex) => {
    const siteServers = servers.filter((server) => server.azIndex === azIndex);
    const entries = {};
    layerDefinitions.forEach((layer) => {
      entries[layer.key] = [];
      const layerServers = siteServers.filter((server) => getExcelServerLayer(server) === layer.key);
      groupServersByRack(layerServers).forEach(([rackName, rackServers]) => {
        const chunks = chunkExcelItems(rackServers, 3);
        chunks.forEach((serverChunk, chunkIndex) => entries[layer.key].push({
          rackLabel: chunks.length > 1 ? `${rackName}（${chunkIndex + 1}/${chunks.length}）` : rackName,
          servers: serverChunk
        }));
      });
    });
    return entries;
  });

  layerDefinitions.forEach((layer) => {
    const maxEntries = Math.max(0, ...siteLayerEntries.map((entries) => entries[layer.key].length));
    if (!maxEntries) return;
    const layerStart = rows.length + 1;
    for (let entryIndex = 0; entryIndex < maxEntries; entryIndex += 1) {
      const rackRow = addRow([""], excelStyles.body, 22);
      azNames.forEach((_, azIndex) => {
        const start = siteStartColumn(azIndex);
        const end = start + siteWidth - 1;
        const entry = siteLayerEntries[azIndex][layer.key][entryIndex];
        for (let column = start; column <= end; column += 1) styles[rackRow - 1][column] = entry ? excelStyles.rack : excelStyles.reserve;
        setCell(rackRow, start, entry ? entry.rackLabel : "—", entry ? excelStyles.rack : excelStyles.reserve);
        mergeColumns(rackRow, start, end);
      });

      const dataRow = addRow([""], excelStyles.body, 58);
      let maxRoleCount = 1;
      azNames.forEach((_, azIndex) => {
        const start = siteStartColumn(azIndex);
        const end = start + siteWidth - 1;
        const entry = siteLayerEntries[azIndex][layer.key][entryIndex];
        if (!entry) {
          setCell(dataRow, start, "本中心无该层规划", excelStyles.reserve);
          for (let column = start; column <= end; column += 1) styles[dataRow - 1][column] = excelStyles.reserve;
          mergeColumns(dataRow, start, end);
          return;
        }
        for (let slot = 0; slot < 3; slot += 1) {
          const server = entry.servers[slot];
          const serverColumn = start + slot * 2;
          const roleColumn = serverColumn + 1;
          if (server) {
            const poolLabel = server.tenantPoolLabel || "现有集群共享服务器";
            setCell(dataRow, serverColumn, `${server.id}\nIP：待规划\n${poolLabel}`, server.tenantPool && server.tenantPool !== "shared" ? excelStyles.dedicatedServer : excelStyles.sharedServer);
            setCell(dataRow, roleColumn, server.roles.length ? server.roles.map(formatExcelRole).join("\n") : "SLOTH / 扩容预留", getExcelComponentStyle(server));
            maxRoleCount = Math.max(maxRoleCount, server.roles.length);
          } else {
            setCell(dataRow, serverColumn, "扩容预留", excelStyles.reserve);
            setCell(dataRow, roleColumn, "SLOTH", excelStyles.reserve);
          }
        }
      });
      rowHeights[dataRow] = Math.min(122, Math.max(58, 34 + maxRoleCount * 14));
    }
    const layerEnd = rows.length;
    setCell(layerStart, 0, layer.label, layer.style);
    for (let layerRow = layerStart; layerRow <= layerEnd; layerRow += 1) styles[layerRow - 1][0] = layer.style;
    if (layerEnd > layerStart) merges.push(`A${layerStart}:A${layerEnd}`);
  });

  row = addRow(["部署说明", "各中心横向并排，同一层级、机柜批次和服务器槽位纵向对齐；新增租户服务器仍归入对应组件层，IP 为可编辑待规划字段。"], excelStyles.note, 32);
  merges.push(`B${row}:${excelColumnName(width - 1)}${row}`);

  return {
    name: "组网规划",
    rows,
    styles,
    merges,
    widths: [12, ...azNames.flatMap(() => [18, 28, 18, 28, 18, 28])],
    rowHeights,
    freezeRows: 5,
    freezeColumns: 1,
    landscape: true
  };
}

function buildExcelTableSheet({ name, title, headers, dataRows, widths, rowStyle }) {
  const rows = [[title, ...Array(Math.max(0, headers.length - 1)).fill("")], headers, ...dataRows];
  const styles = rows.map((values, rowIndex) => {
    if (rowIndex === 0) return values.map(() => excelStyles.title);
    if (rowIndex === 1) return values.map(() => excelStyles.header);
    const defaultStyles = values.map(() => excelStyles.body);
    return rowStyle ? rowStyle(values, rowIndex - 2, defaultStyles) : defaultStyles;
  });
  return {
    name,
    rows,
    styles,
    merges: [`A1:${excelColumnName(headers.length - 1)}1`],
    widths,
    rowHeights: { 1: 30, 2: 28 },
    freezeRows: 2,
    autoFilter: `A2:${excelColumnName(headers.length - 1)}${Math.max(2, rows.length)}`,
    landscape: headers.length > 8
  };
}

function buildExcelSheets(data) {
  const servers = getPlanServers(data);
  const azNames = getAzNames(data.mode, data.azCount);
  const sizing = data.reverse ? data : data.serverSizing;
  const redlines = getResourceReductionRedlines(data);
  const summaryRows = [
    ["设计模块", data.reverse ? "资源约束反推架构" : "业务场景性能测算", "与当前页面选择一致"],
    ["环境类型", environmentLabels[data.environment], data.environment === "production" ? "按生产反亲和和资源水位校验" : "POC 规则不等同生产上线标准"],
    ["部署方式", modeLabels[data.mode], getNetworkLinkText(data.mode)],
    ["数据库形态", data.reverse ? "分布式" : shapeLabels[data.shape], "租户资源包含 CN、DN，分布式租户绑定 GTM"],
    ["租户数量", data.businessTenants, "租户资源按当前参数逐项生成"],
    ["CN 总实例", data.totalCn, "按单 AZ、单租户性能需求汇总"],
    ["DN Group 总数", data.shardCount, "按容量与 TPS 两个维度取较大值"],
    ["DN 副本实例", data.dnInstances, "Group 数 × 每 Group 副本数"],
    ["GTM 实例", data.gtmNodes, `${data.gtmBinding.groupCount} Group × ${data.gtmReplicasPerGroup} 副本`],
    ["管理节点", data.managementNodes, `环境建议不少于 ${data.recommendedManagementNodes}`],
    ["实际服务器", servers.length, "以组网落位后的 Server 清单为准"],
    ["组件组合", data.reverse ? data.componentLayoutLabel : data.serverSizing.componentLayoutLabel, "以当前资源缩减与组件融合配置为准"],
    ["资源预留比例", `${round((data.reverse ? data.reserveRatio : data.serverSizing.reserveRatio) * 100)}%`, "CPU、内存、磁盘均参与安全水位检查"],
    ["红线结论", redlines.length ? `未通过（${redlines.length} 项）` : "通过", redlines.length ? redlines[0] : "当前落位未触发硬红线"]
  ];
  const summarySheet = buildExcelTableSheet({
    name: "方案摘要",
    title: "GoldenDB 方案摘要",
    headers: ["规划字段", "结果", "说明"],
    dataRows: summaryRows,
    widths: [24, 32, 72],
    rowStyle(values, index, defaultStyles) {
      if (index === summaryRows.length - 1) defaultStyles[1] = redlines.length ? excelStyles.risk : excelStyles.pass;
      return defaultStyles;
    }
  });

  const tenantHeaders = [
    "租户", "服务器策略", "形态", "QPS", "事务TPS", "CN/生产AZ", "CN自动建议", "CN手工",
    "各站点CN", "CN总数", "DN Group", "Group建议", "Group手工", "副本/Group", "DN实例",
    "规划数据TB", "GTM绑定", "CN规格", "DN规格", "容量校验"
  ];
  const tenantRows = data.tenantPlans.map((tenant) => [
    tenant.name,
    tenant.deploymentStrategyLabel || tenantDeploymentStrategyLabels[tenant.deploymentStrategy],
    tenant.type,
    tenant.qps,
    Number(round(tenant.businessTxnTps || 0)),
    tenant.cnPerAz,
    tenant.recommendedCnPerAz || tenant.cnPerAz,
    tenant.cnManual ? "是" : "否",
    (tenant.cnByAz || []).map((count, index) => `${azNames[index]}:${count}`).join(" / "),
    tenant.totalCn,
    tenant.shardCount,
    tenant.recommendedShardCount || tenant.shardCount,
    tenant.shardManual ? "是" : "否",
    tenant.replicasPerShard,
    tenant.dnInstances,
    Number(round(tenant.futureDataTb || 0)),
    tenant.gtmGroupText,
    tenant.cnSpecLabel || `${tenant.cnCores}C/${tenant.cnMemoryGb}GB`,
    tenant.dnSpecLabel || `${tenant.dnCores}C/${tenant.dnMemoryGb}GB`,
    tenant.cnBelowMinimum || tenant.shardBelowMinimum ? "未通过" : "通过"
  ]);
  const tenantSheet = buildExcelTableSheet({
    name: "租户资源",
    title: "租户 CN / DN / GTM 资源规划",
    headers: tenantHeaders,
    dataRows: tenantRows,
    widths: [14, 24, 20, 14, 14, 14, 14, 10, 42, 12, 13, 13, 10, 13, 12, 14, 28, 18, 18, 14],
    rowStyle(values, index, defaultStyles) {
      defaultStyles[1] = data.tenantPlans[index]?.deploymentStrategy === "dedicated" ? excelStyles.dedicatedServer : excelStyles.sharedServer;
      defaultStyles[19] = values[19] === "通过" ? excelStyles.pass : excelStyles.risk;
      return defaultStyles;
    }
  });

  const serverHeaders = [
    "服务器", "中心/AZ", "中心角色", "机柜", "资源池", "主机组", "组件组合", "CN数", "DN数", "GTM数",
    "管理节点数", "实例明细", "CPU水位%", "内存水位%", "磁盘水位%", "水位校验", "服务器规格"
  ];
  const serverRows = servers.map((server) => {
    const audit = server.resourceAudit;
    return [
      server.id,
      server.az,
      getSiteRole(data.mode, server.azIndex),
      server.rack,
      server.tenantPoolLabel || "现有集群共享服务器",
      server.hostGroup,
      server.componentKeys.join("+"),
      server.roles.filter(isCnRole).length,
      server.roles.filter(isDnRole).length,
      server.roles.filter(isGtmRole).length,
      server.roles.filter((role) => role === "管理节点").length,
      server.roles.map(formatExcelRole).join(" / ") || "扩容预留",
      audit?.cpuPercent ?? server.cpuLoad ?? 0,
      audit?.memoryPercent ?? 0,
      audit?.diskPercent ?? server.diskLoad ?? 0,
      audit && !audit.withinWatermark ? "未通过" : "通过",
      server.spec
        ? `${server.spec.model}；${server.spec.sockets}路/${server.spec.cores}物理核；${server.spec.memoryGb}GB；数据盘${round(server.spec.diskTb)}TB；${server.spec.network}`
        : "资源反推机型 / 待客户确认"
    ];
  });
  const serverSheet = buildExcelTableSheet({
    name: "服务器清单",
    title: "机房 / 机柜 / Server / 组件物理落位",
    headers: serverHeaders,
    dataRows: serverRows,
    widths: [13, 14, 18, 14, 26, 22, 18, 10, 10, 10, 12, 62, 12, 12, 12, 14, 66],
    rowStyle(values, index, defaultStyles) {
      defaultStyles[4] = servers[index]?.tenantPool && servers[index]?.tenantPool !== "shared"
        ? excelStyles.dedicatedServer
        : excelStyles.sharedServer;
      defaultStyles[15] = values[15] === "通过" ? excelStyles.pass : excelStyles.risk;
      return defaultStyles;
    }
  });

  const instanceRows = [];
  servers.forEach((server) => server.roles.forEach((role) => instanceRows.push([
    server.id,
    server.az,
    server.rack,
    server.tenantPoolLabel || "现有集群共享服务器",
    parseCnTenant(role) || parseDnPlacementRole(role)?.tenant || (/^(.*)-GTM\d+$/.exec(role)?.[1]) || "集群管理域",
    isCnRole(role) ? "CN" : isDnRole(role) ? "DN" : isGtmRole(role) ? "GTM" : "管理节点",
    formatExcelRole(role)
  ])));
  const instanceSheet = buildExcelTableSheet({
    name: "组件实例",
    title: "GoldenDB 组件实例明细",
    headers: ["服务器", "中心/AZ", "机柜", "资源池", "租户/系统域", "组件类型", "实例名称"],
    dataRows: instanceRows,
    widths: [14, 14, 14, 28, 20, 14, 30],
    rowStyle(values, index, defaultStyles) {
      const componentStyle = values[5] === "CN" ? excelStyles.cnComponent
        : values[5] === "DN" ? excelStyles.dnComponent
          : values[5] === "GTM" ? excelStyles.gtmComponent
            : excelStyles.managementComponent;
      defaultStyles[5] = componentStyle;
      defaultStyles[6] = componentStyle;
      return defaultStyles;
    }
  });

  const riskRows = [];
  const displayedRisks = [...document.querySelectorAll("#riskList li")].map((item) => ({
    level: item.classList.contains("risk-high") ? "高风险" : item.classList.contains("risk-mid") ? "提示" : "通过",
    text: item.textContent.trim()
  }));
  const uniqueRiskText = new Set();
  redlines.forEach((text) => {
    uniqueRiskText.add(text);
    riskRows.push(["架构红线", "高风险", "整体方案", text]);
  });
  displayedRisks.forEach((item) => {
    if (uniqueRiskText.has(item.text)) return;
    riskRows.push(["页面校验", item.level, "整体方案", item.text]);
  });
  if (!riskRows.length) riskRows.push(["架构红线", "通过", "整体方案", "当前方案未触发硬红线"]);
  servers.forEach((server) => {
    const audit = server.resourceAudit;
    if (!audit) return;
    riskRows.push([
      "服务器水位",
      audit.withinWatermark ? "通过" : "高风险",
      `${server.id} / ${server.az}`,
      `CPU ${audit.cpuPercent}% / 内存 ${audit.memoryPercent}% / 磁盘 ${audit.diskPercent}%；资源预留 ${round((data.reverse ? data.reserveRatio : data.serverSizing.reserveRatio) * 100)}%`
    ]);
  });
  (sizing.gtmGroupPlacementAudit?.groups || []).forEach((group) => riskRows.push([
    "GTM副本",
    group.actual === group.expected ? "通过" : "高风险",
    group.groupKey,
    `实际 ${group.actual} / 应有 ${group.expected}；同 Group 副本必须跨物理服务器`
  ]));
  const riskSheet = buildExcelTableSheet({
    name: "风险水位",
    title: "生产红线、资源水位与副本完整性",
    headers: ["检查类型", "状态", "对象", "检查结果"],
    dataRows: riskRows,
    widths: [18, 14, 24, 96],
    rowStyle(values, index, defaultStyles) {
      defaultStyles[1] = values[1] === "高风险" ? excelStyles.risk : values[1] === "通过" ? excelStyles.pass : excelStyles.note;
      return defaultStyles;
    }
  });

  return [
    buildNetworkPlanningSheet(data, servers, azNames),
    summarySheet,
    tenantSheet,
    serverSheet,
    instanceSheet,
    riskSheet
  ];
}

function excelColumnName(index) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function xmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildWorksheetXml(sheet) {
  const rows = sheet.rows;
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const widths = sheet.widths || Array.from({ length: columnCount }, (_, column) =>
    Math.min(45, Math.max(10, ...rows.map((row) => String(row[column] ?? "").length + 2))));
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const freezeRows = sheet.freezeRows || 0;
  const freezeColumns = sheet.freezeColumns || 0;
  const pane = freezeRows || freezeColumns
    ? `<pane${freezeColumns ? ` xSplit="${freezeColumns}"` : ""}${freezeRows ? ` ySplit="${freezeRows}"` : ""} topLeftCell="${excelColumnName(freezeColumns)}${freezeRows + 1}" activePane="${freezeRows && freezeColumns ? "bottomRight" : freezeRows ? "bottomLeft" : "topRight"}" state="frozen"/>`
    : "";
  const sheetRows = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const height = sheet.rowHeights?.[rowNumber];
    const rowAttributes = height ? ` ht="${height}" customHeight="1"` : "";
    const cells = Array.from({ length: Math.max(row.length, sheet.styles?.[rowIndex]?.length || 0) }, (_, columnIndex) => {
      const value = row[columnIndex] ?? "";
      const ref = `${excelColumnName(columnIndex)}${rowNumber}`;
      const styleId = sheet.styles?.[rowIndex]?.[columnIndex] ?? excelStyles.default;
      const styleAttribute = styleId ? ` s="${styleId}"` : "";
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${styleAttribute}><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowNumber}"${rowAttributes}>${cells}</row>`;
  }).join("");
  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  const autoFilter = sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : "";
  const pageSetup = sheet.landscape
    ? `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>`
    : `<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0" paperSize="9"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${sheetRows}</sheetData>${merges}${autoFilter}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>${pageSetup}</worksheet>`;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => { result.set(part, offset); offset += part.length; });
  return result;
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(({ path, content }) => {
    const name = encoder.encode(path);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([concatBytes([...localParts, ...centralParts, end])], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function createExcelWorkbook(sheets) {
  const sheetEntries = sheets.map((sheet, index) => ({ path: `xl/worksheets/sheet${index + 1}.xml`, content: buildWorksheetXml(sheet) }));
  const overrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const workbookRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const styleRelId = sheets.length + 1;
  const createdAt = new Date().toISOString();
  const sheetTitles = sheets.map((sheet) => `<vt:lpstr>${xmlEscape(sheet.name)}</vt:lpstr>`).join("");
  return createZipBlob([
    { path: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>` },
    { path: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { path: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>GoldenDB 架构及组网规划</dc:title><dc:creator>GoldenDB Architecture Designer</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified></cp:coreProperties>` },
    { path: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>GoldenDB Architecture Designer</Application><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>工作表</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheetTitles}</vt:vector></TitlesOfParts></Properties>` },
    { path: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="14000"/></bookViews><sheets>${workbookSheets}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { path: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${styleRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { path: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="6"><font><sz val="10"/><name val="Microsoft YaHei"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><color rgb="FF102A43"/><sz val="16"/><name val="Microsoft YaHei"/></font><font><b/><color rgb="FF102A43"/><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><color rgb="FFC62828"/><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><color rgb="FF167A45"/><sz val="10"/><name val="Microsoft YaHei"/></font></fonts><fills count="20"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF2F8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F75B5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD966"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8497B0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2A9D8F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC6E0B4"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4CCCC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF7F8C8D"/></left><right style="thin"><color rgb="FF7F8C8D"/></right><top style="thin"><color rgb="FF7F8C8D"/></top><bottom style="thin"><color rgb="FF7F8C8D"/></bottom><diagonal/></border><border><left style="medium"><color rgb="FF1F4E78"/></left><right style="medium"><color rgb="FF1F4E78"/></right><top style="medium"><color rgb="FF1F4E78"/></top><bottom style="medium"><color rgb="FF1F4E78"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="21"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="6" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" textRotation="255" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" textRotation="255" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="8" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" textRotation="255" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="9" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" textRotation="255" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="12" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="14" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="5" fillId="15" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="16" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="17" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="18" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="19" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    ...sheetEntries
  ]);
}

function downloadExcelPlan() {
  const data = getCurrentPlanForAction();
  if (!data) return;
  const button = $("downloadExcelBtn");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.dataset.busy = "true";
  button.textContent = "正在生成 Excel...";
  try {
    const blob = createExcelWorkbook(buildExcelSheets(data));
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `goldendb-architecture-plan-${data.mode}-${date}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    button.textContent = "Excel 已下载";
  } catch (error) {
    console.error("Excel 生成失败", error);
    button.textContent = "生成失败，请重试";
  } finally {
    setTimeout(() => {
      delete button.dataset.busy;
      syncPlanActionAvailability();
      button.textContent = originalLabel;
    }, 1400);
  }
}

async function downloadTopologyImage(targetId, buttonId, filePrefix) {
  const data = getCurrentPlanForAction();
  if (!data) return;
  const target = $(targetId);
  const button = $(buttonId);
  if (!target || !button) return;

  const originalLabel = button.textContent;
  button.disabled = true;
  button.dataset.busy = "true";
  button.textContent = "正在生成 PNG...";
  try {
    const blob = await renderElementToPng(target);
    if (latestDesignData !== data) {
      button.textContent = "参数已改变，请重新下载";
      return;
    }
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const mode = latestDesignData?.mode || ($("designModule").value === "reverse"
      ? $("reverseDeploymentMode").value
      : $("deploymentMode").value);
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filePrefix}-${mode}-${date}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    button.textContent = "PNG 已下载";
  } catch (error) {
    console.error("组网图片生成失败", error);
    window.__lastTopologyExportError = error?.stack || error?.message || String(error);
    button.title = error?.message || "组网图片生成失败";
    button.textContent = "生成失败，请重试";
  } finally {
    setTimeout(() => {
      delete button.dataset.busy;
      syncPlanActionAvailability();
      button.textContent = originalLabel;
    }, 1600);
  }
}

async function renderElementToPng(target) {
  await document.fonts?.ready;
  const padding = 12;
  const siteCount = Math.max(1, latestDesignData?.azCount || 1);
  const preferredWidth = Math.max(target.scrollWidth, Math.min(3000, 120 + siteCount * 460));
  const staging = document.createElement("div");
  staging.style.cssText = "position:fixed;left:-100000px;top:0;z-index:-1;pointer-events:none;background:#08110f;";
  const layoutClone = target.cloneNode(true);
  layoutClone.style.width = `${preferredWidth}px`;
  layoutClone.style.minWidth = `${preferredWidth}px`;
  layoutClone.style.maxWidth = "none";
  layoutClone.style.height = "auto";
  layoutClone.style.maxHeight = "none";
  layoutClone.style.overflow = "visible";
  staging.appendChild(layoutClone);
  let contentWidth;
  let contentHeight;
  let clone;
  try {
    document.body.appendChild(staging);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    contentWidth = Math.ceil(Math.max(preferredWidth, layoutClone.scrollWidth));
    layoutClone.style.width = `${contentWidth}px`;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    contentHeight = Math.ceil(Math.max(layoutClone.scrollHeight, layoutClone.getBoundingClientRect().height));
    clone = layoutClone.cloneNode(true);
    inlineExportStyles(layoutClone, clone);
  } finally {
    staging.remove();
  }
  const width = contentWidth + padding * 2;
  const height = contentHeight + padding * 2;
  const maxDimension = 16384;
  const maxPixels = 100000000;
  const scale = Math.max(0.5, Math.min(
    2,
    maxDimension / width,
    maxDimension / height,
    Math.sqrt(maxPixels / Math.max(1, width * height))
  ));

  clone.style.width = `${contentWidth}px`;
  clone.style.height = `${contentHeight}px`;
  clone.style.minWidth = `${contentWidth}px`;
  clone.style.maxWidth = "none";
  clone.style.overflow = "visible";
  clone.style.margin = "0";
  clone.style.animation = "none";
  clone.style.transition = "none";

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="${padding}" y="${padding}" width="${contentWidth}" height="${contentHeight}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${contentWidth}px;height:${contentHeight}px;background:#08110f;color:#eef6ea;overflow:visible">${serialized}</div></foreignObject></svg>`;
  const image = await loadExportImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#08110f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("浏览器未生成 PNG 数据")), "image/png", 1);
  });
}

function inlineExportStyles(source, clone) {
  const properties = [
    "align-content", "align-items", "align-self", "background", "background-color", "background-image",
    "background-position", "background-repeat", "background-size", "border", "border-color", "border-radius",
    "border-style", "border-width", "bottom", "box-shadow", "box-sizing", "color", "column-gap", "display",
    "flex", "flex-basis", "flex-direction", "flex-grow", "flex-shrink", "flex-wrap", "font-family", "font-size",
    "font-style", "font-weight", "gap", "grid-auto-columns", "grid-auto-flow", "grid-auto-rows", "grid-column",
    "grid-row", "grid-template-columns", "grid-template-rows", "height", "inset", "justify-content", "justify-items",
    "justify-self", "left", "letter-spacing", "line-height", "margin", "max-height", "max-width", "min-height",
    "min-width", "object-fit", "opacity", "overflow", "overflow-wrap", "padding", "position", "right", "row-gap",
    "text-align", "text-decoration", "text-overflow", "text-rendering", "text-transform", "top", "transform",
    "transform-origin", "vertical-align", "visibility", "white-space", "width", "word-break", "z-index"
  ];
  const sourceNodes = [source, ...source.querySelectorAll("*")];
  const cloneNodes = [clone, ...clone.querySelectorAll("*")];
  sourceNodes.forEach((node, index) => {
    const computed = getComputedStyle(node);
    properties.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value) cloneNodes[index].style.setProperty(property, value);
    });
    cloneNodes[index].style.setProperty("animation", "none");
    cloneNodes[index].style.setProperty("transition", "none");
  });
}

function loadExportImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("浏览器无法渲染组网快照"));
    image.src = source;
  });
}

function getPresetDnLimit(prefix) {
  if (prefix === "reverse") return integerValue("reverseMaxDnPerServer", 1);
  const customDnEnabled = $("businessServerConfigMode").value === "customer" && $("customerDnEnabled").checked;
  return customDnEnabled ? integerValue("customerDnMaxInstances", 1) : 2;
}

function applyReductionPreset(prefix) {
  const preset = $(`${prefix}ReductionPreset`).value;
  if (preset === "custom") return;
  const maxDnPerServer = getPresetDnLimit(prefix);
  const layout = $(`${prefix}ComponentLayout`);
  const affinity = $(`${prefix}GtmAffinity`);
  const allowShard = $(`${prefix}AllowShardColocation`);
  const allowCnDn = $(`${prefix}AllowCnDnMixed`);
  const allowGtmManagement = $(`${prefix}AllowGtmManagementMixed`);
  const allowGtmGroupColocation = $(`${prefix}AllowGtmGroupColocation`);
  const allowAll = $(`${prefix}AllowAllMixed`);
  const tenantLimit = $(`${prefix}MaxTenantDnPerServer`);
  const cnTenantPlacement = $(`${prefix}CnTenantPlacement`);
  const dnTenantPlacement = $(`${prefix}DnTenantPlacement`);

  if (preset === "current") {
    layout.value = "auto";
    affinity.value = "auto";
    allowShard.checked = true;
    allowCnDn.checked = false;
    allowGtmManagement.checked = true;
    allowGtmGroupColocation.checked = true;
    allowAll.checked = false;
    tenantLimit.value = Math.min(2, maxDnPerServer);
    cnTenantPlacement.value = "auto";
    dnTenantPlacement.value = "auto";
  } else if (preset === "safe") {
    layout.value = "gtmMgrMixed";
    affinity.value = "management";
    allowShard.checked = true;
    allowCnDn.checked = false;
    allowGtmManagement.checked = true;
    allowGtmGroupColocation.checked = true;
    allowAll.checked = false;
    tenantLimit.value = Math.min(2, maxDnPerServer);
    cnTenantPlacement.value = "isolated";
    dnTenantPlacement.value = "isolated";
  } else if (preset === "balanced") {
    layout.value = "cnDnMixed";
    affinity.value = "management";
    allowShard.checked = true;
    allowCnDn.checked = true;
    allowGtmManagement.checked = true;
    allowGtmGroupColocation.checked = true;
    allowAll.checked = false;
    tenantLimit.value = maxDnPerServer;
    cnTenantPlacement.value = "shared";
    dnTenantPlacement.value = "shared";
  } else if (preset === "maximum") {
    layout.value = "allMixed";
    affinity.value = "auto";
    allowShard.checked = true;
    allowCnDn.checked = true;
    allowGtmManagement.checked = true;
    allowGtmGroupColocation.checked = true;
    allowAll.checked = true;
    tenantLimit.value = maxDnPerServer;
    cnTenantPlacement.value = "shared";
    dnTenantPlacement.value = "shared";
  }
  syncResourceReductionControls();
}

function markReductionPresetCustom(target) {
  const prefix = target.id.startsWith("reverse") ? "reverse" : "business";
  const reductionIds = new Set([
    `${prefix}ComponentLayout`,
    `${prefix}GtmAffinity`,
    `${prefix}AllowShardColocation`,
    `${prefix}AllowCnDnMixed`,
    `${prefix}AllowGtmManagementMixed`,
    `${prefix}AllowGtmGroupColocation`,
    `${prefix}AllowAllMixed`,
    `${prefix}MaxTenantDnPerServer`,
    `${prefix}CnTenantPlacement`,
    `${prefix}DnTenantPlacement`
  ]);
  if (reductionIds.has(target.id)) $(`${prefix}ReductionPreset`).value = "custom";
}

function resetForm() {
  businessTenantSpecs = cloneTenantSpecs(defaultBusinessTenants);
  reverseTenantSpecs = cloneTenantSpecs(defaultReverseTenants);
  Object.entries(defaults).forEach(([key, value]) => {
    const el = $(key);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = value;
    } else {
      el.value = value;
    }
  });
  render();
}

function bindParameterEvents() {
  const inputPanel = document.querySelector(".input-panel");
  const handleParameterChange = (event) => {
    // A hidden field can emit its final change event after switching modules.
    const section = event.target.closest(".parameter-section");
    const activeSection = $("designModule").value === "reverse" ? "reverseParams" : "businessParams";
    if (section && section.id !== activeSection) return;
    // Text/number edits already update on input; a later blur must not rebuild a new field under the cursor.
    if (event.type === "change" && event.target.matches('input:not([type="checkbox"])')) return;
    if (event.target.matches("#businessReductionPreset, #reverseReductionPreset")) {
      applyReductionPreset(event.target.id.startsWith("reverse") ? "reverse" : "business");
      render();
      return;
    }
    if (event.target.matches(".tenant-input")) {
      const update = updateTenantSpec(event.target);
      if (!update) return;
      if (["type", "deploymentStrategy"].includes(update.key)) {
        render();
        return;
      }
      render({ tenantEditors: false });
      return;
    }
    if (event.target.matches("#maxShardTb, #dnReferenceCores, #dnReferenceMemoryGb, #dnReferenceTps, #growthFactor, #years, #forceEven, #sqlPerTxn, #singleCoreTps, #cpuCores, #cpuLimit")) {
      render();
      return;
    }
    if (event.target.matches("input, select")) {
      markReductionPresetCustom(event.target);
      render();
    }
  };

  inputPanel.addEventListener("input", handleParameterChange);
  inputPanel.addEventListener("change", handleParameterChange);
  inputPanel.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
    const index = Number(event.target.dataset.index);
    if (action === "remove-business-tenant" && businessTenantSpecs.length > 1) {
      businessTenantSpecs.splice(index, 1);
      normalizeTenantOrder(businessTenantSpecs);
      render();
    }
    if (action === "remove-reverse-tenant" && reverseTenantSpecs.length > 1) {
      reverseTenantSpecs.splice(index, 1);
      normalizeTenantOrder(reverseTenantSpecs);
      render();
    }
    if (action === "adjust-business-cn" || action === "adjust-business-shards") {
      const tenant = businessTenantSpecs[index];
      if (!tenant) return;
      const key = action === "adjust-business-cn" ? "cnPerAz" : "minShards";
      const manualKey = action === "adjust-business-cn" ? "cnPerAzManual" : "minShardsManual";
      tenant[key] = Math.max(1, Math.floor(Number(tenant[key]) || 1) + Number(event.target.dataset.delta || 0));
      tenant[manualKey] = true;
      render();
    }
    if (action === "auto-business-cn" || action === "auto-business-shards") {
      const tenant = businessTenantSpecs[index];
      if (!tenant) return;
      if (action === "auto-business-cn") tenant.cnPerAzManual = false;
      if (action === "auto-business-shards") tenant.minShardsManual = false;
      render();
    }
  });

  $("addBusinessTenantBtn").addEventListener("click", () => {
    businessTenantSpecs.push(createBusinessTenantSpec(businessTenantSpecs.length + 1));
    render();
  });

  $("addReverseTenantBtn").addEventListener("click", () => {
    reverseTenantSpecs.push(createReverseTenantSpec(reverseTenantSpecs.length + 1));
    render();
  });

  inputs.forEach((id) => {
    const el = $(id);
    if (!el) {
      console.warn(`参数控件缺失：${id}`);
    }
  });
}

function updateTenantSpec(input) {
  const mode = input.dataset.mode;
  const index = Number(input.dataset.index);
  const list = mode === "reverse" ? reverseTenantSpecs : businessTenantSpecs;
  const target = list[index];
  if (!target) return;
  const key = input.dataset.key;
  const numericKeys = new Set(["qps", "dataTb", "minShards", "replicaCount", "cnPerAz", "shardCount", "cnCores", "cnMemoryGb", "dnCores", "dnMemoryGb"]);
  target[key] = numericKeys.has(key) && input.value.trim() !== "" ? Number(input.value) : input.value;
  if (mode === "business" && key === "minShards") {
    target.minShardsManual = true;
  }
  if (mode === "business" && key === "cnPerAz") {
    target.cnPerAzManual = true;
  }
  return { mode, index, key };
}

function syncBusinessTenantAutoValues(index = null) {
  if (getPlanningInputIssues("business").length) return;
  const tenants = index === null
    ? businessTenantSpecs.map((tenant, tenantIndex) => ({ tenant, tenantIndex }))
    : [{ tenant: businessTenantSpecs[index], tenantIndex: index }];
  tenants.forEach(({ tenant, tenantIndex }) => {
    if (!tenant) return;
    if (!tenant.cnPerAzManual) {
      tenant.cnPerAz = calculateSuggestedCnPerAz(tenant);
      const cnField = document.querySelector(`.tenant-input[data-mode="business"][data-index="${tenantIndex}"][data-key="cnPerAz"]`);
      if (cnField && document.activeElement !== cnField) cnField.value = tenant.cnPerAz;
    }
    if (!tenant.minShardsManual) {
      tenant.minShards = calculateSuggestedMinShards(tenant);
      const shardField = document.querySelector(`.tenant-input[data-mode="business"][data-index="${tenantIndex}"][data-key="minShards"]`);
      if (shardField && document.activeElement !== shardField) shardField.value = tenant.minShards;
    }
  });
}

function syncBusinessTenantMinShards(index = null, options = {}) {
  const force = Boolean(options.force);
  const tenants = index === null
    ? businessTenantSpecs.map((tenant, tenantIndex) => ({ tenant, tenantIndex }))
    : [{ tenant: businessTenantSpecs[index], tenantIndex: index }];

  tenants.forEach(({ tenant, tenantIndex }) => {
    if (!tenant || (tenant.minShardsManual && !force)) return;
    tenant.minShards = calculateSuggestedMinShards(tenant);
    tenant.minShardsManual = false;
    const field = document.querySelector(`.tenant-input[data-mode="business"][data-index="${tenantIndex}"][data-key="minShards"]`);
    if (field && document.activeElement !== field) {
      field.value = tenant.minShards;
    }
  });
}

function calculateSuggestedMinShards(tenant) {
  const dataTb = Math.max(0.1, Number(tenant.dataTb) || 0.1);
  const qps = Math.max(1, Number(tenant.qps) || 1);
  const growthPower = Math.pow(numberValue("growthFactor"), numberValue("years"));
  const maxShardTb = Math.max(0.1, numberValue("maxShardTb"));
  const safeShardTps = Math.max(1, numberValue("dnReferenceTps"));
  const sqlPerTxn = Math.max(1, numberValue("sqlPerTxn"));
  const byCapacity = Math.ceil((dataTb * growthPower) / maxShardTb);
  const byPerformance = Math.ceil((qps / sqlPerTxn) / safeShardTps);
  return maybeEven(Math.max(1, byCapacity, byPerformance), $("forceEven").checked);
}

function calculateSuggestedCnPerAz(tenant) {
  const qps = Math.max(1, Number(tenant.qps) || 1);
  const sqlPerTxn = Math.max(1, numberValue("sqlPerTxn"));
  const singleCoreTps = Math.max(1, numberValue("singleCoreTps"));
  const physicalCores = Math.max(1, numberValue("cpuCores"));
  const cpuLimit = Math.min(1, Math.max(0.1, numberValue("cpuLimit")));
  const growthPower = Math.pow(numberValue("growthFactor"), numberValue("years"));
  const raw = Math.ceil((qps / sqlPerTxn) / (singleCoreTps * physicalCores * cpuLimit)) * growthPower;
  return maybeEven(Math.max(2, raw), $("forceEven").checked);
}

function syncDnPlanningOutputs({ dnSingleCoreTps, safeShardTps }) {
  const singleCoreField = $("dnSingleCoreTps");
  const planningLimitField = $("safeShardTps");
  if (singleCoreField) singleCoreField.value = Number(dnSingleCoreTps.toFixed(2));
  if (planningLimitField) planningLimitField.value = Number(safeShardTps.toFixed(2));
}

function createBusinessTenantSpec(index) {
  const tenant = {
    name: `租户${index}`,
    type: $("dbShape").value === "centralized" ? "centralized" : "distributed",
    deploymentStrategy: index === 1 ? "shared" : "dedicated",
    qps: 50000,
    dataTb: 1,
    cnPerAz: 2,
    cnPerAzManual: false,
    minShards: 2,
    minShardsManual: false,
    replicaCount: getReplicaCount($("deploymentMode").value, $("dbShape").value, $("environmentType").value)
  };
  return {
    ...tenant
  };
}

function createReverseTenantSpec(index) {
  return {
    name: `租户${index}`,
    type: "distributed",
    deploymentStrategy: index === 1 ? "shared" : "dedicated",
    cnPerAz: $("environmentType").value === "poc" ? 1 : 2,
    shardCount: 2,
    replicaCount: getMinimumReplicaCount($("environmentType").value, $("reverseDeploymentMode").value),
    cnCores: 8,
    cnMemoryGb: 16,
    dnCores: 16,
    dnMemoryGb: 64
  };
}

function normalizeTenantOrder(specs) {
  specs.forEach((tenant, index) => {
    tenant.deploymentStrategy = getTenantDeploymentStrategy(tenant, index);
    if (!String(tenant.name || "").trim()) {
      tenant.name = `租户${index + 1}`;
    }
  });
}

$("copyBtn").addEventListener("click", copySummary);
$("resetBtn").addEventListener("click", resetForm);
$("downloadExcelBtn").addEventListener("click", downloadExcelPlan);
$("downloadTopologyBtn").addEventListener("click", () => downloadTopologyImage("topology", "downloadTopologyBtn", "goldendb-network-plan"));
$("downloadServerTopologyBtn").addEventListener("click", () => downloadTopologyImage("serverTopology", "downloadServerTopologyBtn", "goldendb-server-plan"));

renderComponentMachineEditor();
bindParameterEvents();
render();
