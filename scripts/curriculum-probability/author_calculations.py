#!/usr/bin/env python3
"""Recompute selected nontrivial answers and rounded critical values.

Uses only Python's standard library. Formula inputs are entered independently
of the authoring helpers; checks bind to the selected answer text in final JSON.
This is a targeted numerical audit, not a claim to machine-prove all semantics.
"""
import argparse, json, math
from fractions import Fraction as F
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def default_data_dir():
    """Prefer an author workspace; otherwise use the installed project layout."""
    return ROOT if (ROOT/'math-probability-questions.json').is_file() else ROOT.parent.parent/'data'

def simpson(fun,a,b,n=12000):
    h=(b-a)/n
    return h/3*(fun(a)+fun(b)+4*sum(fun(a+i*h) for i in range(1,n,2))+2*sum(fun(a+i*h) for i in range(2,n,2)))

def cdf_t(x,nu):
    coefficient=math.gamma((nu+1)/2)/(math.sqrt(nu*math.pi)*math.gamma(nu/2))
    return .5+simpson(lambda v:coefficient*(1+v*v/nu)**(-(nu+1)/2),0,x)

def cdf_chi(x,nu):
    coefficient=1/(2**(nu/2)*math.gamma(nu/2))
    return simpson(lambda v:coefficient*v**(nu/2-1)*math.exp(-v/2),0,x)

def cdf_f(x,m,n):
    coefficient=(m/n)**(m/2)*math.gamma((m+n)/2)/(math.gamma(m/2)*math.gamma(n/2))
    return simpson(lambda v:coefficient*v**(m/2-1)*(1+m*v/n)**(-(m+n)/2),0,x)

def run(data_dir=None):
    data_dir=Path(data_dir) if data_dir is not None else default_data_dir()
    questions={q['id']:q for q in json.loads((data_dir/'math-probability-questions.json').read_text(encoding='utf-8'))}
    records=[]
    def C(node,qnum,formula,value,expected,text,tol=1e-10):
        qid=f'cnm_ps{node:03d}_q{qnum}';q=questions[qid]
        actual=next(c['text'] for c in q['choices'] if c['key']==q['answer'])
        passed=math.isclose(float(value),float(expected),abs_tol=tol,rel_tol=tol) and actual==text
        records.append(dict(question_id=qid,formula=formula,computed=float(value),expected=float(expected),answer_text=text,passed=passed))
        assert passed,records[-1]
    C(4,2,'0.5+0.4+0.3-3*0.1+0.02',.5+.4+.3-3*.1+.02,.92,'0.92')
    C(5,2,'C(4,2)C(3,1)/C(7,3)',F(math.comb(4,2)*math.comb(3,1),math.comb(7,3)),F(18,35),'18/35')
    C(6,2,'triangle area: (1/2)*(1/2)*(1/2)',F(1,2)**3,F(1,8),'1/8')
    C(8,2,'(3/5)*(2/4)*(2/3)',F(3,5)*F(2,4)*F(2,3),F(1,5),'1/5')
    C(9,1,'0.7*0.02+0.3*0.05',.7*.02+.3*.05,.029,'0.029')
    C(9,2,'(1/3)*(3/4)+(2/3)*(1/4)',F(1,3)*F(3,4)+F(2,3)*F(1,4),F(5,12),'5/12')
    C(10,2,'0.4*0.03/(0.6*0.01+0.4*0.03)',F(4,10)*F(3,100)/(F(6,10)*F(1,100)+F(4,10)*F(3,100)),F(2,3),'2/3')
    C(11,2,'1-0.1^3',1-.1**3,.999,'0.999')
    C(18,1,'C(3,2)*(1/2)^3',math.comb(3,2)*F(1,2)**3,F(3,8),'3/8')
    C(18,2,'1-(1-0.8)^3',1-.2**3,.992,'0.992')
    C(19,2,'(3^2/2!)/(3/1!)',(3**2/math.factorial(2))/(3/math.factorial(1)),1.5,'3/2')
    C(21,2,'integral[1/2,1] 2x dx',simpson(lambda x:2*x,.5,1),.75,'3/4')
    C(22,2,'-2+0.75*6',-2+.75*6,2.5,'5/2')
    C(23,2,'exp[-(1/3)*9]/exp[-(1/3)*6]',math.exp(-3)/math.exp(-2),math.exp(-1),'e^(−1)')
    C(24,2,'2*0.8413-1',2*.8413-1,.6826,'0.6826')
    C(25,2,'5+sqrt(9)*1.645',5+math.sqrt(9)*1.645,9.935,'9.935')
    C(27,2,'normalization integral[1,e] 1/y dy',simpson(lambda y:1/y,1,math.e),1,'1/y')
    C(28,2,'CDF check y=2.25: length([-1,1.5])/3',F(5,2)/3,F(5,6),'(1+√y)/3')
    C(29,2,'0.8-0.4-0.3+0.1',.8-.4-.3+.1,.2,'0.2')
    C(31,2,'integral[0,1/2] 2y dy',simpson(lambda y:2*y,0,.5),.25,'1/4')
    C(33,2,'integral[0,1/2] (x+1/2) dx',simpson(lambda x:x+.5,0,.5),.375,'3/8')
    C(34,2,'(3/8)/(3/8+1/4)',F(3,8)/(F(3,8)+F(1,4)),F(3,5),'3/5')
    C(35,2,'(1-3/4)/(1-1/2)',F(1,4)/F(1,2),F(1,2),'1/2')
    C(38,2,'exp(-2)*exp(-3)',math.exp(-2)*math.exp(-3),math.exp(-5),'e^(−5)')
    C(39,2,'integral[1.5,2] (2-z) dz',simpson(lambda z:2-z,1.5,2),.125,'1/8')
    C(40,2,'variance: 2^2*4+(-1)^2*9',2**2*4+(-1)**2*9,25,'N(3,25)')
    C(41,2,'1-(3/4)^3',1-F(3,4)**3,F(37,64),'37/64')
    C(42,1,'integral[0,1] x/2 dx',simpson(lambda x:x/2,0,1),.25,'1/4')
    C(42,2,'1/4+integral[1/4,1] 1/(4x) dx',.25+simpson(lambda x:1/(4*x),.25,1),.25+math.log(4)/4,'1/4+(ln 4)/4')
    C(44,1,'integral[0,1] x*2x dx',simpson(lambda x:2*x*x,0,1),F(2,3),'2/3')
    C(45,2,'integral[0,1] y^3 dy',simpson(lambda y:y**3,0,1),.25,'1/4')
    C(46,2,'3*(4/10)',3*F(4,10),F(6,5),'6/5')
    C(47,1,'7-2^2',7-2**2,3,'3')
    C(48,2,'4^2*(1/2)^2',4**2*F(1,2)**2,4,'4')
    C(49,2,'p=1-3/4; n=4/p',4/(1-F(3,4)),16,'16和1/4')
    C(50,1,'uniform variance: (8-2)^2/12',F((8-2)**2,12),3,'5和3')
    C(51,2,'3*(-2)*(-2)',3*(-2)*(-2),12,'12')
    C(52,2,'4*2+3-4*1',4*2+3-4,7,'7')
    C(53,1,'3/(sqrt(4)*sqrt(9))',3/(math.sqrt(4)*math.sqrt(9)),.5,'1/2')
    C(55,2,'rho*sdX*sdY=(-0.5)*2*3',-.5*2*3,-3,'[[4,−3],[−3,9]]')
    C(56,2,'7-3*3+3*1-1',7-9+3-1,0,'0')
    C(57,2,'1-(1/100)/(0.5^2)',1-(1/100)/(.5**2),.96,'0.96')
    C(59,2,'4/(0.5^2*0.01)',4/(.5**2*.01),1600,'1600')
    C(60,1,'(1/2)*(1/2)/400',F(1,2)**2/400,F(1,1600),'1/1600')
    C(60,2,'0.4*0.6/(0.05^2*0.05)',.4*.6/(.05**2*.05),1920,'1920')
    C(62,2,'(230-100*2)/sqrt(100*9)',(230-100*2)/math.sqrt(100*9),1,'0.8413')
    C(63,2,'corrected interval standardized half-width=(55.5-50)/5',(55.5-50)/5,1.1,'0.7286')
    C(67,2,'12/sqrt(36)',12/math.sqrt(36),2,'2')
    C(68,1,'((2-4)^2+(4-4)^2+(6-4)^2)/(3-1)',sum((x-4)**2 for x in [2,4,6])/2,4,'4')
    C(69,2,'(n-1)*S^2/n+mean^2',F(3,4)*4+2**2,7,'7')
    C(70,2,'chi-square sum variance=2*(3+5)',2*(3+5),16,'8和16')
    C(74,2,'F degrees of freedom first=6-1, second=9-1',6-1,5,'F(5,8)')
    C(76,1,'n/sum(x)',F(3,sum([2,3,5])),F(3,10),'3/10')
    C(77,1,'mean square - square mean',F(sum(x*x for x in [1,2,3]),3)-F(6,3)**2,F(2,3),'(2,2/3)')
    C(77,2,'uniform width=sqrt(12*(A2-A1^2))',math.sqrt(12*(7-2**2)),6,'(−1,5)')
    C(78,2,'Poisson MLE: sample mean',sum([1,2,3])/3,2,'2')
    C(79,2,'exponential scale MLE=sum/n',20/5,4,'4')
    C(80,1,'sum((x-mean)^2)/n',sum((x-2)**2 for x in [1,1,3,3])/4,1,'(2,1)')
    C(80,2,'known mean0: sum(x^2)/n',sum(x*x for x in [1,3])/2,5,'5')
    C(81,1,'support lower parameter boundary=max(2,5,3)',max([2,5,3]),5,'5')
    C(81,2,'feasible lower theta=max(x)-1',max([2.2,2.8])-1,1.8,'区间[1.8,2.2]中的所有值')
    C(82,2,'bias correction for n=5: (6/5)*(5/6)',F(6,5)*F(5,6),1,'((n+1)/n)max Xᵢ')
    C(83,1,'variance+bias^2',3+2**2,7,'7')
    C(86,1,'lower=10-1.96*4/sqrt(16)',10-1.96*4/4,8.04,'[8.04,11.96]')
    C(86,2,'lower=5-1.645*2/sqrt(25)',5-1.645*2/5,4.342,'4.342')
    C(87,1,'lower=10-2.306*3/sqrt(9)',10-2.306*3/3,7.694,'[7.694,12.306]')
    C(87,2,'S=half-width*sqrt(n)/t',1.0655*4/2.131,2,'2')
    C(88,1,'pivot numerator=(n-1)*S^2',9*4,36,'[36/19.023,36/2.700]')
    C(89,1,'lower=3-1.96*sqrt(4/8+4/8)',3-1.96*math.sqrt(4/8+4/8),1.04,'[1.04,4.96]')
    C(89,2,'pooled variance * (1/n1+1/n2)',((4*4+4*9)/8)*(1/5+1/5),2.6,'2±2.306√2.6')
    C(90,2,'reciprocal interval upper=1/(1/2)',1/F(1,2),2,'[1/4,2]')
    C(92,2,'beta=Phi((0.5-1.5)/0.5)',.5*(1+math.erf(-2/math.sqrt(2))),.0228,'0.0228',tol=5e-5)
    C(93,2,'P(X=5)=(1/2)^5',F(1,2)**5,F(1,32),'1/32')
    C(94,1,'z=(104-100)/(10/sqrt(25))',(104-100)/(10/5),2,'z=2，拒绝H₀')
    C(95,2,'t=(11-10)/(2/sqrt(16))',(11-10)/(2/4),2,'t=2，拒绝H₀')
    C(96,2,'Q=(10-1)*8/4',9*8/4,18,'Q=18，拒绝H₀')
    C(97,1,'pooled variance=(4*4+4*9)/8',(4*4+4*9)/8,6.5,'6.5')
    C(97,2,'t=3/sqrt(4*(1/5+1/5))',3/math.sqrt(4*(1/5+1/5)),2.3717082451262845,'t=3/√1.6≈2.372，拒绝H₀')
    C(99,1,'two-sided p=2*(1-0.97725)',2*(1-.97725),.0455,'0.0455')
    critical=[('z_0.975=1.96',.5*(1+math.erf(1.96/math.sqrt(2))),.975),('z_0.95=1.645',.5*(1+math.erf(1.645/math.sqrt(2))),.95),('t_0.975(8)=2.306',cdf_t(2.306,8),.975),('t_0.975(15)=2.131',cdf_t(2.131,15),.975),('t_0.95(15)=1.753',cdf_t(1.753,15),.95),('chi_0.025(9)=2.700',cdf_chi(2.700,9),.025),('chi_0.975(9)=19.023',cdf_chi(19.023,9),.975),('chi_0.95(9)=16.919',cdf_chi(16.919,9),.95),('F_0.025(5,5)=0.140',cdf_f(.140,5,5),.025),('F_0.975(5,5)=7.146',cdf_f(7.146,5,5),.975)]
    for name,value,expected in critical:
        passed=abs(value-expected)<5e-5
        records.append(dict(check=name,method='standard-library density integration / normal erf',computed_cdf=value,target_cdf=expected,tolerance=5e-5,passed=passed));assert passed,records[-1]
    return dict(status='PASS',checks_count=len(records),checks=records,method='逐式独立复算关键数值，核对选中答案文本；用标准库数值积分验证给定分位数的累计概率。',limitations='针对关键数值的抽查；全部定义、题意与选项唯一性由逐条内容复核另行记录。')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir',type=Path,default=default_data_dir(),help='数据目录；默认先用脚本同目录数据，否则使用../../data')
    parser.add_argument('--report',type=Path,default=ROOT/'author-calculation-report.json',help='计算报告输出路径')
    args=parser.parse_args()
    report=run(args.data_dir)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status'],'checks_count':report['checks_count']},ensure_ascii=False))
