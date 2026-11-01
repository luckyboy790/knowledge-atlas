# 概率论与数理统计：作者源文件与可移植构建

本目录为数学学科新增第三门大学课程的原创内容源，课程 ID 为 `probability_statistics`，知识点 ID 为 `cnm_ps001`—`cnm_ps100`。共 100 个知识点、200 道原创四选一题、185 条学习依赖。每个知识点含两条具体掌握标准，以及一道基础题与一道标准题。题目解析不依赖选项字母。

## 版本与依据

主教材为浙江大学盛骤、谢式千、潘承毅编，黄炜、张立新、庞天晓、崔逸凡修订的《概率论与数理统计》第六版，高等教育出版社，ISBN 9787040666892；已核验出版社书目、2026 年 2 月出版与 2026 年 7 月印次以及公开目录。章节定位只声明公开父节目录关联，括号内主题是作者的编排标签，未编造教材页码或子节号。

[出版社主教材页面](https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=6967ccf2e119ac97292654e8)

2027 年数学考试大纲仅核验官方书目，未取得全文逐条比对。81 个节点标为数一/数三共用基础，19 个估计量评价、区间估计与检验节点标为数一方向。这些方向标签依据出版社备考目录制定，特别是数一/数三推断差异使用了旧年目录佐证，不能视为 2027 官方大纲正文确认。具体证据与限制保存在 `source_metadata.json`。

完整教材正文未逐页核验；内容与题目为原创整理，仍待教师审核。此目录既不替代教材，也不声称精确覆盖 2027 考试大纲所有条目。

## 随包文件

- `events.py`、`univariate.py`、`multivariate.py`、`moments.py`、`limits.py`、`sampling.py`、`estimation.py`、`testing.py`：八章作者内容模块。
- `common.py`：统一元数据、题目选项排列和导出结构。
- `source_metadata.json`：已核验来源及全文可用性边界。
- `existing_prerequisites.json`：只读 v14 基线中的 8 个既有先修节点及原文件哈希。
- `build.py`：生成五个 `math-probability-*.json` 文件；缺失任一章或来源元数据即停止。
- `author_validate.py`：结构、来源、诊断同步、答案分布、依赖 DAG 与可重建性检查。
- `author_calculations.py`：关键数值和分位数的独立公式复算，使用 Python 标准库。
- `revision_log.json`：按独立审阅意见修订的记录。
- `author-source-manifest.json`：随包作者源文件的 SHA-256 清单，清单中的文件名可作为复制白名单；清单自身另行随包。
- `final-freeze.json`：最终五份数据的计数、SHA-256 和语义复核锁定结果。
- `README.md`：本说明。

作者源码子包不包含 `snapshots/`、`__pycache__/`、临时目录、检查报告或重复的五份生成数据。正式项目的数据仅位于项目根目录的 `data/`；审阅与检查报告由主项目汇总保存。分章快照只在编写与独立审阅过程中使用，运行生成器和作者检查均不需要它们。

## 构建与检查

要求 Python 3.9 或更新版本，无第三方 Python 依赖。两个作者检查脚本都支持 `--data-dir` 和 `--report`：

- 未指定 `--data-dir` 时，若脚本同目录存在 `math-probability-questions.json`，优先使用同目录数据，兼容独立作者工作目录；否则使用脚本目录的 `../../data`，兼容 `scripts/curriculum-probability/` 安装位置。
- `--report` 可以指定任意可写的报告路径，缺失的父目录会自动创建；默认分别写入脚本目录的 `author-validation-report.json` 和 `author-calculation-report.json`。
- 两个检查脚本读取数据，不修改已生成的五份 JSON。结构检查会临时重建并逐字节比较，临时目录在检查后自动清理。

在正式项目根目录运行，两个脚本会自动找到 `data/`：

```bash
python scripts/curriculum-probability/author_validate.py --report validation/probability-author-structure.json
python scripts/curriculum-probability/author_calculations.py --report validation/probability-author-calculations.json
```

独立使用作者源码子包时，可先生成数据，再显式指定目录检查：

```bash
python build.py --out /tmp/probability-build
python author_validate.py --data-dir /tmp/probability-build --report /tmp/probability-validation.json
python author_calculations.py --data-dir /tmp/probability-build --report /tmp/probability-calculations.json
```

`build.py` 默认输出到作者源码目录，建议使用 `--out` 将生成数据写入指定数据目录。`author_validate.py` 默认使用脚本同目录的既有先修清单；若有完整 v14 基线，可加 `--baseline-data /absolute/path/to/baseline/data` 核对原节点与源文件哈希。

`author_calculations.py` 读取所选数据目录的最终题目，独立列式后同时核对选中的答案文本；它检查 89 项，包括用标准库数值积分核对 10 个已给分位数的累计概率。它是关键数值审计，不是所有题目语义正确性的形式证明。逐条概念、适用条件和选项唯一性另由独立 AI 内容审阅完成并记录在项目审阅文件中。

## 学习依赖约定

依赖方向由 `prerequisiteId` 指向 `topicId`，强度为 `hard` 或 `soft`，每条有具体理由。新增节点只向本课程先前节点或已存在的中学/高等数学节点引用，既有课程数据保持只读。旧课程跨学科基础多标为建议性软先修，避免把高等积分计算能力当成所有概念判断题的硬前置。

## 未纳入范围

本次没有展开直方图/箱线图、截尾估计、Bernoulli 参数区间、贝叶斯参数估计、拟合检验、列联表、一般多元统计、回归、Bootstrap、R、随机过程等扩展。第八章容量选择也未作为独立主题纳入；大数定律部分的样本量题仅用于理解切比雪夫界。
