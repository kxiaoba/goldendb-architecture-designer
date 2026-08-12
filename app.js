const $ = (id) => document.getElementById(id);

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
  "minShards",
  "safeShardTps",
  "forceEven",
  "businessServerProfile",
  "businessComponentLayout",
  "businessMemoryGb",
  "businessDiskTb",
  "businessReserveRatio",
  "businessMaxCnPerServer",
  "businessMaxDnPerServer",
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
  "reverseComponentLayout"
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
  allMixed: "CN + DN + GTM + 管理全混布"
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
  minShards: 2,
  safeShardTps: 2500,
  forceEven: true,
  businessServerProfile: "balanced",
  businessComponentLayout: "auto",
  businessMemoryGb: 256,
  businessDiskTb: 8,
  businessReserveRatio: 0.35,
  businessMaxCnPerServer: 2,
  businessMaxDnPerServer: 2,
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
  reverseComponentLayout: "auto"
};

const defaultBusinessTenants = [
  { name: "租户1", type: "distributed", qps: 100000, dataTb: 3, minShards: 2, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 }
];

const defaultReverseTenants = [
  { name: "租户1", type: "distributed", cnPerAz: 2, shardCount: 4, replicaCount: 4, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 },
  { name: "租户2", type: "distributed", cnPerAz: 2, shardCount: 2, replicaCount: 4, cnCores: 8, cnMemoryGb: 16, dnCores: 16, dnMemoryGb: 64 }
];

let businessTenantSpecs = cloneTenantSpecs(defaultBusinessTenants);
let reverseTenantSpecs = cloneTenantSpecs(defaultReverseTenants);

function cloneTenantSpecs(specs) {
  return specs.map((item) => ({ ...item }));
}

function numberValue(id) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : defaults[id];
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

function calculate() {
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
  const globalMinShards = numberValue("minShards");
  const safeShardTps = numberValue("safeShardTps");
  const forceEven = $("forceEven").checked;
  const serverProfile = $("businessServerProfile").value;
  const requestedComponentLayout = $("businessComponentLayout").value;
  const memoryGb = numberValue("businessMemoryGb");
  const diskTb = numberValue("businessDiskTb");
  const reserveRatio = Math.min(0.8, Math.max(0, numberValue("businessReserveRatio")));
  const maxCnPerServer = integerValue("businessMaxCnPerServer", 1);
  const maxDnPerServer = integerValue("businessMaxDnPerServer", 1);

  const growthPower = Math.pow(growthFactor, years);
  const cnSingleNodeTps = singleCoreTps * cpuCores * cpuLimit;
  const replicasPerShard = getReplicaCount(mode, shape, environment);
  const azCount = getAzCount(mode);
  const managementNodes = getManagementNodes(environment, mode);
  const tenantPlans = buildBusinessTenantPlans({
    shape,
    specs: businessTenantSpecs,
    sqlPerTxn,
    cnSingleNodeTps,
    cpuLimit,
    growthPower,
    maxShardTb,
    globalMinShards,
    safeShardTps,
    replicasPerShard,
    azCount,
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
  const totalCn = cnPerAz * azCount;
  const shardByCapacity = tenantPlans.reduce((sum, tenant) => sum + tenant.shardByCapacity, 0);
  const shardByTps = tenantPlans.reduce((sum, tenant) => sum + tenant.shardByTps, 0);
  const cnRaw = tenantPlans.reduce((sum, tenant) => sum + tenant.cnRaw, 0);
  const gtmBinding = getGtmBinding(shape, distributedTenants, gtmBindMode);
  const gtmNodes = getBusinessGtmNodes(shape, mode, gtmBinding);
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
    cpuCores,
    memoryGb,
    diskTb,
    reserveRatio,
    maxCnPerServer,
    maxDnPerServer,
    azCount,
    totalCn,
    dnInstances,
    gtmNodes,
    managementNodes,
    futureDataTb,
    maxShardTb,
    tenantPlans
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
    minShards: globalMinShards,
    safeShardTps,
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
    gtmPerPrimaryAz,
    totalCn,
    gtmBinding,
    gtmNodes,
    tenantPlans,
    serverProfile,
    memoryGb,
    diskTb,
    reserveRatio,
    maxCnPerServer,
    maxDnPerServer,
    serverSizing: businessServerPlan
  };
}

function calculateReverse() {
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
  const requestedComponentLayout = $("reverseComponentLayout").value;
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
  const managementNodes = getReverseManagementNodes(environment, mode, serverCount);
  const gtmBinding = getGtmBinding("distributed", distributedTenants, $("reverseGtmBindMode").value);
  const gtmNodes = getReverseGtmNodes(environment, gtmBinding);
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
  const componentSizing = calculateComponentServerCounts({
    environment,
    requestedComponentLayout,
    azCount,
    totalCn,
    dnInstances: actualDnInstances,
    gtmNodes,
    managementNodes,
    maxCnPerServer,
    maxDnPerServer,
    storedDataTb: 0,
    usableDiskTb: Math.max(0.1, diskTb * (1 - reserveRatio)),
    cpuDemandCores,
    memoryDemandGb,
    usableCpuCores: Math.max(1, Math.floor(cpuCores * (1 - reserveRatio))),
    usableMemoryGb: Math.max(1, Math.floor(memoryGb * (1 - reserveRatio)))
  });
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
    totalCn,
    dnInstances: actualDnInstances,
    tenantPlans,
    gtmNodes,
    managementNodes,
    maxDnPerServer,
    maxCnPerServer
  });
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
    componentSizing,
    maxDnPerServer,
    maxCnPerServer,
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
    gtmPerPrimaryAz,
    totalCn,
    gtmBinding,
    gtmNodes,
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

function getReverseManagementNodes(environment, mode, serverCount) {
  if (mode === "local1az" && environment === "poc") return 1;
  if (environment === "poc") return serverCount >= 3 ? 3 : 1;
  return mode === "threeSiteFiveDc" ? 5 : 3;
}

function getManagementNodes(environment, mode) {
  if (mode === "local1az" && environment === "poc") return 1;
  if (mode === "threeSiteFiveDc") return 5;
  return 3;
}

function getReverseGtmNodes(environment, binding) {
  if (binding.kind === "none") return 0;
  const perGroup = environment === "poc" ? 1 : 2;
  return Math.max(perGroup, binding.groupCount * perGroup);
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

function buildBusinessServerSizing(config) {
  const usableCpuCores = Math.max(1, Math.floor(config.cpuCores * (1 - config.reserveRatio)));
  const usableMemoryGb = Math.max(1, Math.floor(config.memoryGb * (1 - config.reserveRatio)));
  const usableDiskTb = Math.max(0.1, config.diskTb * (1 - config.reserveRatio));
  const storedDataTb = config.tenantPlans.reduce(
    (sum, tenant) => sum + tenant.futureDataTb * tenant.replicasPerShard,
    0
  );
  const cpuDemandCores = config.tenantPlans.reduce(
    (sum, tenant) => sum + tenant.cnCpuDemand + tenant.dnCpuDemand,
    0
  ) + config.gtmNodes * 4 + config.managementNodes * 4;
  const memoryDemandGb = config.tenantPlans.reduce(
    (sum, tenant) => sum + tenant.cnMemoryDemand + tenant.dnMemoryDemand,
    0
  ) + config.gtmNodes * 8 + config.managementNodes * 8;
  const profileAdjust = getBusinessProfileAdjust(config.serverProfile);
  const maxCnPerServer = Math.max(1, Math.floor(config.maxCnPerServer * profileAdjust.cn));
  const maxDnPerServer = Math.max(1, Math.floor(config.maxDnPerServer * profileAdjust.dn));
  const componentSizing = calculateComponentServerCounts({
    environment: config.environment,
    requestedComponentLayout: config.requestedComponentLayout,
    azCount: config.azCount,
    totalCn: config.totalCn,
    dnInstances: config.dnInstances,
    gtmNodes: config.gtmNodes,
    managementNodes: config.managementNodes,
    maxCnPerServer,
    maxDnPerServer,
    storedDataTb,
    usableDiskTb,
    cpuDemandCores,
    memoryDemandGb,
    usableCpuCores,
    usableMemoryGb
  });
  const serverPlan = buildServerPlan({
    serverCount: componentSizing.recommendedServers,
    azCount: config.azCount,
    mode: config.mode,
    environment: config.environment,
    allowColocation: componentSizing.effectiveLayout !== "dedicated",
    componentLayout: componentSizing.effectiveLayout,
    totalCn: config.totalCn,
    dnInstances: config.dnInstances,
    tenantPlans: config.tenantPlans,
    gtmNodes: config.gtmNodes,
    managementNodes: config.managementNodes,
    maxDnPerServer,
    maxCnPerServer
  });

  return {
    profile: config.serverProfile,
    profileLabel: serverProfileLabels[config.serverProfile],
    requestedComponentLayout: config.requestedComponentLayout,
    componentLayout: componentSizing.effectiveLayout,
    componentLayoutLabel: componentSizing.effectiveLabel,
    componentLayoutNote: componentSizing.note,
    serverSpec: `${config.cpuCores}C / ${config.memoryGb}GB / ${config.diskTb}TB`,
    usableSpec: `${usableCpuCores}C / ${usableMemoryGb}GB / ${round(usableDiskTb)}TB`,
    reserveRatio: config.reserveRatio,
    maxCnPerServer,
    maxDnPerServer,
    storedDataTb,
    cpuDemandCores,
    memoryDemandGb,
    ...componentSizing,
    serverPlan,
    perAzServers: distributeCount(componentSizing.recommendedServers, config.azCount),
    deploymentStyle: componentSizing.effectiveLabel
  };
}

function calculateComponentServerCounts(config) {
  const effectiveLayout = resolveComponentLayout(config.requestedComponentLayout, config.environment);
  const cnServers = Math.ceil(config.totalCn / config.maxCnPerServer);
  const dnServersByDensity = Math.ceil(config.dnInstances / config.maxDnPerServer);
  const dnServersByCapacity = Math.ceil(config.storedDataTb / config.usableDiskTb);
  const dnServers = Math.max(dnServersByDensity, dnServersByCapacity);
  const gtmServers = config.gtmNodes > 0 ? Math.ceil(config.gtmNodes / 2) : 0;
  const managementServers = config.managementNodes;
  const dedicatedServers = cnServers + dnServers + gtmServers + managementServers;
  const gtmMgrMixedServers = cnServers + dnServers + Math.max(gtmServers, managementServers);
  const cnDnMixedServers = Math.max(config.azCount, Math.max(Math.ceil((config.totalCn + config.dnInstances) / (config.maxCnPerServer + config.maxDnPerServer)), dnServersByCapacity)) + gtmServers + managementServers;
  const allMixedServers = Math.max(
    config.azCount,
    Math.ceil((config.totalCn + config.dnInstances + config.gtmNodes + config.managementNodes) / (config.maxCnPerServer + config.maxDnPerServer + 1)),
    dnServersByCapacity
  );
  const cpuServers = config.cpuDemandCores ? Math.ceil(config.cpuDemandCores / config.usableCpuCores) : 0;
  const memoryServers = config.memoryDemandGb ? Math.ceil(config.memoryDemandGb / config.usableMemoryGb) : 0;
  const layoutServers = {
    dedicated: dedicatedServers,
    gtmMgrMixed: gtmMgrMixedServers,
    cnDnMixed: cnDnMixedServers,
    allMixed: allMixedServers
  }[effectiveLayout];
  const recommendedServers = Math.max(layoutServers, cpuServers, memoryServers);

  return {
    effectiveLayout,
    effectiveLabel: componentLayoutLabels[effectiveLayout],
    note: getComponentLayoutNote(effectiveLayout, config.environment),
    cnServers,
    dnServers,
    dnServersByDensity,
    dnServersByCapacity,
    gtmServers,
    managementServers,
    dedicatedServers,
    gtmMgrMixedServers,
    cnDnMixedServers,
    allMixedServers,
    mixedServers: allMixedServers,
    layoutServers,
    cpuServers,
    memoryServers,
    recommendedServers
  };
}

function resolveComponentLayout(requested, environment) {
  if (requested && requested !== "auto") return requested;
  return environment === "poc" ? "allMixed" : "gtmMgrMixed";
}

function getComponentLayoutNote(layout, environment) {
  if (layout === "dedicated") return "CN、DN、GTM、管理节点分别部署，隔离性最好，服务器成本最高。";
  if (layout === "gtmMgrMixed") return "参考公开核心系统案例，GTM 可与管理节点合设，CN 与 DN 仍保持分层。";
  if (layout === "cnDnMixed") return "CN 与 DN 合设可降低服务器数量，但计算、存储和 IO 会互相影响，生产需压测确认。";
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

function buildServerPlan(config) {
  const azNames = getAzNames(config.mode, config.azCount);
  const servers = Array.from({ length: config.serverCount }, (_, index) => ({
    id: `Server-${String(index + 1).padStart(2, "0")}`,
    az: azNames[index % azNames.length],
    roles: [],
    dnCount: 0,
    cnCount: 0
  }));

  if (config.componentLayout === "gtmMgrMixed") {
    placeGtmManagementMixed(servers, config);
    placeTenantCnRoles(servers, config);
    placeDnRoles(servers, config);
  } else if (config.componentLayout === "cnDnMixed") {
    placeRoles(servers, "管理节点", config.managementNodes, 1);
    placeTenantGtmRoles(servers, config, 1);
    placeCnDnMixed(servers, config);
  } else if (config.componentLayout === "allMixed") {
    placeRoles(servers, "管理节点", config.managementNodes, 2);
    placeTenantGtmRoles(servers, config, 2);
    placeTenantCnRoles(servers, config);
    placeDnRoles(servers, config);
  } else {
    placeRoles(servers, "管理节点", config.managementNodes, 1);
    placeTenantGtmRoles(servers, config, 1);
    placeTenantCnRoles(servers, config);
    placeDnRoles(servers, config);
  }

  return servers.map((server) => ({
    ...server,
    cpuLoad: estimateServerCpu(server, config.environment),
    diskLoad: estimateServerDisk(server, config)
  }));
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

function getBusinessGtmNodes(shape, mode, binding) {
  if (shape !== "distributed" || binding.kind === "none") return 0;
  const perGroup = mode === "local2az" ? 2 : 2;
  return Math.max(perGroup, binding.groupCount * perGroup);
}

function buildBusinessTenantPlans(data) {
  return data.specs.map((spec, index) => {
    const tenantNo = index + 1;
    const isDistributed = data.shape === "distributed" && spec.type === "distributed";
    const qps = Math.max(1, Number(spec.qps) || 1);
    const dataTb = Math.max(0.1, Number(spec.dataTb) || 0.1);
    const minShards = Math.max(1, Math.floor(Number(spec.minShards) || data.globalMinShards));
    const futureDataTb = dataTb * data.growthPower;
    const businessTxnTps = qps / data.sqlPerTxn;
    const cnRaw = Math.ceil(businessTxnTps / data.cnSingleNodeTps) * data.growthPower;
    const cnPerAz = maybeEven(Math.max(2, cnRaw), data.forceEven);
    const shardByCapacity = Math.ceil(futureDataTb / data.maxShardTb);
    const shardByTps = Math.ceil(businessTxnTps / data.safeShardTps);
    const shardBase = isDistributed
      ? Math.max(minShards, shardByCapacity)
      : Math.max(1, shardByCapacity);
    const shardCount = isDistributed
      ? maybeEven(shardBase, data.forceEven)
      : 1;
    const replicasPerShard = isDistributed ? data.replicasPerShard : Math.min(3, data.replicasPerShard);
    const dnInstances = shardCount * replicasPerShard;
    const totalTenantCn = cnPerAz * data.azCount;
    const cnSpec = recommendCnNodeSpec({
      tenantTxnTps: businessTxnTps,
      totalTenantCn,
      cpuLimit: data.cpuLimit
    });
    const dnSpec = recommendDnNodeSpec({
      tenantTxnTps: businessTxnTps,
      futureDataTb,
      shardCount,
      safeShardTps: data.safeShardTps
    });

    return {
      tenantNo,
      name: normalizeTenantName(spec.name, tenantNo),
      isDistributed,
      type: isDistributed ? "分布式租户" : "集中式/单分片租户",
      qps,
      dataTb,
      futureDataTb,
      minShards,
      businessTxnTps,
      cnRaw,
      cnPerAz,
      totalCn: totalTenantCn,
      cnCores: cnSpec.cores,
      cnMemoryGb: cnSpec.memoryGb,
      cnSpecLabel: cnSpec.label,
      cnSpecReason: cnSpec.reason,
      cnCpuDemand: totalTenantCn * cnSpec.cores,
      cnMemoryDemand: totalTenantCn * cnSpec.memoryGb,
      shardByCapacity,
      shardByTps,
      shardCount,
      replicasPerShard,
      dnInstances,
      dnCores: dnSpec.cores,
      dnMemoryGb: dnSpec.memoryGb,
      dnSpecLabel: dnSpec.label,
      dnSpecReason: dnSpec.reason,
      dnCpuDemand: dnInstances * dnSpec.cores,
      dnMemoryDemand: dnInstances * dnSpec.memoryGb,
      masterCount: shardCount,
      slaveCount: shardCount * Math.max(0, replicasPerShard - 1),
      gtmLabel: "待绑定",
      gtmGroupText: "待绑定"
    };
  });
}

function buildReverseTenantPlans(data) {
  return data.specs.map((spec, index) => {
    const tenantNo = index + 1;
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
}

function recommendCnNodeSpec(data) {
  const perCnTps = data.tenantTxnTps / Math.max(1, data.totalTenantCn);
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
  if (perShardTps <= 1000 && perShardTb <= 1) {
    return {
      cores: 8,
      memoryGb: 32,
      label: "8C / 32GB",
      reason: `单 Group 约 ${round(perShardTps)} TPS / ${round(perShardTb)}TB，适合轻量分片`
    };
  }
  if (perShardTps <= 2500 && perShardTb <= 2) {
    return {
      cores: 16,
      memoryGb: 64,
      label: "16C / 64GB",
      reason: `单 Group 约 ${round(perShardTps)} TPS / ${round(perShardTb)}TB，匹配常规核心分片`
    };
  }
  if (perShardTps <= 5000 && perShardTb <= 4) {
    return {
      cores: 32,
      memoryGb: 128,
      label: "32C / 128GB",
      reason: `单 Group 约 ${round(perShardTps)} TPS / ${round(perShardTb)}TB，适合高负载分片`
    };
  }
  return {
    cores: 64,
    memoryGb: 256,
    label: "64C / 256GB",
    reason: `单 Group 约 ${round(perShardTps)} TPS / ${round(perShardTb)}TB，建议高规格并增加分片压测`
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

function getReplicaCount(mode, shape, environment = "production") {
  if (mode === "local1az") {
    return environment === "poc" ? 1 : 2;
  }
  if (shape === "centralized") {
    return mode === "local2az" ? 2 : 3;
  }
  if (mode === "local2az") return 4;
  if (mode === "twoSiteThreeDc") return 4;
  return 5;
}

function render(options = {}) {
  const shouldRenderTenantEditors = options.tenantEditors !== false;
  syncParameterPanels();
  if (shouldRenderTenantEditors) {
    renderTenantEditors();
  }
  const isReverse = $("designModule").value === "reverse";
  const data = isReverse ? calculateReverse() : calculate();
  renderSummary(data);
  renderMetrics(data);
  renderNodePlan(data);
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
  renderRelationGraph(data);
}

function renderTenantEditors() {
  renderBusinessTenantEditor();
  renderReverseTenantEditor();
}

function renderBusinessTenantEditor() {
  $("businessTenantEditor").innerHTML = businessTenantSpecs.map((tenant, index) => `
    <article class="tenant-editor-card" data-tenant-index="${index}" data-tenant-mode="business">
      <div class="tenant-editor-title">
        <strong>${normalizeTenantName(tenant.name, index + 1)}</strong>
        <button class="ghost-btn icon-btn tenant-remove-btn" type="button" data-action="remove-business-tenant" data-index="${index}" ${businessTenantSpecs.length === 1 ? "disabled" : ""}>删除</button>
      </div>
      <label class="field compact-field">
        <span>租户名称</span>
        <input class="tenant-input" data-mode="business" data-index="${index}" data-key="name" value="${escapeAttr(tenant.name)}">
      </label>
      <div class="grid-two">
        <label class="field compact-field">
          <span>租户形态</span>
          <select class="tenant-input" data-mode="business" data-index="${index}" data-key="type">
            <option value="distributed" ${tenant.type === "distributed" ? "selected" : ""}>分布式租户</option>
            <option value="centralized" ${tenant.type === "centralized" ? "selected" : ""}>集中式/单分片租户</option>
          </select>
        </label>
        <label class="field compact-field">
          <span>租户 QPS</span>
          <input class="tenant-input" data-mode="business" data-index="${index}" data-key="qps" type="number" min="1" value="${tenant.qps}">
        </label>
        <label class="field compact-field">
          <span>数据量 TB（业务预计体量）</span>
          <input class="tenant-input" data-mode="business" data-index="${index}" data-key="dataTb" type="number" min="0.1" step="0.1" value="${tenant.dataTb}">
        </label>
        <label class="field compact-field">
          <span>最低分片数（自动建议，可手动改）</span>
          <input class="tenant-input" data-mode="business" data-index="${index}" data-key="minShards" type="number" min="1" value="${tenant.minShards}">
        </label>
      </div>
    </article>
  `).join("");
}

function renderReverseTenantEditor() {
  $("reverseTenantEditor").innerHTML = reverseTenantSpecs.map((tenant, index) => `
    <article class="tenant-editor-card" data-tenant-index="${index}" data-tenant-mode="reverse">
      <div class="tenant-editor-title">
        <strong>${normalizeTenantName(tenant.name, index + 1)}</strong>
        <button class="ghost-btn icon-btn tenant-remove-btn" type="button" data-action="remove-reverse-tenant" data-index="${index}" ${reverseTenantSpecs.length === 1 ? "disabled" : ""}>删除</button>
      </div>
      <label class="field compact-field">
        <span>租户名称</span>
        <input class="tenant-input" data-mode="reverse" data-index="${index}" data-key="name" value="${escapeAttr(tenant.name)}">
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
}

function renderSummary(data) {
  $("summaryMode").textContent = modeLabels[data.mode];
  $("summaryShape").textContent = data.reverse ? `${environmentLabels[data.environment]} · ${goalLabels[data.goal]}` : shapeLabels[data.shape];
  $("summaryCn").textContent = `${data.cnPerAz}/AZ`;
  $("summaryShard").textContent = String(data.shardCount);
  $("topologySubtitle").textContent = data.reverse
    ? `${environmentLabels[data.environment]}，按 ${data.serverCount} 台服务器反推 ${goalLabels[data.goal]} 架构。`
    : modeSubtitles[data.mode];
}

function renderMetrics(data) {
  $("cnPerAz").textContent = data.cnPerAz;
  $("shardCount").textContent = data.shardCount;
  $("replicasPerShard").textContent = data.replicasPerShard;
  $("dnInstances").textContent = data.dnInstances;
}

function renderNodePlan(data) {
  const rows = data.reverse ? [
    ["设计模式", `${environmentLabels[data.environment]} · ${goalLabels[data.goal]} · ${data.componentLayoutLabel}`],
    ["服务器资源", `${data.serverCount} 台 ${getServerTypeLabel(data.serverType)}，每台 ${data.cpuCores}C/${data.memoryGb}GB/${data.diskTb}TB，预留 ${round(data.reserveRatio * 100)}%。`],
    ["CN 计算节点", `每 AZ ${data.cnPerAz} 个，总计 ${data.totalCn} 个；单机最多 ${data.maxCnPerServer} 个 CN。`],
    ["DN 数据节点", `${data.shardCount} 个分片 × ${data.replicasPerShard} 副本 = ${data.dnInstances} 个 DN 实例；单机最多 ${data.maxDnPerServer} 个 DN。`],
    ["GTM", `${data.gtmBinding.label}；规划 ${data.gtmNodes} 个 GTM 实例。`],
    ["管理节点", `${data.managementNodes} 套；${data.environment === "production" ? "生产按 HA 管理面规划。" : "POC 可简化，建议保留恢复验证能力。"}`],
    ["资源结论", `${data.resourceState}：当前组合预计需要 ${data.requiredServerCount} 台，当前 ${data.serverCount} 台，可用口径约 ${data.usableServerCount} 台。`]
  ] : [
    ["CN 计算节点", `每 AZ ${data.cnPerAz} 个，总计约 ${data.totalCn} 个。交易、批量、查询建议拆入口。`],
    ["DN 数据节点", `租户分片汇总 ${data.shardCount} 个 Group，副本实例合计 ${data.dnInstances} 个 DN。`],
    ["GTM", data.shape === "distributed" ? `${data.gtmBinding.label}；规划 ${data.gtmNodes} 个 GTM 实例。` : "集中式单分片事务通常不把 GTM 作为主路径。"],
    ["管理节点", `${data.managementNodes} 套起，管理网络与业务网络隔离。`],
    ["租户", `${data.businessTenants} 个租户实例，其中 ${data.distributedTenants} 个分布式租户；每个租户包含自己的 CN、DN 分片和副本资源。`],
    ["服务器推算", `建议 ${data.serverSizing.serverSpec} 规格，${data.serverSizing.componentLayoutLabel} 口径 ${data.serverSizing.recommendedServers} 台。`],
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
    if (data.requestedReplicas < getMinimumReplicaCount(data.environment, data.mode)) {
      risks.push(["risk-mid", `输入副本数为 ${data.requestedReplicas}，已按 ${environmentLabels[data.environment]} 和部署方式修正为 ${data.replicasPerShard} 副本。`]);
    }
    if (data.serverPlan.some((server) => server.diskLoad >= 90)) {
      risks.push(["risk-mid", "部分服务器 DN 密度较高，磁盘或 IO 可能成为瓶颈，建议降低单机 DN 上限或增加服务器。"]);
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
  if (data.shardByTps > data.shardCount) {
    risks.push(["risk-mid", `按单分片安全 TPS 校验，性能维度建议至少 ${data.shardByTps} 分片；当前推荐值主要遵循容量公式，请结合压测调整。`]);
  }
  if (data.growthFactor === 1 && data.years > 1) {
    risks.push(["risk-mid", "规划年限大于 1 但增长系数为 1，请确认是否无需容量增长预留。"]);
  }
  if (data.gtmBinding.kind === "shared" && data.distributedTenants > 1) {
    risks.push(["risk-mid", "多个分布式租户共享系统级 GTM 时，需评估 GTM 容量、隔离性和变更窗口。"]);
  }
  if (data.environment === "production" && data.serverSizing.componentLayout === "allMixed") {
    risks.push(["risk-high", "生产环境全混布会放大故障影响面，核心交易建议改为独立部署或 GTM+管理节点合设。"]);
  }
  if (data.environment === "production" && data.serverSizing.componentLayout === "cnDnMixed") {
    risks.push(["risk-mid", "CN+DN 混合部署可节省服务器，但核心生产需验证 CPU、IO、网络和故障切换互相影响。"]);
  }
  if (data.serverSizing.componentLayout === "gtmMgrMixed") {
    risks.push(["risk-ok", "当前采用 GTM+管理节点合设，符合公开核心账务案例中的管理面部署方式。"]);
  }
  if (data.serverSizing.dnServersByCapacity > data.serverSizing.dnServersByDensity) {
    risks.push(["risk-mid", `DN 台数由容量决定：副本落盘约 ${round(data.serverSizing.storedDataTb)}TB，高于实例密度口径。`]);
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
  const slaveCount = Math.max(0, data.replicasPerShard - 1);
  const gtmLine = data.shape === "distributed"
    ? `${data.gtmBinding.label}；GTM 本身按主备多机部署，CN 在跨分片事务中申请/释放全局事务标识。`
    : "集中式/单分片场景通常不配置专属 GTM；如果后续改为多分片租户，再补齐 GTM 绑定。";

  $("haGuide").innerHTML = `
    <article class="ha-item">
      <strong>Group 分片组</strong>
      <span>每个 Group 对应一个数据分片，建议 ${data.replicasPerShard} 副本：1 个 Master + ${slaveCount} 个 Slave。当前规划 ${data.shardCount} 个 Group，共 ${data.dnInstances} 个 DN 实例。</span>
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
    `每 AZ CN = Max(2, ROUNDUP((QPS / T) / (K × 机器核数 × C)) × POWER(增长系数, 年限))${evenNote}`,
    `业务事务量 = ${data.qps} / ${data.sqlPerTxn} = ${round(data.businessTxnTps)} TPS`,
    `单 CN 安全事务能力 = ${data.singleCoreTps} × ${data.cpuCores} × ${data.cpuLimit} = ${round(data.cnSingleNodeTps)} TPS`,
    `基础 CN = ROUNDUP(${round(data.businessTxnTps)} / ${round(data.cnSingleNodeTps)}) × ${round(data.growthPower)} = ${round(data.cnRaw)}`,
    `最终 CN = ${data.cnPerAz} / AZ`,
    "",
    "DN 分片公式：",
    `规划总数据量 = ${data.dataTb}TB × POWER(${data.growthFactor}, ${data.years}) = ${round(data.futureDataTb)}TB`,
    `容量维度分片 = ROUNDUP(${round(data.futureDataTb)} / ${data.maxShardTb}) = ${data.shardByCapacity}`,
    `TPS性能校验分片 = ROUNDUP(${round(data.businessTxnTps)} / ${data.safeShardTps}) = ${data.shardByTps}`,
    `推荐分片 = Max(最低分片 ${data.minShards}, 容量分片 ${data.shardByCapacity})${evenNote} = ${data.shardCount}`,
    `DN 实例 = 租户内分片 × 各租户副本数汇总 = ${data.dnInstances}`,
    "",
    "服务器配置与个数推算：",
    `推荐规格 = ${data.serverSizing.serverSpec}，预留后可用 = ${data.serverSizing.usableSpec}`,
    `组件总量 = ${data.totalCn} CN + ${data.dnInstances} DN + ${data.gtmNodes} GTM + ${data.managementNodes} 管理节点`,
    `副本落盘容量 = SUM(租户规划数据量 × 副本数) = ${round(data.serverSizing.storedDataTb)}TB`,
    `CN 服务器 = CEIL(${data.totalCn} / ${data.serverSizing.maxCnPerServer}) = ${data.serverSizing.cnServers}`,
    `DN 服务器 = Max(CEIL(${data.dnInstances} / ${data.serverSizing.maxDnPerServer}), CEIL(${round(data.serverSizing.storedDataTb)} / 单机可用磁盘)) = ${data.serverSizing.dnServers}`,
    `租户节点规格资源 = CN/DN CPU ${round(data.serverSizing.cpuDemandCores)} 核、内存 ${round(data.serverSizing.memoryDemandGb)}GB`,
    `资源口径服务器 = Max(CPU ${data.serverSizing.cpuServers} 台, 内存 ${data.serverSizing.memoryServers} 台)`,
    `GTM 服务器 = ${data.serverSizing.gtmServers}，管理服务器 = ${data.serverSizing.managementServers}`,
    `独立部署 = ${data.serverSizing.dedicatedServers} 台；GTM+管理合设 = ${data.serverSizing.gtmMgrMixedServers} 台；CN+DN混合 = ${data.serverSizing.cnDnMixedServers} 台；全混布 = ${data.serverSizing.allMixedServers} 台`,
    `当前组件组合 = ${data.serverSizing.componentLayoutLabel}；当前推荐 = ${data.serverSizing.recommendedServers} 台`
  ].join("\n");
  $("formulaOutput").textContent = text;
}

function renderReverseFormula(data) {
  const text = [
    "资源约束反推公式：",
    `环境类型 = ${environmentLabels[data.environment]}，设计目标 = ${goalLabels[data.goal]}`,
    `可用服务器口径 = FLOOR(${data.serverCount} × (1 - ${data.reserveRatio})) = ${data.usableServerCount} 台`,
    `CN 实例 = ${data.cnPerAz}/AZ × ${data.azCount} AZ = ${data.totalCn}`,
    `DN 实例 = ${data.shardCount} 分片 × ${data.replicasPerShard} 副本 = ${data.dnInstances}`,
    `GTM 实例 = ${data.gtmNodes}，管理节点 = ${data.managementNodes}`,
    `独立部署最少服务器 = CEIL(${data.totalCn}/${data.maxCnPerServer}) + CEIL(${data.dnInstances}/${data.maxDnPerServer}) + CEIL(${data.gtmNodes}/2) + ${data.managementNodes} = ${data.requiredDedicatedServers}`,
    `组件组合对比 = 独立 ${data.componentSizing.dedicatedServers} 台 / GTM+管理 ${data.componentSizing.gtmMgrMixedServers} 台 / CN+DN ${data.componentSizing.cnDnMixedServers} 台 / 全混布 ${data.componentSizing.allMixedServers} 台`,
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
    ["服务器使用", `${data.serverPlan.filter((server) => server.roles.length > 0).length}/${data.serverCount} 台有部署组件`],
    ["组件总量", `${data.totalCn} CN / ${data.dnInstances} DN / ${data.gtmNodes} GTM / ${data.managementNodes} 管理节点`],
    ["副本与分片", `${data.shardCount} Group × ${data.replicasPerShard} 副本`],
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

function renderBusinessServerPlan(data) {
  const sizing = data.serverSizing;
  const azNames = getAzNames(data.mode, data.azCount);
  const cards = [
    ["推荐服务器规格", `${sizing.serverSpec} · ${sizing.profileLabel}`],
    ["组件组合方式", `${sizing.componentLayoutLabel} · ${sizing.componentLayoutNote}`],
    ["资源预留后可用", `${sizing.usableSpec}，预留 ${round(sizing.reserveRatio * 100)}%`],
    ["推荐服务器数", `${sizing.recommendedServers} 台 · ${sizing.deploymentStyle}`],
    ["独立部署口径", `${sizing.dedicatedServers} 台：CN ${sizing.cnServers} / DN ${sizing.dnServers} / GTM ${sizing.gtmServers} / 管理 ${sizing.managementServers}`],
    ["推荐混布口径", `GTM+管理 ${sizing.gtmMgrMixedServers} 台 / CN+DN ${sizing.cnDnMixedServers} 台 / 全混布 ${sizing.allMixedServers} 台`],
    ["规格资源口径", `CPU需求 ${round(sizing.cpuDemandCores)}核→${sizing.cpuServers} 台；内存需求 ${round(sizing.memoryDemandGb)}GB→${sizing.memoryServers} 台`],
    ["副本落盘容量", `${round(sizing.storedDataTb)}TB，DN 容量口径需 ${sizing.dnServersByCapacity} 台`]
  ];

  $("businessServerPlan").innerHTML = `
    <div class="reverse-card-grid">
      ${cards.map(([key, value]) => `<div class="reverse-card"><span>${key}</span><strong>${value}</strong></div>`).join("")}
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
  `;
}

function renderServerPlanRow(server) {
  const roleText = server.roles.length ? server.roles.join(" / ") : "预留";
  return `
    <article class="server-row">
      <strong>${server.id}</strong>
      <span>${server.az}</span>
      <small>${roleText}</small>
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
  if (data.reverse) {
    $("topology").innerHTML = renderReverseTopology(data);
    return;
  }
  $("topology").innerHTML = renderBusinessTopology(data);
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
        <small>GTM：${tenant.gtmGroupText}；管理节点：${data.managementNodes} 套/副本管控租户拓扑、监控、切换。</small>
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
        <small>${data.managementNodes} 套/副本起，维护元数据、拓扑、监控告警、扩缩容、主备切换</small>
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
        <div class="tenant-resource cn"><b>CN</b><span>${tenant.cnPerAz}/AZ · 租户入口</span></div>
        <div class="tenant-resource dn"><b>DN</b><span>${tenant.shardCount} Group · ${tenant.dnInstances} 实例</span></div>
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
  const isReverse = $("designModule").value === "reverse";
  const data = isReverse ? calculateReverse() : calculate();
  const summary = isReverse ? [
    `GoldenDB 资源约束反推架构`,
    `环境/目标：${environmentLabels[data.environment]} · ${goalLabels[data.goal]}`,
    `部署方式：${modeLabels[data.mode]}`,
    `服务器：${data.serverCount} 台，资源状态：${data.resourceState}`,
    `CN：${data.cnPerAz}/AZ，总计 ${data.totalCn}`,
    `DN：${data.shardCount} Group × ${data.replicasPerShard} 副本 = ${data.dnInstances} 实例`,
    `GTM：${data.gtmNodes} 实例，${data.gtmBinding.label}`,
    `管理节点：${data.managementNodes}`,
    `综合评分：${data.scores.weighted}/100`,
    `结论：${getReverseConclusion(data)}`
  ].join("\n") : [
    `GoldenDB ${modeLabels[data.mode]} ${shapeLabels[data.shape]} 部署建议`,
    `每 AZ CN：${data.cnPerAz}`,
    `推荐分片数：${data.shardCount}`,
    `每分片副本：${data.replicasPerShard}`,
    `DN 实例数：${data.dnInstances}`,
    `GTM：${data.shape === "distributed" ? data.gtmBinding.label : "集中式场景可选"}`,
    `管理节点：${data.managementNodes} 套起`,
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

function resetForm() {
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
    if (event.target.matches(".tenant-input")) {
      const update = updateTenantSpec(event.target);
      if (!update) return;
      if (update.mode === "business" && update.key === "dataTb") {
        syncBusinessTenantMinShards(update.index, { force: true });
      }
      render({ tenantEditors: false });
      return;
    }
    if (event.target.matches("#maxShardTb, #growthFactor, #years, #forceEven, #minShards")) {
      syncBusinessTenantMinShards();
      render();
      return;
    }
    if (event.target.matches("input, select")) {
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
  const numericKeys = new Set(["qps", "dataTb", "minShards", "cnPerAz", "shardCount", "replicaCount", "cnCores", "cnMemoryGb", "dnCores", "dnMemoryGb"]);
  target[key] = numericKeys.has(key) ? Number(input.value) : input.value;
  if (mode === "business" && key === "minShards") {
    target.minShardsManual = true;
  }
  return { mode, index, key };
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
  const growthPower = Math.pow(numberValue("growthFactor"), numberValue("years"));
  const maxShardTb = Math.max(0.1, numberValue("maxShardTb"));
  const globalMinShards = Math.max(1, numberValue("minShards"));
  const byCapacity = Math.ceil((dataTb * growthPower) / maxShardTb);
  return maybeEven(Math.max(globalMinShards, byCapacity), $("forceEven").checked);
}

function createBusinessTenantSpec(index) {
  const tenant = {
    name: `租户${index}`,
    type: $("dbShape").value === "centralized" ? "centralized" : "distributed",
    qps: 50000,
    dataTb: 1,
    minShards: 2,
    minShardsManual: false
  };
  tenant.minShards = calculateSuggestedMinShards(tenant);
  return {
    ...tenant
  };
}

function createReverseTenantSpec(index) {
  return {
    name: `租户${index}`,
    type: "distributed",
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
    if (!String(tenant.name || "").trim()) {
      tenant.name = `租户${index + 1}`;
    }
  });
}

$("copyBtn").addEventListener("click", copySummary);
$("resetBtn").addEventListener("click", resetForm);

bindParameterEvents();
render();
