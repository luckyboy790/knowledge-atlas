# Knowledge Atlas · 学科知识图谱

基于知识图谱第十五版整理的公开源码候选。提供学科目录、局部知识图谱、自适应知识测评与学习路径。当前包含 10 个学科、2,950 个知识点、9,053 道题和 4,369 条先修关系。

本项目为非商业源码可用项目，含非商业限制，不宣称符合 OSI 开源定义。公开源码发布目录。

## 本地运行

在本目录执行 `python3 -m http.server 8000 --bind 127.0.0.1`，打开 http://127.0.0.1:8000/ 。网页为静态站点，不需要 API 密钥或数据库。来源链接需要联网。浏览器保存本地学习进度，请勿提交个人测评导出文件。

## 源码结构

- `assets/` 为界面、学科配置与本地第三方库。
- `data/*.json` 为知识点、题目、关系和来源记录；`data/runtime/` 为浏览器运行载荷。
- `explore/`、`diagnose/` 为图谱及测评页面。
- `scripts/` 保留随 V15 提供的课程编写源文件、构建与检查程序；并非全部历史学科均有生成器。
- `validation/` 只保留被数据引用且未发现内部路径的审阅记录；AI 审阅不等于教师认证。
- `V15-NOTES.md` 保留本版内容范围与来源依据。

## 重建和检查

```sh
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
