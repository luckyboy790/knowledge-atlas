# K12-KGraph 四科图谱

作者为 Hao Liang、Qihan Lin、Mingrui Chen、Hengyi Feng、Zhaoyang Han、Xiaochen Ma、Zhen Hao Wong、Meiyi Qiang、Linzhuang Sun 和 Wentao Zhang。数据来自 [作者的数据集](https://huggingface.co/datasets/lhpku20010120/K12-KGraph/tree/d8522c2b336ee435aa51daa39ca0dd736f56fa53/K12-KGraph/subject_specific_KG)。人工核验过程见[论文附录](https://arxiv.org/html/2605.09635v1)。本目录的图谱数据及其改编按 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 提供。学校教材权利归各自权利人。

本站将发布版的学习节点及其教材位置、直接先修、分类、实验验证和相关关系转换为可离线加载的 48 个册次文件。知识点详情显示原始编号。未具名称的 3 个数学占位节点不参与教学。化学的 4 条循环边仅供查看，指向习题的 7 条边不参与知识点诊断。教材顺序和一般关联均不用于推断先修。生成的回忆自评题及本站历史题库独立于原图的人工核验范围。

原数据哈希、分科数量、排除节点与文件清单见 [index.json](index.json)。站内旧编号仅在学科与名称唯一、年级匹配、上下册兼容时沿用。其他旧编号不重定向到新主题。大学衔接只保留当前图谱两端可定位的边。

在项目根目录运行：

```sh
python3 scripts/import_k12.py
python3 scripts/build_runtime.py
node scripts/check_k12.cjs
```

已有固定版本的四个原始 JSON 文件时，可给导入脚本指定 `--from-dir 路径`。导入后完整解压网站并打开根目录的 `index.html` 可离线使用。
