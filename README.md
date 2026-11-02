# Knowledge Atlas · 学科知识图谱

[在线体验（B站 Toy）](https://www.bilibili.com/toy/4MbZIiXhMcFndGNL/index.html)

线上 Toy 与本仓库的公开版可能存在内容差异；本仓库已移除部分课标原文，仅保留出处和结构。

基于知识图谱第十七版整理的公开源码。提供学科目录、局部知识图谱、自适应知识测评与学习路径。当前包含 9 个学科入口、3,308 个知识点、9,769 道题和 4,981 条先修关系。

本项目为非商业源码可用项目，含非商业限制，不宣称符合 OSI 开源定义。公开源码发布目录。

## 第十七版更新

新增生物、地理；将大学物理并入物理、大学化学并入化学、中医与中药合并为中医药，新增 83 条跨原数据块的先修关系。旧入口与旧进度兼容逻辑随最新版同步。保留原知识点、题目和教材来源标识。

公开版延续课标原文清理。原交付包的内部路径、截图和部分过程证据不进入公开仓库；V17-NOTES 中引用的完整验收档案及第十六版对照基线需使用原交付材料，不能将历史报告视为本次全部复跑。

## 本地运行

在本目录执行 `python3 -m http.server 8000 --bind 127.0.0.1`，打开 http://127.0.0.1:8000/ 。网页为静态站点，不需要 API 密钥或数据库。来源链接需要联网。浏览器保存本地学习进度，请勿提交个人测评导出文件。

## 源码结构

- `assets/` 为界面、学科配置与本地第三方库。
- `data/*.json` 为知识点、题目、关系和来源记录；`data/runtime/` 为浏览器运行载荷。
- `explore/`、`diagnose/` 为图谱及测评页面。
- `scripts/` 保留随 V17 提供的课程编写源文件、构建与检查程序；并非全部历史学科均有生成器。
- `validation/` 只保留被数据引用且未发现内部路径的审阅记录；AI 审阅不等于教师认证。
- `V17-NOTES.md` 保留原交付版内容范围与来源依据；`V15-NOTES.md` 为历史说明。
- `BIOGEO-NOTICE.md`、`SUBJECT-MERGE-NOTICE.md` 说明生物地理扩展和学科合并。

## 重建和检查

```sh
python3 scripts/check_delivery.py
node scripts/validate_subject_merge_frontend.cjs
python3 scripts/rebuild_probability.py
python3 scripts/build_runtime.py
node scripts/validate_probability.cjs --require-reviewed
python3 scripts/check_probability_calculations.py
```

统计推断额外检查需要 `requirements-probability-checks.txt` 中的 SciPy。部分旧交付检查依赖未随候选包公开的历史材料，不作为本目录默认验收命令。修改数据后必须重新验证，旧审阅结果不能证明新内容正确。

## 来源和许可

原作者为 [xiaoyang111222](https://github.com/xiaoyang111222)，原项目为 [cn-math-taxonomy](https://github.com/xiaoyang111222/cn-math-taxonomy)。本候选保留 Toy 适配、扩展内容和界面修改，并整理为独立源码目录；未暗示原作者、出版社或学校认可本版本。

原项目代码、原始数据与文档适用根目录 `LICENSE` 的 CC BY-NC 4.0。`data/math-university-*.json` 大学数学扩展适用 CC BY-NC-SA 4.0，详见 `UNIVERSITY-NOTICE.md`。第三方程序组件保留各自许可，详见 `THIRD_PARTY_NOTICES.md`。不得把整个项目改标 MIT，也不得将这些许可解释为教材全文或图表的再分发授权。

公开候选移除了 157 条标为原文或缺省原文的课标正文，保留条款编号、对应关系与来源链接。界面仍可浏览课标定位，但这些条款只显示查阅原文提示。其余自主整理条目未在本次重新逐条对照原书。

## 使用边界

AI 生成及整理内容尚未经教师全面审核，测评只供学习参考，不代表能力认证或完整考试范围。医学、中医、中药内容仅供课程学习，不用于疾病诊断、处方或自行用药，不替代专业医疗意见。第三方教材、考试大纲的名称和出处仅用于学习定位，相关权利归各权利人。

本地准备与检查结果、未完成的版权核验范围见 `PUBLICATION-REVIEW.md`。
