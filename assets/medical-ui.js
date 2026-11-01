/* Undergraduate curriculum framing, shared navigation and source entry. */
(function () {
  'use strict';
  var subject = Subjects.read();
  document.querySelectorAll('.subject-link').forEach(function(a) {
    var active = a.dataset.subject === subject;
    a.classList.toggle('on', active);
    if (active) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current');
  });
  if (!Subjects.curriculum(subject)) return;
  document.body.classList.add('subject-curriculum', 'subject-' + subject);
  if (Subjects.medical(subject)) document.body.classList.add('subject-medical');
  document.querySelectorAll('.site-nav a').forEach(function(a) {
    if (a.textContent.trim() === '诊断') a.textContent = '测评';
  });
  var banner = document.querySelector('.toy-notice span');
  if (banner) {
    var strong = document.createElement('strong');
    strong.textContent = '内容已经过 AI 审核，但尚未经教师审核。';
    banner.replaceChildren(strong, '仅供课程学习参考，题目与知识测评结果请结合教师指导核实。');
  }
  var texts = {
    med:'本科基础知识学习与测评；课程中的“诊断学”是学科名称，答题结果不作疾病诊断。',
    tcm:'中医概念按其传统理论框架学习；藏象、经络等概念不与现代解剖结构直接等同。',
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
