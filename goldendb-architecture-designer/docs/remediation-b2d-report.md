# B2d XML 与 Excel 字符边界修复记录

日期：2026-09-08。基于已发布 B2c `e593bf1`；本批本地保存，未提交、推送或更新 Pages。

## 修改范围

- `app.js`：当前模块租户名称、已启用的客户机型文本拦截 XML 1.0 非法字符。保留原始草稿并指出字符码，不静默删除字符；沿用现有失效保护，停止旧方案输出与下载。未启用机型或非当前模块草稿不阻塞当前规划。
- 导出底层再次校验 XML 文本；Excel 单元格保护字面 `_xHHHH_`，编码回车，避免名称被 Excel 当成转义序列或被 XML 换行归一化改变。合法中文、补充平面字符、制表符和换行保留。
- Excel 下载失败显示错误原因，重试时清除旧原因。
- 新增 `tests/remediation-b2-xml.mjs`、`tests/check-b2-xml-export.py`。
- 未修改 CN/DN/GTM 数量、性能公式、水位、资源池分配、机房落位或工作簿布局。

## 依据及边界

[W3C XML 1.0 字符规范](https://www.w3.org/TR/REC-xml/#charsets) 定义合法字符范围；孤立代理码、部分控制字符不能直接进入 XML。本工具选择明确拒绝这些文本，而不是改变客户名称。

[Microsoft ST_Xstring 说明](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/bd0aa042-434a-4ca7-b25f-4e1fd25a954d) 说明 `_xHHHH_`、首下划线保护及回车编码。单元格按该规则处理；普通 XML 元数据不套用单元格转义规则。

这些是文件格式规则，不是新的 GoldenDB 部署或性能规则。

## 测试结果

| 检查 | 结果 |
| --- | --- |
| 同一专项运行于修改前快照 | 15/40，复现非法字符和转义边界问题 |
| B2d 字符专项 | 40/40 |
| B1 输入、联动、行业场景及下载回归 | 74/74 |
| B2a 输出回归 | 40/40 |
| B2b 拓扑回归 | 25/25 |
| B2c 租户身份回归 | 29/29 |
| 当前批自动化检查合计 | 208/208，部分覆盖面重叠 |

业务、资源反推及字符边界三个实际下载的工作簿逐格检查共 2779 个单元格：差异 0、公式单元格 0、错误单元格 0、非法 XML 0，ZIP 完整。另有 B1 工作簿 1132 格、B2b 两工作簿 948/928 格的回归核验通过。

字符断言采用单次 ST_Xstring 解码，不递归解码；openpyxl 仅辅助检查工作簿结构，不能把其未解码的 inlineStr 值当作 Excel 客户端显示结果。已检查实际下载的组网 PNG，未见明显文字遮挡。语法与差异空白检查通过。

真实 Microsoft Excel 客户端读取尝试未完成，WPS 未验收，因此本批没有客户端视觉通过结论。自动解析通过不等于所有客户端显示无误。

## 存档与续接

相对于 `outputs/goldendb-remediation-20260906/`：

- 修改前：`checkpoints/09-before-b2d.tar.gz`。
- 修改后：`checkpoints/10-b2d-xml-verified.tar.gz`。
- 专项及实际下载：`b2d/evidence/xml/`；修改前复现：`b2d/evidence/before/`。
- 回归：`b2d/evidence/b1-replay/`、`output-replay/`、`topology-replay/`、`identity-replay/`。
- 续接状态：`b2d/checkpoint.json`；文件哈希：`b2d/evidence/source-hashes.txt`。

下一批从 B3 的 R01/R02 开始，先核对单 AZ/单租户安全能力、最终规格和增长语义，再修改及独立复算。R06/R08/R09/R12 以及 B4/B5 仍未关闭，完整清单见 `remediation-progress.md`。不要把这次字符回归通过当成整体生产架构已正确或已经过实库认证。
