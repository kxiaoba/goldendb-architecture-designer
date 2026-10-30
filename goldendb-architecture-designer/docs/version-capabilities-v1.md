# 指定版本能力与配置适用性契约 v1

2026-10-30，P02b2b1。它补足“仅有通用版本支持证据，不能说明当前副本/混布/平台配置适用”的缺口。此模块不内置或推测 GoldenDB 版本支持表，不读取或认证厂商证据正文，也不批准生产。

## 必须逐项核验的范围

|能力ID|绑定的当前事实|必须引用的证据类别|
|---|---|---|
|deployment|入口、环境、部署模式、规模、逻辑可用区；完整物理集群/DC/AZ/机柜/主机映射|versionSupport|
|dn|逐租户分片和副本数、已落位DN身份/主从/宿主机/站点|versionSupport、ha|
|gtm|共享或专属关系、Group/副本及实际分布|versionSupport、ha|
|management|管理节点数量、当前抽象角色模型及实际分布|versionSupport、ha|
|cn|逐租户业务CN数量及实际分布|versionSupport|
|cohosting|共宿策略/组件上限及每台主机实际组件组合|versionSupport|
|operations|固定入口的专用运维CN及位置；其他入口明确未单独建模，需说明接入与授权|versionSupport、security|
|platform|实际主机规格、OS/架构、净容量/预留及单位声明|versionSupport、inventory|
|network|声明的网段、接口、ACL与流量需求，含地址族|versionSupport、network|

这些是本工具要求补证的项目类别，不是厂商已确认的能力名称或最小部署标准。物理映射、主机规格与网络修改，即使数量未变，也会使旧配置绑定失效。

## JSON与填写方法

外层生产评审材料新增 capabilities：

```json
{
  "schema": "goldendb-version-capabilities-v1",
  "targetVersion": null,
  "claims": [
    {
      "id": "management",
      "configuration": {},
      "decision": "unknown",
      "evidenceIds": [],
      "conditions": null
    }
  ]
}
```

上面仅展示字段结构，不是可导入的完整合格样例。请下载当前页面生成的模板，保留九项 capability 及工具生成的 configuration，不用空对象替换。

1. 填写 design 的准确版本/补丁和环境，补充 topology、infrastructure 和 evidence。
2. configuration 是支持结论绑定的事实副本。模板中的规划数量/角色/落位已自动生成；补充物理资料后，deployment.configuration.topology 应与外层 topology 一致；platform.configuration 包含与 infrastructure 一致的 hosts 和 planUnits；network.configuration 包含与 infrastructure 一致的 networks、interfaces、acl、flows，并绑定外层connectivity组件连接材料。不得将6副本改成3副本来匹配另一份支持材料。
3. capabilities.targetVersion 与 design.targetVersion 完全一致。逐项引用 evidence 中真实存在的 ID；可重复使用同一份资料作为不同能力项依据，但每项 conditions 必须说明章节/页码、适用条件、限制和例外。不得仅写“支持”。
4. decision 只能 unknown、supported、unsupported。资料未明确覆盖当前配置时保留 unknown；发现不支持应填 unsupported 并调整方案。工具不允许通过自报 verified/approved 取得生产资格。
5. 重新规划、改变物理映射/OS/硬件/地址/策略后，先重新核验适用性，再更新配置绑定。更新绑定本身不是核验。旧证据日期、摘要、环境和设计修订仍由外层门禁检查。

材料最多100条能力结论，每项最多30个不重复证据ID；外层JSON仍受4MiB限制。超限、非法/重复/未知字段、缺失引用明确诊断，不忽略错误。configuration按JSON对象键序无关比较；数组顺序保留，避免悄悄改变实例序列和关系。事实缺项保持未评估。

## 状态与输出

- 缺能力项、未知结论、缺适用条件、缺必需证据类别、事实尚不完整：未评估。
- 明确不支持、版本/配置不匹配、重复项或引用不存在的证据：阻断。
- 每项声明完整：已声明支持待核验；全部声明完整不认证证据内容，外层最多待独立核验，canDeploy始终false。
- 外层负面证据、过期、错误环境/修订、结构或资源红线不能被 supported 抵消。

页面、报告、JSON/HTML/SVG、风险/公式/复制/PNG使用同一门禁；Excel增加九项能力状态与条件。旧评审文件不含capabilities时仍可读取，但不再视为这一阶段材料齐备。初始布局、公式、主角色和数量不因导入而改变。

## 60台案例的关键前提

工具绑定的案例事实为：3租户24/3/1分片，DN每组6副本，专属GTM共18个，管理6个、业务CN18个、运维CN2个、60台、每机最多4组件。实际配置绑定保留组/主从/主机/机房，不将“6副本”抽象成“支持高可用”一句话。

[厂商发布的2023金融应用指南](https://www.zte.com.cn/content/dam/zte-site/res-www-zte-com-cn/mediares/golden_db/pdf/report2024010303.pdf)第24–25页（PDF第32–33页）同城双中心配置描述管理节点为3或5个。此资料不能证明本例6管理节点受当前目标版本支持，也不能推出所有后续版本都不支持6个。必须提供实际版本/补丁、管理子组件、选主机制与厂商适用依据。因此本批没有自动改掉用户要求的6个，也没有硬编码3/5为通用合法集合。

管理节点在不同产品版本可能包含多个子组件，本工具的“一主多从”仍是抽象；声明支持不能替代详细部署模型。固定数量入口仍缺CPU/内存/数据需求，填版本资料不会消除容量未知。

## 来源与未完成范围

- [Conftest项目](https://github.com/open-policy-agent/conftest)及[使用说明](https://github.com/open-policy-agent/conftest/blob/master/docs/index.md)：参考结构化配置断言及负向测试方法。当前为独立JS实现，未引入Rego、第三方执行器或直接复制代码。
- 上述GoldenDB指南用于指出项目需补证的前提差异；它不是本例实际目标版本的完整支持矩阵。

P02b2b2已完成当前组件目录/接口/声明连接对应检查，详见component-network-v1.md。仍需真实规范与后续P02b3：组件级完整连接矩阵及端点映射、逐角色/租户/Group的覆盖，网络用途与流量关系、路由/链路/LB/VIP/NAT/有序防火墙/状态语义；单/多集群、Team、真实管理子组件和复制选主仍需建模/证据。当前仅绑定已声明的流量，不证明流量清单完整或真实网络可达。P03/R18b2b/b3、V4/S03、P05/P06/Office/可信审批均未关闭。
