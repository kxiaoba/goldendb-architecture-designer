# 组件连接矩阵与端点绑定契约 v1

更新：2026-10-30，P02b2b2。外层生产评审材料增加 connectivity，schema=goldendb-component-network-v1。检查当前组件、接口和声明连接是否对应；不内置GoldenDB端口或自动生成全互连关系，不证明实际网络可达。

## 数据从哪里来

当前规划生成只读组件目录，包含id、type、tenantId、group、role、hostId、zone。type为CN/DN/GTM/MGR/OPS。固定入口保留工具组件ID；业务/反推入口用宿主机与角色的组合键标识当前规划实例。它们不是现网原生进程ID。组件移动、角色/租户/组或站点变化后，旧目录不能继续匹配。

tenantId=null表示集群/共享组件，不能视为天然拥有跨租户权限。CN/DN必须有租户身份。固定60台目录有212个实例、28个DN Group、18个专属GTM实例、6个抽象管理节点、2个运维CN。真实管理子组件拆分仍需后续模型。

## 字段

|字段|内容与约束|
|---|---|
|targetVersion|与design.targetVersion一致的准确版本/补丁|
|components|与当前规划生成的完整目录一致，不可用删行来隐藏未映射组件|
|endpoints：component|id、kind=component、componentId、interfaceId；接口必须属于组件实际宿主机；同组件/接口不重复登记|
|endpoints：external|id、kind=external、externalKind、networkId、address、tenantId；外部类型限application/load-balancer/backup/monitoring/operations；地址族与范围符合已声明网段|
|links|id、sourceEndpointId、targetEndpointId、flowId、securityEvidenceIds；方向、协议/目标端口/用途取自被引用的infrastructure.flows|
|review|coverage=unknown或declared-complete；evidenceIds引用network及versionSupport类别；conditions说明资料章节、范围、限制和未覆盖项|

每类列表最多5000项，证据引用每处最多30项；外层仍限制4MiB。缺字段不猜测，重复/非法/未建模字段明确诊断。数组顺序保留，JSON对象键序不影响比较。

模板预置当前组件与空interfaceId端点；没有厂商端口和连接默认值。外部端点是声明的应用/备份等边界，不额外创建生产服务器。VIP、NAT、同IP多业务、主机内代理等复杂归属不由普通端点自动证明。

## 填写顺序

1. 下载当前规划评审模板，补充物理拓扑、库存、网段、网卡及版本资料。
2. 把每个component端点绑定到正确宿主机上的接口。一个组件需要使用多张网卡时，可建立多个不同接口端点；它们不能被计成不同组件。
3. 按项目和目标版本资料增加外部端点。共享外部端点的tenantId填null，随后补充对应授权依据；不要随便填某租户以规避授权检查。
4. 先在infrastructure.flows填写有来源和目标版本的流量需求，再用links绑定实际源/目标端点。源/目的网段必须与端点接口一致，且两个网段purposes都包含流量用途。两个方向分别声明，不能以反向允许代替正向要求。
5. 跨租户连接，或涉及共享外部端点的访问，securityEvidenceIds须引用security类依据；同租户不等于真实权限已验证。证据失败/版本不符不能抵消。
6. review.conditions注明完整连接清单的章节、页码、角色/租户/Group适用条件和例外；未经核验用unknown。declared-complete只表示提供者声明已复核，不是工具认证。
7. 同步更新capabilities.network.configuration.connectivity，使版本支持结论绑定这份实际连接声明。仅复制绑定不等于重新评审；supported需要有相应依据。

旧文件缺connectivity仍可读取，但此阶段会显示未评估。导入不会修改数量、分片、主角色、资源公式或宿主机落位。

## 能检查什么

- 当前组件目录与导入目录一致，避免冒用旧角色/租户/Group/宿主机。
- 端点组件/接口/网段引用存在；接口属于当前组件宿主机；IPv4/IPv6地址基本适用性正确。
- 外部地址越界、网络/广播地址、重复别名、与规划主机共用IP的待核验归属。
- 连接引用有效端点和流量；源/目的方向匹配，协议/目标端口/用途与资料版本符合声明。
- 同向同协议端口用途重复连接、组件自连接冒充参与、跨租户缺授权引用。
- 每个当前组件有有效接口映射并参与至少一条有效声明连接；每条infrastructure.flows有具体连接引用；外部端点不能孤立挂在清单里。
- 在任意其他网段补填replication等用途，不能替代实际流量两端的用途声明。

错误阻断；漏项或无法确认的适用条件保持未评估。逐组件“已声明参与待实测”只说明参与关系，整个清单还可能有其他错误。外层风险/公式/复制/PNG、固定JSON/HTML/SVG与Excel使用同一结果；Excel增加逐组件对应状态。

## 不能从检查通过推断什么

“一条有效连接”不是完整通信清单。没有目标版本通信规范，就不能知道还漏了哪些特定CN→DN、CN→GTM、复制、管理、备份或故障切换关系。测试中的循环图只是合成反例，不是GoldenDB建议组网。

流量目标端口也不是已核验的进程监听端口。本批未检查同机实例监听冲突、绑定地址、端口占用、网络命名空间/容器、真实端口转发。4组件/台不等于4个进程一定能同时启动。

实际路由、跨VRF、交换机/链路冗余、端到端MTU、LB/VIP/NAT、动态端口、返回流/连接跟踪、设备规则顺序和真实账号权限仍待P02b3。网段级ACL允许也不等于实际防火墙已配置、目的进程已监听。canDeploy=false保持。

## 依据与验证

参考[Batfish转发分析设计](https://github.com/batfish/batfish/blob/master/docs/forwarding_analysis/README.md)对接口、地址所有权、路由和实际数据平面的区分，以及[差分检查文档](https://batfish.readthedocs.io/en/stable/notebooks/differentialQuestions.html)对前后行为核对的思路。当前模块独立实现，无第三方运行依赖，未调用Batfish，也未实现其转发分析能力。

专项包括1024组独立位掩码网段用途组合，以及错绑接口、漏组件/流量、跨租户缺证据、旧目录、端点别名和未知边界。真实厂商连接规范仍需由项目补充，不使用论坛示例端口作为生产默认。
