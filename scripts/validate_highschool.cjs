/* Validate delivered data, offline assets, and the real diagnosis engine.
 * This checks structure and behavior; it does not claim to prove science answers.
 * Usage: node scripts/validate_highschool.cjs [optional-original-v10-directory]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = process.argv[2] ? path.resolve(process.argv[2]) : null;
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const E = require(path.join(root, 'diagnose', 'engine.js'));
const C = require(path.join(root, 'diagnose', 'choice-order.js'));
let assertions = 0;
const check = (condition, message) => { assertions++; assert.ok(condition, message); };
const unique = (items, key, name) => check(new Set(items.map(x=>x[key])).size===items.length, name+' duplicate '+key);
const report = {date:'2026-10-30', scope:'高中物理与化学扩展；结构和实际诊断引擎回归', subjects:{}, limitations:['结构/判分回归不能替代独立解题和学科审阅。','真实浏览器测试另记；本脚本不验证像素布局。']};
const ctx = {window:{}, URL, URLSearchParams, location:{search:'',hash:''}, setTimeout, clearTimeout};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/data-manifest.js'),'utf8'),ctx);
const manifest = ctx.window.ToyDataFiles;
vm.runInContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),ctx);
const S = ctx.window.Subjects;
const payloads = {};
for (const [file, asset] of Object.entries(manifest)) {
  const runtime = {window:{ToyData:{register:(key,raw)=>{payloads[key]=raw;}}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'data/runtime',asset),'utf8'),runtime);
  check(payloads[file]===fs.readFileSync(path.join(root,'data',file),'utf8'),file+' runtime mismatch');
}
report.runtime_files = Object.keys(manifest).length;
const allIds = new Set();
for (const subject of ['physics','chemistry']) {
  const topics=read(subject+'-topics.json'), questions=read(subject+'-questions.json'), deps=read(subject+'-dependencies.json');
  const sources=read(subject+'-sources.json'), coverage=read(subject+'-highschool-coverage.json');
  const high=topics.filter(t=>t.grade>=10&&t.grade<=12), byId=new Map(topics.map(t=>[t.id,t]));
  unique(topics,'id',subject+' topics'); unique(questions,'id',subject+' questions');
  check(high.length>0,subject+' has no high school nodes');
  topics.forEach(t=>{check(!allIds.has(t.id),'Cross-subject duplicate '+t.id);allIds.add(t.id);});
  const bookIds=new Set(sources.books.map(b=>b.id));
  const counts={};
  let judgeChecks=0, shuffledChecks=0, sessions=0, screenSessions=0;
  for (const q of questions) {
    check(byId.has(q.topicId),q.id+' orphan question');
    counts[q.topicId]=(counts[q.topicId]||0)+1;
    check(typeof q.prompt==='string' && q.prompt.length>0,q.id+' empty prompt');
    if(q.type==='choice') {
      unique(q.choices,'key',q.id+' choices'); unique(q.choices,'text',q.id+' choices');
      check(q.choices.some(c=>c.key===q.answer),q.id+' answer missing from choices');
      for(const c of q.choices) {check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' incorrect grading');judgeChecks++;}
      if(byId.get(q.topicId).grade>=10) for (const seed of ['audit0','audit1','audit2','audit3','audit4']) {
        const ordered=C.ordered(q,seed), repeated=C.ordered(q,seed);
        check(JSON.stringify(ordered)===JSON.stringify(repeated),q.id+' unstable shuffled restore');
        for(const c of ordered) {check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' shuffle changes grading'); shuffledChecks++;}
        check(ordered.map(c=>c.label).join('')==='ABCD',q.id+' display labels');
      }
    }
  }
  for(const t of high) {
    check(/^cn[pc]_h\d+$/.test(t.id),t.id+' unexpected high school id');
    check(t.subject===subject,t.id+' incorrect subject');
    check(counts[t.id]>=2,t.id+' fewer than two questions');
    check(t.description && t.description.length>=20,t.id+' missing explanation');
    check(Array.isArray(t.mastery_criteria) && t.mastery_criteria.length>=1,t.id+' missing mastery criteria');
    check(t.textbook && bookIds.has(t.textbook.book),t.id+' unresolvable book reference');
    check(t.textbook.chapter && t.textbook.section && t.textbook.volume,t.id+' incomplete chapter citation');
    check(t.textbook.source_url && /^https?:\/\//.test(t.textbook.source_url),t.id+' missing source URL');
    check(!/undefined|null/.test(S.reference(t)),t.id+' invalid rendered textbook reference');
    const qs=questions.filter(q=>q.topicId===t.id);
    for(const q of qs) {
      check(q.choices && q.choices.length===4,q.id+' expected four unique choices');
      check(typeof q.explanation==='string' && q.explanation.length>=8,q.id+' missing answer explanation');
      check(q.origin && q.origin.includes('原创'),q.id+' missing original-question label');
      check(q.textbook?.book===t.textbook.book,q.id+' textbook differs from topic');
    }
  }
  const edgeKeys = new Set();
  for(const d of deps) {
    check(byId.has(d.topicId) && byId.has(d.prerequisiteId),'Dangling prerequisite '+JSON.stringify(d));
    check(d.topicId!==d.prerequisiteId,'Self dependency '+d.topicId);
    const key=d.prerequisiteId+'->'+d.topicId;
    check(!edgeKeys.has(key),'Duplicate dependency '+key);edgeKeys.add(key);
    check(['hard','soft'].includes(d.strength),'Unknown dependency strength '+key);
    check(typeof d.reason==='string' && d.reason.length>4,'Missing dependency reason '+key);
  }
  const graph=E.buildGraph(S.engineTopics(topics),deps,questions);
  check(E.topoSort(graph,topics.map(t=>t.id)).length===topics.length,subject+' cycle');
  for(const t of high) for(const response of ['correct','wrong','skip','mixed']) {
    let session=E.createSession(graph,[t.id],{seed:'high-school-audit',limit:20});
    let item, turns=0;
    while((item=E.nextItem(graph,session))) {
      check(turns++<21,t.id+' unbounded diagnosis');
      session=E.applyAnswer(graph,session,item.topicId,response==='mixed'?(turns%2?'wrong':'correct'):response);
    }
    const summary=E.summarize(graph,session), layout=E.layout(graph,session,summary);
    check(summary.finished,t.id+' session did not finish');
    check(summary.path.every(p=>byId.has(p.id)),t.id+' unknown path node');
    check(layout.nodes.every(n=>byId.has(n.id)),t.id+' unknown layout node');
    if(response==='correct') check(summary.mastered.includes(t.id),t.id+' correct answer not mastered');
    if(response==='wrong' || response==='skip') check(summary.weak.includes(t.id),t.id+' double wrong not weak');
    const replay=E.replay(graph,session.targets,session.answers,{seed:session.seed,limit:session.limit});
    check(JSON.stringify(replay.status)===JSON.stringify(session.status),t.id+' replay status mismatch');
    sessions++;
  }
  const screenScopes = [10,11,12].map(g=>({label:'grade '+g,ids:high.filter(t=>t.grade===g).map(t=>t.id)}));
  for(const book of new Set(high.map(t=>t.textbook.book))) screenScopes.push({label:book,ids:high.filter(t=>t.textbook.book===book).map(t=>t.id)});
  for(const scope of screenScopes) for(const response of ['correct','wrong','skip','mixed']) {
    const allowed=new Set(scope.ids);
    let s=E.createSession(graph,scope.ids,{mode:'screen',seed:'scope-audit',limit:20}), item, turns=0;
    while((item=E.nextItem(graph,s))) {
      check(allowed.has(item.topicId),scope.label+' asks outside selected scope');
      check(turns++<21,scope.label+' unbounded screening');
      s=E.applyAnswer(graph,s,item.topicId,response==='mixed'?(turns%2?'wrong':'correct'):response);
    }
    const sum=E.summarize(graph,s), chapters=E.chapterSummary(graph,s);
    check(sum.finished,scope.label+' screening unfinished');
    check(chapters.reduce((n,c)=>n+c.total,0)===scope.ids.length,scope.label+' chapter total mismatch');
    for(const c of chapters)check(c.volume && c.chapterNo && c.chapterName,scope.label+' missing textbook chapter label');
    const replay=E.replay(graph,s.targets,s.answers,{mode:'screen',seed:s.seed,limit:s.limit});
    check(JSON.stringify(replay.status)===JSON.stringify(s.status),scope.label+' screening replay mismatch');
    screenSessions++;
  }
  // The manifest is authored against textbook sections; every mapped ID must resolve.
  const mapped=[];
  const walk=(v)=>{
    if(!v||typeof v!=='object') return;
    if(Array.isArray(v)) {v.forEach(walk);return;}
    for(const [k,val] of Object.entries(v)) {
      if(['topicIds','topic_ids'].includes(k) && Array.isArray(val)) mapped.push(...val);
      else walk(val);
    }
  };
  walk(coverage);
  check(mapped.length>0,subject+' empty textbook coverage mapping');
  for(const id of mapped)check(byId.has(id) && byId.get(id).grade>=10,subject+' coverage points to unknown/non-high-school '+id);
  const covered=new Set(mapped);
  for(const t of high)check(covered.has(t.id),t.id+' absent from textbook coverage');
  // Counts follow the separately checked textbook tables of contents, not the
  // generated number of topics (one section may map to several topic nodes).
  const expectedSections = subject==='physics'
    ? {p10r1:19,p10r2:18,p10r3:23,p11s1:23,p11s2:19,p12s3:23}
    : {chem_h_b1:11,chem_h_b2:12,chem_h_s1:13,chem_h_s2:9,chem_h_s3:15};
  check(coverage.books.length===Object.keys(expectedSections).length,subject+' missing coverage book');
  let sectionCount=0, experimentCount=0;
  for(const b of coverage.books) {
    const sections=subject==='physics' ? b.chapters.flatMap(c=>c.sections) : b.sections.filter(s=>s.kind==='core');
    check(sections.length===expectedSections[b.book],b.book+' incomplete table of contents');
    for(const s of sections)check(Array.isArray(s.topicIds)&&s.topicIds.length>0,b.book+' empty section '+s.section);
    sectionCount+=sections.length;
    if(subject==='chemistry') experimentCount+=b.sections.filter(s=>s.kind==='experiment').length;
  }
  if(subject==='physics') experimentCount=coverage.experiments.length;
  check(experimentCount===(subject==='physics'?21:18),subject+' incomplete experiment index');
  if(baseline) for(const kind of ['topics','questions','dependencies']) {
    const old=JSON.parse(fs.readFileSync(path.join(baseline,'data',subject+'-'+kind+'.json'),'utf8'));
    const current={topics,questions,dependencies:deps}[kind];
    check(JSON.stringify(old)===JSON.stringify(current.slice(0,old.length)),subject+' altered initial '+kind);
  }
  report.subjects[subject]={total_topics:topics.length,highschool_topics:high.length,total_questions:questions.length,highschool_questions:questions.filter(q=>byId.get(q.topicId).grade>=10).length,total_dependencies:deps.length,highschool_dependencies:deps.filter(d=>byId.get(d.topicId).grade>=10).length,books:Array.from(new Set(high.map(t=>t.textbook.book))),judge_checks:judgeChecks,shuffled_choice_checks:shuffledChecks,diagnosis_sessions:sessions,screening_sessions:screenSessions,coverage_topic_count:covered.size,textbook_sections:sectionCount,required_experiments:experimentCount,grades:[10,11,12].map(g=>({grade:g,topics:high.filter(t=>t.grade===g).length}))};
}
if(baseline) for(const f of ['topics.json','questions.json','dependencies.json','math-university-topics.json','math-university-questions.json','math-university-dependencies.json','id-aliases.json','cn-curriculum-standards.json']) check(fs.readFileSync(path.join(root,'data',f)).equals(fs.readFileSync(path.join(baseline,'data',f))),'Unrelated data changed: '+f);
if(baseline) for(const f of ['engine.js']) check(fs.readFileSync(path.join(root,'diagnose',f)).equals(fs.readFileSync(path.join(baseline,'diagnose',f))),'Diagnosis core changed: '+f);
// 408 is now included in shuffle scope. Existing subjects must retain identical order.
if (baseline) {
  const OldC = require(path.join(baseline,'diagnose','choice-order.js'));
  for (const name of ['questions.json','physics-questions.json','chemistry-questions.json','math-university-questions.json'])
    for (const q of read(name).filter(q=>q.type==='choice'))
      for (const seed of ['regression0','regression1','regression2'])
        check(JSON.stringify(C.ordered(q,seed))===JSON.stringify(OldC.ordered(q,seed)),q.id+' existing choice order changed');
}
report.assertions=assertions;
report.result='PASS';
fs.mkdirSync(path.join(root,'validation'),{recursive:true});
fs.writeFileSync(path.join(root,'validation','highschool-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
