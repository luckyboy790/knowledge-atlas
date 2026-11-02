/* Biology and geography: retain each textbook's actual evidence boundary. */
(function () {
  'use strict';
  var selected = Subjects.read();
  function node(tag, text, cls) {
    var el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  function link(text, href, external) {
    var el = node('a', text); el.href = href;
    if (external) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    return el;
  }
  function readable(value) {
    if (Array.isArray(value)) return value.map(readable).filter(Boolean).join('；');
    if (value && typeof value === 'object') return readable(value.text || value.summary || value.note || Object.values(value));
    return value == null ? '' : String(value);
  }
  function note(host, label, value) {
    var text = readable(value);
    if (text) host.append(node('p', (label ? label + '：' : '') + text));
  }
  function external(record, label) {
    var url = record.source_url || record.url;
    return /^https?:\/\//.test(url || '') ? link(label, url, true) : null;
  }
  function evidenceLabel(value) {
    var labels = {
      official_companion_toc_with_official_version_notice:'官方配套图册目录与教材更新通报',
      official_companion_toc_with_limited_official_main_text:'官方配套图册目录与有限主教材正文',
      official_toc_and_limited_text:'官方目录与有限正文',
      official_toc:'官方目录',
      official_full_text:'官方正文',
      official_publisher_revision_introduction:'出版社教材修订介绍',
      official_approved_catalog:'教育部教学用书目录',
      education_authority_update_notice:'教育部门教材更新通报',
      official_publisher_curriculum_metadata:'出版社课标书目',
      official_curriculum_document_reposted_by_school:'学校公开转载的课程标准文件',
      official_curriculum_research_institute_notice:'课程教材研究机构通知',
      official_meteorological_science:'气象机构科普资料',
      official_geological_survey_announcement:'地质调查机构公告',
      official_joint_statistical_communique:'部门联合统计公报',
      official_treaty_text:'联合国条约正文',
      official_local_textbook_use_notice:'地方官方用书通知',
      official_companion_toc:'官方配套图册目录'
    };
    return labels[value] || readable(value);
  }
  // Sources is a common page; preserve the requested subject when returning to the app.
  if (Subjects.biogeo(selected)) {
    document.title = Subjects.names[selected] + ' · 教材来源与覆盖范围';
    document.querySelectorAll('.site-nav a, a.brand').forEach(function(a) {
      var href = a.getAttribute('href');
      if (!href || href[0] === '#' || /^(?:https?:|mailto:|data:)/.test(href)) return;
      var pieces = href.split('#'), parts = pieces.shift().split('?'), params = new URLSearchParams(parts[1] || '');
      params.set('subject', selected);
      a.setAttribute('href', parts[0] + '?' + params.toString() + (pieces.length ? '#' + pieces.join('#') : ''));
    });
  }
  ['biology','geography'].forEach(function(subject) {
    var host = document.getElementById(subject + '-books');
    if (!host) return;
    Promise.all(['topics','questions','sources','coverage'].map(function(kind) {
      return Subjects.fetch('data/' + subject + '-' + kind + '.json', subject).then(function(response) { return response.json(); });
    })).then(function(values) {
      var topics = values[0], questions = values[1], sources = values[2], coverage = values[3];
      if (!Array.isArray(topics) || !Array.isArray(questions) || !Array.isArray(sources.books)) throw new Error('教材来源格式不完整');
      var names = new Set(topics.map(function(t) { return t.textbook.book; }));
      var junior = topics.filter(function(t) { return t.grade <= 9; }).length;
      document.getElementById(subject + '-summary').textContent = '已收录 ' + topics.length + ' 个核心知识点、' + questions.length + ' 道原创练习，涉及 ' + names.size + ' 册教材；初中 ' + junior + ' 点，高中 ' + (topics.length-junior) + ' 点。来源核验日期：' + (sources.checked_date || '见逐册记录') + '。';
      var evidence = document.getElementById(subject + '-evidence');
      evidence.replaceChildren();
      note(evidence, '收录范围', sources.scope || coverage.scope);
      note(evidence, '版本与材料边界', sources.version_boundary);
      note(evidence, '核验方法', sources.method);
      evidence.append(node('p', '教材册次用于查找原书；高中年级仅为建议学习编排。各条记录区分主教材正文、官方目录、配套资料和更新通报，不把配套目录或旧版正文标为最新版教材全文核验。'));
      evidence.append(node('p', '知识摘要、练习与先修关系已经 AI 检查，尚未经教师审核；每节有核心节点不等于覆盖全部课文、实验和综合题。'));
      var navigation = node('p');
      navigation.append(link('浏览本学科', 'explore/index.html?subject=' + subject), ' · ', link('选择测评范围', 'diagnose/index.html?subject=' + subject), ' · ', link('完整来源记录', 'data/' + subject + '-sources.json'), ' · ', link('覆盖映射', 'data/' + subject + '-coverage.json'));
      evidence.append(navigation);
      var refs = sources.curriculum_references || [];
      if (refs.length) {
        var refDetails = node('details'); refDetails.append(node('summary','课程标准与教材更新依据'));
        refs.forEach(function(ref) {
          var item = node('div', null, 'source-reference');
          item.append(node('p', ref.title || ref.name || '官方资料'));
          note(item, '发布来源', [ref.publisher, ref.date].filter(Boolean).join(' · '));
          note(item, '材料类型', evidenceLabel(ref.evidence_level));
          note(item, '核验范围', ref.verification || ref.read_scope || ref.note || ref.evidence);
          note(item, '对应内容', ref.short_evidence);
          note(item, '数据时点', ref.data_reference_date);
          note(item, '证据边界', ref.limitations);
          var href = external(ref, '查看依据'); if (href) item.append(href);
          if (/^https?:\/\//.test(ref.landing_url || '')) item.append(' · ', link('查看发布页', ref.landing_url, true));
          if (/^https?:\/\//.test(ref.official_pdf_url || '')) item.append(' · ', link('查看官方 PDF 链接', ref.official_pdf_url, true));
          refDetails.append(item);
        });
        evidence.append(refDetails);
      }
      note(evidence, '覆盖限制', coverage.limitations);
      if (coverage.excluded_content && coverage.excluded_content.length) {
        var exclusions = node('details'); exclusions.append(node('summary','未纳入的内容与使用边界'));
        note(exclusions, '', coverage.excluded_content); evidence.append(exclusions);
      }
      host.replaceChildren();
      sources.books.forEach(function(book) {
        var list = topics.filter(function(t) { return t.textbook.book === book.id; });
        if (!list.length) return;
        var ids = new Set(list.map(function(t) { return t.id; }));
        var card = node('section', null, 'source-book'); card.id = book.id;
        card.append(node('h3', book.title || book.volume));
        var bibliographic = [book.publisher, book.curriculum_level,
          book.approval_year ? book.approval_year + ' 年审定' : '',
          book.publication_date ? '出版：' + book.publication_date : book.publication_year ? '出版年：' + book.publication_year : '',
          book.isbn ? 'ISBN ' + book.isbn : ''].filter(Boolean).join(' · ');
        if (bibliographic) card.append(node('p', bibliographic));
        note(card, '版次', book.edition);
        note(card, '印次', book.latest_printing_date || book.printing_date || book.printing);
        note(card, '课程标准依据', book.curriculum_standard || book.curriculum_basis || book.curriculum);
        note(card, '现行课标核对', book.current_curriculum_standard);
        if (book.curriculum_current_evidence) {
          var curriculum = book.curriculum_current_evidence;
          var curriculumDetail = node('details'); curriculumDetail.append(node('summary', '本册课程标准核验记录'));
          note(curriculumDetail, '', curriculum.title);
          note(curriculumDetail, '文件依据', curriculum.document_authority);
          note(curriculumDetail, '转载来源', [curriculum.repost_publisher, curriculum.repost_date].filter(Boolean).join(' · '));
          note(curriculumDetail, '实读印刷页码', curriculum.read_printed_pages);
          note(curriculumDetail, '材料可读情况', curriculum.access);
          note(curriculumDetail, '证据边界', curriculum.limitation);
          var curriculumLinks = node('p');
          if (/^https?:\/\//.test(curriculum.publish_url || '')) curriculumLinks.append(link('查看转载发布页', curriculum.publish_url, true));
          if (/^https?:\/\//.test(curriculum.read_url || '')) {
            if (curriculumLinks.childNodes.length) curriculumLinks.append(' · ');
            curriculumLinks.append(link('查看对应课标附件', curriculum.read_url, true));
          }
          curriculumDetail.append(curriculumLinks); card.append(curriculumDetail);
        }
        var update = book.verified_update;
        note(card, '已核实更新', update && typeof update === 'object' ? [update.label, update.notice_date ? update.notice_date + ' 通报' + (update.notice_item ? '第 ' + update.notice_item + ' 项' : '') : '', update.meaning].filter(Boolean).join('；') : update);
        note(card, '材料证据', evidenceLabel(book.evidence_level));
        note(card, '核验范围', book.verification || book.verified_scope);
        note(card, '已读材料', book.read_scope);
        note(card, '版本说明', book.version_note || book.publication_note || book.edition_note);
        note(card, '仍待核验', book.limitations || book.source_boundary);
        if (book.chapter_title_variants && book.chapter_title_variants.length) {
          var variants = node('details'); variants.append(node('summary', '已核材料中的章名差异'));
          book.chapter_title_variants.forEach(function(variant) {
            note(variants, '第 ' + variant.chapter + ' 章', [variant.display, variant.variant, variant.evidence].filter(Boolean).join('；'));
          });
          card.append(variants);
        }
        if (book.companion_atlas) {
          var atlas = book.companion_atlas;
          var companion = node('details'); companion.append(node('summary', '配套图册书目（与主教材分列）'));
          note(companion, '', atlas.title || atlas.name);
          note(companion, '出版社', atlas.publisher);
          note(companion, '图册 ISBN', atlas.isbn);
          note(companion, '适配关系', atlas.relationship);
          var atlasSource = external(atlas, '查看图册依据'); if (atlasSource) companion.append(atlasSource);
          card.append(companion);
        }
        var controls = node('p');
        controls.append(link('浏览本册', 'explore/index.html?subject=' + subject + '&volume=' + encodeURIComponent(book.id) + '#' + list[0].id), ' · ', link('测评本册已收录知识', 'diagnose/index.html?subject=' + subject + '&volume=' + encodeURIComponent(book.id)));
        var source = external(book, '查看本册依据'); if (source) controls.append(' · ', source);
        if (/^https?:\/\//.test(book.update_evidence_url || '')) controls.append(' · ', link('查看教材更新依据', book.update_evidence_url, true));
        if (/^https?:\/\//.test(book.curriculum_reference_url || '')) controls.append(' · ', link('查看现行课标依据', book.curriculum_reference_url, true));
        if (/^https:\/\//.test(book.official_pdf_url || '')) controls.append(' · ', link('查看已定位的官方 PDF 链接', book.official_pdf_url, true));
        if (/^https:\/\//.test(book.evidence_pdf_url || '')) controls.append(' · ', link('查看官方 PDF 依据', book.evidence_pdf_url, true));
        card.append(controls);
        card.append(node('p', '本册收录 ' + list.length + ' 点、' + questions.filter(function(q) { return ids.has(q.topicId); }).length + ' 道原创练习。'));
        var chapters = new Map();
        list.forEach(function(t) {
          var c = Subjects.scienceChapter(t), key = c.volume + ' ' + c.chapterNo;
          if (!chapters.has(key)) chapters.set(key, {key:key, first:t, list:[]});
          chapters.get(key).list.push(t);
        });
        chapters.forEach(function(chapter) {
          var first = chapter.first, detail = node('details');
          detail.append(node('summary', [first.textbook.unit,first.textbook.chapter].filter(Boolean).join(' · ') + ' · ' + chapter.list.length + ' 点'));
          var actions = node('p');
          actions.append(link('浏览本章', 'explore/index.html?subject=' + subject + '&chapter=' + encodeURIComponent(chapter.key) + '#' + first.id), ' · ', link('以本章为目标', 'diagnose/index.html?subject=' + subject + '&chapter=' + encodeURIComponent(chapter.key)));
          detail.append(actions);
          var ul = node('ul', null, 'source-topics');
          chapter.list.forEach(function(topic) {
            var li = node('li'); li.append(link(topic.name, 'explore/index.html?subject=' + subject + '#' + topic.id),node('span',topic.textbook.section || '')); ul.append(li);
          });
          detail.append(ul); card.append(detail);
        });
        host.append(card);
      });
      var hash = location.hash.slice(1) || (selected === subject ? subject : ''), target = hash && document.getElementById(hash);
      if (target) target.scrollIntoView();
    }).catch(function(error) {
      document.getElementById(subject + '-summary').textContent = Subjects.names[subject] + '教材与覆盖数据未能载入，请确认完整解压并保留所有数据文件。';
      host.replaceChildren(node('p', String(error.message || error), 'muted'));
    });
  });
})();
