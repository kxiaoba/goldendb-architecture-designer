# 有效目的路由与往返路径契约 v1

2026-10-31完成（2026-10-30开始），P02b3b1。生产评审材料 connectivity.routing，schema=goldendb-network-routing-v1。旧材料仍可导入，缺少routing显示未评估。只校验已声明有效目的路由和端点往返选择，不执行设备配置、不计算动态路由协议、不认证真实可达。

## 数据准备

先完成组件、网卡、网段、VRF和有向连接，再按实际设备/系统配置及路由查询结果提供有效表。本工具不默认生成网关，也不根据两端同网段就假定物理二层互通。测试中的直连表及local路由是合成材料，不是生产配置。

|字段|填写要求|
|---|---|
|tables[].id|唯一表ID|
|ownerType / ownerId|host及当前规划主机ID，或external及已登记外部端点ID；共享同宿主机/VRF的组件共用一份有效表|
|vrf|与出发端点网段VRF一致；本阶段不能自行声明路由泄漏成功|
|mode|destination-only表示已明确按目的地址选择的有效表；策略规则、多表选择未完成时填unknown|
|coverage|declared-complete或unknown；是提供者声明，不能填verified|
|source / targetVersion|实际采集/配置资料定位、范围、平台和准确目标数据库版本补丁；不是只填通用支持结论|
|routes[].id / destination|表内唯一ID；规范IPv4/IPv6 CIDR，网络地址主机位必须为0|
|routes[].kind|direct直连、via经网关、local本机交付、blackhole明确丢弃；其他动作/动态优选须先转换为真实有效结果或保留未知|
|routes[].networkId / interfaceId|出口网段及归属主机接口。外部端点仅支持已声明网段，interfaceId填not-applicable。blackhole二者均填not-applicable|
|routes[].nextHop|via填写真实网关地址；其他动作填not-applicable。没有网关资料不能填虚构地址|
|paths[].id / linkId|每条有向连接的一份往返路径声明|
|paths[].forward / reverse|分别为{tableId,routeId}；返回方向从原目标地址查到原源地址，不是新增一条业务流量|

同一归属/VRF只接受一张已归并的有效表；每表最多1000路由、总计最多5000路由、最多1000表/5000路径，逐目标匹配预算100000次。预算耗尽明确未评估，不把尚未解析的已提供表误判为不存在。

## 核对逻辑

1. 核对表归属、VRF、出口接口/网段和资料版本；组件目录或接口变化会影响解析结果，routing也进入network版本能力的精确配置绑定。
2. 只有mode=destination-only且coverage=declared-complete时，才按匹配目的地址的最长前缀核对所选条目。未知策略或不完整表不被当作实际选路结果。
3. 不能选择宽泛允许条目绕过更具体的丢弃路由。完整表没有匹配条目则阻断；同一最长前缀有多个候选则未评估，不随意选一条。metric/优先级/ECMP未模拟。
4. direct仅检查声明的同网段和同VRF；local只支持当前归属已登记地址的/32或/128精确路由，不能跨VRF或交付给其他对象。物理二层、ARP/ND及系统实际local表仍须验证。
5. 普通via网关须是出口网段内的同族单播地址，不是自己的地址或IPv4网络/广播地址。IPv6链路本地网关及作用域保留专项未评估，不因不在全局前缀内就直接判错；递归/特殊网关不假定可达。
6. via首跳不等于全路径可达。P02b3b2a2已接入设备有效FIB逐跳检查；有完整适用声明时计算往返路径，缺FIB或超出模型范围仍未评估。不要求路径对称。
7. 每条连接分别检查正向和返回；返回黑洞/选错表会阻断。所有连接当前都纳入双向路由预检；纯单向/无回复业务豁免尚未建模，不能伪造反向资料。
8. 页面、风险/公式、固定JSON/HTML/SVG及Excel逐连接行同源；导入评审不会改变主节点、分片、数量、资源计算或落位。

## 不能推断的结论

两个方向有声明路由，不等于TCP/UDP能通、数据库可用或故障后自动恢复。返回检查没有模拟临时源端口、连接跟踪、实际ACL顺序、策略路由、反向路径过滤、VRF感知套接字、命名空间、ARP/ND、链路状态、MTU、路由收敛、NAT、LB/VIP或真实设备转发。

同一逻辑网段ID不证明跨机房二层拉通；普通网关在网段内也不证明它存在或转发目标流量。必须提供目标版本/平台与实际网络证据，继续完成逐跳及环境测试。所有结果canDeploy=false。

## 方法依据

参考 [Batfish转发分析设计](https://github.com/batfish/batfish/blob/master/docs/forwarding_analysis/README.md)区分FIB、IP归属、邻接和实际转发，以及 [Linux VRF文档](https://docs.kernel.org/networking/vrf.html)对接口所属表、策略规则和VRF感知套接字的说明。本模块独立实现，只提供有限声明检查，没有引入Batfish或实现其完整转发分析。

686项专项包含625组独立前缀顺序组合、IPv6、返回黑洞、未知策略/不完整表、网关、自身地址、同机跨VRF和预算边界。完整验收见remediation-p02b3b1-routing.md。

P02b3b2a1补充：routing.fabric已提供设备/接口/有向邻接和网关首跳对应检查，详见network-fabric-v1.md。首跳与后续转发分层检查；P02b3b2a2补充的有限目的地址逐跳模型见network-forwarding-v1.md，不构成实际可达认证。

## P02b3b2b1a最新补充（2026-10-31）

routing.physical已提供一条逻辑邻接内部的物理端口/线缆/有向交换路径、连续性、有效IP MTU和故障域资料检查。错误端口占用、错接和已知MTU不足阻断；缺项/预算保留未评估。路径使用集合来自路由/邻接计算，备用未使用down不自动阻断。详见network-physical-v1.md。下一步b3b2b1b跨路由逐业务连接MTU目标汇总，再b1c备选链路/共享故障域/带宽容量；b3b2b2、b3b2b3及全部原遗留继续开放，不构成生产认证。


## 2026-11-01 端到端MTU补充（P02b3b2b1b）

逐连接/方向包长目标已接入计算路径与物理结果，详见 [network-mtu-v1.md](network-mtu-v1.md)。via使用实际逐跳邻接，direct使用方向邻接；physical输出已知有效IP MTU和配置网段MTU，二者共同约束。旧材料缺packetTargets显示未评估，不自动补成通过。未知转换/分片策略不假设包长不变；本机连接仅外部网络MTU不适用。界面与导出同源，修改目标会使网络能力绑定失效。只完成静态声明检查，未批准生产；下一步b3b2b1c备选链路/共享故障域/带宽故障容量，其他旧计划继续开放。
