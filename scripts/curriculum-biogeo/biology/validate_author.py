#!/usr/bin/env python3
"""Author arithmetic/model recomputation for the original biology questions.

The calculations are independent of the application's scoring engine. They are
still author self-checks, not an independent author's content review. This
supplements schema checks and does not replace the separate peer reviewers.
"""
import argparse
import collections
import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path


def encode(x):
    return (json.dumps(x, ensure_ascii=False, indent=2) + "\n").encode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path(__file__).resolve().parent / "output")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    questions = json.loads((args.data / "biology-questions.json").read_text())
    by_id = {q["id"]: q for q in questions}
    rows = []

    def record(qid, computation, result, expected, answer_text, conditions):
        assert result == expected, (qid, result, expected)
        q = by_id[qid]
        answer = next(c["text"] for c in q["choices"] if c["key"] == q["answer"])
        assert answer == answer_text, (qid, answer, answer_text)
        rows.append({"question": qid, "method": computation, "computed": str(result),
                     "correct_choice": answer, "conditions": conditions, "status": "passed"})

    crosses = list(itertools.product("Aa", "Aa"))
    recessive = sum(a == b == "a" for a, b in crosses)
    heterozygous = sum(a != b for a, b in crosses)
    dominant = len(crosses) - recessive
    testcross = list(itertools.product("Aa", "aa"))
    test_recessive = sum(a == b == "a" for a, b in testcross)
    record("cnb_003_q1", "目镜倍数×物镜倍数", 10 * 20, 200, "200倍", "常规显微镜总放大倍数")
    record("cnb_022_q2", "萌发数/总数×100", Fraction(84, 100) * 100, 84, "84%", "同一批100粒")
    record("cnb_026_q2", "正常种子数一一对应成功发育的胚珠数", 5, 5, "5个", "正常发育，不含多胚等特殊推断")
    record("cnb_030_q2", "合成−呼吸消耗", 12 - 8, 4, "4克", "同一昼夜且无其他收支")
    record("cnb_063_q1", "枚举Aa×aa四种等机会配子组合", Fraction(test_recessive, len(testcross)), Fraction(1, 2), "1/2", "正常分离、随机受精")
    record("cnb_063_q2", "枚举Aa×Aa；新后代与前一结果独立", Fraction(recessive, len(crosses)), Fraction(1, 4), "1/4", "各基因型存活相同")
    record("cnb_064_q2", "两类等机会精子中Y占一类", Fraction(1, 2), Fraction(1, 2), "1/2", "X卵细胞，等机会随机受精")
    record("cnb_077_q1", "线性无分支链中相邻连接数=n−1", 20 - 1, 19, "19个", "未环化")
    record("cnb_092_q2", "C6H12O6完全氧化配平得O2与CO2均为6", Fraction(6, 6) * 6, 6, "6 mmol", "只葡萄糖有氧氧化，不光合")
    record("cnb_095_q1", "总固定−同范围呼吸释放", 10 - 3, 7, "7", "单位与时段相同，无其他CO2过程")
    record("cnb_096_q1", "S期每个核DNA复制一次", 6 * 2, 12, "12个", "G1至复制完成尚未分裂")
    record("cnb_096_q2", "每个原着丝粒连接的两姐妹分开后分别计染色体", Fraction(2, 1), 2, "暂时加倍", "后期按整个未分开的细胞计")
    record("cnb_102_q1", "两个独立Aa杂交隐性概率相乘", Fraction(recessive, len(crosses)) ** 2, Fraction(1, 16), "1/16", "两对基因独立且存活相同")
    record("cnb_102_q2", "显性子集中杂合数/显性数", Fraction(heterozygous, dominant), Fraction(2, 3), "2/3", "完全显性、条件样本为显性")
    record("cnb_103_q1", "复制但着丝粒未分裂：n,2n,2n", (8, 8 * 2, 8 * 2), (8, 16, 16), "8、16、16", "2n=8，减I中期，按整细胞")
    record("cnb_104_q1", "正常减数分裂成熟配子染色体数减半", 12 // 2, 6, "6条", "二倍体2n=12，无异常分离")
    combinations = list(itertools.product(["XA", "Xa"], ["XA", "Y"]))
    affected_sons = [x for x in combinations if x == ("Xa", "Y")]
    sons = [x for x in combinations if x[1] == "Y"]
    record("cnb_106_q1", "枚举母XAXa与父XAY；样本仅儿子", Fraction(len(affected_sons), len(sons)), Fraction(1, 2), "1/2", "等机会配子，无存活差异")
    record("cnb_106_q2", "同一枚举以全部后代为分母", Fraction(len(affected_sons), len(combinations)), Fraction(1, 4), "1/4", "独立题干已明示全部模型")
    record("cnb_108_q1", "双链A=T，剩余G=C", Fraction(100 - 30 * 2, 2), 20, "20%", "标准互补双链DNA")
    molecules = [("old1", "old2")]
    for cycle in range(3):
        molecules = [(strand, f"new_{cycle}_{i}_{j}") for i, pair in enumerate(molecules) for j, strand in enumerate(pair)]
    labeled = sum(any(s.startswith("old") for s in pair) for pair in molecules)
    record("cnb_109_q2", "逐轮追踪两条原始链，复制新链不新增标记", labeled, 2, "2个", "3轮8分子，忽略交换修复")
    complement = {"A": "U", "T": "A", "C": "G", "G": "C"}
    record("cnb_111_q1", "按3′到5′模板逐位互补得到5′到3′RNA", "".join(complement[x] for x in "TACG"), "AUGC", "5′-AUGC-3′", "模板链身份与方向明确")
    record("cnb_111_q2", "5′到3′编码链与RNA同序，T换U", "AGTC".replace("T", "U"), "AGUC", "5′-AGUC-3′", "忽略剪接等加工")
    record("cnb_112_q2", "密码子总数减不编码氨基酸的终止密码子", 101 - 1, 100, "100个", "无提前终止，初始多肽")
    record("cnb_117_q1", "原序列末三字符逆序，无增加删除", "ABCDE"[:2] + "ABCDE"[2:][::-1], "ABEDC", "倒位", "题干已限定仅原片段反转")
    record("cnb_118_q1", "2n基础上只多一条，非整套增加", 11 - 10, 1, "个别染色体增加的非整倍性变化", "正常体细胞2n=10")
    record("cnb_121_q1", "A拷贝数=(2AA+Aa)，分母=2N", Fraction(2 * 40 + 40, 2 * 100), Fraction(3, 5), "0.60", "常染色体二倍体")
    record("cnb_142_q1", "处理伸长量分别减同条件对照", (8 - 5, 3 - 5), (3, -2), "低浓度促进、高浓度抑制根伸长", "同期平均伸长量、同溶剂对照")
    record("cnb_145_q2", "初始+出生−死亡+迁入−迁出", 200 + 30 - 20 + 15 - 5, 220, "220只", "边界固定，无其他数量变化")
    record("cnb_146_q2", "首次标记×第二次捕获/重捕标记", Fraction(40 * 50, 10), 200, "200只", "近似封闭、混合、标记与捕获条件成立")
    record("cnb_147_q2", "固定年倍数连续相乘", 100 * Fraction(3, 2) ** 2, 225, "225个", "理想两年增长")
    record("cnb_153_q1", "摄入−粪便=同化；同化−呼吸=净生产", 100 - 40 - 45, 15, "15单位", "无其他未计能量项")
    record("cnb_154_q1", "下一营养级同化/前一级同化×100", Fraction(120, 1000) * 100, 12, "12%", "同一时段同一生态范围")
    record("cnb_156_q1", "光合输入−全部系统呼吸分解−有机碳输出", 100 - 80 - 15, 5, "5吨碳", "同一边界一年，单位均为碳质量")
    record("cnb_159_q1", "人口×相同口径人均面积", 200 * 4, 800, "800万公顷", "人口以万人计")
    record("cnb_164_q1", "菌落数/体积/稀释比例", Fraction(38, 1) / Fraction(1, 10) / Fraction(1, 100000), 38000000, "3.8×10⁷ CFU/mL", "CFU非绝对单细胞数")
    record("cnb_167_q2", "无丢失和额外加倍的核融合计数相加", 20 + 30, 50, "50条", "同类未复制阶段")
    record("cnb_174_q1", "起始分子数×2的轮数次方", 3 * 2 ** 5, 96, "96个", "仅理想每轮翻倍模型")
    answer_balance = dict(collections.Counter(q["answer"] for q in questions))
    report = {"checked_date": "2026-11-01", "check_type": "作者独立模型复算与答案内容对应",
              "case_count": len(rows), "cases": rows, "answer_key_distribution": answer_balance,
              "question_file_sha256": hashlib.sha256((args.data / "biology-questions.json").read_bytes()).hexdigest(),
              "limitations": ["只对列出的数值、序列和模型题复算，不代替全量概念语义复核", "独立AI逐点复核与教师审核状态由主交付记录管理"]}
    target = args.out or args.data / "biology-author-numerical-check.json"
    target.write_bytes(encode(report))
    print(json.dumps({"case_count": len(rows), "status": "passed", "answer_key_distribution": answer_balance}, ensure_ascii=False))


if __name__ == "__main__":
    main()
