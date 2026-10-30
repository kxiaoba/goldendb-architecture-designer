# 生产设计与证据门禁 v1

开始：2026-10-28；完成：2026-10-29。P02a已实现只读检查；本格式不是厂商部署配置，也不具备签发生产批准的能力。业务测算、资源反推、固定数量三个入口使用同一检查器。

## 使用方法

1. 计算当前方案，在“生产设计与评审材料”下载当前设计评审模板。模板的snapshot为实际计算结果；设计ID、修订号、准确GoldenDB版本（含补丁）、环境ID和真实物理映射待填写，不自动造值。
2. 填写design、topology和evidence，保留schema与snapshot；资料暂缺保留null或unknown。不要删除负面证据以制造通过结果。
3. 导入JSON。工具检查引用、逻辑/物理AZ对应、版本/环境适用性及时间有效性，不执行部署，也不修改实例布局。文件上限4MiB，清单上限5000对象/类、1000条证据。
4. 下载门禁检查记录，包含当前context、原材料、checkedAt及检查结果。每个入口独立保存本次页面会话的材料；刷新页面后需重新导入。清除材料只影响当前入口。
5. 修改任意计算输入或实例落位后，旧snapshot失配即阻断。更新真实设计修订号、材料及对应证据，重新检查。不能仅改revision就沿用旧证据。

## 顶层结构与来源

schema固定为goldendb-production-review-v1。顶层仅接收schema/design/topology/evidence/infrastructure；未知字段拒绝。导出模板没有内置认证凭据。

|字段|含义和检查|
|---|---|
|design.id/revision|明确的设计ID和修订号；同一修订应冻结并归档。本工具校验当次一致性，尚无跨会话版本注册库|
|design.targetVersion|准确GoldenDB版本和补丁；与每条证据完全匹配，不按相似字符串推断适用|
|design.environmentId|唯一目标环境；测试环境证据不能冒充生产环境验收|
|design.entry|business/reverse/fixed，必须与当前入口相同|
|design.snapshot|下载时的完整计算结果；递归排序对象键后精确比较。数组顺序保留，不能凭数量相同接受不同落位|
|topology|真实对象关系，见下表；材料中的ID只代表声明，真实性仍需独立核验|
|connectivity|当前组件目录、接口端点、有向连接及证据，见component-network-v1.md；缺失未评估，参与不等于实际连通|
|capabilities|九项指定版本能力与当前配置事实绑定，见version-capabilities-v1.md；缺少时未评估，声明不等于认证|
|infrastructure|库存、双栈网络与必要容量补充，见infrastructure-contract-v1.md；旧材料缺少时未评估|
|evidence|十类证据，允许同类多条；任何一条失败/不支持/过期都不能被其他pass抵消|

snapshot刻意采用完整JSON比较，避免自行发明短摘要算法。它不等于签名：本工具未认证导入者、文件正文或审查人。证据sha256目前检查格式，不读取外部文件核对内容；未来可信审核系统应验证文件摘要、受信签名/身份和明确的批准范围。

## 物理对象关系

|清单|每项字段|检查|
|---|---|---|
|clusters|id|同类ID唯一|
|dcs|id,region|机房与地域声明；地域名称真实性待核验|
|azs|id,dcId|引用已有机房；AZ不自动等于独立机房|
|racks|id,azId,powerDomain,networkDomain|机柜所属AZ、供电与网络域；缺项未评估|
|hosts|id,physicalId,clusterId,azId,rackId|id须精确覆盖当前规划主机；physicalId不得重复；所有引用存在；机柜和主机AZ一致|

当前逻辑AZ映射严格为一对一：同一规划AZ不能拆成多个真实AZ，多个规划AZ不能合并到同一真实AZ。需要不同映射应先修改规划模型，不能只改标签。不同AZ可属于同一机房，本检查不会因此声称可抗机房故障。

当前适配器仍按单集群解释规划快照。出现多个clusterId时阻断并要求P02b专项设计，避免把现三地五中心示意直接当成多集群实施方案；不是断言GoldenDB不支持多集群。跨集群复制、控制面/Team、链路、安全和故障恢复语义仍须后续建模。机柜/供电/交换机是否独立、每个Group跨故障域是否符合指定SLO，仍未由本批自动证明。

## 证据规则

必需类别：versionSupport版本支持、inventory物理库存、network网络、capacity正常/故障容量、ha复制选主容灾、backupRestore备份恢复、security安全授权、operations监控运维、cutover部署割接回退、acceptance环境验收审批。该清单是项目工程门禁，不冒充厂商标准。

每条字段：id、category、designId、revision、targetVersion、environmentId、source、sourceVersion、sha256、collectedAt、validUntil、owner、result、limitations。

- 适用范围四元组designId/revision/targetVersion/environmentId必须与design完全相同。
- source是文档/证据定位，仅显示为文本，不自动下载、不执行其中内容。sourceVersion应记录文档或测试方法版本；sha256为64位小写十六进制。
- collectedAt和validUntil使用完整UTC，如2026-10-28T10:00:00Z。拒绝不存在的日历日期、隐含时区、未来采集、到期或倒置有效期。有效期由实际证据的治理规则确定，不擅自统一规定天数。
- result仅为unknown/pass/fail/unsupported；pass是输入者声明，verified/approved等自报字段不能升级信任。
- owner及limitations必填，说明硬件/负载/SQL/故障/配置范围及失效条件。当前仅检查材料字段，不用一句“无”替代人工评审质量。

## 状态与输出一致性

|状态|触发条件|含义|
|---|---|---|
|阻断|当前规划已知红线、材料格式/引用/故障域矛盾、快照不符、证据失败/不支持/过期/版本不符等|生产准入显示未通过，仍可下载诊断材料|
|未评估|必需信息或材料缺失、当前结构未知|不能声明已评审或可实施|
|待独立核验|全部必需字段与一致性检查满足|材料可交给责任人核验；productionStatus仍为未评估|

canDeploy始终false。本批没有自动“生产通过”分支；真实批准需指定环境、证据正文、责任人/签名及变更闭环。当前检查时间由浏览器时钟提供，不是可信时间戳；导出时重新检查有效期，保存的报告表示其checkedAt时点。

主界面风险、计算过程、复制摘要、Excel摘要和PNG说明使用同一门禁逻辑；固定入口JSON/HTML/SVG带门禁状态，SVG metadata保留完整报告。HTML与SVG仍是规划资料，导出不执行上线。主机数量、实例身份、副本落位和主均衡算法不因材料导入而改变。

## 参考实现选择

已查看[in-toto验证模型](https://github.com/in-toto/attestation/blob/main/docs/validation.md)及[Statement校验源码](https://github.com/in-toto/attestation/blob/main/go/v1/statement.go)：其设计将被验证对象、内容标识与认证者分开，验证签名需预先认可的密钥。本工具借鉴“证据须绑定对象、字段存在不等于可信”的原则；未复制协议或宣称兼容in-toto，未引入依赖。后续可信认证不能靠JSON中自己填写verified。

[OPA项目](https://github.com/open-policy-agent/opa)将规则、输入数据和决策分离。本批据此采用无DOM的只读检查器与独立界面适配；这是工程设计借鉴，不声称本工具已经集成OPA。

## 下一阶段

P02b1和P02b2a已补库存、双栈网络声明一致性和明确单位/预留的实际必要容量核对；P02b2b1已补逐项版本能力适用性声明；P02b2b2已补组件目录/端点/声明连接对应，b3继续监听冲突、网络与集群实施语义，真实版本支持仍需实际资料；明确集群边界、3+3/管理/Team/运维CN的版本语义及故障域策略。可信证据正文/摘要/身份核验、跨会话不可变修订登记及生产批准流程在P05/P06继续。R18b2b/b3、V4/S03/原生Office仍未关闭。测试用synthetic示例一律不能作为真实生产证据。
