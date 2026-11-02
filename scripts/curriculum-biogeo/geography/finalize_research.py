#!/usr/bin/env python3
"""Write compact bibliography, plan and an honest 2025 curriculum crosswalk."""
import json,pathlib
from metadata import BOOKS,DATE,BOUNDARY,REFERENCES,EXCLUDED,CURRICULUM2025
from build import build,dump
from common import ROWS
ROOT=pathlib.Path(__file__).resolve().parent
ids={r['key']:f'cng_{i:03d}' for i,r in enumerate(ROWS,1)}
def req(code,keys,status='core_concepts_and_original_questions',note='仅概念与文字题支持；不能替代课标要求的全部图表、实践和综合表现。'):
    return dict(requirement=code,topic_ids=[ids[x] for x in keys.split('|')],status=status,note=note)
M=[
 dict(module='地理1',book='geo_pep_b1',printed_pages='10—11',requirements=[
 req('1.1','b1_systems|b1_life|b1_solar_energy|b1_solar_activity'),req('1.2','b1_spheres'),req('1.3','b1_earth_history','partial','地层、化石和相对历史已写；完整地质年代表判读未展开。'),
 req('1.4','b1_fluvial_landform|b1_wind_landform|b1_karst|b1_landform_observe','partial','覆盖3类地貌原理；没有真实图像和野外观察评价。'),req('1.5','b1_atmosphere'),req('1.6','b1_heating|b1_thermal|b1_wind'),req('1.7','b1_water_cycle|b1_human_water'),req('1.8','b1_sea_temperature|b1_sea_salinity|b1_sea_motion'),req('1.9','b1_soil','partial','成土因素与组成已写；土壤标本观察未实施。'),req('1.10','b1_vegetation','partial','环境关系已写；植被类型图像识别未完整展开。'),req('1.11','b1_meteor_hazard|b1_geologic_hazard|b1_risk_reduce'),req('1.12','b1_geoinfo','partial','技术用途与场景判断已写；没有实操遥感或GIS任务。')]),
 dict(module='地理2',book='geo_pep_b2',printed_pages='12',requirements=[
 req('2.1','b2_population_distribution|b2_migration|b2_capacity|b2_reasonable_population'),req('2.2','b2_settlement_space|b2_urban_problems','partial','空间结构与职住联系已写；城乡融合具体案例未完整展开。'),req('2.3','b2_culture_landscape'),req('2.4','b2_urbanization|b2_urban_problems'),req('2.5','b2_agri_location|b2_agri_change|b2_industry_location|b2_industry_change|b2_services'),req('2.6','b2_transport_demand|b2_transport_effect'),req('2.7','b2_national_strategy','partial','流域协同和生态约束已写；国家战略专题地图判读未提供。'),req('2.8','b2_marine_rights'),req('2.9','b2_curriculum_islands','attributed_curriculum_text','准确归属中国课程标准的岛屿表述，不据此推导国际各方已一致。'),req('2.10','b2_environment_problem|b2_sustainable'),req('2.11','b1_geoinfo','partial','跨册提供地理信息技术背景；人文地理专门GIS探究未实施。')]),
 dict(module='自然地理基础',book='geo_pep_s1',printed_pages='13—14',requirements=[
 req('1.1','s1_motion|s1_declination|s1_local_time|s1_zone_time|s1_noon_altitude|s1_daylength|s1_zones'),req('1.2','s1_rock_cycle'),req('1.3','s1_internal_external|s1_folds|s1_faults|s1_river_evolution'),req('1.4','s1_fronts|s1_cyclones','partial','文字模型覆盖天气系统；简易天气图判读未实施。'),req('1.5','s1_belts|s1_belt_shift|s1_climate_circulation'),req('1.6','s1_water_exchange|s1_river_recharge','partial','水体补给机制已写；学生绘制示意图的表现未测。'),req('1.7','s1_currents|s1_current_effects','partial','寒暖流与影响已写；世界洋流分布全图与所有主要洋流未穷尽。'),req('1.8','s1_ocean_air|s1_la_nina'),req('1.9','s1_integrity|s1_horizontal_zonation|s1_vertical_zonation')]),
 dict(module='区域发展',book='geo_pep_s2',printed_pages='15',requirements=[
 req('2.1','s2_region'),req('2.2','s2_region_links|s2_compare|s2_natural_basis'),req('2.3','s2_city_radiation|s2_city_network','partial','城市网络原理与情境题已写；具体大都市全套空间案例未提供。'),req('2.4','s2_industry_structure'),req('2.5','s2_resource_city'),req('2.6','s2_fragile'),req('2.7','s2_industry_transfer|s2_transfer_receiving|s2_resource_transfer'),req('2.8','s2_basin|s2_ecocompensation'),req('2.9','s2_international','core_application_scenario','结合一带一路的跨境交通合作情境；非完整真实项目绩效评估。')]),
 dict(module='资源、环境与国家安全',book='geo_pep_s3',printed_pages='16',requirements=[
 req('3.1','s3_resource_use|s3_renewability'),req('3.2','s3_lithium','dated_official_example','按2025中国地质调查局公开例子写类型、地域与技术，不采用实时排名。'),req('3.3','s3_china_cropland|s3_food_security','dated_official_example','以2019标准时点三调公报说明分布与质量，不称2026实时统计。'),req('3.4','s3_marine_space|b2_marine_rights'),req('3.5','s3_climate_change|s3_mitigation_adaptation|s3_international_action','partial','温室效应、减缓适应及合作已写；碳循环的完整碳库通量图题未展开。'),req('3.6','s3_ecological_protection','partial','生境和连通性保护已写；自然保护地具体制度和真实国家公园案例未完整展开。'),req('3.7','s3_pollution_transfer','partial','跨区域传输原理已写；具体跨国污染转移案例未完整展开。'),req('3.8','s3_policy|s3_environment_security|s3_ecocivilization')])
]
assert sum(len(m['requirements']) for m in M)==49
crosswalk={'schema_version':'1.0','subject':'geography','checked_date':DATE,'source_url':CURRICULUM2025,'source_level':'学校正式公开转载的2025国家课程标准原文；课程教材研究所官方通报交叉确认修订存在','read_scope':'封面、课程结构、印刷页10—16五模块全部内容要求。非主教材全文。','scope':'按49项内容要求逐项建立核心节点和剩余实践边界；有映射不等于要求已全部达成。','modules':M,'limitations':['文字选择题不能替代观察、绘图、真实地图判读、实验和社会调查表现。','部分条款只有核心机制支撑，未覆盖完整案例或所有学习表现。',BOUNDARY]}
dump(ROOT/'curriculum2025-alignment.json',crosswalk)
dump(ROOT/'source-research.json',{'schema_version':'1.0','subject':'geography','checked_date':DATE,'method':'官方版本通知、出版社配套目录、有限主教材片段、2025课标五模块全文内容要求及新增节点一手资料相互区分。','version_boundary':BOUNDARY,'books':list(BOOKS.values()),'curriculum_references':REFERENCES,'excluded_content':EXCLUDED,'curriculum_alignment_file':'curriculum2025-alignment.json'})
dump(ROOT/'course-plan.json',{'subject':'geography','checked_date':DATE,'version_boundary':BOUNDARY,'actual_topic_count':len(ROWS),'books':[{'book':b['id'],'volume':b['volume'],'chapters':b['chapters'],'evidence_level':b['evidence_level'],'topic_count':sum(r['book']==b['id'] for r in ROWS)} for b in BOOKS.values()],'coverage_policy':'配套目录的128个小节或整章定位均有核心节点。新增175—179按2025课标补充，保留原174个ID。范围并非教材和课标所有学习表现的穷尽。'})
print('2025 requirements mapped:',sum(len(m['requirements']) for m in M),'topics:',len(ROWS))
