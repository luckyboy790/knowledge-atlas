#!/usr/bin/env node
// Run: node scripts/validate_university_frontend.cjs [v13_baseline_directory]
// Omitting the baseline explicitly skips preservation comparisons.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.argv[2] ? path.resolve(process.argv[2]) : null;
const REPORT = path.join(ROOT, 'validation/university-frontend-validation.json');
const checks = [];
const skipped = [];
const available = [];
const baselineSubjectsChecked = [];
let baselineComparison = 'not_run';
let existingJsonPreserved = null;
let coreEngineUnchanged = null;
function check(name, f) {
  try { f(); checks.push(name); }
  catch (error) { error.checkName = name; throw error; }
}
function digest(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function load(root, search = '', hash = '') {
  const window = {ToyDataFiles:{}};
  const sandbox = {window, URL, URLSearchParams, location:{search,hash}, document:{currentScript:{src:'http://localhost/assets/subjects.js'}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),sandbox);
  return window.Subjects;
}
const legacy = ['math','english','physics','chemistry','cs408','med','tcm','herbal'];
const fresh = ['uphysics','uchemistry'];

function main() {
if (process.argv.length > 3) throw new Error('Usage: node scripts/validate_university_frontend.cjs [v13_baseline_directory]');
if (BASE) assert(fs.existsSync(BASE) && fs.statSync(BASE).isDirectory(), 'Baseline directory does not exist: '+BASE);
const S = load(ROOT), B = BASE ? load(BASE) : null;
check('all ten subject identities exist',()=>assert.equal(Object.keys(S.names).length,10));
if (BASE) baselineComparison = 'in_progress';
for (const subject of legacy) {
  if (!BASE) {
    skipped.push({check:subject+' identity and existing curriculum unchanged',reason:'No baseline directory supplied.'});
    continue;
  }
  check(subject+' identity and existing curriculum unchanged',()=>{
    assert.equal(S.names[subject],B.names[subject]);
    assert.equal(JSON.stringify(S.coursesFor(subject)),JSON.stringify(B.coursesFor(subject)));
    assert.equal(JSON.stringify(S.specs[subject]),JSON.stringify(B.specs[subject]));
    for(const t of ['诊断这个知识点','按课程整体诊断','诊断课程','普通文本','课程知识作答']) assert.equal(S.assessment(t,subject),B.assessment(t,subject));
  });
  baselineSubjectsChecked.push(subject);
}
for(const [subject,prefix,grades] of [['uphysics','uphy_',[51,52,53,54,55,56]],['uchemistry','uch_',[61,62,63,64,65,66,67]]]) {
  check(subject+' academic classification and modules',()=>{
    assert(S.academic(subject)); assert(S.universityScience(subject)); assert(S.curriculum(subject)); assert(!S.medical(subject)); assert(!S.science(subject));
    assert.equal(JSON.stringify(S.coursesFor(subject).map(c=>c.grade)),JSON.stringify(grades));
    assert.equal(S.unitLabel(subject),'模块');
    assert.equal(S.assessment('按课程整体诊断',subject),'按模块整体测评');
    assert.equal(S.assessment('诊断课程',subject),'测评模块');
  });
  check(subject+' routes, data files, module identifiers and normalization',()=>{
    assert.equal(load(ROOT,'?subject='+subject).read(),subject);
    for(const c of S.coursesFor(subject)){
      const id=prefix+c.id+'_001';
      assert.equal(load(ROOT,'','#'+id).read(),subject);
      assert.equal(load(ROOT,'?target='+id).read(),subject);
      assert.equal(load(ROOT,'?subject=math','#'+id).read(),'math');
      assert.equal(S.of({id}),subject);
      assert.equal(S.courseFrom(c.id,subject).grade,c.grade);
      assert.equal(S.courseFrom(c.grade,subject).id,c.id);
      assert.equal(S.courseName(c.name,subject),c.name);
      const topic={id,subject,module:c.id,grade:c.grade,chapter:'第1章 基础模型'};
      const n=S.engineTopics([topic])[0];
      assert.equal(n.grade,grades[0]); assert.equal(n.id,id); assert(n.chapter.startsWith(c.name)); assert.equal(topic.grade,c.grade);
    }
    for(const file of ['topics.json','questions.json','dependencies.json']) assert.equal(S.data(file,subject),subject+'-'+file);
    assert.equal(S.reference({id:prefix+'test_001',textbook:{title:'测试教材',edition:'第8版',chapter:'第1章',section:'第1节'}}),'测试教材 · 第8版 · 第1章 · 第1节');
  });
}
if (BASE) {
  const oldJson=fs.readdirSync(path.join(BASE,'data')).filter(x=>x.endsWith('.json'));
  check('all 39 existing data JSON files remain byte-identical',()=>{
    assert.equal(oldJson.length,39);
    for(const name of oldJson) assert.equal(digest(path.join(ROOT,'data',name)),digest(path.join(BASE,'data',name)),name);
  });
  existingJsonPreserved = oldJson.length;
  check('core engine remains byte-identical',()=>assert.equal(digest(path.join(ROOT,'diagnose/engine.js')),digest(path.join(BASE,'diagnose/engine.js'))));
  coreEngineUnchanged = true;
  baselineComparison = 'passed';
} else {
  for (const name of ['all 39 existing data JSON files remain byte-identical','core engine remains byte-identical']) {
    skipped.push({check:name,reason:'No baseline directory supplied.'});
  }
}
for(const rel of ['index.html','explore/index.html','diagnose/index.html','sources.html']) {
  const html=fs.readFileSync(path.join(ROOT,rel),'utf8');
  check(rel+' ten subject navigation links',()=>{
    for(const subject of legacy.concat(fresh)) assert.equal((html.match(new RegExp('data-subject="'+subject+'"','g'))||[]).length,1);
    assert(!html.includes('八个学科'));
  });
}
check('home hash redirects support new IDs including underscore module names',()=>{
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('var id = location.hash'));
  for(const [id,subject] of [['uphy_oscillations_waves_001','uphysics'],['uch_structure_004','uchemistry']]){
    let replacement='';
    const sandbox={location:{hash:'#'+id,replace:url=>replacement=url},document:{documentElement:{style:{}}}};
    vm.runInNewContext(script,sandbox);
    assert.equal(replacement,'explore/index.html?subject='+subject+'#'+id);
  }
});
const Choice=require(path.join(ROOT,'diagnose/choice-order.js'));
check('new subjects use stable choice permutations and preserve grading keys',()=>{
  for(const id of ['uphy_mechanics_001','uphy_oscillations_waves_001','uch_structure_004']){
    const q={id:id+'_q1',topicId:id,answer:'C',choices:['A','B','C','D'].map(key=>({key,text:'option '+key}))};
    let changed=false;
    for(let seed=1;seed<=24;seed++){
      const a=Choice.ordered(q,seed),b=Choice.ordered(q,seed);
      assert.deepEqual(a,b);
      assert.deepEqual(a.map(x=>x.key).sort(),['A','B','C','D']);
      assert.deepEqual(a.map(x=>x.label),['A','B','C','D']);
      assert.equal(a.find(x=>x.key===q.answer).text,'option C');
      if(a.some((x,i)=>x.key!==q.choices[i].key))changed=true;
    }
    assert(changed); assert(!('label' in q.choices[0]));
  }
});
check('new context labels and source section anchors exist',()=>{
  const app=fs.readFileSync(path.join(ROOT,'explore/app.js'),'utf8');
  assert(app.includes("modern_physics:'现代物理学'")); assert(app.includes("modern_chemistry:'现代化学'"));
  const html=fs.readFileSync(path.join(ROOT,'sources.html'),'utf8');
  for(const s of fresh) for(const id of [s,s+'-summary',s+'-coverage',s+'-books']) assert(html.includes('id="'+id+'"'));
});
for(const subject of fresh){
  const file=path.join(ROOT,'data',subject+'-topics.json');
  if(!fs.existsSync(file))continue;
  const topics=JSON.parse(fs.readFileSync(file,'utf8')); available.push(subject);
  check(subject+' actual data agree with configured modules and demo',()=>{
    const demo=topics.find(t=>t.id===S.specs[subject].demo);assert(demo,'configured demo missing');assert.equal(demo.name,S.specs[subject].demoName);
    for(const t of topics){const c=S.courseFrom(t.module,subject);assert(c,t.module);assert.equal(c.grade,t.grade);assert.equal(S.of(t),subject);}
    for(const c of S.coursesFor(subject))assert(topics.some(t=>t.module===c.id),c.id);
  });
}
}

const changed=['assets/subjects.js','assets/home.js','assets/medical-ui.js','assets/medical-sources.js','assets/site.css','explore/app.js','diagnose/app.js','diagnose/choice-order.js','index.html','explore/index.html','diagnose/index.html','sources.html','scripts/build_runtime.py'];
function writeReport(status, error) {
  const limits = ['实际页面布局、真实测评流程、来源页与导出需要另行浏览器验收。'];
  if (available.length !== fresh.length) limits.unshift('两科实际数据尚未全部接入；缺失学科的默认演示名称、模块映射与运行时载荷需在完整数据就绪后重跑。');
  if (!BASE) limits.unshift('未提供基线目录；旧8科配置、39份JSON与核心engine的精确比对未运行，不能据此声称保持不变。');
  const report = {
    schema_version:1,
    date:new Date().toISOString().slice(0,10),
    reviewer:'/root/university_frontend',
    status,
    scope:'前端作者针对性静态与接口检查；不是独立内容复核或真实浏览器验收。',
    baseline_path:BASE,
    baseline_comparison:baselineComparison,
    baseline_subjects_checked:baselineSubjectsChecked,
    checks,
    check_groups:checks.length,
    skipped_checks:skipped,
    existing_json_preserved:existingJsonPreserved,
    core_engine_unchanged:coreEngineUnchanged,
    data_integration_checked_for:available,
    remaining_limits:limits,
    changed_file_sha256:Object.fromEntries(changed.filter(rel=>fs.existsSync(path.join(ROOT,rel))).map(rel=>[rel,digest(path.join(ROOT,rel))]))
  };
  if (error) report.failure = {check:error.checkName || null,message:error.message};
  fs.mkdirSync(path.dirname(REPORT),{recursive:true});
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status,check_groups:checks.length,baseline_comparison:baselineComparison,existing_json_preserved:existingJsonPreserved,data_integration_checked_for:available,report:path.relative(ROOT,REPORT),...(error?{failure:report.failure}:{})}));
}
try {
  main();
  writeReport('PASS');
} catch (error) {
  if (baselineComparison === 'in_progress') baselineComparison = 'incomplete';
  writeReport('FAIL',error);
  process.exitCode = 1;
}
