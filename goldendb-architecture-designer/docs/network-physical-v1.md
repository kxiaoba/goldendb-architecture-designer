# 物理端口、链路与 MTU 声明契约 v1

2026-10-31，P02b3b2b1a。材料位于 `connectivity.routing.physical`，schema=`goldendb-network-physical-v1`。本批补齐一条逻辑邻接内的物理路径，不是整条业务连接跨路由的端到端 PMTU 或生产高可用认证。

## 填写顺序与字段

先填写库存接口、组件连接、有效路由、fabric邻接及forwarding设备FIB。根据真实设备配置和布线记录填写以下字段，不以合成样例代替。

|字段|必需内容|
|---|---|
|targetVersion|与设计准确GoldenDB版本/补丁一致|
|review|coverage为unknown/declared-complete；source记录采集范围、资料位置与时间，不接受自报verified|
|faultDomains[]|id、kind、source；kind为power/rack/conduit/site/device/other。故障域用一致ID表示共享电源、机架、管道等真实依赖|
|switches[]|id、assetId、model、source、faultDomainIds；不能与既有路由设备以同一资产重复登记|
|ports[]|id、owner、name、networkId、mode、state、ipMtuBytes、source、faultDomainIds|
|owner|{kind,id}；kind为host/router/switch/external，分别引用当前主机、fabric设备、本批交换设备、已登记外部端点|
|mode|端口只支持dedicated-l2或unknown；本批只表示单网段专用物理端口，不用bond、port-channel、VLAN子接口冒充独立物理端口|
|bindings[]|id、interface:{kind,id}、portId、mode、source；interface引用host-interface/router-interface/external-endpoint；mode为one-to-one或unknown|
|cables[]|id、aPortId、bPortId、state、ipMtuBytes、source、faultDomainIds；两个不同真实物理端口，一端只能占用一条线缆|
|transits[]|id、switchId、fromPortId、toPortId、networkId、state、ipMtuBytes、source；声明交换设备内部同网段的有向有效转发，不能省略或倒用|
|paths[]|id、adjacencyId、segments、requiredIpMtu、packetPolicy、source；每逻辑邻接仅一条当前活动物理路径|
|segments[]|{kind,id,fromPortId,toPortId}；kind为cable或transit；线缆可按实际端点双向使用，交换转发严格按声明方向|
|packetPolicy|requiredIpMtu是本段要求承载的无分片IP包大小；packetPolicy为no-fragment/unknown，目标未知填null|

state为up/down/unknown。IP MTU使用字节整数，包含IP头，不是应用负载长度、TCP MSS或以太网整帧长度；ipMtuBytes为已计入本范围封装条件后的有效IP MTU，未知填null。本批不计算隧道、聚合或动态封装开销，无法归并时不得伪填数值。整数范围68..65535；IPv6适用路径需至少1280，不能用未建模的底层适配暗中绕过。

故障域未知填空数组并保留未评估，不能填虚构的独立电源/管道。无论是否已给故障域，本批均不自动判定冗余或故障切换可用。

## 检查与计算

- 主机/路由端口必须属于逻辑接口的同一归属对象和网段；一个接口/端口只有一份明确绑定。相同归属及端口名不能重复计为不同资源。
- 物理路径必须从源接口绑定端口连续到达目标端口。逐段核对实际线缆两端、有向交换转发、同网段、端口重复到访及引用完整性。不能仅手填“路径可达”。
- 路由/邻接计算器提供已使用邻接集合，物理检查只对这些路径应用运行状态和MTU判断。未使用备用路径down或未选中备用网关的物理MTU问题不自动阻断当前连接；材料本身的错引用/重复资源仍阻断。
- 在一条逻辑邻接内，对所有已知端口、线缆及交换转发的有效IP MTU取最小值。与本路径requiredIpMtu及已有网段mtu目标中的较大者比较，不能通过降低路径目标绕过已录网段MTU。
- 任一已知值不足即阻断该MTU设计要求，即使其他段MTU未知。全部已知且满足时仍仅“声明物理路径待实测”。有未知值时显示的已知最小值不能视作完整路径MTU。
- MTU不足表示不满足所声明的无分片目标，不自动断言小包、TCP协商或采用其他分片策略的业务必然完全不通。本批不验证PMTUD、ICMP可达、MSS钳制或应用实际包长。
- 缺physical或无法对应fabric的旧材料保持未评估；资料畸形给出诊断，不能崩溃后让评审中断。端点绑定缺失不伪造路径断路结论。预算耗尽不伪造“没有到达目标”。

每类清单最多5000项，交换设备最多1000，单路径最多128段，累计最多10000路径段；超计算预算的未处理部分保持未评估。外层材料仍受4MiB上限约束。本阶段不处理多活动路径、LAG/MLAG、Trunk/VLAN标签转换、EVPN/VXLAN、STP收敛、设备故障重选或隧道。

新增network-physical行及路径段/故障域清单，页面、JSON/HTML和Excel同源；SVG显示统一生产门禁。配置变化进入既有network版本能力绑定。父层引用/版本/资料错误可能使整体结果比某单行更严格，应以整体评审为准。canDeploy=false保持。

## 生产实施与后续

交换设备和线缆是独立网络资产，不增加数据库60台主机数量，也不占每台4个数据库组件名额。真实容量、带宽/速率、链路超卖、时延和故障备用容量仍须另行核验。

下一步b3b2b1b：把逐跳结果与物理段相连，形成每条业务连接/方向的统一包长目标和跨路由MTU汇总；明确缺失/转换/预算边界。随后b3b2b1c：备选链路选择、共享设备/电源/管道故障域、带宽单位与故障容量；须保留端点共同依赖，不能用不同链路ID证明独立。b3b2b2处理LB/VIP/NAT/有序及状态ACL，b3b2b3处理故障收敛、实际业务探测与证据闭环。

## 方法参考与验证边界

- [Batfish分层数据平面设计](https://github.com/batfish/batfish/blob/master/docs/data_plane/README.md)：区分物理连接、二层交换和三层IP拓扑。本模块独立实现，未接入Batfish。
- [Batfish补充拓扑格式](https://github.com/batfish/pybatfish/blob/master/docs/source/formats.md)：参考将物理接口连接显式建模的方法。
- [RFC 8900 第2.1节](https://www.rfc-editor.org/rfc/rfc8900.html#section-2.1)：IP包大小、链路MTU和路径瓶颈的定义；本批只计算已声明邻接内的物理段，不冒充跨路由实测PMTU。
- [RFC 8200 第5节](https://www.rfc-editor.org/rfc/rfc8200.html#section-5)：IPv6最小链路MTU及底层适配条件。当前模型不支持需要另行建模的底层分段重组。

核对日期2026-10-31。156项专项含96组双栈MTU独立最小值组合、缺项/错接/重复占用/方向/备用down/故障域、空路径/循环/预算及畸形输入。累计预算单测故意复用逻辑请求来压力测试本模块；上层会拒绝重复逻辑邻接，它不是生产拓扑样例。详情见本批验收记录。


## 2026-11-01 端到端MTU补充（P02b3b2b1b）

逐连接/方向包长目标已接入计算路径与物理结果，详见 [network-mtu-v1.md](network-mtu-v1.md)。via使用实际逐跳邻接，direct使用方向邻接；physical输出已知有效IP MTU和配置网段MTU，二者共同约束。旧材料缺packetTargets显示未评估，不自动补成通过。未知转换/分片策略不假设包长不变；本机连接仅外部网络MTU不适用。界面与导出同源，修改目标会使网络能力绑定失效。只完成静态声明检查，未批准生产；下一步b3b2b1c备选链路/共享故障域/带宽故障容量，其他旧计划继续开放。


## 2026-11-01 单活动选择与备选路径补充（P02b3b2b1c1）

新增physical.selections，详见 [network-selection-v1.md](network-selection-v1.md)。同邻接多路径须显式选择，当前与候选检查独立展示；当前故障不自动回退，候选故障不参与当前路径MTU。先检查全部当前路径，再使用剩余预算检查候选。非法库存仍属整体材料错误；旧单路径资料兼容。选择变化使网络能力绑定失效，实际导出同步。只完成声明快照检查，控制平面、自动切换及物理独立性未验证。下一步c2a共享故障域/跨目录资产，再c2b带宽/故障容量；其余原计划保留。
