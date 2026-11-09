/* Undergraduate curriculum framing, shared navigation and source entry. */
(function () {
  'use strict';
  var subject = Subjects.read();
  document.querySelectorAll('.subject-link').forEach(function(a) {
    var active = a.dataset.subject === subject;
    a.classList.toggle('on', active);
    if (active) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current');
  });
  if (Subjects.usesK12(subject)) {
    var k12Notice = document.querySelector('.toy-notice span');
    if (k12Notice) {
      var origin = document.createElement('a');
      origin.href = (/\/(explore|diagnose)\//.test(location.pathname) ? '../' : '') + 'sources.html?subject=' + subject + '#k12-kgraph';
      origin.textContent = '数据来源与人工核验说明';
      k12Notice.replaceChildren('中小学数学、物理、化学、生物采用 K12-KGraph。', origin);
    }
  }
  if (!Subjects.usesK12(subject) && subject !== 'english') {
    const notice = document.querySelector('.toy-notice span');
    if (notice) {
      const source = document.createElement('a');
      source.href = (/\/(explore|diagnose)\//.test(location.pathname) ? '../' : '') + 'sources.html?subject=' + subject + '#chinese-terminology';
      source.textContent = '中文术语对照说明';
      notice.replaceChildren('站内编写的课程和习题经过 AI 检查，尚待教师审核。', source);
    }
  }
  if (!Subjects.curriculum(subject)) return;
  document.body.classList.add('subject-curriculum', 'subject-' + subject);
  if (Subjects.medical(subject)) document.body.classList.add('subject-medical');
  document.querySelectorAll('.site-nav a').forEach(function(a) {
    if (a.textContent.trim() === '诊断') a.textContent = '测评';
  });
  var texts = {
    med:'本科基础知识学习与测评；课程中的“诊断学”是学科名称，答题结果不作疾病诊断。',
    tcm:'中医概念保留传统理论语境；中药的传统药性、实验研究、人体临床证据和质量标准分别说明。藏象、经络不与现代解剖结构直接等同，药典收载不等同于疗效证明。',
    herbal:'区分传统药性、实验研究与人体临床证据；药典收载及质量合格不等同于疗效证明。',
    uphysics:'本科基础物理核心模块；模型假设、适用条件和单位须结合题目与教材核实。',
    uchemistry:'本科基础化学核心模块；近似条件、标准态与实验数据的适用范围分别说明。'
  };
  var note = document.createElement('div');
  note.className = 'curriculum-note'; note.setAttribute('role','note');
  var text = document.createElement('span'); text.textContent = texts[subject];
  var a = document.createElement('a');
  a.textContent = '教材与覆盖范围';
  var nested = /\/(?:explore|diagnose)\/[^/]*$/.test(location.pathname);
  a.href = (nested ? '../' : '') + 'sources.html?subject=' + subject + '#' + subject;
  note.append(text,a);
  var notice = document.querySelector('.toy-notice');
  if (notice) notice.after(note);
})();
