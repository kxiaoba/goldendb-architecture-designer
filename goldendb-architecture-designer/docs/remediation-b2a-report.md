# B2a 局部修复与续接报告

日期：2026-09-08。发布基线：60a3187。本检查点仅覆盖第二批的一部分，不表示第二批或整体架构审核完成。

## 已修改

以下 HTML 文本出口转义租户名、机型及包含这些字段的提示，原始字符串仍保存在模型中：

- `renderNodePlan`：推荐表的键和值。
- `renderRisks`：业务、资源反推两个分支的风险文字。
- `renderReversePlan`、`renderBusinessServerPlan`：建议卡文字；客户机型、CPU、网络、系统盘说明。
- `renderReductionPlan`：红线和缩减建议列表。
- `renderBusinessPhysicalServerRow`、`renderServerPlanRow`：租户服务器池标签、组件清单和机型描述。

复用 `escapeAttr` 在输出边界处理，避免在原始模型存 HTML 实体。不修改 CN/DN/GTM 计算、分配、水位或 Excel 数据模型。已有测试增加可选证据目录，以免重放时覆盖历史证据。

## 验证结果

| 验证 | 结果 | 边界 |
| --- | --- | --- |
| 32 个模型完整 JSON 对比 | 全部一致 | 两模块、POC/生产、4 种机房模式、2/4 租户；一致不意味着原有规划缺陷消失 |
| 7 个输出区域特殊字符断言 | 全部通过 | 模型副本中的惰性 `<em>` 测试文本原样显示，没有生成对应元素；不代表整页安全 |
| 浏览器异常 | 0 | 本脚本所覆盖路径 |
| B1 回归 | 74/74 | 包括 4 个行业场景、参数异常、重置、下载和 3 个页面宽度 |
| 实际 Excel 逐格核对 | 1095/1095 一致 | 6 sheet、ZIP 完整，无错误单元格；仍是正常场景文件 |
| 源码检查 | 通过 | JS 语法与 diff 空白检查 |

测试脚本第一次执行因测试文件缺少函数结束括号而失败，修正脚本后重跑通过。未因此修改产品逻辑。截图仅用于局部文字展示核对，不能替代全图遮挡验收。

## 下一检查点

1. R10 尚未动代码。为业务/反推租户建立稳定 ID，创建时分配，改名和删除其他租户时保留；默认重置的行为单独测试。
2. 当前 `getRoleResourceDemand` 通过名字查租户，`placeTenantCnRolesByPool` / `placeDnRolesByPool` / `getGtmRolePlacements` 创建含名字的角色；`getTenantResourcePoolKey` 依赖序号。必须一起改为 ID 关联，不能只修其中一处。
3. 更新 Group、同租户 CN 反亲和、跨租户隔离、资源池审计、物理落位、GTM 逐组审计；保留界面“租户-DN-G-M/S”的显示名称。
4. R11 尚待 `renderPptNetworkPlan`、`renderPptLogicalServer`、`renderPptRolePill`、`renderPhysicalServer`、组件映射、关系图、HA 指南及遗留拓扑函数。仅转义客户文本，不转义子渲染函数返回的受控 HTML。
5. 导出角色名称必须从稳定 ID 映射回显示名；测试重名不同规格、改名、删除中间/首租户、GTM 副本、原始特殊字符的 Excel/XML 和 PNG。不能简单刷新旧快照掩盖分配漂移。
6. 延续全部 R01–R18 计划，B3/B4 的已知容量与落位缺陷仍保持待修状态。

## 存档

归档根目录：`../../outputs/goldendb-remediation-20260906/`。

- 基线：`checkpoints/03-before-b2.tar.gz`。
- 本检查点：`checkpoints/04-b2a-output-verified.tar.gz`。
- 验证：`b2/evidence/b2a-results.json`、`b2/evidence/b1-replay/`。
- 局部截图：`b2/evidence/b2a-business-literal.png`、`b2a-reverse-literal.png` 及服务器局部图片。
- 源文件哈希：`b2/evidence/b2a-source-hashes.txt`。

未提交 Git、未推送、未更新 Pages。线上仍为已发布 B1。此局部检查点不是生产部署认证。
