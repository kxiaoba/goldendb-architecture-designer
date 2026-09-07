# B2b 拓扑文字修复与续接

日期：2026-09-08。基线为工作树中已验收的 B2a；未覆盖之前修改。

## 影响范围

本次修改 `app.js` 的展示出口，不改 CN/DN/GTM 性能公式、租户规格、服务器分配、水位阈值或部署规则：

1. 组网规划中的业务入口、租户边界、CN/DN/GTM 标签及提示属性按文字输出。
2. 组网规划-服务器中的租户池、机型、角色详情、CN 租户/DN Group/GTM Group 关联按文字输出。
3. 租户资源卡、组件关系链、服务器关系图、HA 指南和旧拓扑函数同步处理客户名称。
4. 名称中含 `-Master` 时不再误改名称；仅转换组件末尾 `-Master` 为 `-M`。Excel 使用相同语义。
5. 主从摘要仅检查角色末尾，修复名称中含 Master/Slave 导致的误计。该修复只影响摘要文字，不改物理落位。

复用 `escapeAttr`，不把名称预编码进模型，也不把子渲染函数产生的 HTML 当成普通文字转义。没有新增依赖、修改 CSS 或更改参数默认值。

## 测试

| 检查 | 结果 |
| --- | --- |
| 新专项浏览器测试 | 25/25 |
| B1 回归（含 36 个正常/行业完整模型） | 74/74 |
| 含特殊字符的业务 Excel | 920 单元格逐格一致 |
| 含特殊字符的资源反推 Excel | 896 单元格逐格一致 |
| 两模块各两类 PNG | 实际下载成功，检查了图片内容 |
| JS 语法和 diff 空白检查 | 通过 |

专项测试包括尖括号、双引号、单引号、&、以等号开头的名称、长名称，以及名称含 Master/Slave。整页没有生成测试用的 HTML 元素；角色提示属性与原始字符串一致。客户机型在业务模式下通过真实参数进入渲染链。长名称通过表单修改，验证联动以及 390/875/1600 宽度下角色文字不横向溢出。

Excel 使用当前页面实际下载文件作只读核验，没有用外部工具重建文件。公式单元格 0，错误单元格 0，ZIP 完整。未做 Excel/WPS 原生客户端渲染、非法 XML 控制字符和所有 OOXML 特殊转义验收，因此 R11 不整体关闭。

图片检查中发现 Master 名称误计主从数量，修正并补断言后重新执行专项及 74 项回归。最终证据为最后一次重跑版本。图片验证是所选场景的检查，不保证任意规模都无截断。

## 下一次从这里继续

### R10：稳定身份，尚未实施

- 当前角色字符串、资源需求查找和资源池仍依赖租户名/序号；重名、改名、删除租户的问题仍存在。
- 从 `cloneTenantSpecs`、`createBusinessTenantSpec`、`createReverseTenantSpec` 建立稳定 ID，再贯穿两个 `build*TenantPlans`。
- 一起更新 `getRoleResourceDemand`、`placeTenantCnRolesByPool`、`placeDnRolesByPool`、`getGtmRolePlacements`、`getTenantResourcePoolKey`、隔离/反亲和/落位审计。不要只替换标签而遗漏关联键。
- 展示与 Excel 应从稳定 ID 映射回客户名字，保留“租户-DN-G-M/S”格式；HTML 在最终出口转义，XML 独立转义。
- 必测：四租户、同名不同规格、重命名、删除中间/首租户、新增后 ID 不复用、GTM 逐组副本不串联、两模块隔离、复制与导出。

### R11：仍待补的边界

- `xmlEscape` 尚无非法控制字符和孤立代理码元处理；不能宣称任何文本都能导出。
- 真实 Excel 对 `_xNNNN_` 字面名称的解释尚未验收，需在允许的输入契约和 OOXML 输出中统一处理，不静默改名。
- R10 将改变角色数据模型，完成后必须重跑本批文字/下载用例及普通模型回归。

全部 R01–R18 状态仍在 `remediation-progress.md`，B3–B5 未开始，勿因本批回归通过而关闭旧架构缺陷。

## 保存位置

归档根目录：`../../outputs/goldendb-remediation-20260906/`。

- 修改前：`checkpoints/05-before-b2b.tar.gz`。
- 修改后：`checkpoints/06-b2b-topology-verified.tar.gz`。
- 专项证据：`b2b/evidence/b2b-results.json`、`b2b-excel-validation.json` 及 PNG/XLSX。
- 原功能重放：`b2b/evidence/b1-replay/`，不覆盖 B1/B2a 历史证据。
- 源文件哈希：`b2b/evidence/source-hashes.txt`。
- 测试：`tests/remediation-b2-topology.mjs`、`tests/check-b2-export.py`。

本次未提交、推送或更新 Pages。下次先读当前 diff 和本报告，不从旧快照覆盖工作树。
