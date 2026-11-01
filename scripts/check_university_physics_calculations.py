#!/usr/bin/env python3
"""Independent reviewer calculations for selected model/units/sign risks.

Run from any working directory; the default input is this project's data/.
Optionally pass a reviewed frozen dataset directory and an output JSON path.
Equations were independently derived by the reviewer from the question text.
This supplements, and does not replace, reading every question and option.
"""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data'
question_path = source / 'uphysics-questions.json'
questions = {q['id']: q for q in json.loads(question_path.read_text())}
results = []

# These exact reviewed prompts bind the independently transcribed inputs below.
# If a prompt changes, re-read it and derive the calculation again before updating.
REVIEWED_PROMPTS = {
    "uphy_mechanics_001_q2": "平面运动r(t)=(t²,2t) m，t以s计。t=1 s时加速度为多少？",
    "uphy_mechanics_002_q2": "一维运动a(t)=6t m/s²，v(0)=2 m/s，x(0)=0。t=1 s时x是多少？",
    "uphy_mechanics_003_q2": "质点沿半径2 m的圆轨道运动，某时速率4 m/s、速率增加率6 m/s²。总加速度大小是多少？",
    "uphy_mechanics_009_q2": "质量2 kg物体初速度沿+x为1 m/s。0到2 s内合力F(t)=3t N沿+x，末速度是多少？",
    "uphy_mechanics_011_q2": "质点质量2 kg，r=(3,0,0) m，v=(0,4,0) m/s，关于原点的角动量是多少？",
    "uphy_mechanics_018_q2": "质量2 kg、长度3 m的均匀细杆，绕垂直杆且过中点轴的I=ML²/12。绕平行的端点轴I是多少？",
    "uphy_mechanics_022_q2": "均匀实心圆柱质量2 kg，以质心速率3 m/s纯滚动，I_cm=MR²/2，总动能多少？",
    "uphy_mechanics_024_q2": "定常、不可压缩、无黏性的水平水流，沿同一流线且无外部机械能输入，流速由1增为3 m/s，ρ=1000 kg/m³。p₁−p₂是多少？",
    "uphy_thermodynamics_005_q2": "1 mol单原子理想气体温度升高20 K，取R=8.31 J/(mol·K)，内能增加多少？",
    "uphy_thermodynamics_009_q2": "系统吸热500 J并对外做功200 J，内能变化是多少？",
    "uphy_thermodynamics_013_q2": "单原子理想气体γ=5/3，可逆绝热膨胀使体积增至初值8倍，温度为初温的多少？",
    "uphy_thermodynamics_014_q2": "一台热机每循环吸热1000 J、向冷源放热600 J，效率是多少？",
    "uphy_thermodynamics_018_q2": "系统在300 K下可逆等温吸热600 J，熵变是多少？",
    "uphy_thermodynamics_020_q2": "1 mol理想气体在绝热容器内向真空自由膨胀，由V达到平衡体积2V，R=8.31 J/(mol·K)，熵变约多少？",
    "uphy_electromagnetism_009_q2": "真空平行板面积0.01 m²，板距0.001 m，ε₀=8.85×10⁻¹² F/m，电容是多少？",
    "uphy_electromagnetism_010_q2": "2 μF与3 μF的电容器串联，等效电容是多少？",
    "uphy_electromagnetism_013_q2": "电容2 μF，端电压100 V，储能是多少？",
    "uphy_electromagnetism_018_q2": "半径0.1 m的单匝圆线圈通电1 A，μ₀=4π×10⁻⁷ T·m/A，圆心磁场为多少？",
    "uphy_electromagnetism_020_q2": "理想空芯长螺线管每米1000匝，电流2 A，μ₀=4π×10⁻⁷ T·m/A，内部磁场是多少？",
    "uphy_electromagnetism_021_q2": "正电荷以速度沿+x运动，均匀磁场沿+z方向，磁力指向哪里？",
    "uphy_electromagnetism_024_q2": "10匝线圈，每匝面积0.01 m²，电流2 A，在0.5 T磁场中磁矩与场垂直，力矩是多少？",
    "uphy_electromagnetism_026_q2": "100匝线圈每匝磁通量在0.1 s内均匀减少0.02 Wb，感应电动势大小是多少？",
    "uphy_electromagnetism_029_q2": "半径r=0.1 m的圆路径内均匀磁场垂直圆面，以2 T/s增加。轴对称下路径上感生电场大小为多少？",
    "uphy_electromagnetism_032_q2": "L=0.5 H，电流2 A，磁能为多少？",
    "uphy_oscillations_waves_002_q2": "x=A cos(ωt+φ)，A>0、ω>0。t=0时x=0且v>0，在[0,2π)中φ是多少？",
    "uphy_oscillations_waves_006_q2": "L=1 H、C=1×10⁻⁴ F的理想LC回路，角频率是多少？",
    "uphy_oscillations_waves_007_q2": "两同方向同频振动振幅都为2 cm，相位差π/2，合振幅是多少？",
    "uphy_oscillations_waves_008_q2": "两个同方向振动频率为100 Hz和103 Hz，拍周期约为多少？",
    "uphy_oscillations_waves_010_q2": "y=0.02 cos(10t−2x) m，x以m、t以s计，质点振动速度的最大值大小是多少？",
    "uphy_oscillations_waves_015_q2": "长1 m的两端固定弦，波速100 m/s，基频是多少？",
    "uphy_oscillations_waves_016_q2": "空气中声速330 m/s，1000 Hz声源以30 m/s朝静止接收者运动，接收频率多少？",
    "uphy_oscillations_waves_017_q2": "两处声强之比为100，声强级差是多少？",
    "uphy_oscillations_waves_018_q2": "真空平面波电场振幅300 V/m，c=3×10⁸ m/s，磁场振幅是多少？",
    "uphy_optics_001_q2": "光从n=2的介质射向空气，空气n=1，临界角是多少？",
    "uphy_optics_002_q2": "薄凸透镜焦距10 cm，实物距30 cm，近轴实像距是多少？",
    "uphy_optics_004_q2": "真空波长600 nm的光，两路光程差300 nm且无额外相位变化，传播相位差是多少？",
    "uphy_optics_005_q2": "空气中λ=600 nm、D=2 m、d=0.5 mm，满足远场小角度条件，相邻明纹间距多少？",
    "uphy_optics_007_q2": "空气—薄膜—空气结构，膜n=1.5，正入射真空波长600 nm，反射相长的最小正厚度是多少？",
    "uphy_optics_008_q2": "空气劈尖角θ=1×10⁻³ rad，入射波长600 nm，正入射、小角度，相邻暗纹距离约多少？",
    "uphy_optics_009_q2": "同一牛顿环装置中，第4暗环半径是第1暗环半径的多少倍？",
    "uphy_optics_010_q2": "空气中波长500 nm，折射率近似为1且保持不变，反射镜沿光路移动0.05 mm，观察到的条纹变化数是多少？",
    "uphy_optics_012_q2": "空气中λ=500 nm、缝宽a=0.1 mm、屏距D=2 m，满足小角远场，中央亮纹宽度约多少？",
    "uphy_optics_013_q2": "λ=500 nm、圆孔直径D=0.1 m，瑞利角分辨限约多少？",
    "uphy_optics_014_q2": "正入射光波长500 nm，光栅栅距1 μm，第一级主极大的衍射角是多少？",
    "uphy_optics_016_q2": "在第2级使用有效缝数5000的理想光栅，λ=600 nm，按R=mN最小可分辨波长差约多少？",
    "uphy_optics_017_q2": "一级布拉格衍射，λ=0.10 nm、θ=30°，晶面间距d是多少？",
    "uphy_optics_019_q2": "强度I₀的自然光依次通过两片理想偏振片，透光轴夹角60°，末强度是多少？",
    "uphy_optics_020_q2": "光从空气n₁=1射向折射率n₂=√3的透明介质，布儒斯特角是多少？",
    "uphy_modern_002_q2": "v=0.6c时，洛伦兹因子γ是多少？",
    "uphy_modern_003_q2": "S系两事件Δt=0、Δx=300 m，S′沿+x以0.6c运动，c=3×10⁸ m/s。Δt′是多少？",
    "uphy_modern_004_q2": "某粒子自身静止系寿命为2 μs，实验室中速度0.6c，实验室平均寿命是多少？",
    "uphy_modern_005_q2": "飞船固有长度10 m，以0.6c沿长度方向运动，实验室测得长度多少？",
    "uphy_modern_006_q2": "飞船相对地面以0.6c运动，从船上沿前进方向发射相对船速0.6c的粒子，地面速率约多少？",
    "uphy_modern_007_q2": "质量m粒子速度0.6c，其动能为静能mc²的多少？",
    "uphy_modern_008_q2": "理想黑体温度增为2倍，总辐出度增为多少倍？",
    "uphy_modern_009_q2": "给定hc=1240 eV·nm，真空波长620 nm的光子能量是多少？",
    "uphy_modern_010_q2": "入射光子能量5 eV，金属逸出功2 eV，遏止光电子的电压大小是多少？",
    "uphy_modern_011_q2": "电子康普顿波长为2.43 pm，散射角90°时光子波长增加多少？",
    "uphy_modern_012_q2": "用E_n=−13.6/n² eV，氢原子从n=2跃迁到n=1，发射光子能量多少？",
    "uphy_modern_013_q2": "给定h=6.63×10⁻³⁴ J·s，粒子动量3.315×10⁻²⁴ kg·m/s，德布罗意波长多少？",
    "uphy_modern_014_q2": "若定位标准差Δx减为原来一半，由ħ/(2Δx)给出的动量标准差下界怎样变化？",
    "uphy_modern_015_q2": "某归一化态在0≤x≤L内概率密度均匀为1/L，在外为零，落在0至L/4的概率是多少？",
    "uphy_modern_017_q2": "同一粒子所在无限深势阱宽度由L变为2L，基态能量怎样变化？",
    "uphy_modern_019_q2": "某量子谐振子的ħω=2 eV，基态能量是多少？",
    "uphy_modern_021_q2": "p亚层l=1有三个空间轨道，该亚层最多容纳几个电子？",
    "uphy_modern_025_q2": "某核由自由核子结合后静质量减少0.01 u，取1 u·c²=931.5 MeV，结合能多少？",
    "uphy_modern_026_q2": "某样本有1000个未衰变核，衰变常量λ=0.2 s⁻¹，活度是多少？"
}

def check(topic, calculated, expected, answer_text, derivation):
    qid = 'uphy_' + topic + '_q2'
    q = questions[qid]
    assert q['prompt'] == REVIEWED_PROMPTS[qid], (qid, 'reviewed prompt changed; re-derive the inputs')
    values = calculated if isinstance(calculated, tuple) else (calculated,)
    targets = expected if isinstance(expected, tuple) else (expected,)
    assert len(values) == len(targets)
    assert all(math.isclose(a, b, rel_tol=1e-10, abs_tol=1e-12) for a,b in zip(values,targets)), qid
    selected = next(c['text'] for c in q['choices'] if c['key'] == q['answer'])
    assert selected == answer_text, (qid, selected, answer_text)
    results.append({'question_id':qid,'prompt':q['prompt'],'derivation':derivation,'computed':calculated,'expected':expected,'correct_option_text':selected,'status':'PASS'})

check('mechanics_001', (2,0), (2,0), '(2,0) m/s²', 'r=(t²,2t)，逐分量二阶求导得a=(2,0)。')
check('mechanics_002', 2*1+1**3, 3, '3 m', 'a=6t积分得v=2+3t²，再积分得x=2t+t³。')
check('mechanics_003', math.hypot(4**2/2,6), 10, '10 m/s²', '法向a_n=v²/r=8，与切向6正交合成。')
check('mechanics_009', 1+(3*2**2/2)/2, 4, '4 m/s', '冲量∫0²3t dt=6 N·s；v末=1+6/2。')
check('mechanics_011', (0,0,3*2*4), (0,0,24), '(0,0,24) kg·m²/s', 'r×mv=(3,0,0)×(0,8,0)=(0,0,24)。')
check('mechanics_018', 2*3**2/12+2*(3/2)**2, 6, '6 kg·m²', '平行轴I=ML²/12+M(L/2)²。')
check('mechanics_022', 0.5*2*3**2+0.25*2*3**2, 13.5, '13.5 J', '纯滚动总动能为质心平动Mv²/2加转动Mv²/4。')
check('mechanics_024', 1000*(3**2-1**2)/2, 4000, '4000 Pa', '水平定常理想流体：p1-p2=ρ(v2²-v1²)/2。')
check('thermodynamics_005', 1.5*8.31*20, 249.3, '249.3 J', '单原子理想气体ΔU=3nRΔT/2。')
check('thermodynamics_009', 500-200, 300, '增加300 J', '物理约定W为系统对外功，ΔU=Q-W。')
check('thermodynamics_013', 8**(-(5/3-1)), 0.25, '1/4', '可逆绝热单原子气体T2/T1=(V1/V2)^(γ-1)=8^(-2/3)。')
check('thermodynamics_014', (1000-600)/1000, 0.4, '40%', '效率用净功/吸收热量；分母不是净吸热。')
check('thermodynamics_018', 600/300, 2, '2 J/K', '等温可逆熵变Qrev/T。')
check('thermodynamics_020', 8.31*math.log(2), 5.760053070453145, '5.76 J/K', '绝热自由膨胀理想气体初末等温，选可逆等温替代路径得nR ln2。')
check('electromagnetism_009', 8.85e-12*0.01/0.001*1e12, 88.5, '88.5 pF', 'C=ε0A/d=8.85e-11 F，1 pF=1e-12 F。')
check('electromagnetism_010', 2*3/(2+3), 1.2, '1.2 μF', '串联等效电容为C1C2/(C1+C2)。')
check('electromagnetism_013', 0.5*2e-6*100**2, 0.01, '0.01 J', '电容能量CU²/2。')
check('electromagnetism_018', 4*math.pi*1e-7/(2*0.1), 2*math.pi*1e-6, '2π×10⁻⁶ T', '圆环中心B=μ0I/(2R)，与长直导线2πr分母区分。')
check('electromagnetism_020', 4*math.pi*1e-7*1000*2, 8*math.pi*1e-4, '8π×10⁻⁴ T', '空芯长螺线管B=μ0 nI。')
check('electromagnetism_021', (0,-1,0), (0,-1,0), '−y方向', '+x与+z叉积为−y，正电荷不反向。')
check('electromagnetism_024', 10*2*0.01*0.5, 0.1, '0.1 N·m', '线圈力矩NIAB sin90°。')
check('electromagnetism_026', 100*0.02/0.1, 20, '20 V', '每匝通量变化先乘匝数再除以时间。')
check('electromagnetism_029', (math.pi*0.1**2*2)/(2*math.pi*0.1), 0.1, '0.1 V/m', '轴对称时E(2πr)=πr²dB/dt。')
check('electromagnetism_032', 0.5*0.5*2**2, 1, '1 J', '线性电感磁能LI²/2。')
check('oscillations_waves_002', 3*math.pi/2, 1.5*math.pi, '3π/2', 'cosφ=0且v=-Aωsinφ>0，故sinφ=-1。')
check('oscillations_waves_006', 1/math.sqrt(1*1e-4), 100, '100 rad/s', '理想LC角频率1/sqrt(LC)，不是普通频率。')
check('oscillations_waves_007', math.sqrt(2**2+2**2+2*2*2*math.cos(math.pi/2)), 2*math.sqrt(2), '2√2 cm', '相量夹角π/2，两振幅2 cm正交相加。')
check('oscillations_waves_008', 1/abs(103-100), 1/3, '1/3 s', '拍频3 Hz，强弱包络周期1/3 s。')
check('oscillations_waves_010', 0.02*10, 0.2, '0.2 m/s', '质点速度振幅Aω，与相速ω/k=5 m/s区分。')
check('oscillations_waves_015', 100/(2*1), 50, '50 Hz', '固定端基模波长2L，频率u/(2L)。')
check('oscillations_waves_016', 1000*330/(330-30), 1100, '1100 Hz', '静止介质中移动声源而非移动接收者：f′=fu/(u-vs)。')
check('oscillations_waves_017', 10*math.log10(100), 20, '20 dB', '声强比用10lg，不把声强与声压比混用。')
check('oscillations_waves_018', 300/(3e8), 1e-6, '1×10⁻⁶ T', '真空平面行波振幅关系E0=cB0。')

check('optics_001', math.degrees(math.asin(1/2)), 30, '30°', '全反射临界角sinθc=n低/n高=1/2；角度相对法线。')
check('optics_002', 1/(1/10-1/30), 15, '15 cm', '薄透镜1/f=1/u+1/v，实物与实像按题设正号约定。')
check('optics_004', 2*math.pi*300/600, math.pi, 'π', '传播相位差=2π×光程差/真空波长，题设无附加反射相位。')
check('optics_005', 600e-9*2/(0.5e-3)*1e3, 2.4, '2.4 mm', '空气、小角、远场双缝间距Dλ/d，统一米后换算毫米。')
check('optics_007', 600/(4*1.5), 100, '100 nm', '空气—膜—空气反射两路只有一次π反射相变，相长最低正厚度λ0/(4n)。')
check('optics_008', 600e-9/(2*1e-3)*1e3, 0.3, '0.3 mm', '空气劈尖相邻等厚暗纹高度差λ/2，再除楔角θ。')
check('optics_009', math.sqrt(4/1), 2, '2倍', '同装置暗环r_m²=mRλ，第4与第1暗环半径比√4=2。')
check('optics_010', 2*(0.05e-3)/(500e-9), 200, '200', '空气中反射镜位移造成往返光程变化2Δd，条纹数=2Δd/λ。')
check('optics_012', 2*2*500e-9/(0.1e-3)*1e3, 20, '20 mm', '单缝中央亮纹从−1暗纹到+1暗纹，完整宽度2Dλ/a。')
check('optics_013', 1.22*500e-9/0.1, 6.1e-6, '6.1×10⁻⁶ rad', '圆孔瑞利分辨角1.22λ/D；这里使用口径直径。')
check('optics_014', math.degrees(math.asin(500e-9/1e-6)), 30, '30°', '正入射光栅一阶主极大d sinθ=λ。')
check('optics_016', 600/(2*5000), 0.06, '0.06 nm', 'R=mN=λ/Δλ，取有效照明缝数5000。')
check('optics_017', 0.10/(2*math.sin(math.radians(30))), 0.10, '0.10 nm', '一级布拉格2d sinθ=λ，θ相对晶面而非晶面法线。')
check('optics_019', 0.5*math.cos(math.radians(60))**2, 1/8, 'I₀/8', '自然光第一片后为I0/2，第二片再乘cos²60°，得到I0/8。')
check('optics_020', math.degrees(math.atan(math.sqrt(3)/1)), 60, '60°', '布儒斯特角tanθB=n2/n1，角度相对法线。')

check('modern_002', 1/math.sqrt(1-0.6**2), 1.25, '1.25', '洛伦兹因子γ=1/√(1−β²)，β=0.6。')
check('modern_003', -1.25*0.6*3e8*300/(3e8)**2*1e6, -0.75, '−0.75 μs', '同时但空间分离事件Δt′=−γvΔx/c²，换算微秒并保留方向符号。')
check('modern_004', 2/math.sqrt(1-0.6**2), 2.5, '2.5 μs', '实验室平均寿命γτ0=1.25×2 μs。')
check('modern_005', 10*math.sqrt(1-0.6**2), 8, '8 m', '观察系同时测两端，纵向长度L0/γ。')
check('modern_006', (0.6+0.6)/(1+0.6*0.6), 15/17, '0.882c', '共线相对论速度合成得到15c/17≈0.882c，不能用经典1.2c。')
check('modern_007', 1/math.sqrt(1-0.6**2)-1, 0.25, '0.25倍', '动能/静能=γ−1，与总能/静能γ区分。')
check('modern_008', 2**4, 16, '16倍', '斯特藩—玻尔兹曼总辐出度随绝对温度四次方变化。')
check('modern_009', 1240/620, 2, '2 eV', 'E=hc/λ，hc与真空波长均用eV·nm和nm。')
check('modern_010', 5-2, 3, '3 V', '最大光电子动能3 eV，对应反向遏止电压大小3 V。')
check('modern_011', 2.43*(1-math.cos(math.pi/2)), 2.43, '2.43 pm', '自由静止电子康普顿位移λC(1−cosθ)，θ=90°。')
check('modern_012', -13.6/4-(-13.6), 10.2, '10.2 eV', '氢原子n=2到n=1释放能量E2−E1。')
check('modern_013', 6.63e-34/3.315e-24*1e9, 0.20, '0.20 nm', '德布罗意λ=h/p，题目已给动量，无需再用非相对论近似。')
check('modern_014', 1/0.5, 2, '增为2倍', '不确定度下界ħ/(2Δx)随Δx减半而加倍；没有断言实际Δp必加倍。')
check('modern_015', 1*0.25, 0.25, '1/4', '均匀密度1/L在L/4长区间积分。')
check('modern_017', 1/2**2, 0.25, '减为1/4', '无限深势阱基态能量与宽度平方成反比。')
check('modern_019', 0.5*2, 1, '1 eV', '基态n=0，E0=ħω/2。')
check('modern_021', (2*1+1)*2, 6, '6个', 'l=1有2l+1个空间轨道，每轨道两个相反自旋态。')
check('modern_025', 0.01*931.5, 9.315, '9.315 MeV', '核质量亏损单位u乘每u对应的静能931.5 MeV。')
check('modern_026', 0.2*1000, 200, '200 Bq', '活度A=λN，单位s⁻¹对应Bq。')

report = {'reviewer':'/root/university_frontend','date':'2026-10-31','status':'PASS','method':'复核者从题设独立列式复算，并将所选正确选项原文与计算结果人工对应后写入断言；未调用作者numeric-checks表达式。','source':str(source),'question_sha256':hashlib.sha256(question_path.read_bytes()).hexdigest(),'count':len(results),'checks':results,'limits':['这是对模型、符号、方向与单位风险的针对性计算子集，不能替代全量内容逐项阅读。','表达式依据已审题干独立列出；脚本绑定题干原文，题干变化后须重新审读和列式。','独立AI复算，不是教师审查或教材全文校核。']}
output = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'validation' / 'university-uphysics-independent-calculations.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'PASS','independent_calculations':len(results)},ensure_ascii=False))
