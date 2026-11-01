#!/usr/bin/env node
// Usage: node scripts/validate_probability_frontend.cjs [v14_baseline_directory]
// No browser or external package is required. A missing baseline is explicitly reported.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] ? path.resolve(process.argv[2]) : null;
const REPORT = path.join(ROOT, 'validation/probability-frontend-validation.json');
const checks = [], skipped = [];
const modules = ['events','univariate','multivariate','moments','limits','sampling','estimation','testing'];
const files = ['topics','questions','dependencies','sources','coverage'].map(k => 'math-probability-' + k + '.json');
const changed = ['assets/subjects.js','assets/home.js','assets/probability-sources.js','explore/app.js','explore/index.html','diagnose/app.js','diagnose/choice-order.js','index.html','sources.html','scripts/build_runtime.py','scripts/validate_probability_frontend.cjs','assets/data-manifest.js'];
let preserved = null, enginePreserved = null, runtimeCount = null, actualTopics = null, actualQuestions = null;
function read(rel, root = ROOT) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function json(rel, root = ROOT) { return JSON.parse(read(rel, root)); }
function digest(rel, root = ROOT) { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex'); }
function equal(a, b, message) { assert.equal(JSON.stringify(a), JSON.stringify(b), message); }
async function check(name, fn) {
  try { await fn(); checks.push(name); }
  catch (error) { error.checkName = name; throw error; }
}
class Element {
  constructor(tag) { this.tagName = tag; this.nodeType = tag === '#text' ? 3 : 1; this.children = []; this.attrs = {}; this.events = {}; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(x => typeof x === 'string' ? x : x.textContent).join(''); }
  append(...children) { this.children.push(...children.map(child => child instanceof Element ? child : String(child))); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  setAttribute(key, value) { this.attrs[key] = String(value); if (key === 'id') this.id = String(value); }
  getAttribute(key) { return this.attrs[key] || this[key] || null; }
  addEventListener(name, fn) { this.events[name] = fn; }
  remove() {}
  scrollIntoView() { this.scrolled = true; }
}
function walk(root) { return [root].concat(root.children.filter(x => x && typeof x === 'object').flatMap(walk)); }
function environment(root = ROOT, search = '', hash = '') {
  const dom = new Element('document');
  for (const id of ['root','detail','math-probability-books','math-probability-summary','math-probability-scope','math-probability-coverage']) {
    const element = new Element('div'); element.id = id; dom.append(element);
  }
  const document = {
    currentScript:{src:'https://example.test/nested/graph/assets/subjects.js'},
    createElement:tag => new Element(tag),
    createTextNode:text => { const el = new Element('#text'); el.textContent = text; return el; },
    getElementById:id => walk(dom).find(el => el.id === id) || null,
    querySelectorAll:() => [],
    documentElement:{style:{}},
    head:{}
  };
  const window = {addEventListener() {}, DiagEngine:require(path.join(root, 'diagnose/engine.js'))};
  const context = vm.createContext({window,document,location:{search,hash,pathname:'/nested/graph/explore/index.html'},URL,URLSearchParams,setTimeout,clearTimeout,console});
  vm.runInContext(read('assets/data-manifest.js', root), context);
  document.head.appendChild = script => {
    const url = new URL(script.src);
    assert(url.pathname.startsWith('/nested/graph/data/runtime/'), 'Runtime must support an HTTP deployment subpath');
    try {
      vm.runInContext(read('data/runtime/' + path.basename(url.pathname), root), context);
      script.onload();
    } catch (error) { if (script.onerror) script.onerror(error); else throw error; }
  };
  vm.runInContext(read('assets/subjects.js', root), context);
  context.Subjects = window.Subjects;
  return {context,window,document,dom,S:window.Subjects};
}
function diagnose(env, root = ROOT) {
  const code = read('diagnose/app.js', root);
  const marker = '\n  init();\n})();';
  assert(code.includes(marker), 'Diagnose instrumentation entry point changed');
  vm.runInContext(code.replace(marker, '\n  window.FrontendTest = {loadData,scopeTargets,resolveTargets,buildTree,volumeRows,standardsCard,gradeCard,setGrade:function(s){gradeSel=s;},setSubject:function(s){subject=s;},data:function(){return D;},setSession:function(s){session=s;}};\n})();'), env.context);
  return env.window.FrontendTest;
}
function explore(env) {
  const code = read('explore/app.js');
  const marker = '\n  subject = readSubject();';
  assert.equal(code.split(marker).length, 2, 'Explore instrumentation entry point changed');
  const capture = `
  window.FrontendTest = {
    load:load,gradeWord:gradeWord,chapterOf:chapterOf,
    runQuery:function(search,s){subject=s||'math';grade='';stage='';domain='';query='';location.search=search;applyQuery();return {grade:grade,stage:stage};},
    visible:function(){return topics.filter(passFilter).map(function(t){return t.id;});},
    detail:function(id){selected=id;renderDetail();}
  };
})();`;
  vm.runInContext(code.split(marker)[0] + capture, env.context);
  return env.window.FrontendTest;
}
async function main() {
  assert(process.argv.length <= 3, 'Usage: node scripts/validate_probability_frontend.cjs [v14_baseline_directory]');
  if (BASE) assert(fs.statSync(BASE).isDirectory(), 'Baseline directory must exist');
  await check('changed browser scripts and all HTML inline scripts parse', () => {
    for (const rel of changed.filter(x => x.endsWith('.js'))) new vm.Script(read(rel), {filename:rel});
    for (const rel of ['index.html','explore/index.html','diagnose/index.html','sources.html']) {
      for (const match of read(rel).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], {filename:rel});
    }
  });
  const current = environment(), S = current.S;
  await check('probability remains mathematics and all ten subject identities remain present', () => {
    assert.equal(Object.keys(S.names).length, 10);
    for (const search of ['?target=cnm_ps001','?subject=math&grade=17']) assert.equal(environment(ROOT, search).S.read(), 'math');
    assert.equal(environment(ROOT, '', '#cnm_ps001').S.read(), 'math');
    assert.equal(environment(ROOT, '?subject=cs408&grade=17').S.read(), 'cs408');
    assert.equal(S.of({id:'cnm_ps001',subject:'math'}), 'math');
    assert.equal(S.academic('math'), false);
  });
  if (BASE) {
    const B = environment(BASE).S;
    await check('all ten existing subject configurations and label functions equal v14', () => {
      equal(S.names, B.names);
      for (const subject of Object.keys(B.names)) {
        equal(S.coursesFor(subject), B.coursesFor(subject));
        equal(S.specs[subject], B.specs[subject]);
        for (const method of ['academic','curriculum','medical','science','universityScience','unitLabel']) equal(S[method](subject), B[method](subject));
        for (const text of ['诊断这个知识点','按课程整体诊断','诊断课程','普通文本']) assert.equal(S.assessment(text,subject), B.assessment(text,subject));
      }
    });
    await check('all 49 pre-existing data JSON files and core engine remain byte-identical to v14', () => {
      const names = fs.readdirSync(path.join(BASE, 'data')).filter(n => n.endsWith('.json'));
      assert.equal(names.length, 49);
      for (const name of names) assert.equal(digest('data/'+name), digest('data/'+name,BASE), name);
      assert.equal(digest('diagnose/engine.js'), digest('diagnose/engine.js',BASE));
      preserved = names.length; enginePreserved = true;
    });
    await check('existing university mathematics normalization and textbook references equal v14', () => {
      for (const topic of json('data/math-university-topics.json')) {
        equal(S.engineTopics([topic]), B.engineTopics([topic]));
        assert.equal(S.reference(topic), B.reference(topic));
      }
    });
  } else skipped.push('No v14 baseline supplied; exact existing configuration, data and engine preservation were not checked.');
  await check('all page navigations retain exactly ten subjects; course card and grade option are present', () => {
    for (const rel of ['index.html','explore/index.html','diagnose/index.html','sources.html']) {
      const html = read(rel);
      assert.equal((html.match(/data-subject="/g)||[]).length, 10, rel);
      for (const subject of Object.keys(S.names)) assert.equal((html.match(new RegExp('data-subject="'+subject+'"','g'))||[]).length, 1, rel+' '+subject);
    }
    assert(read('assets/home.js').includes("addCard(17, '大学', '概率论与数理统计'"));
    assert(read('explore/index.html').includes('<option value="17">大学 · 概率论与数理统计</option>'));
    assert(read('sources.html').includes('id="math-probability"'));
    assert(read('sources.html').includes('src="assets/probability-sources.js"'));
  });
  await check('homepage legacy hash redirect accepts probability IDs', () => {
    const redirect = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(s=>s.includes('var id = location.hash'));
    let target = '';
    vm.runInNewContext(redirect, {location:{hash:'#cnm_ps001',replace:value=>target=value},document:{documentElement:{style:{}}}});
    assert.equal(target, 'explore/index.html#cnm_ps001');
  });
  const Choice = require(path.join(ROOT,'diagnose/choice-order.js'));
  await check('new probability options shuffle reproducibly without changing grading identity or input', () => {
    const q={id:'cnm_ps001_q1',topicId:'cnm_ps001',answer:'C',choices:['A','B','C','D'].map(key=>({key,text:'option '+key}))};
    let shuffled = false;
    for(let seed=1;seed<=24;seed++) {
      const a=Choice.ordered(q,seed), b=Choice.ordered(q,seed);
      equal(a,b); equal(a.map(x=>x.key).sort(),['A','B','C','D']); equal(a.map(x=>x.label),['A','B','C','D']);
      assert.equal(a.find(x=>x.key===q.answer).text,'option C');
      if(a.some((x,i)=>x.key!==q.choices[i].key))shuffled=true;
    }
    assert(shuffled); assert(!('label' in q.choices[0]));
  });
  if (BASE) await check('choice display for every pre-existing question equals v14 across fixed seeds', () => {
    const oldChoice=require(path.join(BASE,'diagnose/choice-order.js'));
    for (const file of fs.readdirSync(path.join(BASE,'data')).filter(n=>n==='questions.json'||n.endsWith('-questions.json'))) {
      for (const q of json('data/'+file,BASE)) for (const seed of ['v14-regression','another-seed']) equal(Choice.ordered(q,seed), oldChoice.ordered(q,seed), q.id);
    }
  });
  const absent = files.filter(name=>!fs.existsSync(path.join(ROOT,'data',name)));
  if (absent.length) { skipped.push('Actual probability data not yet available: '+absent.join(', ')); return 'WAITING_FOR_DATA'; }
  const topics = json('data/math-probability-topics.json'), questions = json('data/math-probability-questions.json');
  actualTopics = topics.length; actualQuestions = questions.length;
  await check('five probability JSON files are present in the runtime manifest with exact matching payloads', async () => {
    for (const file of files) {
      const filename = current.window.ToyDataFiles[file];
      assert(filename, 'Runtime manifest missing '+file+'; run scripts/build_runtime.py');
      assert(filename.includes(digest('data/runtime/'+filename).slice(0,12)), filename);
      equal(await (await S.fetch('data/'+file,'math')).json(), json('data/'+file));
    }
    if (BASE) for (const [file, filename] of Object.entries(environment(BASE).window.ToyDataFiles)) assert.equal(current.window.ToyDataFiles[file],filename,'Existing runtime changed: '+file);
    runtimeCount = Object.keys(current.window.ToyDataFiles).length;
    assert.equal(runtimeCount,53);
  });
  await check('mathematics runtime merges base, unchanged university data and probability without aliasing', async () => {
    for (const part of ['topics','questions','dependencies']) {
      const expected = json('data/'+part+'.json').concat(json('data/math-university-'+part+'.json'),json('data/math-probability-'+part+'.json'));
      const actual = await (await S.fetch('../data/'+part+'.json','math')).json();
      equal(actual, expected);
      if (actual.length) actual[0].testMutation = true;
      const reread = await (await S.fetch('../data/'+part+'.json','math')).json();
      assert(!reread[0].testMutation);
    }
  });
  const dEnv=environment(), D=diagnose(dEnv); await D.loadData();
  await check('all probability topic IDs, eight textbook chapters and metadata survive engine normalization', () => {
    equal([...new Set(topics.map(t=>t.module))],modules);
    for (const t of topics) {
      assert.equal(t.subject,'math'); assert.equal(t.grade,17); assert.equal(t.semester,'全');
      assert(/^cnm_ps\d+$/.test(t.id)); assert.equal(t.epistemic_status,'modern_mathematics');
      assert(['shared','math1','supplement'].includes(t.exam_scope.track));
      assert.equal(dEnv.window.DiagEngine.parseChapter(t.chapter).volume,'概率论与数理统计');
      assert.equal(D.data().graph.byId[t.id].grade,15);
      assert.equal(D.data().graph.byId[t.id].textbook.book,t.textbook.book);
      assert(S.reference(t).includes('第六版')||S.reference(t).includes('第6版'));
    }
    assert.equal(D.data().tree['概率论与数理统计'].chapters.length,8);
  });
  await check('whole-course, volume, chapter and individual-target URLs resolve only the requested scope', () => {
    const expected=topics.map(t=>t.id);
    for(const search of ['grade=17','grade=概率论与数理统计','volume=概率论与数理统计']) {
      const result=D.resolveTargets(new URLSearchParams(search));equal(result.ids,expected);assert.equal(result.mode,'screen');assert(result.label.includes('含数一方向内容'));
    }
    for(const chapter of D.data().tree['概率论与数理统计'].chapters) equal(D.resolveTargets(new URLSearchParams({chapter:chapter.key})).ids,chapter.topics.map(x=>x.t.id));
    for(const topic of [topics[0],topics[topics.length-1]]) equal(D.resolveTargets(new URLSearchParams({target:topic.id})).ids,[topic.id]);
    for(const [grade,name] of [[15,'高等数学'],[16,'线性代数']]) {
      const ids=json('data/math-university-topics.json').filter(t=>t.grade===grade).map(t=>t.id);
      equal(D.scopeTargets(name).ids,ids);equal(D.resolveTargets(new URLSearchParams({grade:String(grade)})).ids,ids);
    }
  });
  await check('native append in the grade chooser never renders conditional null text', () => {
    for (const grade of ['七','概率论与数理统计']) {
      D.setGrade(grade);
      const text = D.gradeCard().textContent;
      assert(!text.includes('null'), grade + ' chooser displays literal null');
      if (grade === '概率论与数理统计') {
        assert(text.includes(topics.length + ' 个知识点'));
        assert(text.includes('含数一方向内容'));
      }
    }
  });
  const xEnv=environment(), X=explore(xEnv);await X.load();
  await check('explore grade 17 and university filtering include probability while old grade behavior is retained', () => {
    equal(X.runQuery('?grade=17'),{grade:'17',stage:''});equal(X.visible(),topics.map(t=>t.id));
    equal(X.runQuery('?stage=u&grade=17'),{grade:'17',stage:'u'});equal(X.visible(),topics.map(t=>t.id));
    X.runQuery('?stage=h');assert(!X.visible().some(id=>/^cnm_ps/.test(id)));
    X.runQuery('?stage=u');assert(topics.every(t=>X.visible().includes(t.id)));
    for(const [grade,name] of [[15,'高等数学'],[16,'线性代数'],[17,'概率论与数理统计']])assert.equal(X.gradeWord(grade),name);
    for(const grade of [15,16]){X.runQuery('?grade='+grade);equal(X.visible(),json('data/math-university-topics.json').filter(t=>t.grade===grade).map(t=>t.id));}
    equal(X.runQuery('?grade=17','english'),{grade:'',stage:''});X.runQuery('?grade=17');
  });
  await check('probability detail displays modern mathematics, scope provenance, source and all three assessment routes', () => {
    const topic=topics[0];X.detail(topic.id);
    const detail=xEnv.document.getElementById('detail'),elements=walk(detail),links=elements.filter(n=>n.tagName==='a').map(n=>n.getAttribute('href'));
    assert(detail.textContent.includes('知识语境：现代数学'));assert(detail.textContent.includes(topic.exam_scope.label));assert(detail.textContent.includes('2027'));
    assert(links.includes('../diagnose/index.html?target='+topic.id));assert(links.includes('../diagnose/index.html?grade=17'));
    assert(links.some(h=>h&&h.startsWith('../diagnose/index.html?chapter=')));assert(links.includes('../sources.html?subject=math#'+topic.textbook.book));
  });
  await check('new-course result uses textbook review sources while pre-existing calculus retains v14 result behavior', () => {
    D.setSession({mode:'target',targets:[topics[0].id]});
    const card=D.standardsCard({path:[]});assert(card.textContent.includes('教材复习出处'));assert(card.textContent.includes('2027'));assert(card.textContent.includes('第六版')||card.textContent.includes('第6版'));
    D.setSession({mode:'target',targets:['cnm_u001']});assert(D.standardsCard({path:[]}).textContent.includes('相关课标条目'));
  });
  await check('source page renders actual counts, eight chapter routes and official textbook/exam bibliography', async () => {
    const env=environment(ROOT,'?subject=math','#prob_zju6_2026');
    vm.runInContext(read('assets/probability-sources.js'),env.context);
    await new Promise(resolve=>setImmediate(resolve));
    const summary=env.document.getElementById('math-probability-summary').textContent;
    assert(summary.includes(topics.length+' 个核心知识点'));assert(summary.includes(questions.length+' 道原创练习'));assert(!summary.includes('未能加载'));
    const cover=env.document.getElementById('math-probability-coverage');assert.equal(cover.children.filter(x=>x.tagName==='details').length,8);
    assert(env.document.getElementById('prob_zju6_2026'));assert(env.document.getElementById('prob_zju6_2026').textContent.includes('9787040666892'));
    const sourceText=env.document.getElementById('math-probability-books').textContent;assert(sourceText.includes('9787040684049'));assert(sourceText.includes('尚未逐条核验'));
    assert(env.document.getElementById('prob_zju6_2026').scrolled);
  });
  return BASE ? 'PASS' : 'PASS_WITHOUT_BASELINE';
}
function report(status,error) {
  const data={schema_version:1,checked_on:new Date().toISOString(),reviewer:'/root/probability_frontend',status,
    scope:'Portable author-side syntax, offline runtime, route and minimal DOM contract checks; this is not a real-browser layout test or independent content audit.',
    baseline_path:BASE,existing_json_preserved:preserved,core_engine_unchanged:enginePreserved,runtime_files_verified:runtimeCount,probability_topics:actualTopics,probability_questions:actualQuestions,
    checks,check_groups:checks.length,skipped_checks:skipped,remaining_limits:['实际浏览器交互、窄屏布局和导出由单独浏览器验收记录覆盖。','题目数学正确性、教材内容及考研范围核验由独立内容审查记录覆盖。'],
    changed_file_sha256:Object.fromEntries(changed.filter(rel=>fs.existsSync(path.join(ROOT,rel))).map(rel=>[rel,digest(rel)]))};
  if(error)data.failure={check:error.checkName||null,message:error.message};
  fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.writeFileSync(REPORT,JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({status,check_groups:checks.length,existing_json_preserved:preserved,runtime_files_verified:runtimeCount,report:path.relative(ROOT,REPORT),...(error?{failure:data.failure}:{})}));
}
main().then(status=>{report(status);if(status==='WAITING_FOR_DATA')process.exitCode=2;}).catch(error=>{report('FAIL',error);process.exitCode=1;});
