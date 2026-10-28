# 扩容基线结构契约 v1

本契约是R18b1的单集群结构输入模型，版本标识为 `goldendb-expansion-baseline-v1`。当前仅独立检查，不导入现有规划、不应用到R18a工具基线、不生成现网扩容动作。字段未知不推定为0或已核验。真实清单是否完整、厂商原生ID映射、配置来源和生产能力仍须另核。

## 顶层字段

|字段|内容与约束|
|---|---|
|schema|固定版本标识；旧R18a会话记录不是该格式，不能混用|
|source|kind仅unknown/synthetic/user-declared；reference为来源记录；databaseVersion可null。user-declared只是文件自报，不等于核验。verified等自称核验枚举拒绝|
|sites|1..16个站点，稳定id与可选name|
|pools|1..256个资源池，稳定id|
|hosts|1..2000台；id、siteId、poolId、maxComponents、usableResources|
|tenants|1..100个租户；id、name、cnCount、cnRequiredBySite、allowedCnPoolIds、dnGroupIds、gtmGroupId|
|groups|最多1000组；id、component（DN/GTM/MGMT）、tenantIds、replicaCount、requiredBySite、primarySiteId、allowedPoolIds|
|instances|最多2000个实例；id、component（CN/OPS_CN/DN/GTM/MGMT）、tenantId、groupId、role、hostId、resourceDemand|
|policies|显式maxComponents（1..64）、opsCnCount及同租户CN反亲和、CN/GTM混布、跨租户CN/DN混布、管理/运维CN专用与DN分层开关；不使用隐式默认|

这是工具检查预算，不是GoldenDB产品上限。界面文件最大2MiB。稳定ID为1..128字符的ASCII字母/数字开头，后续允许字母、数字、下划线、点、冒号、短横线；中文名称放name。工具稳定键不自动等同厂商原生ID。

## 关系及未知值

- 所有实例ID、主机ID、租户ID、组ID分别唯一；引用必须存在。省略实际对象且同时省略其目标不能被纯文件检查发现，文件通过不证明实际清单完整。
- 主机必须引用站点与资源池。组声明allowedPoolIds，租户声明allowedCnPoolIds；实例宿主机须在对应允许池内。null表示该约束未知，报告部分未评估；遗漏或非法类型报错。
- DN组恰好归属一个租户；GTM组可共享多个租户，也可独占，租户gtmGroupId与组tenantIds须双向一致。MGMT组tenantIds为空。副本组实例仅primary/replica，每组恰好一个主，全部副本跨主机。
- GTM/MGMT实例的归属由组管理，实例tenantId为null；DN和业务CN必须有有效租户。CN/OPS_CN的groupId为null、role为service，OPS_CN的tenantId为null。
- tenant.cnCount为显式总数；cnRequiredBySite为所有站点（含0）的CN目标，和必须等于总数，实际分布须匹配。null表示逐站点目标未知，不能表示检查通过。
- 组replicaCount须正整数，requiredBySite必须显式覆盖全部站点（含0）且总和匹配；primarySiteId显式指定。三项可null，分别标结构未评估，不暗自推定副本数或主中心。
- 主机maxComponents可null；全局maxComponents仍会校验，但缺单机上限报告部分未评估。全部组件（包括运维CN/管理）计入密度。
- usableResources是已经扣除用户约定开销/预留的可部署预算；resourceDemand是单实例预算，均为 `{cpuCores,memoryGb,dataTb}` 有限非负数或null。共同宿主机联合求和比较，不重复扣预留；null保持容量未评估。零值是明确录入的零，不能替代未知。
- 隔离开关属于录入的项目约束。false不等于厂商允许放宽生产隔离；本工具不核验版本策略或实际cgroup/IO限制。

## 返回值判读

`valid` 仅表示格式和已知约束没有发现矛盾，未知约束时也可为true，不能单独用于增量规划准入。

- structuralStatus：未通过 / 部分未评估 / 结构检查通过（非生产认证）。
- capacityStatus：未通过 / 未评估 / 仅录入预算通过（非实测）。
- productionStatus：本阶段始终未评估；即便来源/版本填满也不升级为已核验。
- errors、unknowns各最多显示300条，errorCount/unknownCount记录总量，状态按全部已检查结果确定，截断不能掩盖后续未知或超限。

不检查真实IP/VLAN、冗余交换机、防火墙、链路连通/RTT/带宽、机柜故障域、仲裁/选主、同步追平、性能或RPO/RTO。额外未知字段不参与判断，不应依赖其自报“通过”状态。

## 60台合成样例与下一步

`examples/expansion-baseline-60-synthetic.json`由用户60台用例的固定规划结果转换，包含本地/同城站点、4种资源池、60台、3租户、32组、212实例。CPU/内存/数据盘及实例需求显式null，来源synthetic、版本null；它用于学习/回归，绝不是现网基线。

契约已能表达“原共享GTM组+另一个专属GTM组”并检验双向归属，尚不生成或保持这些组的物理落位。R18b2需要将经过来源核对的对象映射、已有角色锁定和新增资源约束接入真正的增量规划；在此之前R18整体不关闭。

## R18b2a相对检查扩展

单份快照通过不能证明已有对象没有变化。新增[相对约束契约](incremental-constraints-v1.md)，在基线与候选间检查既有角色锁定、逐Group归属、新增集合和原生ID映射；界面识别两种版本，仅下载诊断报告，不应用到当前规划。

严格入口`GoldenDBBaseline.validate`仍要求所有实例已落位；新增`validateTarget(candidate,newInstanceIds)`辅助入口只对显式新增实例接受`hostId:null`并报告待落位/未评估，不创建虚拟主机。相对检查器从候选减基线计算真正新增集合，既有实例继续严格锁定。辅助入口本身不替代相对检查，不执行试排或认证现网身份。
