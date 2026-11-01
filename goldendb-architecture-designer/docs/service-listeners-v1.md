# 服务监听与端口冲突契约 v1

更新：2026-10-30，P02b3a。字段位于生产评审材料 connectivity.services，schema 为 goldendb-service-listeners-v1。旧材料可导入，缺 services 时显示未评估，不推断默认端口。

## 填写与使用

先下载当前规划的评审模板，完成当前组件目录、库存接口与有向连接。依据目标版本部署文档、配置文件和进程清单填写监听；工具不提供 GoldenDB 端口默认值。

|字段|填写要求|
|---|---|
|listeners[].id|清单内唯一的服务监听ID；一个组件可有多条监听，不等于增加组件数量|
|componentId|当前 connectivity.components 的组件ID，宿主机从组件目录取得，不能另填主机规避共宿检查|
|protocol / port|tcp或udp；1–65535整数；不接受范围、动态端口或字符串数字|
|bindAddress|IPv4/IPv6具体地址，或0.0.0.0 / ::通配地址；具体host绑定必须属于组件宿主机的已登记接口|
|namespaceId|明确共用宿主机网络填写host；容器/其他命名空间填写实际标识，但本阶段仍未评估其隔离、接口归属与转发，不能凭不同名字放行|
|ipv6Only|IPv4填写not-applicable；IPv6填写实际 IPV6_V6ONLY 的true/false，未知填写null；不根据系统默认值推定进程实际设置|
|reusePolicy|exclusive表示明确要求独占；shared/unknown保留专项核验，不自动以SO_REUSEADDR/SO_REUSEPORT概念放行|
|source / targetVersion|配置文件/进程/资料章节及准确目标版本补丁；与design.targetVersion一致|
|bindings[]|id、linkId、listenerId；一个入向连接只绑定一个明确目标监听，同一监听可接受多条连接|
|review|coverage填unknown或declared-complete，source注明完整进程监听清单来源和适用范围；声明完整不是实际核验通过|

每类列表最多5000项，外层材料仍限制4MiB；冲突检查最多100000对，达到1000条诊断时停止后续冲突比较并明确未评估，不将未检查项当成通过。不得把模板里的空监听清单视作无需监听。

## 检查逻辑

1. 将声明按实际宿主机、命名空间、协议和端口归组；不同租户、不同组件类型不构成端口隔离。
2. 相同地址族的同地址或通配地址存在覆盖；IPv6地址按数值比较，压缩/大小写写法不能规避冲突。`::`在ipv6Only=false时还覆盖IPv4，未知时不假定独立。
3. 两条明确独占声明范围重叠则阻断。复用策略或双栈模式未知则未评估。不同主机、不同协议、不同端口不会仅因端口数值相同误报冲突。
4. 每个当前组件需补充有效监听声明。每条指向规划组件的入向连接需匹配目标组件、实际接口宿主机、地址覆盖、协议和端口。存在冲突/缺项的监听不能充当匹配证明。
5. 未被连接引用的额外监听仍参加冲突检查；不能删除binding来隐藏占用。监听配置位于connectivity中，因此地址/端口变化使原network版本能力配置绑定失效，须重新核验。
6. 同源结果进入固定JSON/HTML/SVG、业务/反推风险与公式摘要、Excel逐组件监听行。导入只评审，不改规划数量、分片、主角色或布局。

## 生产边界

本阶段验证的是已声明的host直接监听和入向对应关系，不证明进程实际启动、真实空闲端口、完整厂商服务清单、实际防火墙或网络可达。对外部服务的目标监听、容器发布端口、主机非数据库进程占用、VIP/浮动IP、NAT、bind-to-device、跨VRF、动态端口、特殊IP、端口复用和运行时配置仍须补材料及实测。一个监听对应多条连接属于正常复用，重复登记同一个监听应合并清单。

当前六个管理节点仍是抽象组件；真实管理子进程可能有多个监听，必须列全。不同租户CN/DN共宿允许，不意味着端口独立；每机≤4组件不等于一定能同时启动。canDeploy=false保持；实际目标版本支持、容量、故障/恢复和审批未因本批检查关闭。

## 方法来源与验证

参考 [Kubernetes NodePorts检查器](https://github.com/kubernetes/kubernetes/blob/master/pkg/scheduler/framework/plugins/nodeports/node_ports.go)按HostIP/Protocol/HostPort核对占用的思路，以及 [Linux内核IP文档](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)中bindv6only对IPv4映射能力的定义。本模块独立实现，没有引入Kubernetes依赖或声称覆盖其调度/网络模型；内核默认值不能代替目标进程实际选项。

测试包含324组独立地址/双栈组合、入向错绑、未知/冲突传播、实际下载对账和IPv4改IPv6后旧监听失效。合成端口仅供测试，不是GoldenDB推荐参数。完整结果见remediation-p02b3a-listeners.md。
