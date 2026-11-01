# 网络设备、接口与邻接声明契约 v1

2026-10-31，P02b3b2a1。材料位于connectivity.routing.fabric，schema=goldendb-network-fabric-v1。本阶段检查已声明设备、接口、直连关系和网关首跳，不执行网络配置，不证明真实ARP/ND、物理链路或完整转发。旧材料缺fabric时保持未评估。

## 字段与填写顺序

先完成现有组件、库存接口、网段/VRF、连接和有效目的路由，再按实际资料填写本表。模板不生成交换机、路由器或网关默认值。

|字段|填写要求|
|---|---|
|targetVersion|与design.targetVersion一致的准确目标数据库版本/补丁；网络设备版本另填osVersion|
|devices[]|id、assetId、model、osVersion、forwarding、source；一个物理资产只登记一次，不用别名重复计数|
|forwarding|分别声明ipv4/ipv6为enabled、disabled或unknown；必须是本声明范围内的有效转发结论，不能只复制某个全局sysctl值|
|interfaces[]|id、deviceId、networkId、address、state、addressRole、source；接口引用已有网段及VRF|
|state|up/down/unknown；声明不是工具现场探测结果|
|addressRole|unicast、virtual或unknown；virtual/未知归属保留专项核验，不当作普通独立接口|
|adjacencies[]|id、source、target、state、evidenceSource；source/target均为{kind,id}|
|邻接端点kind|host-interface引用库存接口；router-interface引用本批设备接口；external-endpoint引用已有外部端点|
|directPaths[]|id、linkId、forwardAdjacencyId、reverseAdjacencyId；仅核对已绑定direct路由，local/via的这两项可填not-applicable|
|gatewayBindings[]|id、tableId、routeId、routerInterfaceId、adjacencyId；每条via路由绑定网关设备接口及源出口到网关的有向邻接|
|review|coverage填unknown或declared-complete；source注明本批设备/邻接清单范围、资料章节及未覆盖部分；不接受verified|

每类清单最多5000项，设备/路由表最多1000项，网关核对最多5000路由；外层材料仍有4MiB限制。声明完整只表示所提供范围已填全，不能证明所有实际设备和链路都已录入。

## 检查规则

- 网关接口必须属于已声明设备；具体地址族、范围、网段/VRF和所选网关地址对应。普通单播地址不能与规划主机、外部端点或同VRF其他设备接口重复占用。VIP/特殊地址留待专项模型。
- 直接邻接须在相同声明网段、VRF及地址族内；只填同网段不等于已证明邻接。源接口不能指向自己，不能用相反方向或其他接口的边替代。
- 每条有向连接的direct路由分别核对正向/返回邻接；每条via路由核对具体网关首跳。缺声明未评估，错引用/错方向/错地址明确阻断。
- 实际路径使用down邻接或down设备接口时阻断；使用unknown状态时未评估。未被路径使用的备用down接口/邻接不自动判为当前路径故障。
- 网关分别检查所用地址族的有效转发状态；IPv4禁用不能自动代表IPv6禁用。被当前连接选用的网关，所用地址族禁用则阻断、未知不放行；未选中的备用via仍检查引用与资料一致性，运行状态不自动阻断当前路径。
- Linux全局和接口级转发、VRF/命名空间及接口覆盖可能共同影响实际结果。forwarding必须依据这些条件得出；不同接口条件混合、无法归并时填unknown，不把单一全局开关作为有效结论。
- 设备/邻接配置纳入network版本能力绑定；修改后旧支持声明失效。风险/公式、固定JSON/HTML/SVG及Excel逐连接/网关行使用同源结果。

## 结果边界与下一步

“声明关系待实测”只描述已选direct路由的对应关系；local/via不能由该行证明。“声明首跳待实测”只说明网关归属、首跳邻接和有效转发声明符合本模型，不能推断设备FIB、后续出口、循环或完整回程。P02b3b2a2新增routing.forwarding逐跳计算；缺设备FIB或范围不适用时route-transit等未评估保持，canDeploy=false保持。

同一逻辑网段不证明跨机房二层拉通，up不能代替实测。物理交换机/端口、链路/MTU、真实ARP/ND、路由协议、策略路由/ECMP、接口级转发覆盖、LB/VIP/NAT、状态防火墙及故障收敛尚未完成。

P02b3b2a2已实现有界设备有效FIB逐跳、循环和往返计算，详见network-forwarding-v1.md；下一步处理物理链路/MTU、转换和状态规则。当前设备清单不是新增数据库服务器，不计入60台数据库主机或每机4组件限制；网络资产的采购、故障域和容量须另行评审。

## 方法依据与验证

参考[Batfish转发分析设计](https://github.com/batfish/batfish/blob/master/docs/forwarding_analysis/README.md)区分地址归属、邻接、ARP和设备转发；参考[Linux IP配置文档](https://docs.kernel.org/networking/ip-sysctl.html)核对IPv4、IPv6及全局/接口转发条件。本模块独立实现，没有调用Batfish、没有完整模拟Linux网络栈。

110项专项包含两地址族的54组网关状态组合、9组正反向邻接状态、错绑/重复/缺项、备用down、有效转发未知及首跳不能替代完整转发等边界。合成网络和端口只供测试，不是GoldenDB生产建议。

## P02b3b2b1a最新补充（2026-10-31）

routing.physical已提供一条逻辑邻接内部的物理端口/线缆/有向交换路径、连续性、有效IP MTU和故障域资料检查。错误端口占用、错接和已知MTU不足阻断；缺项/预算保留未评估。路径使用集合来自路由/邻接计算，备用未使用down不自动阻断。详见network-physical-v1.md。下一步b3b2b1b跨路由逐业务连接MTU目标汇总，再b1c备选链路/共享故障域/带宽容量；b3b2b2、b3b2b3及全部原遗留继续开放，不构成生产认证。


## 2026-11-01 端到端MTU补充（P02b3b2b1b）

逐连接/方向包长目标已接入计算路径与物理结果，详见 [network-mtu-v1.md](network-mtu-v1.md)。via使用实际逐跳邻接，direct使用方向邻接；physical输出已知有效IP MTU和配置网段MTU，二者共同约束。旧材料缺packetTargets显示未评估，不自动补成通过。未知转换/分片策略不假设包长不变；本机连接仅外部网络MTU不适用。界面与导出同源，修改目标会使网络能力绑定失效。只完成静态声明检查，未批准生产；下一步b3b2b1c备选链路/共享故障域/带宽故障容量，其他旧计划继续开放。
