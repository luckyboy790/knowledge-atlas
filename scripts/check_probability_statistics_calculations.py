#!/usr/bin/env python3
"""Independent review calculations for probability/statistics chapters 7 and 8.

Usage after copying to a project's scripts/ directory:
  python scripts/check_probability_statistics_calculations.py
  python scripts/check_probability_statistics_calculations.py --data /path/to/data --output /path/to/report.json

Python 3 and SciPy are required. Models and candidate values below were derived
independently from the question statements, not imported from curriculum builders.
The immutable semantic hashes bind this review to the text actually read. Only
top-level review_status and review_record are excluded from those hashes.
"""

import argparse
import hashlib
import json
import math
from fractions import Fraction as R
from pathlib import Path

import scipy
from scipy.stats import chi2, f, norm, t


REVIEWED_SEMANTIC_HASHES = {'cnm_ps075': '3964c692ef3e1849eaac348479412591e209e003a60abdb2fcfe9d70c1e8055a', 'cnm_ps075_q1': '5ba6ae26c5bbdc734651b389abf37245fe22c47cb1238878161faac784b4d5f4', 'cnm_ps075_q2': 'a6d58f2a7728b887b720ba93c9415ae35d89868dd620da9e0e2eebd8d64ea488', 'cnm_ps076': '98b4c74625bab3ac5a0e18a16e1c212dba35bce8506398fe7707305c99d50301', 'cnm_ps076_q1': '1f3a96374ff6a4f8da1dd9f68b34fd5b12c59301b738b9a222b3a26006ac9a87', 'cnm_ps076_q2': '3d150e713febf9894cbf4985ae819c10621111b7f292f82b099ef06393c6cbce', 'cnm_ps077': '011e1b55d7a3969b807bc8dad603638d9a4e6cc4b2eb4c857fba1198cd74cf18', 'cnm_ps077_q1': 'f9f0bc2df1c94d2c299738dd3a44544d1c950a19f473e6d3d7a9808b342f2b01', 'cnm_ps077_q2': '943c03d36f43026053146174f15cc3b0c9ceb679794444221626093c0cb49902', 'cnm_ps078': '5fc862f027ece939c08e1a80cf87ad4041fd644836a57ab1ec44331bb3daa009', 'cnm_ps078_q1': 'b464748622040813e595a0e62b637e0b054a7f8efeeec7292082cf0ade26b538', 'cnm_ps078_q2': '4fc4cbde3cde81feeae118852f0c6e9ae775a55a4fa4407d191cfa7c8335412c', 'cnm_ps079': '6fabbe27dacecd82134210003f38cacbf7114c5814858914facde0e08133a580', 'cnm_ps079_q1': '67d0a2da5fe3f76bf1ef522dbd75de7f99576391938c79c0147ff9eebe31fac2', 'cnm_ps079_q2': 'b3e065168d75fcc54e8d39c05e569331055d641668d77dc8d439e1fb57bba1a2', 'cnm_ps080': 'e24e64482c1e7131ad59136db5480330d4b84937643710a23dcf406fc833040e', 'cnm_ps080_q1': '01077a9d0aa8544d091a1fb222b547cd60ae25c9073962626cd7dd8afa22d11a', 'cnm_ps080_q2': '82dc68f5dfaf8fa9bd84804ffc4cc7b2d0d559433c8dd43e118dc32e572f2228', 'cnm_ps081': '93243bbda89a22340dee72a5f8cb2f37dcd814dcf830e790f10c0e0936caee77', 'cnm_ps081_q1': 'd08b246929e8782d18c08d6846e7fbc558963ecfc87965906e47028ad03240da', 'cnm_ps081_q2': '3517ecfaf8c5fa76860787c62d4f8f303f9d5e414e8f1ebf188d31a6cd3987b3', 'cnm_ps082': 'd6b2e552a445350c4d26c04553d350e6dfd5676d5cdb05c0813e1011ad800dae', 'cnm_ps082_q1': '4c8a4348b490afc5e1a3c09f150d97d4fcd87cddf20282e1077704bc454e87df', 'cnm_ps082_q2': 'c8ccdde3684c28a483998ad9e68dd482bec205a2d70512c04293bf6cef391392', 'cnm_ps083': '2122343ed55c2a6c53d644fac5a1c06a6e18c28ce4051e8910f440f316929531', 'cnm_ps083_q1': 'd65e3f67aa689850bef587dc805141e8d016351707259c2b24447d23aceaa7c0', 'cnm_ps083_q2': 'a7f09df672553ecad17406fd877079a64427218b38f98d3aeda4831cc8fef4de', 'cnm_ps084': 'ec7f0c62c71f78ec58b76c08a86e58177ed7f1e9ae938bd94ba3d7cfc7b97b1d', 'cnm_ps084_q1': '210a781dc8ae83dd364925da6ecc6ca3c7b6131e660c74f500d77095c58876cc', 'cnm_ps084_q2': 'c3ce2107329f1099f55be4ab2a66533e0c4c9e845a2053de43761edb5b37d8cb', 'cnm_ps085': 'a826c303a66dd5b1546cfa54e541559702ca3f9d401e19cbf59ef6c23ba4c113', 'cnm_ps085_q1': '97b8d3f6f7e238dde88371f936bfde2a944b9df2ba6f2896e92722b2ed0f6d41', 'cnm_ps085_q2': '58e0e9df6e5f14c361863321cd53d17b1a0467c77f2b4b2e10fa93d68da638ce', 'cnm_ps086': '823e82a8f03b9abaaa9704d118a9aa64f9b1061dcebb968359e0ae131b057af7', 'cnm_ps086_q1': '0ac6ccb78919ca592f1ea0ac732e7016225322ab24a00d81bb9937b2a71c7e9f', 'cnm_ps086_q2': '3e7b9879abcd05e506e12a94584c4cbfbace028ad909db50b5b024500a4f5e39', 'cnm_ps087': 'e191cc0b05cc7a881b0b011966b7f623fd41c76bb310ddc96c83a0a5894b897e', 'cnm_ps087_q1': 'a9a502423d8a31784579da61af9c87095f19e8eb2cb28611747dd3f76077881c', 'cnm_ps087_q2': '5734c3ddcf0f3f33353e39ee24c267fd6d80fe084fa14778b63da6051c72e7fd', 'cnm_ps088': '4802c85158fb3e65d9ea3c0a1b3f173a8552edd288a8b4dcef2c94acdd266026', 'cnm_ps088_q1': '3e0b8b1eb3e93be7bc9402ceb3efbe40148c514fc491476d0f36f14967212d6c', 'cnm_ps088_q2': '8cc64daeebda86a819349c16b7829b930638b927398da6608bbb29992fd5c8fd', 'cnm_ps089': 'c2fdf353fe86f8971d22da885bcaa53e1fa4f0c7deaee619f28f4ae9d623003f', 'cnm_ps089_q1': 'e8de0de3e47c4adbc160068e1e19d9147613299316285ccccccb18dbdfe107bb', 'cnm_ps089_q2': 'a14c56e1ec4d17991df5bd61d7bde7847aa4943fe52d7cd8d9753690f3881e2c', 'cnm_ps090': 'af9a75e8605ae1599c9585ca107bf31ede2096f99989fd345819634dda8141ff', 'cnm_ps090_q1': '61e926ae5555a9fa25fc35f23a20aac9c8a43db202a1993de2334c736584879e', 'cnm_ps090_q2': '1e8f3a13fab09ae37859cddb2365403f29547dd319dc3d6926fddca3b8e4fb17', 'cnm_ps091': '6f85e5f8edb813b9563f2ba8f4391884e6d1705d0689ffff566e09205a5d32ca', 'cnm_ps091_q1': 'b5d5d21250ad3a7978ecc2c35bb329548b92841d61df2f4f46678615a24a59e7', 'cnm_ps091_q2': '1d5bc0ea191228b987141b2ddcfb438b8f82c3f28c267103f1d17d52d5d71eb9', 'cnm_ps092': '30926a0af2629e7165b5112298b9667957e5026161a4c5599b35324d368f9dba', 'cnm_ps092_q1': '96aca48900a8c674a579a01e881d8677a18e00542bb32de94225e56cc2df7eee', 'cnm_ps092_q2': '9c19257a7890c50e7a8205485de92f7f259a00d3b5137f814d87e7cc769e9953', 'cnm_ps093': '05b0df2ca48f30e528a415d3de0d74ff68b4c6719094280db20dd0475c5d9d73', 'cnm_ps093_q1': '6b6740175392a900374b8baef1edb199824c81215616243d2fe71bc6c8a78b55', 'cnm_ps093_q2': '0ddc50eadfc6f9822dfa1c3978bf639a7ff145d10c596d061e94df81e467e05f', 'cnm_ps094': '9f98768c925cbde6a9faea810ee1e46768af02a148c79ea2d54d703c8970f579', 'cnm_ps094_q1': '99f2a7b358b41f74338209f252a64199a8c31e33243075a051ad485abce30741', 'cnm_ps094_q2': '3e47daf768b867c9b62e18e9fd5a2ef2d675690ca5fd7fb87a47e0ccad9beed8', 'cnm_ps095': '21c3e8a057260cb873e136cdbab5f2e624440cd37c882930b50fe8bf1af4b135', 'cnm_ps095_q1': 'bdf81805aeb50a8b406b629266c8dd6bf1f4f21b787c030c10d0c33bda853e5b', 'cnm_ps095_q2': '181ce5615ecc1764bbcb56e4e1cebc4afdefbb1f1f0ac2f8902fac9a72b63f4d', 'cnm_ps096': '707f5b01150e6c1064d8f81436610808fd7fe9221509ae1bd3a38f81ef19858f', 'cnm_ps096_q1': '37bcbed994bdeeb5e93436559c9fda49c8256a961055de5136f7dc71cb6b3f0d', 'cnm_ps096_q2': '438a8238028d3f250d851c1fadbecf5d5ca4bb8fd446cc51d83ec20a939de1b1', 'cnm_ps097': '8864d53d7c9632b02435f4cd7c89911a59d433ea930f6efbe793b01b7ee6fd36', 'cnm_ps097_q1': 'f08110fbf60052fb68d77cbdcf7a245e9c3e741dc3430a813b4048892bb45012', 'cnm_ps097_q2': 'c43d7881cc873aad6a1b3032abc9f2d95057de7600fce7632ef0e47ec26a04c2', 'cnm_ps098': 'f200c3b8dbcb2097d440d01b4d6d6bcba81a314cd424bd37800231cdb4159990', 'cnm_ps098_q1': '4838eece9e4b4b37a09b390e9316e7f0ec40e1c57e9c595b8b0bf5481622a657', 'cnm_ps098_q2': '2f4cbb9738303e0c226dd67c433188123e58797a67514211cb50a156321bc9fa', 'cnm_ps099': '1b88505ddffad76cf4163005d90bab08c55fde9c9608a656cf7b1e06bd36a037', 'cnm_ps099_q1': '293cd1c61b38dc46d2b6f9fe651a08dfe6b02f5f2dedbee3a72f602b4e206f51', 'cnm_ps099_q2': '1ba202d71314158bf7ebd7bc97057cacf0d41b8bf05c1e6fddaf191cfa5c2e86', 'cnm_ps100': 'f101cb585b62daae18192c81d085b34a9468c615acbb80ae251b3928aa89c6ee', 'cnm_ps100_q1': 'f8126982254102cce09ad02d1574d1b711bec77d951f39e34bc917e679f7c5b0', 'cnm_ps100_q2': '672a29d66a04f66776c86936c9c4de39401faa1509917ecc802af06d7c6cea95'}


def semantic_hash(item):
    body = {key: value for key, value in item.items() if key not in {"review_status", "review_record"}}
    raw = json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def serial(value):
    if isinstance(value, R):
        return {"exact": str(value), "decimal": float(value)}
    if isinstance(value, dict):
        return {key: serial(val) for key, val in value.items()}
    if isinstance(value, (tuple, list)):
        return [serial(val) for val in value]
    return value


def equal(a, b):
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(equal(x, y) for x, y in zip(a, b))
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (int, float, R)) and isinstance(b, (int, float, R)):
        return math.isclose(float(a), float(b), rel_tol=1e-10, abs_tol=1e-10)
    return a == b


def main():
    here = Path(__file__).resolve().parent
    default_data = here.parent / "data"
    if not default_data.exists():
        default_data = here / "curriculum"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=default_data)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    data = args.data.resolve()
    output = args.output or (data.parent / "validation" / "probability-statistics-independent-calculations.json")
    topics_path = data / "math-probability-topics.json"
    questions_path = data / "math-probability-questions.json"
    topics_all = json.loads(topics_path.read_text(encoding="utf-8"))
    questions_all = json.loads(questions_path.read_text(encoding="utf-8"))
    topics = {row["id"]: row for row in topics_all if 75 <= int(row["id"].removeprefix("cnm_ps")) <= 100}
    questions = {row["id"]: row for row in questions_all if row["topicId"] in topics}
    items = {**topics, **questions}
    content_binding = []
    for item_id, reviewed_hash in sorted(REVIEWED_SEMANTIC_HASHES.items()):
        actual = semantic_hash(items[item_id]) if item_id in items else None
        content_binding.append({"id": item_id, "reviewed_sha256": reviewed_hash, "actual_sha256": actual, "pass": actual == reviewed_hash})
    if len(REVIEWED_SEMANTIC_HASHES) != 78:
        raise RuntimeError("The independent review must bind exactly 26 topics and 52 questions.")

    rows = []

    def add(number, index, result, options, derivation, kind="numerical", **details):
        question_id = f"cnm_ps{number:03d}_q{index}"
        actual = questions[question_id]
        if set(options) != {"A", "B", "C", "D"}:
            raise ValueError(f"Four independently assessed options required for {question_id}")
        valid = [key for key, candidate in options.items() if equal(result, candidate)]
        row = {
            "question_id": question_id,
            "kind": kind,
            "independent_derivation": derivation,
            "independent_result": serial(result),
            "independent_option_evaluations": serial(options),
            "unique_correct_options": valid,
            "source_answer": actual["answer"],
            "source_semantic_sha256": semantic_hash(actual),
            "pass": len(valid) == 1 and valid[0] == actual["answer"],
        }
        row.update(serial(details))
        rows.append(row)

    def logic(number, index, true_key, derivation, kind="conceptual", **details):
        add(number, index, True, {key: key == true_key for key in "ABCD"}, derivation, kind, **details)

    # Chapter 7: independently transcribed observations and model equations.
    logic(75, 1, "D", "抽样前均值是样本的函数，随样本而变；A把未知参数与统计量混淆，B只适于观测后，C错误地声称无抽样误差。")
    add(75, 2, 2 * R(1 + 3 + 5, 3), {"A": 3, "B": 6, "C": 9, "D": 18}, "xbar=(1+3+5)/3=3; theta_hat=2*xbar=6.")
    add(76, 1, 1 / R(2 + 3 + 5, 3), {"A": R(3, 10), "B": R(10, 3), "C": R(1, 10), "D": R(3, 5)}, "E(X)=1/lambda=10/3 gives lambda_hat=3/10.")
    add(76, 2, 2 * R(2 + 3 + 4, 3), {"A": 4, "B": 3, "C": 6, "D": 9}, "For U(0,theta), E(X)=theta/2; theta_hat=2*3=6.")
    mean = R(1 + 2 + 3, 3)
    var_moment = R(1 + 4 + 9, 3) - mean * mean
    add(77, 1, [mean, var_moment], {"A": [2, 1], "B": [2, R(2, 3)], "C": [2, R(14, 3)], "D": [1, R(2, 3)]}, "A1=2; A2=14/3; sigma2_hat=A2-A1^2=2/3.")
    width = math.sqrt(12 * (7 - 2 ** 2))
    add(77, 2, [2 - width / 2, 2 + width / 2], {"A": [0, 4], "B": [-4, 8], "C": [1, 3], "D": [-1, 5]}, "Mean is 2; variance moment is 7-4=3; (b-a)^2=36 and b>a imply width 6, endpoints -1 and 5.")
    add(78, 1, R(7, 10), {"A": .3, "B": 7, "C": .7, "D": R(1, 7)}, "log L=7 log p+3 log(1-p); derivative zero at 7/10; second derivative negative and endpoints have L=0.")
    add(78, 2, R(1 + 2 + 3, 3), {"A": 2, "B": 6, "C": R(1, 2), "D": math.sqrt(2)}, "log L=-3lambda+6 log lambda+constant; derivative=-3+6/lambda and second derivative=-6/lambda^2; maximum lambda=2.")
    add(79, 1, R(3, 1 + 2 + 3), {"A": 2, "B": R(1, 6), "C": 3, "D": R(1, 2)}, "Rate model: log L=3 log lambda-6lambda; lambda_hat=3/6=1/2.")
    add(79, 2, R(20, 5), {"A": R(1, 4), "B": 4, "C": 5, "D": 20}, "Scale model: log L=-5 log theta-20/theta; theta_hat=20/5=4.")
    observations = [1, 1, 3, 3]
    mean = R(sum(observations), len(observations))
    mle_var = sum((R(x) - mean) ** 2 for x in observations) / len(observations)
    add(80, 1, [mean, mle_var], {"A": [2, 1], "B": [2, R(4, 3)], "C": [2, 4], "D": [1, 1]}, "Normal joint MLE uses xbar=2 and sum squared deviations/n=4/4=1, not the unbiased denominator n-1.")
    add(80, 2, R(1 ** 2 + 3 ** 2, 2), {"A": 1, "B": 2, "C": 5, "D": 10}, "Known mean zero: sigma2_hat=[(1-0)^2+(3-0)^2]/2=5.")
    add(81, 1, max(2, 5, 3), {"A": R(10, 3), "B": 5, "C": R(20, 3), "D": 3}, "Support requires theta>=5; L(theta)=theta^(-3) is strictly decreasing on [5,infinity), so its maximum is 5.")
    add(81, 2, [max(R(22, 10), R(28, 10)) - 1, min(R(22, 10), R(28, 10))], {"A": [2.5, 2.5], "B": [2.8, 2.8], "C": [2.2, 2.8], "D": [1.8, 2.2]}, "Common unit-length support requires theta<=min x=2.2 and theta>=max x-1=1.8; L=1 on that full interval and 0 outside.")
    logic(82, 1, "C", "For every iid finite-variance distribution, E(sum(Xi-Xbar)^2)=(n-1)sigma2. A has expectation (n-1)sigma2/n; B has mu^2+sigma2/n; D has mu^2+sigma2. Only C is unbiased throughout the stated model class.", "symbolic")
    logic(82, 2, "A", "Expected values of A,B,C,D are respectively theta, n*theta/(n+1), n^2*theta/(n+1)^2, theta/(n+1). Only A equals theta for all n>=1 and theta>0.", "symbolic")
    add(83, 1, 3 + 2 ** 2, {"A": 5, "B": 9, "C": 1, "D": 7}, "MSE=variance+bias^2=3+4=7.")
    add(83, 2, [True, True, R(1, 4)], {"A": [True, False, None], "B": [True, True, R(1, 4)], "C": [True, True, 1], "D": [True, True, 4]}, "Both estimates have expectation mu; independent sampling gives Var(Xbar)=4sigma2/16=sigma2/4.")
    logic(84, 1, "A", "Consistency means convergence in probability at each fixed parameter: for every epsilon>0, P_theta(|Tn-theta|>epsilon)->0. Finite-sample unbiasedness, exact equality and zero variance are different statements.")
    logic(84, 2, "C", "Bias(Tn)=1/n is nonzero at every finite n; Var(Tn)=sigma2/n. MSE=sigma2/n+1/n^2 tends to 0, and Markov's inequality applied to squared error proves consistency.", "symbolic")
    logic(85, 1, "B", "The revised premise specifies exact 95% coverage. Repeated-sampling interval coverage is 0.95; it is neither a posterior probability for fixed theta nor coverage of individual observations nor probability of exact equality.")
    width_ratio = norm.ppf(.975) / norm.ppf(.95)
    add(85, 2, "increase", {"A": "decrease", "B": "unchanged", "C": "exactly_double", "D": "increase"}, "With fixed sigma/sqrt(n)>0, width is 2*z_(1-alpha/2)*sigma/sqrt(n); z_0.975>z_0.95, and their ratio is about 1.1916, not 2.", width_ratio=width_ratio)
    se = 4 / math.sqrt(16)
    add(86, 1, [10 - 1.96 * se, 10 + 1.96 * se], {"A": [6.08, 13.92], "B": [9.51, 10.49], "C": [8.04, 11.96], "D": [8.355, 11.645]}, "Known sigma gives SE=4/sqrt(16)=1, so the two-sided interval is 10 +/- 1.96.")
    add(86, 2, 5 - 1.645 * 2 / math.sqrt(25), {"A": 4.342, "B": 5.658, "C": 4.216, "D": 4.9342}, "One-sided lower bound is 5-z_0.95*2/5=5-.658=4.342; its confidence set is [4.342,infinity).")
    add(87, 1, [10 - 2.306 * 3 / math.sqrt(9), 10 + 2.306 * 3 / math.sqrt(9)], {"A": [8.04, 11.96], "B": [3.082, 16.918], "C": [9.2313, 10.7687], "D": [7.694, 12.306]}, "Unknown sigma: df=9-1=8 and SE=3/3=1, so endpoints are 10 +/- 2.306.")
    add(87, 2, 1.0655 * math.sqrt(16) / 2.131, {"A": .5, "B": 2, "C": 4, "D": 8}, "After the reviewed rounding correction, S=halfwidth*sqrt(n)/t=1.0655*4/2.131=2.")
    total = (10 - 1) * 4
    add(88, 1, [total / 19.023, total / 2.700], {"A": [36 / 19.023, 36 / 2.700], "B": [36 / 2.700, 36 / 19.023], "C": [40 / 19.023, 40 / 2.700], "D": [4 / 19.023, 4 / 2.700]}, "Numerator is (n-1)S^2=36. Inverting q_low<=36/sigma2<=q_high yields [36/q_high,36/q_low].")
    add(88, 2, [math.sqrt(4), math.sqrt(9)], {"A": [4, 9], "B": [16, 81], "C": [2, 3], "D": [2, 4.5]}, "The increasing square-root transformation on positive endpoints preserves exactly the same coverage event.")
    se = math.sqrt(4 / 8 + 4 / 8)
    add(89, 1, [3 - 1.96 * se, 3 + 1.96 * se], {"A": [-.92, 6.92], "B": [1.04, 4.96], "C": [2.02, 3.98], "D": [1.614, 4.386]}, "Independent means with known variances have SE^2=4/8+4/8=1, so the difference interval is 3 +/- 1.96.")
    pooled = R((5 - 1) * 4 + (5 - 1) * 9, 5 + 5 - 2)
    se2 = pooled * (R(1, 5) + R(1, 5))
    def interval(center, critical, variance):
        return [center - critical * math.sqrt(float(variance)), center + critical * math.sqrt(float(variance))]
    add(89, 2, interval(2, 2.306, se2), {"A": interval(2, 1.96, 2.6), "B": interval(2, 2.306, 13), "C": interval(2, 2.306, 1.3), "D": interval(2, 2.306, 2.6)}, "Pooled variance=(4*4+4*9)/8=6.5; SE^2=6.5*(1/5+1/5)=2.6; df=8. Only D uses both the correct t critical value and SE.", pooled_variance=pooled, standard_error_squared=se2)
    low_f, high_f = f.ppf(.025, 5, 8), f.ppf(.975, 5, 8)
    add(90, 1, [2 / high_f, 2 / low_f], {"A": [2 / low_f, 2 / high_f], "B": [2 / f.ppf(.975, 6, 9), 2 / f.ppf(.025, 6, 9)], "C": [2 / high_f, 2 / low_f], "D": [2 * low_f, 2 * high_f]}, "df=(6-1,9-1)=(5,8); R/theta follows F(5,8). Inversion gives [R/F_0.975,R/F_0.025], in that order.")
    add(90, 2, [R(1, 4), 1 / R(1, 2)], {"A": [R(1, 4), 2], "B": [2, R(1, 4)], "C": [R(1, 2), 4], "D": [-4, R(-1, 2)]}, "The decreasing reciprocal transformation on positive theta reverses endpoint order: [1/upper,1/lower]=[1/4,2].")

    # Chapter 8: decisions are independently recomputed from model and direction.
    logic(91, 1, "D", "Failure to reject means insufficient evidence under the selected procedure and alpha. It is not a proof of H0, a posterior probability statement about H1, or a statement about all possible samples.")
    logic(91, 2, "B", "The prospectively selected research direction is mu>10. The complementary null is mu<=10; two-sided, lower-sided and post-data direction selection do not match it.")
    logic(92, 1, "A", "A type-I error is rejection when H0 is true. Type II is non-rejection at an alternative parameter; power and confidence level are not the specified error event.")
    standardized = (.5 - 1.5) / math.sqrt(1 / 4)
    add(92, 2, 1 - .9772, {"A": .9772, "B": .1587, "C": .0228, "D": .5}, "At mu=1.5, Xbar~N(1.5,1/4). Beta=P(Xbar<=.5)=Phi(-2)=1-.9772=.0228; power=.9772.", standardized_boundary=standardized, exact_beta_using_scipy=norm.cdf(standardized))
    add(93, 1, abs(2.10) > 1.96, {"A": False, "B": True, "C": "proves_H0", "D": "requires_posterior"}, "abs(2.10)>1.96, so the observation is in the declared two-sided rejection region.")
    add(93, 2, R(1, 2) ** 5, {"A": .05, "B": R(5, 32), "C": R(1, 2), "D": R(1, 32)}, "Actual size is P_H0(X=5)=choose(5,5)*(1/2)^5*(1/2)^0=1/32=.03125, below .05.")
    z = (104 - 100) / (10 / math.sqrt(25))
    add(94, 1, [z, abs(z) > 1.96], {"A": [2, False], "B": [.4, False], "C": [2, True], "D": [10, False]}, "SE=10/5=2; z=4/2=2; |z|>1.96, so reject.")
    z = (101 - 100) / (12 / math.sqrt(36))
    add(94, 2, [z, z > 1.645], {"A": [.5, False], "B": [.5, "proves_null"], "C": [3, True], "D": [.5, True]}, "SE=12/6=2; z=.5; .5<1.645. Non-rejection does not prove the composite null.")
    test_t = (12 - 10) / (3 / math.sqrt(9))
    add(95, 1, [test_t, abs(test_t) > 2.306], {"A": [2, True], "B": [6, True], "C": [2, "proves_equality"], "D": [2, False]}, "df=8; t=(12-10)/(3/3)=2; 2<2.306, so do not reject the two-sided null.")
    test_t = (11 - 10) / (2 / math.sqrt(16))
    add(95, 2, [test_t, test_t > 1.753], {"A": [2, False], "B": [2, True], "C": [.5, False], "D": [8, False]}, "df=15; upper-sided t=(11-10)/(2/4)=2>1.753, so reject.")
    q_stat = (10 - 1) * 4 / 4
    add(96, 1, [q_stat, q_stat < 2.700 or q_stat > 19.023], {"A": [9, False], "B": [9, True], "C": [10, True], "D": [36, False]}, "Q=(10-1)*4/4=9, inside [2.700,19.023], so do not reject.")
    q_stat = (10 - 1) * 8 / 4
    add(96, 2, [q_stat, q_stat > 16.919], {"A": [18, False], "B": [2, False], "C": [18, True], "D": [18, "proves_variance_8"]}, "At the null boundary sigma0^2=4, Q=9*8/4=18>16.919. The test supports a larger variance, not exact equality to the observed S^2.")
    pooled = R((5 - 1) * 4 + (5 - 1) * 9, 5 + 5 - 2)
    add(97, 1, pooled, {"A": 13, "B": 6.5, "C": 5, "D": 2.6}, "Pooled variance is [(5-1)*4+(5-1)*9]/(5+5-2)=52/8=6.5.")
    pooled = R((5 - 1) * 4 + (5 - 1) * 4, 5 + 5 - 2)
    test_t = 3 / math.sqrt(float(pooled * (R(1, 5) + R(1, 5))))
    add(97, 2, [test_t, abs(test_t) > 2.306], {"A": [1.5, False], "B": [3 / math.sqrt(1.6), False], "C": [3 / math.sqrt(8), True], "D": [3 / math.sqrt(1.6), True]}, "Pooled variance=4, SE=sqrt(4*(1/5+1/5))=sqrt(1.6). t=3/sqrt(1.6)=2.371708245>2.306 with df=8.")
    add(98, 1, [R(8, 4), 6 - 1, 9 - 1], {"A": [2, 6, 9], "B": [R(1, 2), 5, 8], "C": [2, 5, 8], "D": [4, 8, 5]}, "Under equal variances, F=(8/4)/1=2 with ordered degrees of freedom (6-1,9-1)=(5,8).")
    add(98, 2, [.1 < .140, "lower_tail"], {"A": [True, "lower_tail"], "B": [False, "upper_only"], "C": [True, "all_F_less_than_1"], "D": [False, "upper_only"]}, "Both tails matter. The observed .1 is less than the lower critical value .140; rejection is due to this specific lower-tail threshold, not merely F<1.")
    add(99, 1, 2 * (1 - .97725), {"A": .02275, "B": .97725, "C": .9545, "D": .0455}, "Two-sided normal p=2*(1-Phi(|z|))=2*(1-.97725)=.0455.")
    add(99, 2, [.03 <= .05, False, False], {"A": [False, False, False], "B": [True, False, False], "C": [True, True, False], "D": [True, False, True]}, "p=.03<=.05 triggers rejection; p is neither posterior P(H0|data) nor an effect size. The last two flags test those incorrect interpretations.")
    add(100, 1, not (2 <= 6 <= 5), {"A": True, "B": False, "C": "proves_midpoint", "D": "cannot_decide"}, "For the same t procedure and two-sided tails, the inverted test rejects mu0=6 because 6 lies outside [2,5].")
    add(100, 2, [not (1 <= .8 <= 4), not (.5 <= .8 <= 4.5)], {"A": [True, True], "B": [False, False], "C": [True, False], "D": [False, True]}, ".8 is outside the 90% interval and inside the 95% interval, so reject at alpha=.10 and do not reject at alpha=.05.")

    # Independently validate every numerical distribution constant used in the chapters.
    quantiles = []
    specs = [
        ("z_0.975", norm.ppf(.975), 1.96, 2),
        ("z_0.95", norm.ppf(.95), 1.645, 3),
        ("t_0.975(8)", t.ppf(.975, 8), 2.306, 3),
        ("t_0.975(15)", t.ppf(.975, 15), 2.131, 3),
        ("t_0.95(15)", t.ppf(.95, 15), 1.753, 3),
        ("chi2_0.025(9)", chi2.ppf(.025, 9), 2.700, 3),
        ("chi2_0.975(9)", chi2.ppf(.975, 9), 19.023, 3),
        ("chi2_0.95(9)", chi2.ppf(.95, 9), 16.919, 3),
        ("F_0.025(5,5)", f.ppf(.025, 5, 5), .140, 3),
        ("F_0.975(5,5)", f.ppf(.975, 5, 5), 7.146, 3),
        ("Phi(2), four decimals", norm.cdf(2), .9772, 4),
        ("Phi(2), five decimals", norm.cdf(2), .97725, 5),
    ]
    for name, independent, stated, places in specs:
        quantiles.append({"name": name, "independent_value": float(independent), "stated_value": stated, "decimal_places": places, "pass": round(float(independent), places) == stated})

    all_pass = all(row["pass"] for row in rows + quantiles + content_binding)
    result = {
        "reviewer": "independent_statistics_peer",
        "data_directory": str(data),
        "method": "独立抄录题设参数后重建数学模型；逐题评估四个选项；用SciPy另算分布常数；语义哈希只排除顶层review_status/review_record两个字段。",
        "hash_algorithm": "SHA-256(json.dumps(top_level_fields_except_review_status_and_review_record, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8'))",
        "dependencies": {"python": "3", "scipy": scipy.__version__},
        "summary": {
            "topics_bound": len(topics),
            "questions_checked": len(rows),
            "numerical_questions": sum(row["kind"] == "numerical" for row in rows),
            "symbolic_questions": sum(row["kind"] == "symbolic" for row in rows),
            "conceptual_questions": sum(row["kind"] == "conceptual" for row in rows),
            "options_assessed": 4 * len(rows),
            "distribution_constants_checked": len(quantiles),
            "semantic_items_bound": len(content_binding),
            "pass": all_pass,
        },
        "question_calculations": rows,
        "distribution_constant_checks": quantiles,
        "semantic_content_binding": content_binding,
        "source_file_hashes": [{"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in [topics_path, questions_path]],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output.resolve()), **result["summary"]}, ensure_ascii=False))
    raise SystemExit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
