/* 学科、相对路径和教材出处；原始数学/英语数据与诊断引擎不变。 */
(function () {
  'use strict';
  const names = {math:'数学', english:'英语', physics:'物理', chemistry:'化学', biology:'生物', geography:'地理', cs408:'408', med:'医学', tcm:'中医药'};
  const aliases = {uphysics:'physics', uchemistry:'chemistry', herbal:'tcm'};
  const rawNames = Object.assign({}, names, {tcm:'中医', herbal:'中药', uphysics:'大学物理', uchemistry:'大学化学'});
  const groups = {physics:['physics','uphysics'], chemistry:['chemistry','uchemistry'], tcm:['tcm','herbal']};
  function canonical(s) { return aliases[s] || s; }
  function members(s) { s = canonical(s); return (groups[s] || [s]).slice(); }
  function merged(s) { return !!groups[canonical(s)]; }
  function mixedScience(s) { s = canonical(s); return s === 'physics' || s === 'chemistry'; }
  const courses = [
    {id:'ds',grade:17,name:'数据结构',summary:'算法、线性结构、树与图、查找与排序'},
    {id:'co',grade:18,name:'计算机组成原理',summary:'数据表示、存储系统、指令、CPU与I/O'},
    {id:'os',grade:19,name:'操作系统',summary:'进程、同步与调度、内存、文件与设备'},
    {id:'cn',grade:20,name:'计算机网络',summary:'分层、链路、IP、传输与应用协议'}
  ];
  const medicalCourses = {
    med:[
      {id:'anatomy',grade:21,name:'系统解剖学',summary:'人体方位、系统组成与结构联系'},
      {id:'histology',grade:22,name:'组织学与胚胎学',summary:'基本组织、器官微结构与早期发育'},
      {id:'physiology',grade:23,name:'生理学',summary:'稳态、膜电位、循环与器官功能'},
      {id:'biochem',grade:24,name:'生物化学与分子生物学',summary:'生物分子、代谢与遗传信息'},
      {id:'immunology',grade:25,name:'医学免疫学',summary:'固有与适应性免疫、免疫应答'},
      {id:'microbiology',grade:26,name:'医学微生物学',summary:'细菌、病毒、真菌与宿主关系'},
      {id:'pathology',grade:27,name:'病理学',summary:'细胞损伤、炎症、修复与肿瘤'},
      {id:'pathophys',grade:28,name:'病理生理学',summary:'水电解质、酸碱与功能代谢变化'},
      {id:'pharmacology',grade:29,name:'药理学',summary:'药效、药动、作用机制与评价'},
      {id:'diagnostics',grade:30,name:'诊断学基础',summary:'病史、体征、检验与临床推理基础'}
    ],
    tcm:[
      {id:'basics',grade:31,name:'中医基础理论',summary:'思维方式、藏象、气血津液与病机'},
      {id:'diagnostics',grade:32,name:'中医诊断学',summary:'四诊、辨证与证候概念'},
      {id:'formulas',grade:33,name:'方剂学',summary:'治法、组方结构与方剂分类'},
      {id:'meridians',grade:34,name:'针灸学基础',summary:'经络与腧穴的理论和分类'}
    ],
    herbal:[
      {id:'materia',grade:41,name:'中药学',summary:'传统药性、功效分类与代表药材'},
      {id:'identification',grade:42,name:'中药鉴定学',summary:'基原、性状、鉴别与质量标准'},
      {id:'chemistry',grade:43,name:'中药化学',summary:'成分类别、结构与分析思路'},
      {id:'processing',grade:44,name:'中药炮制学',summary:'炮制目的、原理与质量评价'},
      {id:'pharmaceutics',grade:45,name:'中药药剂学',summary:'剂型、制剂特征与稳定性'},
      {id:'pharmacology',grade:46,name:'中药药理学',summary:'实验研究、药动毒理与证据评价'}
    ]
  };
  const universityScienceModules = {
    uphysics:[
      {id:'mechanics',grade:51,name:'力学',summary:'从运动学微积分到动量、能量、刚体与理想流体'},
      {id:'thermodynamics',grade:52,name:'热学',summary:'从分子统计到热力学过程、热机与熵'},
      {id:'electromagnetism',grade:53,name:'电磁学',summary:'静电场、磁场、电磁感应及麦克斯韦方程'},
      {id:'oscillations_waves',grade:54,name:'振动与波',summary:'简谐振动、波动、干涉驻波及电磁波'},
      {id:'optics',grade:55,name:'光学',summary:'几何光学、干涉、衍射与偏振'},
      {id:'modern',grade:56,name:'相对论与量子基础',summary:'相对论时空、量子概念、能带与原子核入门'}
    ],
    uchemistry:[
      {id:'structure',grade:61,name:'物质结构基础',summary:'气体模型、原子轨道、化学键与物质结构'},
      {id:'thermodynamics',grade:62,name:'化学热力学与平衡',summary:'热力学函数、化学势与平衡判据'},
      {id:'kinetics',grade:63,name:'化学动力学与界面',summary:'反应速率、反应机理与界面现象'},
      {id:'solution',grade:64,name:'溶液与离子平衡',summary:'溶液性质、酸碱、沉淀与配位平衡'},
      {id:'electrochemistry',grade:65,name:'电化学',summary:'电极电势、电池与电化学关系'},
      {id:'organic',grade:66,name:'基础有机化学',summary:'结构、立体化学与典型反应规律'},
      {id:'analysis',grade:67,name:'分析化学',summary:'误差评价、定量分析与仪器方法'}
    ]
  };
  function inferred(id) {
    id = String(id || '').trim().split(',')[0];
    return /^uphy_/.test(id) ? 'uphysics' : /^uch_/.test(id) ? 'uchemistry' : /^(med|tcm|herbal)_/.test(id) ? id.split('_')[0] : /^cs408_/.test(id) ? 'cs408' : /^cnb_/.test(id) ? 'biology' : /^cng_/.test(id) ? 'geography' : /^cnc_/.test(id) ? 'chemistry' : /^cnp_/.test(id) ? 'physics' : /^cne_/.test(id) ? 'english' : /^cnm_/.test(id) ? 'math' : '';
  }
  function requested() {
    const p = new URLSearchParams(location.search), explicit = p.get('subject');
    if (rawNames[explicit]) return explicit;
    let id = p.get('target') || location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch (_) { /* Preserve an invalid legacy fragment. */ }
    return inferred(id) || 'math';
  }
  function read() { return canonical(requested()); }
  function rawOf(t) { return inferred(t.id) || t.subject || 'math'; }
  function of(t) { return canonical(rawOf(t)); }
  function initialScope() {
    const raw = requested();
    return {subject:canonical(raw), stage:universityScience(raw) ? 'u' : '', member:raw === 'herbal' ? 'herbal' : ''};
  }
  function link(href, subject) {
    if (!href || href[0] === '#' || /^(?:https?:|data:|mailto:)/.test(href)) return href;
    const parts = href.split('#'), base = parts.shift(), q = base.split('?');
    const params = new URLSearchParams(q[1] || '');
    const wanted = canonical(params.get('subject') || subject || read());
    if (wanted !== 'math' || params.has('subject')) params.set('subject', wanted);
    return q[0] + (params.toString() ? '?' + params.toString() : '') + (parts.length ? '#' + parts.join('#') : '');
  }
  function data(file, subject) { subject = canonical(subject); return (science(subject) || academic(subject)) && /^(topics|dependencies|questions)\.json$/.test(file) ? subject + '-' + file : file; }
  // 普通脚本可在完整解压后的 file:// 页面及 HTTP 子路径加载；不依赖 JSON fetch。
  const scriptUrl = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
  const payloads = Object.create(null), pending = Object.create(null);
  const manifest = window.ToyDataFiles || Object.create(null);
  window.ToyData = {register:function(file, source) {
    if (!Object.prototype.hasOwnProperty.call(manifest, file) || typeof source !== 'string') throw new Error('无效的知识数据文件');
    payloads[file] = source;
  }};
  function loadJson(file) {
    if (!Object.prototype.hasOwnProperty.call(manifest, file)) return Promise.reject(new Error('知识数据清单缺少 ' + file));
    if (!pending[file]) pending[file] = new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      let timer;
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        script.remove();
        if (error) reject(error); else resolve();
      }
      script.src = new URL('../data/runtime/' + manifest[file], scriptUrl).href;
      script.async = true;
      script.onload = function() { finish(typeof payloads[file] === 'string' ? null : new Error('知识数据文件不完整：' + file)); };
      script.onerror = function() { finish(new Error('无法加载知识数据：' + file)); };
      timer = setTimeout(function() { finish(new Error('知识数据加载超时：' + file)); }, 15000);
      document.head.appendChild(script);
    });
    // 每次读取返回独立对象，避免界面或引擎处理污染其他调用的数据。
    return pending[file].then(function() { return JSON.parse(payloads[file]); });
  }
  function response(value) { return {ok:true, status:200, json:async function(){return value;}}; }
  async function fetchRaw(url) { return response(await loadJson(url.split(/[?#]/)[0].split('/').pop())); }
  // 只在展示层合并：原始来源、ID、教材定位及独立 JSON 均不改变。
  async function fetchData(url, subject) {
    const file = url.split(/[?#]/)[0].split('/').pop();
    subject = canonical(subject || read());
    const kind = /(?:^|-)(topics|dependencies|questions)\.json$/.exec(file);
    let value;
    if (subject === 'math' && /^(?:topics|dependencies|questions)\.json$/.test(file)) {
      const arrays = await Promise.all([loadJson(file), loadJson('math-university-' + file), loadJson('math-probability-' + file)]);
      if (!arrays.every(Array.isArray)) throw new Error('大学数学数据格式错误');
      value = arrays[0].concat(arrays[1], arrays[2]);
    } else if (merged(subject) && kind) {
      const arrays = await Promise.all(members(subject).map(function(s){return loadJson(s + '-' + kind[1] + '.json');}));
      if (!arrays.every(Array.isArray)) throw new Error('合并学科数据格式错误');
      value = [].concat.apply([], arrays);
      if (kind[1] === 'dependencies') {
        const bridges = await loadJson('subject-bridge-dependencies.json');
        if (!Array.isArray(bridges)) throw new Error('跨课程先修数据格式错误');
        value = value.concat(bridges.filter(function(e){return canonical(e.subject) === subject;}));
      }
    } else value = await loadJson(file);
    return response(value);
  }
  // 适配对象只进入引擎；大学课程共享学段编码，跨课程先修按拓扑排序。
  function engineTopics(topics) {
    return topics.map(function(t){
      const s = of(t), adapted = Object.assign({}, t, {subject:s});
      if (isAcademicTopic(t)) {
        const c = computingChapter(t);
        return Object.assign(adapted, {grade:coursesFor(s)[0].grade,chapter:c.label + ' ' + c.chapterNo + ' ' + c.chapterName.replace(/\s+/g,'·')});
      }
      if (s === 'math' && t.grade >= 15) return Object.assign(adapted, {grade:15});
      if (science(s) && (t.grade >= 10 || biogeo(s)) && t.textbook) {
        const c = scienceChapter(t);
        return Object.assign(adapted, {chapter:bookLabel(t).replace(/\s+/g, '·') + ' ' + c.chapterNo + ' ' + c.chapterName.replace(/\s+/g, '·')});
      }
      return adapted;
    });
  }
  function scienceGrade(grade) { return {7:'七年级',8:'八年级',9:'九年级',10:'高一',11:'高二',12:'高三'}[grade] || String(grade); }
  function computing(s) { return s === 'cs408'; }
  function medical(s) { return Object.prototype.hasOwnProperty.call(medicalCourses, s); }
  function universityScience(s) { return Object.prototype.hasOwnProperty.call(universityScienceModules, s); }
  function curriculum(s) { return medical(s) || universityScience(s); }
  function academic(s) { return computing(s) || curriculum(s); }
  function unitLabel(s) { return universityScience(s || read()) || mixedScience(s || read()) ? '模块' : '课程'; }
  function rawCoursesFor(s) { return computing(s) ? courses : medicalCourses[s] || universityScienceModules[s] || []; }
  function coursesFor(s) {
    s = canonical(s || read());
    return members(s).reduce(function(all, member){return all.concat(rawCoursesFor(member));}, []);
  }
  function isUniversityTopic(t) { return universityScience(rawOf(t)) || mixedScience(of(t)) && t.grade >= 50; }
  function isAcademicTopic(t) { return computing(of(t)) || medical(rawOf(t)) || isUniversityTopic(t); }
  function stageKind(grade, subject) {
    const s = canonical(subject || read());
    if (grade <= 6) return 'primary';
    if (grade <= 9) return 'junior';
    return academic(s) || s === 'math' && grade >= 15 || mixedScience(s) && grade >= 50 ? 'university' : 'senior';
  }
  function stageCode(grade, subject) { return {primary:'p',junior:'j',senior:'h',university:'u'}[stageKind(grade, subject)]; }
  function legacySessions(s) {
    return ({physics:[['cnpDiagnose.session.v9','原物理'],['uphysicsDiagnose.session.v1','原大学物理']],chemistry:[['cncDiagnose.session.v9','原化学'],['uchemistryDiagnose.session.v1','原大学化学']],tcm:[['tcmDiagnose.session.v1','原中医'],['herbalDiagnose.session.v1','原中药']]}[canonical(s)] || []).map(function(row){return {key:row[0],label:row[1]};});
  }
  function assessment(text, s) {
    s = s || read();
    if (!curriculum(s)) return text;
    const labels = {'诊断这个知识点':'测评这个知识点','选择诊断目标':'选择测评目标','按知识点诊断':'按知识点测评','开始整体诊断':'开始整体测评','按课程整体诊断':'按课程整体测评','可以诊断的知识点：':'可以测评的知识点：','诊断课程':'测评课程'};
    const result = labels[text] || String(text).replace(/诊断/g,'知识测评');
    return universityScience(s) ? result.replace(/课程/g,'模块') : result;
  }
  function courseFrom(value, subject) {
    const v = String(value || '').toLowerCase();
    const aliases = {计组:'co',组成原理:'co',网络:'cn',计网:'cn',操作:'os'};
    return coursesFor(subject || read()).find(function(c){return c.id === (aliases[v] || v) || String(c.grade) === v || c.name === value;}) || null;
  }
  function courseName(value, subject) { const c = courseFrom(value, subject); return c ? c.name : String(value || ''); }
  function courseTargets(topics, scope, subject) {
    subject = canonical(subject || read());
    const course = courseFrom(scope, subject), family = subject === 'tcm' && (scope === 'herbal' || scope === '中医') ? (scope === 'herbal' ? 'herbal' : 'tcm') : '';
    const all = scope === 'all' || scope === names[subject] || subject === 'cs408' && scope === '四门综合' || mixedScience(subject) && (scope === 'university' || scope === '大学' || scope === 'u');
    if (!course && !family && !all || !academic(subject) && !mixedScience(subject)) return null;
    const list = topics.filter(function(t){return !t.external && of(t) === subject && isAcademicTopic(t) && (family ? rawOf(t) === family : all || t.module === course.id);});
    if (!list.length) return null;
    return {ids:list.map(function(t){return t.id;}),volumes:Array.from(new Set(list.map(function(t){return t.module;}))),label:family ? rawNames[family] + '课程' : (mixedScience(subject) ? '大学' + names[subject] : names[subject]) + ' · ' + (all ? '全部' + unitLabel(subject) : course.name)};
  }

  function computingChapter(t) {
    const c = courseFrom(t.module || t.grade, of(t));
    const title = t.chapter || '';
    const m = /^(第[一二三四五六七八九十百\d]+章)\s*(.+)/.exec(title);
    return {volume:c ? c.id : t.module,label:c ? c.name : names[of(t)],chapterNo:m ? m[1] : '第1章',chapterName:m ? m[2] : title,section:t.exam_scope && t.exam_scope.point !== t.name ? t.exam_scope.point : ''};
  }
  function bookLabel(t) { const b = t.textbook || {}; return b.volume || b.title || ''; }
  function scienceChapter(t) {
    const b = t.textbook || {};
    let title = b.chapter || t.chapter || '';
    const match = /(第[一二三四五六七八九十百\d]+[章单元]+)\s*(.+)/.exec(title);
    let chapterNo = match ? match[1] : '第1章';
    // 初中生物的章号可在不同单元内重启，真实单元号与章号共同确定章节。
    if (biogeo(of(t)) && b.unit) {
      const unit = /(第[一二三四五六七八九十百\d]+单元)/.exec(b.unit);
      if (unit && chapterNo.indexOf(unit[1]) < 0) chapterNo = unit[1] + '·' + chapterNo;
    }
    return {volume:b.book, label:bookLabel(t), chapterNo:chapterNo, chapterName:match ? match[2] : title, section:b.section || ''};
  }
  function reference(t) {
    if (!t.textbook) return '';
    const b = t.textbook;
    const parts = [b.title || ('人教版《' + names[of(t)] + '》' + (b.volume || ''))];
    if ((isAcademicTopic(t) || /^cnm_ps\d+$/.test(t.id)) && b.edition && !/第[0-9一二三四五六七八九十]+版/.test(b.title || '')) parts.push(typeof b.edition === 'number' ? '第' + b.edition + '版' : b.edition);
    if (biogeo(of(t)) && b.unit) parts.push(b.unit);
    if (b.chapter && (!b.section || b.section.indexOf(b.chapter) < 0)) parts.push(b.chapter);
    if (b.section) parts.push(b.section);
    if (b.pages) parts.push('纸书第 ' + b.pages + ' 页');
    return parts.join(' · ');
  }
  function biogeo(s) { return s === 'biology' || s === 'geography'; }
  function science(s) { return s === 'physics' || s === 'chemistry' || biogeo(s); }
  // 新两科的整册与年级范围直接读教材元数据，不依赖数学的册次编码。
  function schoolTargets(topics, scope, subject) {
    const key = String(scope || '').trim();
    const grades = {'七':7,'七年级':7,'7':7,'八':8,'八年级':8,'8':8,'高一':10,'高一年级':10,'10':10,'高二':11,'高二年级':11,'11':11,'高三':12,'高三年级':12,'12':12};
    const g = grades[key];
    const junior = /^([七八])(?:年级)?([上下])(?:册)?$/.exec(key);
    const bookCode = function(value) {
      const m = /^(选择性必修|选必|必修)第?([一二三123])(?:册)?/.exec(String(value || '').replace(/\s+/g, ''));
      return m ? (m[1] === '必修' ? 'b' : 's') + ({一:'1',二:'2',三:'3'}[m[2]] || m[2]) : '';
    };
    const code = bookCode(key), all = key === 'all' || key === '全部' || key === names[subject];
    const list = topics.filter(function(t) {
      if (t.external || of(t) !== subject) return false;
      if (all) return true;
      if (g) return t.grade === g;
      if (junior) return t.grade === (junior[1] === '七' ? 7 : 8) && t.semester === junior[2];
      const b = t.textbook || {};
      return b.book === key || b.volume === key || b.title === key || (code && t.grade >= 10 && bookCode(b.volume) === code);
    });
    if (!list.length) return null;
    return {ids:list.map(function(t){return t.id;}),volumes:Array.from(new Set(list.map(function(t){return t.textbook.book;}))),label:all ? names[subject] + ' · 全部已收录知识' : g ? scienceGrade(g) + (g >= 10 ? '（建议编排）' : '') : bookLabel(list[0])};
  }
  const specs = {physics:{grades:[8,9,10,11,12],start:'八',range:'初中至高中',books:'初中三册、高中必修与选择性必修六册',demo:'cnp_043',demoName:'欧姆定律',search:'牛顿运动定律、动量守恒、电磁感应'},chemistry:{grades:[9,10,11,12],start:'九',range:'初中至高中',books:'九年级上下册、高中必修与选择性必修五册',demo:'cnc_017',demoName:'质量守恒定律',search:'物质的量、化学平衡、有机化合物'}};
  specs.biology = {grades:[7,8,10,11,12],start:'七',range:'初中至高中',books:'初中四册、高中必修与选择性必修五册',demo:'cnb_095',demoName:'净光合速率与环境限制',search:'细胞、光合作用、遗传、生态系统',checked:'2026-11-01',intro:'从初中生物学衔接到高中必修与选择性必修：按教材册次与已核验的官方材料查找知识，理解生命现象的结构、机制与证据，再沿先修关系复习。已知的 2026 教材目录更新与尚待核验的新正文逐册列在来源页；原创练习与学习建议已经 AI 检查，尚未经教师审核。'};
  specs.geography = {grades:[7,8,10,11,12],start:'七',range:'初中至高中',books:'初中四册、高中必修与选择性必修五册',demo:'cng_122',demoName:'正午太阳高度与日影方向',search:'经纬度、气候、地貌、区域发展',checked:'2026-11-01',intro:'从初中地理衔接到高中必修与选择性必修：按教材册次理解空间位置、自然过程和人地关系，用原创题检查条件与推理，再回到教材复习。各册更新信息、目录和可读正文的核验范围分别列在来源页；内容已经 AI 检查，尚未经教师审核。'};
  specs.cs408 = {grades:[17,18,19,20],start:'ds',range:'计算机专业基础',books:'数据结构、计算机组成原理、操作系统、计算机网络',demo:'cs408_ds_001',demoName:'逻辑结构、存储结构与抽象数据类型',search:'KMP、Cache、缺页中断、TCP'};
  specs.med = {grades:medicalCourses.med.map(c=>c.grade),start:'anatomy',range:'本科基础课程',demo:'med_anatomy_001',demoName:'解剖学姿势、方位与切面',search:'动作电位、免疫、炎症、药代动力学'};
  specs.tcm = {grades:coursesFor('tcm').map(c=>c.grade),start:'basics',range:'本科中医与中药十门课程',demo:'tcm_basics_001',demoName:'整体观念',search:'藏象、辨证、君臣佐使、药性、鉴定、剂型'};
  specs.herbal = {grades:medicalCourses.herbal.map(c=>c.grade),start:'materia',range:'本科中药学核心课程',demo:'herbal_materia_001',demoName:'中药材、饮片与中成药',search:'药性、鉴定、黄酮、剂型'};
  specs.uphysics = {grades:universityScienceModules.uphysics.map(c=>c.grade),start:'mechanics',range:'本科基础物理',demo:'uphy_mechanics_001',demoName:'位矢、位移与瞬时运动量',search:'角动量、熵、高斯定理、量子数'};
  specs.uchemistry = {grades:universityScienceModules.uchemistry.map(c=>c.grade),start:'structure',range:'本科基础化学',demo:'uch_structure_004',demoName:'原子轨道的量子数',search:'化学势、缓冲溶液、手性、朗伯比尔定律'};
  specs.physics.range = specs.chemistry.range = '初中、高中与大学';
  specs.physics.books += '，以及大学六个模块';
  specs.chemistry.books += '，以及大学七个模块';
  window.Subjects = {canonical, members, merged, mixedScience, courseTargets, rawNames, rawOf, initialScope, rawCoursesFor, isUniversityTopic, isAcademicTopic, stageKind, stageCode, legacySessions, fetchRaw, names, read, of, link, data, reference, science, biogeo, schoolTargets, scienceGrade, bookLabel, scienceChapter, specs, computing, medical, universityScience, curriculum, academic, unitLabel, assessment, courses, coursesFor, courseFrom, courseName, computingChapter, fetch: fetchData, engineTopics: engineTopics};
})();
