# 资产与故障域统一身份 v1

2026-11-02；批次 P02b3b2b1c2a2，2026-11-01开始。适用于静态规划材料的身份声明核对，不提供生产批准。

## 为什么需要

两个目录中编号不同的记录，可能实际指向同一台设备、同一个供电或网络故障域。只比较原始编号会漏掉共享风险。本批引入明确的“命名空间＋统一编号”，保留原始同号检查，并对已声明的别名再次检查。不会自动修改部署位置，也不会把不同编号判成物理独立。

## 填写位置与示例

在生产评审JSON的 `connectivity.routing.physical.identities` 填入对象。下面仅展示字段形式，H1/SW1/FD1必须替换为当前材料中存在的对象，EV-INVENTORY必须引用根级evidence中实际证据；清单应覆盖所有规划主机、路由设备、交换设备和物理链路故障域。不能把本段示例当完整生产材料导入。

```json
{
  "schema": "goldendb-identities-v1",
  "targetVersion": "填写准确产品版本",
  "assets": [
    {"id":"MAP-H1","subject":{"kind":"host","id":"H1"},"identity":{"namespace":"组织统一CMDB","value":"ASSET-001"},"source":"库存导出记录位置","evidenceIds":["EV-INVENTORY"]},
    {"id":"MAP-SW1","subject":{"kind":"switch","id":"SW1"},"identity":{"namespace":"组织统一CMDB","value":"ASSET-002"},"source":"网络资产记录位置","evidenceIds":["EV-INVENTORY"]}
  ],
  "domains": [
    {"id":"MAP-FD1","subject":{"kind":"domain","id":"FD1"},"identity":{"namespace":"组织统一故障域目录","value":"POWER-A-01"},"source":"配电及依赖图位置","evidenceIds":["EV-INVENTORY"]}
  ],
  "review":{"coverage":"declared-complete","source":"本次设计映射范围及核对记录位置"}
}
```

资产subject.kind允许host、router、switch，分别引用当前主机、fabric.devices、physical.switches。域仅引用physical.faultDomains，暂不自动统一topology中的DC/AZ/rack/powerDomain/networkDomain；不同目录的故障域贯通在后续计划中。

每对象只接受一条直接映射，不支持别名链、模糊合并或手填“已通过”。namespace/value精确匹配并区分大小写；禁止首尾空白。应先由库存维护者核对真实身份，不能靠换命名空间或改编号消除已知冲突。

## 校验与结论

|输入或情形|处理|
|---|---|
|旧材料不含identities或为null|新增“统一身份未评估”说明，保留旧静态路径结论，不据此证明独立或批准生产|
|显式材料缺对象、来源、证据或coverage为unknown|统一身份未评估；显式映射不能伪装覆盖完整|
|版本不符、未知字段、对象不存在、重复对象/ID、不合法键|阻断；重复对象不任选一条，映射失效|
|多个独立设备对象映射到同一身份|identity-asset-collision阻断，输出结构化canonicalCollisions；需纠正重复登记或建立共宿模型|
|不同类型故障域映射同一身份|阻断；不能把供电域与机柜等不同层级直接合并|
|同类型域以不同本地ID指向同一身份|保留共享故障域关系；共享本身不等于当前通信失败|
|证据引用不存在、重复、类别不适用、版本错误或明确失败|阻断；适用类别为inventory/network，不能用无关的HA结论代替映射材料|
|证据unknown或来源/证据缺失|保留未评估，同时保留无歧义的已声明身份，已知同设备冲突不会因此隐藏|

根级生产契约还核对证据的设计、修订、环境、时间、摘要格式及失败结论。填写sha256或result=pass不表示程序读取了文件或认证了真实性。映射与连接配置进入既有版本能力绑定，变更后旧能力声明失效，必须重新核验，不能机械刷新生产证据。

资产最多7000条、域5000条、每映射最多20个证据ID、证据目录1000条；根级JSON沿用4MiB限制。证据先建索引再查引用，避免逐条反复扫描。共享资源比较沿用20000结果行、每类型5000资源及100000次访问预算，超限保留未评估。

## 输出与页面

- network-identities：覆盖和格式声明状态，identityProven始终false。
- network-shared-risk：原始shared加canonicalShared.assets/faultDomains。统一身份在JSON中以二元数组的JSON字符串表示，避免拼接分隔符碰撞；页面/HTML/Excel显示“命名空间/编号”。
- identityCoverageComplete仅表示静态身份映射的格式、引用对象和覆盖条件完整，不包括根级证据认证，不证明不存在隐藏实体。comparisonComplete仍仅代表路径比较条件；independenceProven始终false。
- network-asset-identity：原始同号collisions和统一身份canonicalCollisions。实际JSON保留结构，HTML和Excel提供中文说明，SVG保留生产门禁摘要。

共享比较仅限当前路径与同一逻辑邻接的候选路径。路径本来共用端点端口，因此增加中间交换路径不能证明端到端双归属；不同统一编号也不能证明无共享风险。此处识别风险，不模拟故障切换。

## 实施核对步骤

1. 冻结本次规划快照及版本，导出物理主机、交换/路由设备及故障域目录。
2. 对照序列号、资产标签、现场端口/供电图，确定统一身份和资料责任人；先消除目录歧义。
3. 为每个对象补齐直接映射及实际证据引用。导入后处理阻断、未映射及旧配置声明失效。
4. 查阅当前/候选路径共享项；明确保护对象、容许共同端点和要承受的故障。不能把“未发现重合”当合格。
5. 后续补齐独立性需求门禁、带宽/故障剩余容量、跨邻接业务路径、真实切换和数据库复制/恢复实测。

## 依据与边界

[NetBox官方设备模型](https://github.com/netbox-community/netbox/blob/main/docs/models/dcim/device.md)区分厂商序列号与本地管理的资产标签。借鉴其身份管理概念，本工具独立实现映射，不导入NetBox代码，也不把资产标签当跨组织天然唯一。

[RFC 8001 §6.2](https://www.rfc-editor.org/rfc/rfc8001.html#section-6.2)强调跨层、跨管理域使用SRLG信息需要协调一致的编号。本工具据此采用显式命名空间和直接映射；该RFC并不认证本工具算法，也不能证明具体GoldenDB组网获得生产支持。两份依据于2026-11-02复核。
