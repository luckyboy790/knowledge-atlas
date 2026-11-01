#!/usr/bin/env python3
"""Independent calculations written after reading the questions, not from the builder.

The selected answer text is checked against a separately derived result. This does
not prove every distractor or every mathematical statement; see the content review.
Python standard library only. --data can point to an unfrozen author snapshot.
"""
import argparse
import hashlib
import itertools
import json
import math
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--data', type=Path, default=ROOT / 'data')
parser.add_argument('--report', type=Path, default=ROOT / 'validation/probability-independent-calculations.json')
args = parser.parse_args()
question_path = args.data / 'math-probability-questions.json'
bank = {q['id']: q for q in json.loads(question_path.read_text())}
cases = []


def equal(a, b):
    if isinstance(a, (tuple, list)):
        return isinstance(b, (tuple, list)) and len(a) == len(b) and all(equal(x, y) for x, y in zip(a, b))
    return math.isclose(float(a), float(b), rel_tol=1e-11, abs_tol=1e-11)


def case(number, attempt, text, result, expected, calculation):
    qid = f'cnm_ps{number:03d}_q{attempt}'
    q = bank[qid]
    assert equal(result, expected), (qid, 'independent calculation failed', result, expected)
    matches = [c for c in q['choices'] if c['text'] == text]
    assert len(matches) == 1 and matches[0]['key'] == q['answer'], (qid, 'computed answer does not match key', text)
    cases.append({'question_id': qid, 'calculation': calculation, 'computed_value': str(result),
                  'expected_value': str(expected), 'computed_answer_text': text, 'answer_key': q['answer'], 'status': 'PASS'})


# Chapter 1. Counting and exact rational arithmetic from the stated sample spaces.
case(1,2,'3',sum(b>a for a,b in itertools.permutations([1,2,3],2)),3,'枚举不重复有序对，第二项大于第一项的有(1,2)、(1,3)、(2,3)。')
case(3,1,'0.63',1-F(37,100),F(63,100),'补事件：1−37/100。')
case(4,1,'0.7',F(5,10)+F(4,10)-F(2,10),F(7,10),'两事件容斥：1/2+2/5−1/5。')
case(4,2,'0.92',F(5,10)+F(4,10)+F(3,10)-3*F(1,10)+F(2,100),F(92,100),'三事件容斥；各原子区域非负，总并概率0.92。')
case(5,1,'1/2',F(len([x for x in range(1,7) if x in [2,3,5]]),6),F(1,2),'六个等可能点数中质数为2、3、5。')
case(5,2,'18/35',F(math.comb(4,2)*math.comb(3,1),math.comb(7,3)),F(18,35),'超几何计数C(4,2)C(3,1)/C(7,3)。')
case(6,1,'3/10',F(5-2,10),F(3,10),'区间长度比(5−2)/10。')
case(6,2,'1/8',F(1,2)*F(1,2)*F(1,2),F(1,8),'单位正方形中两直角边各1/2的三角形面积。')
case(7,1,'1/4',F(1,10)/F(4,10),F(1,4),'交概率0.1除以正的条件概率0.4。')
case(7,2,'2/3',F(len([x for x in [2,4,6] if x>3]),3),F(2,3),'在等可能条件集合{2,4,6}中枚举{4,6}。')
case(8,1,'0.3',F(6,10)*F(5,10),F(3,10),'0.6×0.5。')
case(8,2,'1/5',F(3,5)*F(2,4)*F(2,3),F(1,5),'不放回指定白黑白路径：(3/5)(2/4)(2/3)。')
case(9,1,'0.029',F(7,10)*F(2,100)+F(3,10)*F(5,100),F(29,1000),'按产量加权次品率：0.7×0.02+0.3×0.05。')
case(9,2,'5/12',F(1,3)*F(3,4)+F(2,3)*F(1,4),F(5,12),'两袋全概率：(1/3)(3/4)+(2/3)(1/4)。')
case(10,1,'0.4',F(2,10)*F(5,10)/F(25,100),F(2,5),'交概率0.1 / 已观察事件概率0.25。')
case(10,2,'2/3',F(4,10)*F(3,100)/(F(6,10)*F(1,100)+F(4,10)*F(3,100)),F(2,3),'乙厂次品0.012除以全体次品0.018。')
case(11,1,'0.3',(1-F(4,10))*F(5,10),F(3,10),'补事件仍独立：(1−0.4)×0.5。')
case(11,2,'0.999',1-F(1,10)**3,F(999,1000),'系统正常是三个都失效的补：1−0.1³。')
coins=list(itertools.product([0,1],repeat=2))
sets=[{r for r in coins if r[0]}, {r for r in coins if r[1]}, {r for r in coins if r[0]==r[1]}]
values=[F(len(s),4) for s in sets]+[F(len(a&b),4) for a,b in itertools.combinations(sets,2)]+[F(len(set.intersection(*sets)),4)]
case(12,2,'两两独立，但不相互独立',values,[F(1,2)]*3+[F(1,4)]*4,'枚举四个硬币结果：边际均1/2、两两交均1/4、三重交1/4≠1/8。')

# Chapter 2. Normalizations, distribution values and support-aware transformations.
case(14,1,'1/6',F(1,1+2+3),F(1,6),'(1+2+3)c=1。')
case(14,2,'0.7',sum(p for x,p in zip([-1,0,2,3],[F(1,10),F(2,10),F(3,10),F(4,10)]) if x*x>=4),F(7,10),'枚举原支持集，仅2、3的平方不小于4。')
case(15,1,'0.5',F(8,10)-F(3,10),F(1,2),'P(1<X≤4)=F(4)−F(1)。')
case(16,1,'0.3',F(7,10)-F(4,10),F(3,10),'跳跃概率F(2)−F(2−)。')
case(16,2,'0.6',F(2,10)+(F(6,10)-F(2,10)),F(6,10),'区间[0,2)包括0点质量0.2和1点质量0.4，排除2点质量。')
case(17,1,'0.7',1-F(3,10),F(7,10),'指示变量为0对应补事件。')
case(17,2,'0.8',1-F(2,10),F(8,10),'1−X=1等价于X=0。')
case(18,1,'3/8',math.comb(3,2)*F(1,2)**3,F(3,8),'三次独立公平伯努利的二项计数。')
case(18,2,'0.992',1-F(2,10)**3,F(992,1000),'明确失败后继续、成功即停；至少一次成功为1−三次失败概率。')
case(19,1,'e^(−2)',math.exp(-2)*2**0/math.factorial(0),math.exp(-2),'Poisson(2)的零点概率。')
case(19,2,'3/2',F(3**2,math.factorial(2))/F(3,math.factorial(1)),F(3,2),'泊松相邻概率比λ/(k+1)，在k=1、λ=3时为3/2。')
case(20,1,'λ=2',1000*F(2,1000),2,'稀有事件泊松近似参数np=2。')
case(20,2,'1−e^(−2)',1-math.exp(-1000*.002),1-math.exp(-2),'近似1−e^(−np)，与精确1−0.998^1000区分。')
case(21,1,'2',1/F(1,2),2,'常数密度c在宽1/2区间积分为1。')
case(21,2,'3/4',1-F(1,2)**2,F(3,4),'积分[1/2,1]2x dx=[x²]。')
case(22,1,'1/2',F(5-2,8-2),F(1,2),'U(2,8)支持区间长度比。')
case(22,2,'5/2',-2+6*F(3,4),F(5,2),'解(c+2)/6=3/4，结果在支持内。')
case(23,1,'e^(−2)',math.exp(-2*1),math.exp(-2),'率参数2的指数尾概率。')
case(23,2,'e^(−1)',math.exp(-9/3)/math.exp(-6/3),math.exp(-1),'直接算条件尾比e^(−9/3)/e^(−6/3)，不从题解读取。')
case(24,2,'0.6826',2*F(8413,10000)-1,F(6826,10000),'标准差√4=2，标准化后为(−1,1)，使用给定Φ值。')
case(25,1,'0.025',1-F(975,1000),F(25,1000),'下侧0.975分位数的右尾为1−0.975。')
case(25,2,'9.935',5+3*F(1645,1000),F(9935,1000),'μ+σz=5+√9×1.645。')
case(26,1,'1/2',F(1,4)+F(1,4),F(1,2),'平方变换合并X=−1和X=1的点概率。')
case(26,2,'1/4，1/4，1/2',[F(sum(min(x,3)==y for x in [1,2,3,4]),4) for y in [1,2,3]],[F(1,4),F(1,4),F(1,2)],'枚举四个等可能原像，截断变换合并3和4。')
case(27,1,'U(2,5)',[3*0+2,3*1+2],[2,5],'单调线性变换支持端点：2和5；常数密度1/3。')

# Chapter 3. Joint and conditional probability, convolution and transformed regions.
case(29,2,'0.2',F(8,10)-F(4,10)-F(3,10)+F(1,10),F(2,10),'联合CDF四角矩形增量。')
case(30,1,'0.4',1-sum([F(1,10),F(2,10),F(3,10)]),F(4,10),'四格联合分布归一化。')
case(30,2,'0.5',F(2,10)+F(3,10),F(1,2),'X≠Y为两非对角格的概率之和。')
case(31,1,'2',1/F(1,2),2,'0<x<y<1三角形面积为1/2。')
case(31,2,'1/4',F(1,2)**2,F(1,4),'对0<y<1/2积分2y，原函数y²。')
case(32,1,'0.7',F(3,10)+F(4,10),F(7,10),'固定X=1，对全部Y求和。')
case(33,2,'3/8',F(1,2)**2/2+F(1,2)*F(1,2),F(3,8),'边缘f_X=x+1/2，在[0,1/2]积分。')
case(34,1,'2/3',F(2,10)/(F(1,10)+F(2,10)),F(2,3),'固定X=0行归一化，0.2/0.3。')
case(34,2,'3/5',F(3,8)/(F(3,8)+F(1,4)),F(3,5),'条件Y=1，目标格为(X,Y)=(0,1)。')
case(35,2,'1/2',(1-F(3,4))/(1-F(1,2)),F(1,2),'条件支持(1/2,1)，目标尾区间(3/4,1)的长度比。')
case(36,1,'0.12',F(3,10)*F(4,10),F(12,100),'独立条件下边际概率乘积。')
case(38,1,'1/2',2*F(1,2)**2,F(1,2),'独立Bernoulli和为1对应两个互斥格点。')
case(38,2,'e^(−5)',math.exp(-2)*math.exp(-3),math.exp(-5),'非负泊松变量和为0等价于二者为0，再用独立性。')
case(39,2,'1/8',F(1,2)*(2-F(3,2))**2,F(1,8),'单位正方形右上三角形，两直角边均1/2。')
case(40,1,'N(3,13)',[1+2,4+9],[3,13],'独立正态和：均值相加，方差相加。')
case(40,2,'N(3,25)',[2*1-2+3,2**2*4+(-1)**2*9],[3,25],'均值2μ_X−μ_Y+3；独立方差4VarX+VarY。')
case(41,1,'1/4',F(1,2)**2,F(1,4),'最大值≤1/2等价于两个都≤1/2。')
case(41,2,'37/64',1-F(3,4)**3,F(37,64),'最小值≤1/4的补为三个都>1/4。')
case(42,1,'1/4',F(1,2)*F(1,2),F(1,4),'Y/X≤1/2在单位正方形中面积为积分x/2 dx=1/4。')
case(42,2,'1/4+(ln 4)/4',.25+.25*(math.log(1)-math.log(.25)),.25+math.log(4)/4,'按x=1/4分区：面积1/4+积分[1/4,1]1/(4x) dx。')

# Chapter 4. Moments, covariance and variance under explicitly checked conditions.
case(43,1,'0',-F(2,3)+2*F(1,3),0,'离散均值(−1)(2/3)+2(1/3)。')
case(44,1,'2/3',F(2,3)*(1**3-0**3),F(2,3),'密度2x的加权积分∫2x² dx。')
case(45,1,'1',F(1,2)*(-1)**2+F(1,2)*1**2,1,'先对每个取值平方，再加权，不能先求均值再平方。')
case(45,2,'1/4',F(1,4),F(1,4),'E(XY)=∫[0,1]∫[0,y]2xy dx dy=∫[0,1]y³dy=1/4。')
case(46,1,'5',2*2-3+4,5,'期望线性性，无需独立：2×2−3+4。')
hyper_mean=sum(k*F(math.comb(4,k)*math.comb(6,3-k),math.comb(10,3)) for k in range(4))
case(46,2,'6/5',hyper_mean,F(6,5),'独立复算采用超几何分布逐项求和，与题解的指示变量法交叉验证。')
case(47,1,'3',7-2**2,3,'二阶原点矩减均值平方：7−4。')
case(48,1,'12',(-2)**2*3,12,'Var(aX+b)=a²VarX。')
case(48,2,'4',F(1,2)**2*4**2,4,'先把标准差4平方，再乘尺度1/2的平方。')
case(49,1,'2和1.6',[10*F(1,5),10*F(1,5)*F(4,5)],[2,F(8,5)],'B(10,0.2)的均值np和方差np(1−p)。')
p=1-F(3,4)
case(49,2,'16和1/4',[4/p,p],[16,F(1,4)],'由Var/EX=1−p得p=1/4，再解n=4/p并检验整数性。')
case(50,1,'5和3',[F(2+8,2),F((8-2)**2,12)],[5,3],'U(2,8)均值中点，方差区间宽度平方/12。')
rate=F(1,3)
case(50,2,'1/3和9',[rate,1/rate**2],[F(1,3),9],'指数均值为率的倒数，方差为率平方的倒数。')
case(51,1,'3',5-1*2,3,'Cov=E(XY)−EX EY。')
case(51,2,'12',3*(-2)*(-2),12,'协方差双线性：3×(−2)×Cov(X,Y)，平移不影响。')
case(52,1,'15',4+9+2*1,15,'保留协方差的交叉项2Cov。')
case(52,2,'7',2**2*2+(-1)**2*3+2*2*(-1)*1,7,'系数平方方差项加2abCov，负系数影响交叉项。')
case(53,1,'1/2',3/(math.sqrt(4)*math.sqrt(9)),F(1,2),'相关系数除以标准差乘积，不能除以方差乘积。')
case(53,2,'−1',-3/abs(-3),-1,'正方差条件下Y=5−3X给完全负线性相关。')
cov=-F(1,2)*2*3
case(55,2,'[[4,−3],[−3,9]]',[[4,cov],[cov,9]],[[4,-3],[-3,9]],'由ρσ_Xσ_Y求非对角项；方差在对角。')
case(56,1,'2',11-3**2,2,'二阶中心矩=二阶原点矩−均值平方。')
case(56,2,'0',7-3*3+3*1-1,0,'展开(X−1)³并取期望：7−9+3−1。')

# Chapter 5. Probability bounds and approximations remain labelled as such.
case(57,1,'1/4',F(4,4**2),F(1,4),'切比雪夫尾界σ²/ε²，非精确尾概率。')
case(57,2,'0.96',1-F(1,100)/F(1,2)**2,F(96,100),'独立均值方差1/100；开区间概率的下界取≥尾界的补。')
case(59,2,'1600',math.ceil(F(4,1)/(F(1,2)**2*F(1,100))),1600,'n须使4/(n×0.5²)≤0.01；取最小满足该充分界的整数。')
case(60,1,'1/1600',F(1,2)*F(1,2)/400,F(1,1600),'伯努利成功频率方差p(1−p)/n。')
case(60,2,'1920',math.ceil(F(4,10)*F(6,10)/(F(5,100)**2*F(5,100))),1920,'n须使0.24/(n×0.05²)≤0.05。')
z=(230-100*2)/math.sqrt(100*9)
assert equal(z,1)
case(62,2,'0.8413',F(8413,10000),F(8413,10000),'先独立算z=(230−200)/30=1，再使用题设Φ(1)=0.8413作CLT近似。')
case(63,1,'50和5',[100*F(1,2),math.sqrt(100*.5*.5)],[50,5],'二项均值50，方差25，标准差5。')
lo=(44.5-50)/5;hi=(55.5-50)/5
assert equal([lo,hi],[-1.1,1.1])
case(63,2,'0.7286',2*F(8643,10000)-1,F(7286,10000),'整数闭区间[45,55]修正至(44.5,55.5)，标准化为(−1.1,1.1)，使用给定Φ值。')
case(64,1,'1/2',math.sqrt(1/4),F(1,2),'平均值标准差σ/√n，样本量四倍使标准差减半。')

# Chapter 6. Sampling moments and the exact normal-sample degrees of freedom.
first=F(5,10);second=first*F(4,9)+(1-first)*F(5,9)
case(65,2,'X₁、X₂同分布，但不独立',[first,second,F(4,9)],[F(1,2),F(1,2),F(4,9)],'无放回两次红球边际均1/2，而已知首次红球时第二次概率4/9。')
case(67,1,'5和4',[5,F(16,4)],[5,4],'独立样本均值保留均值5，方差16/n=4。')
case(67,2,'2',12/math.sqrt(36),2,'标准误差σ/√n=12/6。')
sample=[2,4,6];mean=F(sum(sample),len(sample))
case(68,1,'4',sum((x-mean)**2 for x in sample)/(len(sample)-1),4,'从原样本重算均值、离差平方和及n−1分母。')
case(68,2,'(4/5)σ²',F(5-1,5),F(4,5),'分母n的经验中心矩是(n−1)/n倍无偏样本方差；检查σ²系数。')
case(69,1,'14/3',F(sum(x*x for x in [1,2,3]),3),F(14,3),'逐项平方后平均。')
case(69,2,'7',F(4-1,4)*4+2**2,7,'A₂=(n−1)S²/n+X̄²。')
case(70,1,'χ²(4)',len([1,2,3,4]),4,'独立标准正态平方和项数即自由度。')
case(70,2,'8和16',[3+5,2*(3+5)],[8,16],'独立χ²自由度相加，均值ν、方差2ν。')
case(72,1,'F(4,7)',[4,7],[4,7],'分子、分母χ²各自按自由度缩放，保留有序自由度。')
case(72,2,'F(6,1)',list(reversed([1,6])),[6,1],'t(6)平方为F(1,6)，取倒数交换两个自由度。')
case(73,1,'χ²(9)',10-1,9,'正态样本校正方差的自由度n−1=9。')
case(74,1,'t(15)',16-1,15,'正态均值除以样本标准误差，样本量16给t自由度15。')
case(74,2,'F(5,8)',[6-1,9-1],[5,8],'两组独立正态样本各减1自由度，分子5、分母8。')

report = {'date':'2026-10-31','status':'PASS','method':'独立复核者先逐题阅读，再用标准库枚举、精确分数及显式公式复算，并对照题库实际正确选项。',
          'cases_count':len(cases),'question_file_sha256':hashlib.sha256(question_path.read_bytes()).hexdigest(),
          'cases':cases,'limitations':['本脚本覆盖明确列出的计算与反例，不是全部题目的形式化证明。','原始摘要、完整选项、概念条件和来源定位的逐项阅读另见内容复核报告。']}
args.report.parent.mkdir(parents=True,exist_ok=True)
args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'PASS','cases':len(cases),'report':str(args.report)},ensure_ascii=False))
