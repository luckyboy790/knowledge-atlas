/* 首页：统计、年级入口和先修关系总览都从 data/*.json 计算，不写死数量。 */
(function () {
  'use strict';
  function uiText(text) { return Subjects.assessment(text, subject); }
  var raw = location.hash.replace(/^#/, '');
  try { raw = decodeURIComponent(raw); } catch (e) { /* 保持原样 */ }
  if (/^(?:cn[mepcbg]_[A-Za-z0-9]+|(?:cs408|med|tcm|herbal)_[a-z]+_\d+|(?:uphy|uch)_[a-z_]+_\d+)$/.test(raw)) return;

  var CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var subject = Subjects.read();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function withSubject(href) {
    return Subjects.link(href, subject);
  }

  document.body.classList.toggle('subject-english', subject === 'english');
  document.querySelectorAll('.subject-link').forEach(function (link) {
    var on = link.getAttribute('data-subject') === subject;
    link.classList.toggle('on', on);
    if (on) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.site-nav a:not(.subject-link), a.brand, .site-footer a[href="sources.html"]').forEach(function (link) {
    var href = link.getAttribute('href');
    var next = withSubject(href);
    if (next && next !== href) link.setAttribute('href', next);
  });
  if (subject === 'english') {
    document.title = '英语 · 学科知识图谱';
    var eye = document.querySelector('.eyebrow');
    if (eye) eye.textContent = '英语：三年级到高中';
    var primary = document.querySelector('.hero-actions a.btn-primary');
    var browse = document.querySelector('.hero-actions a.btn:not(.btn-primary)');
    if (primary) primary.setAttribute('href', 'diagnose/index.html?subject=english');
    if (browse) browse.setAttribute('href', 'explore/index.html?subject=english');
    var demo = document.querySelector('.quiet-link a');
    if (demo) {
      demo.setAttribute('href', 'diagnose/index.html?subject=english&grade=' + encodeURIComponent('四上') + '&demo=1');
      demo.textContent = '先看一遍演示：四年级上册英语';
    }
  }

  if (Subjects.science(subject)) {
    document.title = Subjects.names[subject] + ' · 学科知识图谱';
    document.querySelector('.eyebrow').textContent = Subjects.names[subject] + ' · ' + Subjects.specs[subject].range + (Subjects.mixedScience(subject) ? ' · 中学与本科核心课程' : ' · 人教版教材');
    document.querySelector('.lede').textContent = Subjects.biogeo(subject) ? Subjects.specs[subject].intro : '把初中、高中和大学核心知识连在同一张图中，按学段、教材册次或大学模块查找内容，再沿先修关系复习。中学按人教版教材组织，大学保留原有本科教材和模块；不同来源的版本与正文核验范围分别列出。新增衔接关系为原创学习建议，已经 AI 检查、尚未经教师审核。';
    document.querySelector('.hero-actions a.btn-primary').href = 'diagnose/index.html?subject=' + subject;
    document.querySelector('.hero-actions a.btn:not(.btn-primary)').href = 'explore/index.html?subject=' + subject;
    var demoLink = document.querySelector('.quiet-link a');
    demoLink.href = 'diagnose/index.html?subject=' + subject + '&target=' + Subjects.specs[subject].demo + '&demo=1';
    demoLink.textContent = '先看一遍演示：' + Subjects.specs[subject].demoName;
    document.querySelector('#n-standards + .stat-label').textContent = '参考教材册数';
    document.querySelector('.stat-note').textContent = Subjects.biogeo(subject) ? '按当前学科数据统计。每个知识点附教材册、单元、章或节的出处；高一至高三仅为建议编排，请以学校教学进度为准。来源核验日期：' + Subjects.specs[subject].checked + '。' : '统计包含中学与大学内容。高中年级仅为建议编排；大学按模块组织，保留原书章节和版次。书目、目录与正文的核验范围、日期分别见来源页；新增先修关系不扩大原教材的审核范围。';
    document.querySelector('.steps li p').textContent = '按' + Subjects.specs[subject].books + '查找核心知识点，先查看教材出处。';
    if (Subjects.mixedScience(subject)) {
      var mixedSteps = document.querySelectorAll('.steps li p');
      if (mixedSteps[1]) mixedSteps[1].textContent = '先检查目标。首题未通过时用另一道题确认，两题均未通过才继续追查先修。';
      if (mixedSteps[2]) mixedSteps[2].textContent = '按先修顺序复习薄弱或不稳的知识，再回到教材与课堂训练。';
      document.getElementById('grades-title').textContent = '按学段与大学模块进入';
      document.getElementById('grades-title').nextElementSibling.textContent = '中学按年级和教材册次查找，大学按核心模块查找；跨学段先修关系可在同一张图中追查。';
    }
    if (Subjects.biogeo(subject)) {
      document.getElementById('grades-title').textContent = '按教材册次进入';
      document.getElementById('grades-title').nextElementSibling.textContent = '按初中四册与高中五册查找知识；高中年级只是建议学习编排，教材册次与章、节用于定位原书。';
    }
  }

  if (Subjects.computing(subject)) {
    document.title = '408 · 计算机专业基础知识图谱';
    document.querySelector('.eyebrow').textContent = '408 · 数据结构 / 组成原理 / 操作系统 / 网络';
    document.querySelector('.lede').textContent = '把四门专业基础课程连成一张先修图：查看知识摘要与教材出处，用原创题定位薄弱点，再沿先修关系复习。已核验 2027 年官方考试大纲的出版信息，参考教材采用截至 2026-10-30 查实的新版。最新版大纲全文尚未逐条核验，覆盖范围与版本边界见来源页。';
    document.querySelector('.hero-actions a.btn-primary').href = 'diagnose/index.html?subject=cs408';
    document.querySelector('.hero-actions a.btn:not(.btn-primary)').href = 'explore/index.html?subject=cs408';
    var csDemo = document.querySelector('.quiet-link a');
    csDemo.href = 'diagnose/index.html?subject=cs408&target=' + Subjects.specs.cs408.demo + '&demo=1';
    csDemo.textContent = '先看一遍演示：' + Subjects.specs.cs408.demoName;
    document.querySelector('#n-standards + .stat-label').textContent = '专业基础课程';
    document.querySelector('.stat-note').textContent = uiText('按 408 当前数据统计。四门课程分别组织学习单元，教材章节单独标注。原创诊断题用于检查基础理解；不等同于历年真题、整卷训练或考试成绩预测。');
    document.getElementById('grades-title').textContent = '按课程进入';
    var gradeIntro = document.getElementById('grades-title').nextElementSibling;
    if (gradeIntro) gradeIntro.textContent = '先选一门课程，再按单元浏览；跨课程的先修关系会出现在知识点详情中。';
    var steps = document.querySelectorAll('.steps li p');
    if (steps[0]) steps[0].textContent = '从四门课程中选一个目标，查看知识摘要、掌握要求与教材章节。';
    if (steps[1]) steps[1].textContent = '先问目标本身。答错后再用另一道题确认，仍然不会时沿先修关系往回查。';
    if (steps[2]) steps[2].textContent = uiText('根据诊断结果，沿先修顺序补齐基础，再回到参考教材与综合题训练。');
    var canvas = document.getElementById('constellation');
    if (canvas) canvas.setAttribute('aria-label', '408 四门课程先修关系总览');
  }

  if (Subjects.curriculum(subject)) {
    var spec = Subjects.specs[subject], name = Subjects.names[subject];
    var intro = {
      med:'以人卫五年制本科临床医学第十轮规划教材为版本依据，连接解剖、组织胚胎、生理、生化、免疫、微生物、病理、病理生理、药理和诊断学基础。先理解结构与机制，再用原创题检查课程知识。',
      tcm:'依据已核验的中医与中药规划教材，连接中医基础理论、中医诊断学、方剂学、针灸学基础及中药学、鉴定、化学、炮制、药剂、药理十门课程。传统理论、现代药学、质量标准与证据评价分别标明语境；新增课程间先修关系用于学习衔接，原教材核验边界继续保留。',
      herbal:'依据已出版的 2026 年“十五五”规划教材，连接中药学、鉴定、化学、炮制、药剂和药理六门核心课程。传统药性、现代实验研究和药典质量标准分别标明依据。',
      uphysics:'依据出版社核验的本科物理教材，连接力学、热学、电磁学、振动与波、光学及相对论与量子基础。把模型、适用条件和计算关系放在一起，用原创题检查理解，再沿先修关系回到基础。',
      uchemistry:'依据出版社核验的本科化学教材，组织物质结构、热力学与平衡、动力学、溶液、电化学、有机及分析七个知识模块。说明近似条件、量纲与证据，结合原创题检查概念和定量关系。'
    };
    document.title = name + ' · 本科核心知识图谱';
    document.querySelector('.eyebrow').textContent = name + ' · ' + spec.range;
    document.querySelector('.lede').textContent = intro[subject];
    var primary = document.querySelector('.hero-actions a.btn-primary');
    primary.href = 'diagnose/index.html?subject=' + subject;
    primary.firstChild.nodeValue = '开始知识测评';
    document.querySelector('.hero-actions a.btn:not(.btn-primary)').href = 'explore/index.html?subject=' + subject;
    var demo = document.querySelector('.quiet-link a');
    demo.href = 'diagnose/index.html?subject=' + subject + '&target=' + spec.demo + '&demo=1';
    demo.textContent = '先看一遍演示：' + spec.demoName;
    document.querySelector('#n-standards + .stat-label').textContent = '核心' + Subjects.unitLabel(subject);
    document.querySelector('.stat-note').textContent = '按本学科数据统计。收录核心学习节点，不代表教材全文或完整专业培养方案；每个节点均有教材定位与核验范围。版本核验截至 2026-10-31。';
    document.getElementById('grades-title').textContent = '按' + Subjects.unitLabel(subject) + '进入';
    document.getElementById('grades-title').nextElementSibling.textContent = uiText('按课程和学习单元查找内容；先修关系可跨课程，教材原书位置另行标注。');
    var steps = document.querySelectorAll('.steps li p');
    steps[0].textContent = uiText('选择课程或具体知识点，先读学习摘要、掌握要求和教材出处。');
    steps[1].textContent = '先检查目标。首题未通过时用另一道题确认，两题均未通过才继续追查先修。';
    steps[2].textContent = '按先修顺序复习薄弱或不稳的知识，再回到教材与课堂训练。测评标签只反映这次答题表现。';
    document.getElementById('constellation').setAttribute('aria-label', name + Subjects.unitLabel(subject) + '先修关系总览');
  }


  var initial = Subjects.initialScope();
  if (initial.stage || initial.member) {
    document.querySelectorAll('.hero-actions a').forEach(function(a){
      var href = a.getAttribute('href');
      a.setAttribute('href', href + (initial.stage ? '&stage=' + initial.stage : '&member=' + initial.member));
    });
  }

  if (Subjects.usesK12(subject)) {
    const reviewedLink = document.getElementById('reviewed-exercises-link');
    reviewedLink.href = withSubject('explore/index.html?reviewed=1');
    reviewedLink.hidden = false;
    document.querySelector('.lede').textContent = '按册、章和节查找 K12-KGraph 收录的知识点。点开一个主题，可以查看教材位置、先修关系，再用练习找出需要回顾的内容。';
    document.querySelector('.stat-note').textContent = '中小学图谱由 K12-KGraph 项目发布。标有“人工核验习题”的题目来自项目发布数据，另有站内练习和图谱回忆自评题。';
    document.querySelector('#n-standards + .stat-label').textContent = '中小学教材册数';
    const steps = document.querySelectorAll('.steps li p');
    if (steps[1]) steps[1].textContent = '做题检查目标知识点，有第二道题时可再确认一次，然后沿先修关系查找需要复习的内容。';
  }
  let liveTopicIds = null;
  var reviewLink = document.getElementById('review-link');
  reviewLink.href = withSubject('diagnose/index.html?practice=review');
  function refreshDueCount() {
    var count = AtlasPractice.dueEntries(AtlasPractice.records(subject)).filter(item => !liveTopicIds || liveTopicIds.has(item[0])).length;
    reviewLink.textContent = count ? '今日复习（' + count + '）' : '今日复习';
  }
  refreshDueCount();
  window.addEventListener('pageshow', refreshDueCount);
  window.addEventListener('storage', refreshDueCount);

  /* 学段：与浏览页、诊断页的配色一致 */
  function stageKind(grade) { return Subjects.stageKind(grade, subject); }
  function stageName(grade) {
    return { primary: '小学', junior: '初中', senior: '高中', university: Subjects.academic(subject) ? Subjects.names[subject] : '大学' }[stageKind(grade)];
  }
  var SENIOR_SHORT = subject === 'english'
    ? { 10: '必修一', 11: '必修二', 12: '必修三', 13: '选必一', 14: '选必二', 15: '选必三', 16: '选必四' }
    : Subjects.science(subject) ? {10:'高一',11:'高二',12:'高三'} : { 10: '高一', 11: '高二', 12: '选必一', 13: '选必二', 14: '选必三', 15: '高等数学', 16: '线性代数', 17: '概率论与数理统计' };
  function gradeShort(grade) { return Subjects.academic(subject) || Subjects.mixedScience(subject) && grade >= 50 ? Subjects.courseName(grade, subject) : grade <= 9 ? CN[grade] + '年级' : (SENIOR_SHORT[grade] || String(grade)); }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  /* 数字从 0 滚到目标值；看不见时不播，减少动态效果时直接显示。 */
  function countUp(values) {
    var ids = Object.keys(values);
    if (reduceMotion || !window.IntersectionObserver || !window.requestAnimationFrame) {
      ids.forEach(function (id) { setText(id, String(values[id])); });
      return;
    }
    // 先写入最终值：截图、打印或观察器不触发时也显示正确数字；进入视口时再从 0 滚动一次。
    ids.forEach(function (id) { setText(id, String(values[id])); });
    var box = document.getElementById('stats');
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      ids.forEach(function (id) { setText(id, '0'); });
      var t0 = performance.now();
      var span = 1100;
      (function tick(now) {
        var p = Math.min(1, (now - t0) / span);
        var e = 1 - Math.pow(1 - p, 4);
        ids.forEach(function (id) { setText(id, String(Math.round(values[id] * e))); });
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: 0.4 });
    io.observe(box);
  }

  function fail(message) {
    var box = document.getElementById('load-error');
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
  }

  var ARROW = 'M5 11 11 5M6 5h5v5';
  function arrowIcon() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'grade-go');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', ARROW);
    svg.append(path);
    return svg;
  }

  Promise.all([
    Subjects.fetch('data/' + Subjects.data('topics.json', subject), subject),
    Subjects.fetch('data/' + Subjects.data('dependencies.json', subject), subject),
    Subjects.fetch('data/' + Subjects.data('questions.json', subject), subject),
    Subjects.fetch('data/cn-curriculum-standards.json', subject)
  ]).then(function (responses) {
    responses.forEach(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
    });
    return Promise.all(responses.map(function (response) { return response.json(); }));
  }).then(function (data) {
    var topics = data[0];
    var deps = data[1];
    var questions = data[2];
    var standards = data[3];
    if (!Array.isArray(topics) || !Array.isArray(deps) || !Array.isArray(questions)) {
      throw new Error('数据格式无法识别');
    }
    var items = standards && Array.isArray(standards.items) ? standards.items : [];
    var wantEnglish = subject === 'english';
    topics = topics.filter(function (topic) { return Subjects.of(topic) === subject; });
    var allowed = new Set(topics.map(function (t) { return t.id; }));
    liveTopicIds = allowed;
    refreshDueCount();
    deps = deps.filter(function (edge) { return allowed.has(edge.topicId) && allowed.has(edge.prerequisiteId); });
    questions = questions.filter(function (question) { return allowed.has(question.topicId); });
    items = items.filter(function (item) { return String(item.id || '').indexOf('ces-') === 0 === wantEnglish; });
    countUp({
      'n-topics': topics.length,
      'n-edges': deps.length,
      'n-questions': questions.length,
      'n-standards': Subjects.usesK12(subject) ? new Set(topics.filter(t => t.k12).map(t => t.textbook.book)).size : Subjects.academic(subject) ? Subjects.coursesFor(subject).length : Subjects.science(subject) ? new Set(topics.map(function (t) { return t.textbook.book; })).size : items.length
    });

    /* 先修关系总览 */
    try {
      if (window.Constellation) {
        window.Constellation.mount(document.getElementById('constellation'), {
          topics: topics,
          deps: deps,
          stageOf: stageKind,
          stageName: stageName,
          gradeShort: gradeShort,
          caption: document.getElementById('viz-caption'),
          count: document.getElementById('viz-count'),
          idleText: '悬停任一点查看它的先修链，点击打开知识图谱。',
          hrefFor: function (id) { return withSubject('explore/index.html#' + encodeURIComponent(id)); }
        });
      }
    } catch (vizError) {
      var cap = document.getElementById('viz-caption');
      if (cap) cap.textContent = '总览图没有画出来，不影响其他功能。';
    }

    /* 按年级进入：按学段分组 */
    var cards = [];
    function addCard(g, stage, title, klass, splitText, href, bookId) {
      var count = topics.filter(function (topic) { return bookId ? topic.textbook && topic.textbook.book === bookId : topic.grade === g; }).length;
      cards.push({ g: g, stage: stage, title: title, klass: klass, split: splitText, href: href, count: count });
    }
    var from = Subjects.academic(subject) ? Subjects.specs[subject].grades[0] : Subjects.science(subject) ? Subjects.specs[subject].grades[0] : wantEnglish ? 3 : 1;
    var to = 9;
    for (var g = from; !Subjects.biogeo(subject) && g <= to; g++) {
      if (Subjects.biogeo(subject) && Subjects.specs[subject].grades.indexOf(g) < 0) continue;
      var list = topics.filter(function (topic) { return topic.grade === g; });
      var up = list.filter(function (topic) { return topic.semester === '上'; }).length;
      var down = list.filter(function (topic) { return topic.semester === '下'; }).length;
      var whole = list.filter(function (topic) { return topic.semester === '全'; }).length;
      var splitText = whole ? '全一册 ' + whole : '上 ' + up + ' · 下 ' + down;
      var href = wantEnglish ? 'explore/index.html?subject=english&grade=' + g : 'explore/index.html?grade=' + g;
      addCard(g, g <= 6 ? '小学' : '初中', CN[g] + '年级', g <= 6 ? 'is-primary' : 'is-junior', splitText, href);
    }
    if (Subjects.biogeo(subject)) {
      var schoolBooks = new Map();
      topics.forEach(function(t){ if (!schoolBooks.has(t.textbook.book)) schoolBooks.set(t.textbook.book, t); });
      schoolBooks.forEach(function(t, id) {
        addCard(t.grade, t.grade <= 9 ? '初中' : '高中', Subjects.bookLabel(t), t.grade <= 9 ? 'is-junior' : 'is-senior', t.grade <= 9 ? '义务教育 · 按册与章浏览' : t.curriculum_level + ' · ' + Subjects.scienceGrade(t.grade) + '仅建议', 'explore/index.html?subject=' + subject + '&volume=' + encodeURIComponent(id), id);
      });
    } else if (Subjects.academic(subject)) {
      Subjects.coursesFor(subject).forEach(function(c) { addCard(c.grade, Subjects.names[subject], c.name, 'is-university', c.summary, 'explore/index.html?subject=' + subject + '&module=' + c.id); });
    } else if (Subjects.science(subject)) {
      [10,11,12].forEach(function(g) {
        var books = Array.from(new Set(topics.filter(function(t){return t.grade === g;}).map(Subjects.bookLabel)));
        if (books.length) addCard(g, '高中', Subjects.scienceGrade(g), 'is-senior', books.join(' · '), 'explore/index.html?subject=' + subject + '&grade=' + g);
      });
      Subjects.coursesFor(subject).forEach(function(c){addCard(c.grade, '大学', c.name, 'is-university', c.summary, 'explore/index.html?subject=' + subject + '&module=' + c.id);});
    } else {
      if (wantEnglish) {
        addCard(10, '高中', '必修一', 'is-senior', '必修第一册', 'explore/index.html?subject=english&grade=10');
        addCard(11, '高中', '必修二', 'is-senior', '必修第二册', 'explore/index.html?subject=english&grade=11');
        addCard(12, '高中', '必修三', 'is-senior', '必修第三册', 'explore/index.html?subject=english&grade=12');
        addCard(13, '高中', '选必一', 'is-senior', '选择性必修第一册', 'explore/index.html?subject=english&grade=13');
        addCard(14, '高中', '选必二', 'is-senior', '选择性必修第二册', 'explore/index.html?subject=english&grade=14');
        addCard(15, '高中', '选必三', 'is-senior', '选择性必修第三册', 'explore/index.html?subject=english&grade=15');
        addCard(16, '高中', '选必四', 'is-senior', '选择性必修第四册', 'explore/index.html?subject=english&grade=16');
      } else {
        addCard(10, '高中', '高一', 'is-senior', '必修第一册', 'explore/index.html?grade=10');
        addCard(11, '高中', '高二', 'is-senior', '必修第二册', 'explore/index.html?grade=11');
        addCard(12, '高中', '选必一', 'is-senior', '选择性必修第一册', 'explore/index.html?grade=12');
        addCard(13, '高中', '选必二', 'is-senior', '选择性必修第二册', 'explore/index.html?grade=13');
        addCard(14, '高中', '选必三', 'is-senior', '选择性必修第三册', 'explore/index.html?grade=14');
        addCard(15, '大学', '高等数学', 'is-university', '微积分 · 级数 · 微分方程', 'explore/index.html?grade=15');
        addCard(16, '大学', '线性代数', 'is-university', '矩阵 · 向量空间 · 二次型', 'explore/index.html?grade=16');
        addCard(17, '大学', '概率论与数理统计', 'is-university', '概率 · 统计推断 · 考研基础', 'explore/index.html?grade=17');
      }
    }

    var grades = document.getElementById('grades');
    if (!grades) return;
    grades.replaceChildren();
    grades.removeAttribute('aria-busy');
    var max = cards.reduce(function (m, c) { return Math.max(m, c.count); }, 1);
    var groups = [];
    cards.forEach(function (card) {
      var last = groups[groups.length - 1];
      if (!last || last.stage !== card.stage) groups.push(last = { stage: card.stage, tone: card.klass.replace('is-', 'tone-'), cards: [], total: 0 });
      last.cards.push(card);
      last.total += card.count;
    });
    groups.forEach(function (group, gi) {
      var box = document.createElement('div');
      box.className = 'grade-group ' + group.tone;
      var head = document.createElement('div');
      head.className = 'grade-group-head';
      var name = document.createElement('span');
      name.className = 'grade-group-name';
      var dot = document.createElement('i');
      dot.className = 'tone-dot';
      dot.setAttribute('aria-hidden', 'true');
      var nameText = document.createElement('span');
      nameText.textContent = group.stage;
      name.append(dot, nameText);
      var total = document.createElement('span');
      total.className = 'grade-group-count';
      total.textContent = group.total + ' 个知识点';
      head.append(name, total);
      var list = document.createElement('div');
      list.className = 'grade-group-cards';
      group.cards.forEach(function (card, ci) {
        var link = document.createElement('a');
        link.className = 'grade-card ' + card.klass;
        link.href = withSubject(card.href);
        var stage = document.createElement('span');
        stage.className = 'grade-stage';
        stage.textContent = card.stage;
        var title = document.createElement('strong');
        title.textContent = card.title;
        var count = document.createElement('span');
        count.className = 'grade-count';
        count.textContent = card.count + ' 个知识点';
        var split = document.createElement('span');
        split.className = 'grade-split';
        split.textContent = card.split;
        var meter = document.createElement('span');
        meter.className = 'grade-meter';
        meter.setAttribute('aria-hidden', 'true');
        var fill = document.createElement('i');
        fill.style.width = Math.max(4, Math.round(card.count / max * 100)) + '%';
        fill.style.animationDelay = (gi * 80 + ci * 40) + 'ms';
        meter.append(fill);
        link.append(stage, title, count, split, meter, arrowIcon());
        list.append(link);
      });
      box.append(head, list);
      grades.append(box);
    });
  }).catch(function (error) {
    fail('数据没有加载成功（' + (error && error.message ? error.message : error) + '）。请完整解压下载包后打开首页，不要只移动 HTML 文件；已部署的网页请确认数据资源完整，再刷新重试。');
    var cap = document.getElementById('viz-caption');
    if (cap) cap.textContent = '数据没有加载成功。';
    var grades = document.getElementById('grades');
    if (grades) grades.removeAttribute('aria-busy');
  });
})();
