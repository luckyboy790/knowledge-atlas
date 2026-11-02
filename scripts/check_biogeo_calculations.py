#!/usr/bin/env python3
"""Independent geography calculations, with problem-text guards and final-content hashes.

This checks quantitative examples, not all scientific assertions. Inputs below were
read from the actual questions by an independent reviewer. No author numeric table
or application answer key is used to derive the expected numerical results.
"""
import argparse
from datetime import datetime,timedelta
import hashlib,json,math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,default=ROOT/'data/geography-questions.json')
    parser.add_argument('--report',type=Path,default=ROOT/'validation/biogeo-calculations.json')
    args=parser.parse_args()
    rows=json.loads(args.data.read_text());byid={q['id']:q for q in rows};checks=[]
    def check(qid,tokens,formula,inputs,result,expected):
        q=byid[qid]
        assert all(token in q['prompt'] for token in tokens),(qid,'Question inputs changed; reread required')
        selected=next(o['text'] for o in q['choices'] if o['key']==q['answer'])
        assert selected==expected,(qid,selected,expected)
        semantic={k:v for k,v in q.items() if k not in ('review_status','review_record')}
        checks.append({'question_id':qid,'question':q['prompt'],'formula_or_method':formula,'inputs':inputs,
                       'derived_result':result,'independently_expected_choice':expected,'actual_choice':selected,
                       'semantic_sha256':hashlib.sha256(json.dumps(semantic,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
                       'status':'PASS'})
    check('cng_007_q1',['100000','3厘米'],'图距厘米×比例尺分母÷100000，换算为千米',{'map_cm':3,'denominator':100000},3*100000/100000,f'{3*100000/100000:g}千米')
    check('cng_008_q1',['1200','300'],'海拔差=山顶−山脚',{'top_m':1200,'base_m':300},1200-300,f'{1200-300}米')
    check('cng_015_q1',['28','18'],'最高气温−最低气温',{'max_c':28,'min_c':18},28-18,f'{28-18}℃')
    check('cng_016_q2',['100米','0.6','20','1000'],'20−1000÷100×0.6；仅使用题设递减率',{'base_c':20,'rise_m':1000,'rate_c_per_100m':0.6},20-1000/100*.6,f'{20-1000/100*.6:g}℃')
    check('cng_019_q1',['100平方千米','20000'],'人口÷面积',{'population':20000,'area_km2':100},20000/100,f'{20000/100:g}人/平方千米')
    check('cng_020_q1',['12‰','8‰'],'出生率−死亡率，单位保持千分数',{'birth_per_mille':12,'death_per_mille':8},12-8,f'{12-8}‰')
    growth=(1.2-1.2)+(3-1)
    check('cng_020_q2',['1.2','迁入3','迁出1'],'自然增加+(迁入−迁出)',{'birth':1.2,'death':1.2,'in':3,'out':1},growth,f'增加{growth:g}万人，来自迁移净增')
    extra=(11000-9000)/500
    check('cng_028_q2',['9000','11000','500'],'新增航程÷日航程',{'old_km':9000,'new_km':11000,'daily_km':500},extra,f'{extra:g}天')
    a,b=30/200*100,20/100*100
    check('cng_043_q2',['30万','200万','20万','100万'],'分别计算同口径老年人口占比，再比较',{'a_elderly':30,'a_total':200,'b_elderly':20,'b_total':100},{'a_pct':a,'b_pct':b},f'乙老龄化比例{b:g}%，高于甲的{a:g}%')
    deficit=140-(100+20);assert deficit>0
    check('cng_051_q2',['100','110','20','140'],'需求−(原供水+调水)',{'initial_supply':100,'added':20,'demand':140},deficit,'供水仍少于需求，需要继续节水和供需管理')
    check('cng_105_q1',['200万','120万'],'城镇常住人口÷全部常住人口×100%',{'urban':120,'total':200},120/200*100,f'{120/200*100:g}%')
    local=datetime(2026,11,1,10)+timedelta(minutes=(120-105)*4)
    check('cng_120_q1',['105°E','10:00','120°E'],'地方时每向东1°增加4分钟',{'from_lon_e':105,'to_lon_e':120,'from_time':'10:00'},local.strftime('%H:%M'),local.strftime('%H:%M'))
    local=datetime(2026,11,1,8)+timedelta(minutes=(116-120)*4)
    check('cng_120_q2',['120°E','116°E','08:00'],'西移4°，时刻减16分钟；忽略均时差',{'standard_lon_e':120,'local_lon_e':116,'standard_time':'08:00'},local.strftime('%H:%M'),local.strftime('%H:%M'))
    check('cng_121_q1',['东八区'],'时区号×15°',{'east_zone':8},8*15,f'{8*15}°E')
    zoned=datetime(2026,11,1,23)+timedelta(hours=10-8)
    check('cng_121_q2',['2026年11月1日23:00','东十区','不采用夏令时'],'东十区−东八区=+2小时，同时做日期进位',{'source':'2026-11-01T23:00','offset_difference_hours':2},zoned.isoformat(),f'{zoned.year}年{zoned.month}月{zoned.day}日{zoned:%H:%M}')
    h=90-abs(40-0)
    check('cng_122_q1',['40°N','赤道'],'H=90°−|纬度−太阳赤纬|',{'latitude':40,'declination':0},h,f'{h:g}°')
    h=90-abs(40-(-23.5));assert h>0
    shadow='北' if 40>-23.5 else '南'
    check('cng_122_q2',['23.5°S','40°N','水平','竖直','正午'],'H=90°−|φ−δ|；φ>δ且太阳在地平线上时，正午太阳在南、杆影朝北',{'latitude':40,'declination':-23.5},{'altitude':h,'shadow':shadow},f'{h:g}°，影子朝{shadow}')
    def day_hours(latitude,declination):
        return 24/math.pi*math.acos(-math.tan(math.radians(latitude))*math.tan(math.radians(declination)))
    d40,d60=day_hours(40,23.5),day_hours(60,23.5);assert d60>d40
    check('cng_123_q2',['40°N','60°N','夏至','折射'],'昼长=24/π×acos(−tanφ tanδ)，太阳中心、无折射理想模型',{'declination':23.5,'latitudes':[40,60]},{'40N_hours':d40,'60N_hours':d60},'60°N更长')
    check('cng_151_q1',['10','50','40'],'第二产业增加值÷三次产业之和',{'values':[10,50,40]},50/(10+50+40)*100,f'{50/(10+50+40)*100:g}%')
    old,new=40/100*100,60/200*100
    check('cng_151_q2',['40','60','100','200'],'分别计算产业增加值和占比的变化',{'old_value':40,'new_value':60,'old_total':100,'new_total':200},{'old_share':old,'new_share':new,'value_increase_pct':(60-40)/40*100},f'第二产业绝对量增加，但占比由{old:g}%降到{new:g}%')
    gap=(100+40)-(100+30)
    check('cng_154_q2',['100','30','40'],'新需求−新供给',{'base_supply':100,'base_demand':100,'supply_change':30,'demand_change':40},gap,f'形成{gap}单位缺口，仍需管理需求和提高效率')
    a,b=300/100,200/50
    check('cng_155_q2',['300元','100件','200元','50件'],'日工资÷日均合格产量',{'a_wage':300,'a_output':100,'b_wage':200,'b_output':50},{'a_cost_per_item':a,'b_cost_per_item':b},f'甲为{a:g}元/件、乙为{b:g}元/件，乙的低日工资不等于低单位人工成本')
    check('cng_160_q1',['100','150'],'补给−净取水',{'recharge':100,'net_withdrawal':150},100-150,f'减少{150-100}单位')
    check('cng_160_q2',['10吨','16吨'],'自然净增加−捕捞',{'net_natural_increase':10,'harvest':16},10-16,f'减少{16-10}吨，应重新评估捕捞强度')
    check('cng_162_q2',['120','10','无新增'],'储备÷每日净消耗',{'stock':120,'daily_net_use':10},120/10,f'{120/10:g}天')
    added=100*((1-.06)-(1-.1))
    check('cng_165_q2',['100万','10%','6%'],'产量×(原损耗率−新损耗率)',{'output_wan_tonnes':100,'old_loss':.1,'new_loss':.06},round(added,10),f'{added:.0f}万吨')
    material=1000*.9**3
    check('cng_172_q2',['90%','1000','3轮'],'初始质量×回收率的轮数次幂',{'initial_kg':1000,'recovery':.9,'rounds':3},round(material,10),f'{material:.0f}千克')
    before,after=10*100,8*150
    check('cng_173_q1',['10','8','100','150'],'单位产品排放×产量；强度与总量分开',{'old_intensity':10,'new_intensity':8,'old_output':100,'new_output':150},{'old_total':before,'new_total':after},f'由{before}升至{after}单位')
    report={'date':'2026-11-01','status':'PASS','reviewer':'root, independent of geography author','question_count':len(checks),'source_file_sha256':hashlib.sha256(args.data.read_bytes()).hexdigest(),'checks':checks,'limitations':['只检验列出的量化题与适用模型，不代表所有内容正确或最新版教材全文已核验。','输入来自独立读题，公式不调用作者计算清单或诊断引擎；题干数字或模型变化须重新人工检查。']}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'question_count':len(checks)},ensure_ascii=False))
if __name__=='__main__': main()
