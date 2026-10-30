# 库存与双栈网络补充契约 v1

更新：2026-10-30，P02b2a。嵌入生产评审模板的 infrastructure 字段，schema 保持 goldendb-infrastructure-v1。仅检查声明资料及当前规划必要容量，不生成或执行厂商安装、交换机或防火墙配置。

## 填写与数据来源

从当前页面下载评审模板，保留当前设计快照和全部主机 ID。填写真实目标版本、物理库存、故障域、网段/接口和需求流量后导入。空值表示未知，不能填合成测试值获得“通过”。容量需求由当前实例落位资源审计提供，导入材料不能自行覆盖需求或改变规划。

|字段|口径与规则|
|---|---|
|targetVersion|与 design.targetVersion 完全相同的目标版本/补丁；文字一致不等于厂商认证|
|planUnits|cpu 必须 physicalCores；memory 为 GB/GiB；disk 为 TB/TiB；source 填原规划单位的依据。未声明不猜测、不换算|
|hosts|id 精确覆盖当前规划；cpuPhysicalCores 为正整数；memoryGiB、nicGbps 为正数；dataUsableGiB 非负；os、architecture 显式填写|
|hosts[].budget|cpuReserveRatio、memoryReserveRatio 为 [0,1)；diskBasis 和 diskWatermark 见下节。不得省略预留语义|
|networks|id、cidr、vrf、vlan、mtu、purposes、pointToPoint；VLAN 1–4094；IPv4 模板 MTU 576–65535，IPv6 1280–65535，特殊底层适配另行评审|
|interfaces|id、hostId、networkId、nic、address；有效引用、地址族/前缀匹配、同 VRF 地址不能重复|
|acl|id、sourceNetworkId、targetNetworkId、protocol、portStart、portEnd、action、source、targetVersion|
|flows|id、sourceNetworkId、targetNetworkId、protocol、port、purpose、source、targetVersion|

protocol 为 tcp/udp；端口 1–65535。purposes/purpose 为 business、replication、management、backup。允许共网声明多个用途，但共网不等于隔离。ACL 是无冲突的需求规则集合，不模拟真实设备 first-match、连接跟踪、返回流或动态端口。相同方向和协议的允许/拒绝端口重叠阻断；跨 IPv4/IPv6 不推断 NAT64 或可达性。

每类清单最多 5000 条、组合比较预算 200000 次，超出后未评估；JSON 上限 4MiB。未知字段、非法引用/数值和冲突明确报错，缺值不能默认为已验证。

## 容量核对与扣减顺序

1. 规划需求来自当前宿主机的实例合计。CPU 为物理核，内存/磁盘按 planUnits 明确的原始单位换算：GB=10^9 B，GiB=2^30 B，TB=10^12 B，TiB=2^40 B。单位来源仍须独立核验。
2. 实际 CPU 可分配 = cpuPhysicalCores × (1−cpuReserveRatio)。实际内存可分配 = memoryGiB × 2^30 × (1−memoryReserveRatio)。预留只作用于实际库存，不再折减原始需求。
3. dataUsableGiB 必须已扣 RAID/文件系统/系统盘、日志与恢复工作区等非本次数据预算，不是裸盘采购容量；具体分账依据随项目材料提供。
4. diskBasis=net-before-watermark：数据净预算尚未扣水位，可分配 = dataUsableGiB × 2^30 × diskWatermark，水位 (0,1]。diskBasis=allocatable-after-watermark：已扣水位，可分配直接使用该值，diskWatermark 必须为 1，拒绝重复扣水位。
5. 每台主机、每种资源独立比较。已知 CPU 超限不能被磁盘未知掩盖；需求不完整只核对已知部分并保留未评估，不给完整承载结论。零需求须由规划明确产生，固定数量模式不把未知资源转换为零。
6. 换算超过安全数值范围保持未评估。浮点边界只允许机器精度级舍入容差，不添加业务容量余量。

通过行显示“必要容量通过”，只是当前已录负载的资源必要条件，不能证明 IOPS、带宽、热点、NUMA/CPU代际、故障接管和重建性能。固定 60 台入口仅提供组件数量，因此即使硬件已填，CPU/内存/数据需求仍未知；需后续规格/工作量模型，不能直接部署。

旧 P02b1 文件仍可导入；缺少 planUnits 或 budget 会变为未评估。工具不静默改写旧 GB/TB 数值、CPU数量或原有落位。

## IPv4/IPv6 地址规则

- IPv4 /0–/32、IPv6 /0–/128 解析；前缀含主机位拒绝，不静默修正。IPv6 用 128 位整数比较；缩写、前导零、大小写差异统一为数值身份，报表不输出 BigInt 对象。
- 同 VRF、同地址族直连网段不能重叠；不同地址族不做数值重叠比较。不同 VRF 可复用地址，但路由/NAT 可达性仍未知。
- IPv4 按完整前缀判断网络/广播地址，不能简单禁止最后一个字节为 0/255。/31 须 pointToPoint=true，/32 仅表示单地址前缀。
- IPv6 不套用广播地址规则；子网全零接口标识保留任播语义待核验。/127 为路由器间点到点适用问题，不能仅凭 pointToPoint=true 承诺数据库接口支持。
- 环回、未指定、组播等不作为普通接口地址；链路本地、IPv4映射/兼容地址保留专项建模未知。带 %作用域、URL方括号等未建模表达拒绝，不误合并作用域。
- 通用 IPv6 语法检查通过不表示 GoldenDB 指定版本支持 IPv6；真实组件/驱动/工具支持矩阵仍须证明。

## 输出与生产边界

页面、检查记录、固定 JSON/HTML/SVG 与业务/反推摘要、风险、复制、Excel/PNG 使用同一门禁结果。Excel 另外列出逐主机需求/可分配值；库存容量行使用 inventory-capacity 分类，与原有 capacity 证据分类分开。

材料无冲突且检查完整时仅为“结构一致待实测”；外层最多“待独立核验”，canDeploy=false。真实证据正文、签名和批准未认证；未知仍未知、错误阻断。当前门禁不更改组件数量、宿主机、副本、主角色或公式。

P02b2b1已实现逐项版本能力与配置适用性绑定，详见version-capabilities-v1.md。P02b2b2已补组件端点/连接对应及流量用途两端一致性，见component-network-v1.md。仍开放P02b3：版本/补丁、OS/架构、管理6副本/3+3/Team/运维CN支持矩阵；组件级完整连接关系；单/多集群和复制/仲裁语义；物理链路/双交换机、路由/网关、DNS/NTP、LB/VIP/NAT、实际防火墙顺序/状态、端到端 MTU 与带宽/RTT/丢包。R18b2b/b3、V4/S03/Office、P05/P06批准仍未完成。

## 依据与验证方法

- [ipaddr.js 源码](https://github.com/whitequark/ipaddr.js/blob/main/lib/ipaddr.js)：分析地址族区分、解析/匹配和映射地址处理的实现思路；本项目独立实现，没有引入依赖或直接复制代码。工具不采用宽松 IPv4 数值格式或自动把映射地址视为普通接口。
- [NIST 二进制前缀](https://physics.nist.gov/cuu/Units/binary.html)：十进制与二进制单位区分。
- [RFC4291](https://www.rfc-editor.org/rfc/rfc4291) 与 [RFC5952](https://www.rfc-editor.org/rfc/rfc5952)：IPv6 地址表达和统一表示；此处用数值比较等价性，不输出自称规范化的文本格式。
- [RFC6164](https://www.rfc-editor.org/rfc/rfc6164)：/127 路由器间链路适用范围；[RFC8200](https://www.rfc-editor.org/rfc/rfc8200)：IPv6 链路 MTU。
- [RFC4632](https://www.rfc-editor.org/rfc/rfc4632) 与 [RFC3021](https://www.rfc-editor.org/rfc/rfc3021)：IPv4 CIDR 和 /31 点到点条件。

验证采用 Node net.isIP 语法对照、Python ipaddress 独立生成 512 组 IPv6 地址/前缀边界，以及既有 256 组 IPv4 独立位掩码对照。测试中 synthetic、20000 起端口、硬件值和支持声明全部为合成数据，不是 GoldenDB 生产推荐或项目事实。
