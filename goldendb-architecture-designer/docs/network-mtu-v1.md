# 逐业务连接端到端 MTU 契约 v1

2026-11-01，P02b3b2b1b。只核对已声明拓扑上、明确无分片且包长不发生转换的双向 IP 总包长目标。不会因静态检查通过而批准生产。

## 输入与使用

在现有 connectivity.routing 中新增 packetTargets；模板由工具导出，旧资料缺少目标时显示未评估。示例仅说明字段，不是 GoldenDB 包长建议：

```json
{
  "schema": "goldendb-network-mtu-v1",
  "targetVersion": "填写真实目标版本",
  "targets": [{
    "id": "MTU-L1", "linkId": "L1",
    "forward": {"ipPacketBytes": 1500, "policy": "no-fragment", "transformation": "none", "source": "填写需求或实测资料编号"},
    "reverse": {"ipPacketBytes": 1500, "policy": "no-fragment", "transformation": "none", "source": "填写返回方向资料编号"}
  }],
  "review": {"coverage": "declared-complete", "source": "填写覆盖范围复核资料"}
}
```

- 每条连接一项目标，正向和返回独立；引用实际连接 ID，禁止重复、孤立目标或导入手工路径/通过结果。
- ipPacketBytes 为完整 IP 包长，含 IP 头、扩展头、传输层头及负载；不是 TCP MSS、以太网帧长或应用负载。未知填 null。通用整数范围20..65535，IPv6不得小于40；不支持巨型 IPv6 包。这里只核对长度上界，不验证是否构成合法 TCP/UDP 报文；协议所需头部必须由需求来源包含。
- policy 仅 no-fragment / unknown；transformation 仅 none / unknown。隧道、转换、压缩等未建模时须 unknown，不能擅自假设包长不变。
- 正反向 source 与 review.source 都是可追溯材料引用，并非工具已读取认证的证据。覆盖完整是声明，不等于实际连接清单完整。

## 计算和判断

1. 主机路由计算确定 local/direct/via。via 使用逐跳检查器实际经过的邻接 ID；direct 使用邻接检查器的方向记录。用户不能手工替换计算路径。
2. 对每个使用的邻接，读取物理端口/线缆/交换转发的已知有效 IP MTU 最小值，以及 infrastructure.networks.mtu 声明的配置约束；两者共同取最小。物理能力9000不能证明配置1500的网络可传9000。
3. 每方向包长与该方向路径比较，允许往返路径和目标不同。明确无分片且无转换时，已知瓶颈小于目标即阻断该设计要求；不会被其他段缺项掩盖。
4. 路径不完整、来源缺失、转换未知、预算耗尽或资料异常保留未评估，不能用局部最小值宣称全路径满足。物理资料整体存在错误/未知时，单方向行也保守保留未评估；总门禁保留上游错误。
5. 经有效路由计算为 local 的连接显示“本机通信，不适用网络MTU”，不检查外部路径。它不证明回环接口、容器、监听或应用可达；目标材料本身的格式错误仍保留。

页面和 JSON/HTML/SVG/Excel 使用同一结果。行中包含方向、包长、已知最小MTU、实际邻接、分段结果与瓶颈。声明满足仅为“待实测”，canDeploy始终false。

## 预算与边界

连接/目标各最多5000项；计算方向记录最多10000项；每方向最多128邻接；累计最多100000次邻接汇总。输入清单超限是格式错误；计算预算不足为未评估，不静默通过。

不执行 PMTUD、ICMP 可达验证、TCP MSS 协商/钳制或动态分片；不证明所有小包/TCP业务不通。大包目标不满足与服务完全不可达是不同结论。故障切换后的路径可能改变，仍须单独评估。网络 MTU 使用已声明配置约束，接口例外、封装开销须另行建模或由有效 IP MTU 材料准确表达，不能直接填交换机整帧规格。

## 依据与接续

- [RFC 8201](https://www.rfc-editor.org/rfc/rfc8201.html)：路径 MTU 与沿途链路限制及实际发现机制。
- [RFC 8200](https://www.rfc-editor.org/rfc/rfc8200.html)：IPv6基本头、最小链路MTU与分片边界；最小链路MTU1280不代表每个IPv6包都至少1280字节。
- [RFC 8900](https://www.rfc-editor.org/rfc/rfc8900.html)：分片的可靠性与部署问题。
- [Batfish 符号引擎设计](https://github.com/batfish/batfish/blob/master/docs/symbolic_engine/README.md)：借鉴独立正向/返回路径和变换建模的边界。本工具未复制其实现，也不是完整网络符号分析器。

下一批 b3b2b1c：备选路径选择、共享故障域、带宽/超卖/故障容量和跨目录资产别名。随后 b2 转换/状态规则、b3故障和实测闭环。全部遗留以 remediation-backlog.md 最新入口为准。


## 2026-11-01 单活动选择与备选路径补充（P02b3b2b1c1）

新增physical.selections，详见 [network-selection-v1.md](network-selection-v1.md)。同邻接多路径须显式选择，当前与候选检查独立展示；当前故障不自动回退，候选故障不参与当前路径MTU。先检查全部当前路径，再使用剩余预算检查候选。非法库存仍属整体材料错误；旧单路径资料兼容。选择变化使网络能力绑定失效，实际导出同步。只完成声明快照检查，控制平面、自动切换及物理独立性未验证。下一步c2a共享故障域/跨目录资产，再c2b带宽/故障容量；其余原计划保留。
