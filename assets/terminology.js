/* Selected headwords from 术语在线, reviewed by subject and linked to existing topic IDs. */
(function () {
  'use strict';
  const entries = [
    {"name": "脏象","english": "visceral manifestations","other": [],"book": "中医药学名词","year": "2004","record": "f82c695926a611ee85b4b068e6519520","topics": ["tcm_basics_011"]},
    {"name": "饮片","english": "prepared drug in pieces","other": [],"book": "中医药学名词","year": "2004","record": "fdf7b80a26a611ee9e34b068e6519520","topics": ["herbal_materia_001","herbal_processing_009"]},
    {"name": "整体观念","english": "holism","other": [],"book": "中医药学名词","year": "2004","record": "057aad6b26a711eeb795b068e6519520","topics": ["tcm_basics_001"]},
    {"name": "辨证论治","english": "treatment based on syndrome differentiation","other": [],"book": "中医药学名词","year": "2004","record": "0871c18b26a711eeaad1b068e6519520","topics": ["tcm_basics_002"]},
    {"name": "同病异治","english": "treating same disease with different methods","other": [],"book": "中医药学名词","year": "2004","record": "0667c7b126a711eeae47b068e6519520","topics": ["tcm_basics_002"]},
    {"name": "异病同治","english": "treating different diseases with same method","other": [],"book": "中医药学名词","year": "2004","record": "fc96f81226a611ee8778b068e6519520","topics": ["tcm_basics_002"]},
    {"name": "经络","english": "channel,meridian","other": [],"book": "中医药学名词","year": "2004","record": "f8a711ca26a611eebdedb068e6519520","topics": ["tcm_basics_025","tcm_diagnostics_026","tcm_meridians_001","tcm_meridians_002"]},
    {"name": "四诊","english": "four diagnostic methods","other": [],"book": "中医药学名词","year": "2004","record": "fa0f225c26a611eea349b068e6519520","topics": ["tcm_diagnostics_001"]},
    {"name": "望诊","english": "inspection","other": [],"book": "中医药学名词","year": "2004","record": "fa13d8c026a611eea0a7b068e6519520","topics": ["tcm_diagnostics_006"]},
    {"name": "闻诊","english": "listening and smelling","other": [],"book": "中医药学名词","year": "2004","record": "087eb0ee26a711ee8b6fb068e6519520","topics": ["tcm_diagnostics_007"]},
    {"name": "问诊","english": "inquiry","other": [],"book": "中医药学名词","year": "2004","record": "06052abf26a711eeb8d2b068e6519520","topics": ["tcm_diagnostics_008"]},
    {"name": "切诊","english": "palpation and pulse taking","other": [],"book": "中医药学名词","year": "2004","record": "fb514bdf26a611ee93eab068e6519520","topics": ["tcm_diagnostics_011","tcm_diagnostics_012"]},
    {"name": "八纲辨证","english": "syndrome differentiation of eight principles","other": [],"book": "中医药学名词","year": "2004","record": "fb8c09b326a611eeba6bb068e6519520","topics": ["tcm_diagnostics_016"]},
    {"name": "归经","english": "channel tropism","other": [],"book": "中医药学名词","year": "2004","record": "06ab7ef726a711eeaa23b068e6519520","topics": ["herbal_materia_005"]},
    {"name": "四气","english": "four nature of drugs","other": [["又称","四性"]],"book": "中医药学名词","year": "2004","record": "fdd04dc726a611ee91eeb068e6519520","topics": ["herbal_materia_002"]},
    {"name": "五味","english": "five flavours","other": [],"book": "中医药学名词","year": "2004","record": "fdd810c326a611eeaf99b068e6519520","topics": ["herbal_materia_003"]},
    {"name": "升降浮沉","english": "ascending and descending,floating and sinking","other": [],"book": "中医药学名词","year": "2004","record": "06aa953526a711ee995fb068e6519520","topics": ["herbal_materia_004"]},
    {"name": "中成药","english": "traditional Chinese patent medicines and simple preparations","other": [],"book": "中医药学名词","year": "2004","record": "0711272226a711ee9258b068e6519520","topics": ["herbal_materia_001"]},
    {"name": "配伍","english": "concerted application","other": [],"book": "中医药学名词","year": "2004","record": "fdf8c8cf26a611ee8554b068e6519520","topics": ["tcm_formulas_002","herbal_materia_007"]},
    {"name": "炮制","english": "processing","other": [],"book": "中医药学名词","year": "2004","record": "06af25f126a711ee9893b068e6519520","topics": ["herbal_processing_001"]},
    {"name": "神经元","english": "neuron","other": [],"book": "生理学名词","year": "2020","record": "620f8c6326ad11eea9d7b068e6519520","topics": ["med_histology_006"]},
    {"name": "动作电位","english": "action potential","other": [],"book": "生理学名词","year": "2020","record": "60a4e57226ad11eea64bb068e6519520","topics": ["med_physiology_003"]},
    {"name": "静息电位","english": "resting potential","other": [],"book": "生理学名词","year": "2020","record": "609d23ef26ad11ee82d1b068e6519520","topics": ["med_physiology_003"]},
    {"name": "心输出量","english": "cardiac output","other": [["又称","心排血量"],["又称","每分输出量"]],"book": "生理学名词","year": "2020","record": "68a6a06c26ad11ee8da4b068e6519520","topics": ["med_physiology_006"]},
    {"name": "每搏输出量","english": "stroke volume","other": [["又称","搏出量"]],"book": "生理学名词","year": "2020","record": "68aa1ef526ad11eebfe2b068e6519520","topics": ["med_physiology_006"]},
    {"name": "心动周期","english": "cardiac cycle","other": [],"book": "生理学名词","year": "2020","record": "6894f7dd26ad11eeb3b7b068e6519520","topics": ["med_physiology_006"]},
    {"name": "反射弧","english": "reflex arc","other": [],"book": "生理学名词","year": "2020","record": "6299e03626ad11ee8a43b068e6519520","topics": ["med_anatomy_012"]},
    {"name": "细胞外基质","english": "extracellular matrix,ECM","other": [],"book": "生理学名词","year": "2020","record": "5e6a5e9726ad11eea00cb068e6519520","topics": ["med_histology_003"]},
    {"name": "肺泡","english": "pulmonary alveoli","other": [],"book": "人体解剖学名词","year": "2014","record": "2cead15726a711ee883fb068e6519520","topics": ["med_histology_008","med_physiology_008"]},
    {"name": "心电图","english": "electrocardiogram,ECG,electrokardiogram,EKG","other": [],"book": "生理学名词","year": "2020","record": "68d6411726ad11eeba71b068e6519520","topics": ["med_diagnostics_012"]},
    {"name": "自主神经系统","english": "autonomic nervous system","other": [["又称","内脏神经系统"]],"book": "生理学名词","year": "2020","record": "6756e8e226ad11eebecdb068e6519520","topics": ["med_pharmacology_011"]},
    {"name": "肾小球滤过率","english": "glomerular filtration rate,GFR","other": [],"book": "生理学名词","year": "2020","record": "6d81d20126ad11eebe60b068e6519520","topics": ["med_physiology_010"]},
    {"name": "免疫耐受","english": "immunologic tolerance","other": [],"book": "医学名词 第六分册","year": "1997","record": "27a751d926a811ee891ab068e6519520","topics": ["med_immunology_009"]},
    {"name": "抗原","english": "antigen,Ag","other": [],"book": "免疫学名词","year": "2007","record": "46509c3a26a711ee9501b068e6519520","topics": ["med_immunology_003","med_immunology_006"]},
    {"name": "抗体","english": "antibody","other": [],"book": "免疫学名词","year": "2007","record": "4aa1bf6f26a711eea1dbb068e6519520","topics": ["med_immunology_004"]},
    {"name": "水肿","english": "edema","other": [],"book": "生理学名词","year": "2020","record": "679158f526ad11eeb59db068e6519520","topics": ["med_pathology_006"]},
    {"name": "高速缓存","english": "cache","other": [["全称","高速缓冲存储器"]],"book": "计算机科学技术名词","year": "2018","record": "7ab1ad6326b011eeb7c7b068e6519520","topics": ["cs408_co_034","cs408_co_035","cs408_co_036","cs408_co_039"]},
    {"name": "哈希表","english": "hash table","other": [["又称","散列表"]],"book": "计算机科学技术名词","year": "2018","record": "736b705926b011ee9006b068e6519520","topics": ["cs408_ds_055","cs408_ds_057"]},
    {"name": "二叉查找树","english": "binary search tree,BST","other": [["又称","二叉排序树"]],"book": "计算机科学技术名词","year": "2018","record": "6ddc107826b011eeabc3b068e6519520","topics": ["cs408_ds_050"]},
    {"name": "算法","english": "algorithm","other": [],"book": "计算机科学技术名词","year": "2018","record": "8a1c7c1726b011ee82bfb068e6519520","topics": ["cs408_ds_002"]},
    {"name": "二叉树","english": "binary tree","other": [],"book": "计算机科学技术名词","year": "2018","record": "6c1ee60726b011eeabeeb068e6519520","topics": ["cs408_ds_024","cs408_ds_025","cs408_ds_026","cs408_ds_027"]},
    {"name": "抽象数据类型","english": "abstract data type","other": [],"book": "计算机科学技术名词","year": "2018","record": "8a2881aa26b011eeb506b068e6519520","topics": ["cs408_ds_001"]},
    {"name": "数据结构","english": "data structure","other": [],"book": "计算机科学技术名词","year": "2018","record": "a3fc01ef26b011ee8699b068e6519520","topics": ["cs408_ds_001"]},
    {"name": "双向链表","english": "doubly linked list","other": [["简称","双链表"]],"book": "计算机科学技术名词","year": "2018","record": "74e39fe326b011eeb850b068e6519520","topics": ["cs408_ds_010"]},
    {"name": "队列","english": "queue","other": [],"book": "计算机科学技术名词","year": "2018","record": "888651b126b011eebe6eb068e6519520","topics": ["cs408_ds_017","cs408_ds_018","cs408_ds_031","cs408_os_017"]},
    {"name": "操作系统","english": "operating system,OS","other": [],"book": "计算机科学技术名词","year": "2018","record": "947ec7f226b011ee9974b068e6519520","topics": ["cs408_os_001","cs408_os_007"]},
    {"name": "死锁","english": "deadlock","other": [],"book": "计算机科学技术名词","year": "2018","record": "a4f34d4526b011eea358b068e6519520","topics": ["cs408_os_027","cs408_os_028","cs408_os_030"]},
    {"name": "虚拟存储器","english": "virtual memory","other": [],"book": "计算机科学技术名词","year": "2018","record": "70ee68f026b011ee9042b068e6519520","topics": ["cs408_co_040","cs408_os_037"]},
    {"name": "中央处理器","english": "central processing unit,CPU","other": [["又称","中央处理机"]],"book": "计算机科学技术名词","year": "2018","record": "97e6ef4e26b011ee9b10b068e6519520","topics": ["cs408_co_005","cs408_co_049","cs408_co_052","cs408_co_068","cs408_co_070"]},
    {"name": "进程","english": "process","other": [],"book": "计算机科学技术名词","year": "2018","record": "9dfa126d26b011eea688b068e6519520","topics": ["cs408_os_009","cs408_os_010","cs408_os_011","cs408_os_063"]},
    {"name": "正态分布","english": "normal distribution","other": [],"book": "数学名词","year": "1993","record": "ab7b692026a911eea3f5b068e6519520","topics": ["cnm_kxzxbx3cpt37","cnm_ps024"]},
    {"name": "条件概率","english": "conditional probability","other": [],"book": "数学名词","year": "1993","record": "aaa375df26a911eeb75bb068e6519520","topics": ["cnm_h244","cnm_ps007"]},
    {"name": "随机变量","english": "random variable","other": [],"book": "数学名词","year": "1993","record": "c560502b26a911eea7a3b068e6519520","topics": ["cnm_kxzxbx3cpt19","cnm_h249","cnm_kxzxbx3cpt21"]},
    {"name": "样本空间","english": "sample space","other": [],"book": "数学名词","year": "1993","record": "aa62ef8b26a911ee9780b068e6519520","topics": ["cnm_kbx2cpt127","cnm_ps001","cnm_ps007"]},
    {"name": "标准差","english": "standard deviation","other": [],"book": "数学名词","year": "1993","record": "abcb73d126a911eebb3ab068e6519520","topics": ["cnm_k8bcpt70"]},
    {"name": "方差","english": "variance","other": [],"book": "数学名词","year": "1993","record": "abc4e9cf26a911ee9052b068e6519520","topics": ["cnm_k8bcpt67","cnm_h256","cnm_ps068"]},
    {"name": "导数","english": "derivative","other": [["又称","微商"]],"book": "数学名词","year": "1993","record": "bf0ce53e26a911eeb4a1b068e6519520","topics": ["cnm_kxzxbx2cpt33","cnm_u004"]},
    {"name": "微分方程","english": "differential equation","other": [],"book": "数学名词","year": "1993","record": "99c3e51426a911eea081b068e6519520","topics": ["cnm_u018","cnm_u019"]},
    {"name": "特征值","english": "characteristic value","other": [],"book": "数学名词","year": "1993","record": "89696a9e26a911eea6e1b068e6519520","topics": ["cnm_l017"]},
    {"name": "定积分","english": "definite integral","other": [],"book": "数学名词","year": "1993","record": "97b36b1326a911ee897db068e6519520","topics": ["cnm_u014","cnm_u016"]},
    {"name": "二项分布","english": "binomial distribution","other": [],"book": "数学名词","year": "1993","record": "ab0dfcda26a911ee9908b068e6519520","topics": ["cnm_h255","cnm_h256","cnm_kxzxbx3skl10"]},
    {"name": "泊松分布","english": "Poisson distribution","other": [],"book": "数学名词","year": "1993","record": "ab12db7526a911eea3deb068e6519520","topics": ["cnm_ps019"]},
    {"name": "动量","english": "momentum","other": [],"book": "物理学名词","year": "2019","record": "76a99c1926ac11eea121b068e6519520","topics": ["cnp_kxzxbx1cpt1","cnp_kxzxbx1cpt2","cnp_kxzxbx1skl1"]},
    {"name": "角动量","english": "angular momentum","other": [],"book": "物理学名词","year": "2019","record": "d883c35f26ac11eeab98b068e6519520","topics": ["uphy_mechanics_011","uphy_mechanics_021"]},
    {"name": "加速度","english": "acceleration","other": [],"book": "物理学名词","year": "2019","record": "c346ca2326ac11ee9349b068e6519520","topics": ["cnp_kbx1cpt21","cnp_k8bcpt18","cnp_kbx1cpt23"]},
    {"name": "牛顿第二定律","english": "Newton's second law","other": [],"book": "物理学名词","year": "2019","record": "bc8b7e0326ac11ee953cb068e6519520","topics": ["cnp_h016","cnp_kbx3skl19"]},
    {"name": "动能","english": "kinetic energy","other": [],"book": "物理学名词","year": "2019","record": "a050e03026ac11ee8ca8b068e6519520","topics": ["cnp_k8bcpt72","cnp_k8bcpt73","cnp_k8bexp19"]},
    {"name": "势能","english": "potential energy","other": [],"book": "物理学名词","year": "2019","record": "f629589b26ac11eebf44b068e6519520","topics": ["cnp_k8bcpt74","cnp_k8bcpt75","cnp_k8bcpt76"]},
    {"name": "向心力","english": "centripetal force","other": [],"book": "物理学名词","year": "2019","record": "cfba112726ac11ee88f3b068e6519520","topics": ["cnp_kbx2cpt26","cnp_kbx2cpt29","cnp_kbx2exp6"]},
    {"name": "转动惯量","english": "moment of inertia","other": [],"book": "物理学名词","year": "2019","record": "e2989d3f26ac11eeb466b068e6519520","topics": ["uphy_mechanics_018","uphy_mechanics_021"]},
    {"name": "电阻","english": "[electric] resistance","other": [],"book": "物理学名词","year": "2019","record": "f40a0f4d26ac11ee91dbb068e6519520","topics": ["cnp_039","cnp_k9cpt67","cnp_k9exp24"]},
    {"name": "电势差","english": "electric potential difference","other": [],"book": "物理学名词","year": "2019","record": "9223354a26ac11eeadd2b068e6519520","topics": ["cnp_kbx3cpt56","cnp_kbx3skl12","cnp_kbx3cpt61"]},
    {"name": "磁通量","english": "magnetic flux","other": [],"book": "物理学名词","year": "2019","record": "d69b1ad726ac11ee8d02b068e6519520","topics": ["cnp_kbx3cpt177","cnp_kbx3cpt178","cnp_kbx3cpt180"]},
    {"name": "电磁感应","english": "electromagnetic induction","other": [],"book": "物理学名词","year": "2019","record": "e190948826ac11ee8c56b068e6519520","topics": ["cnp_k9cpt149","cnp_kbx3cpt182","cnp_kbx3cpt183"]},
    {"name": "氢键","english": "hydrogen bond","other": [],"book": "化学名词","year": "2016","record": "b5a7e19b26a711ee9701b068e6519520","topics": ["cnc_kbx1cpt246","cnc_kxzxbx2cpt106","cnc_kxzxbx2cpt107"]},
    {"name": "原子轨道","english": "atomic orbital","other": [],"book": "化学名词","year": "2016","record": "c8ecd4d126a711ee8c9fb068e6519520","topics": ["cnc_kxzxbx2cpt18","cnc_kxzxbx2cpt45","cnc_kxzxbx2skl9"]},
    {"name": "摩尔质量","english": "molar mass","other": [],"book": "化学名词","year": "2016","record": "ba71171726a711eeaafab068e6519520","topics": ["cnc_kbx1cpt112","cnc_kbx1skl25","cnc_kbx1cpt167"]},
    {"name": "催化剂","english": "catalyst","other": [],"book": "化学名词","year": "2016","record": "bbb8209526a711eeaabfb068e6519520","topics": ["cnc_007","cnc_k9acpt113","cnc_k9askl27"]},
    {"name": "化学平衡","english": "chemical equilibrium","other": [],"book": "化学名词","year": "2016","record": "b76d3a7c26a711eea083b068e6519520","topics": ["cnc_kxzxbx1cpt90","cnc_kbx2cpt134","cnc_kxzxbx1cpt43"]},
    {"name": "配位数","english": "coordination number","other": [],"book": "化学名词","year": "2016","record": "b3aafe4c26a711eea8deb068e6519520","topics": ["cnc_kxzxbx2cpt214","uch_structure_023"]},
    {"name": "共价键","english": "covalent bond","other": [],"book": "化学名词","year": "2016","record": "a2c74c2126a711ee8347b068e6519520","topics": ["cnc_kbx1cpt237","cnc_kbx1cpt239","cnc_kbx1cpt240"]},
    {"name": "电离能","english": "ionization energy","other": [],"book": "化学名词","year": "2016","record": "a237ca7c26a711eead37b068e6519520","topics": ["cnc_kxzxbx2cpt35","cnc_kxzxbx2skl6"]},
    {"name": "脱氧核糖核酸","english": "deoxyribonucleic acid;DNA","other": [],"book": "生物化学与分子生物学名词","year": "2024","record": "d38baf8a1e4311efbb160242ac110002","topics": ["cnb_kbx1cpt72","cnb_kbx2cpt70"]},
    {"name": "核糖核酸","english": "ribonucleic acid;RNA","other": [],"book": "生物化学与分子生物学名词","year": "2024","record": "d37358ae1e4311efbb160242ac110002","topics": ["cnb_kbx1cpt73"]},
    {"name": "细胞膜","english": "cell membrane","other": [],"book": "生物化学与分子生物学名词","year": "2024","record": "01ce70bc1e4411efbb160242ac110002","topics": ["cnb_k7acpt48","cnb_kbx1cpt84","cnb_kbx1cpt85"]},
    {"name": "线粒体","english": "mitochondrion","other": [],"book": "细胞生物学名词","year": "2009","record": "4dd4d0f026af11eeb519b068e6519520","topics": ["cnb_k7acpt51","cnb_k7acpt145","cnb_kbx1cpt179"]},
    {"name": "光合作用","english": "photosynthesis","other": [],"book": "生物化学与分子生物学名词","year": "2024","record": "1eb114821e4411efbb160242ac110002","topics": ["cnb_k7acpt4","cnb_k7acpt132","cnb_k7acpt140"]},
    {"name": "有丝分裂","english": "mitosis","other": [],"book": "细胞生物学名词","year": "2009","record": "4e0be7d726af11ee91a3b068e6519520","topics": ["cnb_kbx1cpt205","cnb_kbx1cpt206","cnb_kbx1cpt207"]},
    {"name": "染色体","english": "chromosome","other": [],"book": "细胞生物学名词","year": "2009","record": "4c7e1acf26af11eeafadb068e6519520","topics": ["cnb_k7acpt65","cnb_k7acpt66","cnb_k8bcpt20"]},
    {"name": "基因突变","english": "gene mutation","other": [],"book": "生物化学与分子生物学名词","year": "2024","record": "e073b63e1e4311efbb160242ac110002","topics": ["cnb_kbx2cpt123","cnb_kbx2cpt125","cnb_kbx2cpt127"]},
    {"name": "叶绿体","english": "chloroplast","other": [],"book": "细胞生物学名词","year": "2009","record": "4dc87d5026af11eea70fb068e6519520","topics": ["cnb_k7acpt52","cnb_kbx1exp8","cnb_kbx1cpt195"]},
    {"name": "经度","english": "longitude","other": [],"book": "测绘学名词","year": "2020","record": "06cdf53f26ac11eeb01fb068e6519520","topics": ["cng_002","cng_120"]},
    {"name": "纬度","english": "latitude","other": [],"book": "测绘学名词","year": "2020","record": "06d0169226ac11ee91cbb068e6519520","topics": ["cng_002","cng_123"]},
    {"name": "海拔","english": "altitude,height above sea level","other": [],"book": "地理学名词","year": "2006","record": "b86a34af26a811eeb8ddb068e6519520","topics": ["cng_008"]},
    {"name": "等高线","english": "contour","other": [],"book": "测绘学名词","year": "2020","record": "11be8b2026ac11eea43bb068e6519520","topics": ["cng_009"]},
    {"name": "季风","english": "monsoon","other": [],"book": "地理学名词","year": "2006","record": "ba4c29f526a811ee887eb068e6519520","topics": ["cng_030","cng_046"]},
    {"name": "城市化","english": "urbanization","other": [],"book": "地理学名词","year": "2006","record": "b576c7f326a811ee98d3b068e6519520","topics": ["cng_105","cng_106"]},
  ];

  const byTopic = new Map();
  const searchText = new Map();
  for (const term of entries) {
    const keys = [term.name, term.english, ...term.other.map(item => item[1])];
    for (const id of term.topics) {
      if (!byTopic.has(id)) byTopic.set(id, []);
      byTopic.get(id).push(term);
      searchText.set(id, (searchText.get(id) || '') + '\n' + keys.join('\n').toLowerCase());
    }
  }

  window.AtlasTerms = {
    forTopic(id) { return byTopic.get(id) || []; },
    matches(id, query) { return (searchText.get(id) || '').includes(query); },
    entryUrl(term) {
      const params = new URLSearchParams({termName:term.name, subject:term.record, base:'1'});
      return 'https://www.termonline.cn/wordDetail?' + params.toString();
    }
  };
})();
