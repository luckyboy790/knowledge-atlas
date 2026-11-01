/* University physics and chemistry: provenance, graph integrity and real assessment engine. */
'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'), args=process.argv.slice(2), baselineArg=args.find(a=>!a.startsWith('--'));
const baseline=baselineArg && path.resolve(baselineArg), requireReviewed=args.includes('--require-reviewed');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'data',n),'utf8'));
const E=require(path.join(root,'diagnose/engine.js')), Choice=require(path.join(root,'diagnose/choice-order.js'));
let checks=0; function check(test,label){checks++;assert.ok(test,label);}
function subjects(subject) {
  const ctx={window:{},URL,URLSearchParams,location:{search:'?subject='+subject,hash:''},setTimeout,clearTimeout};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/data-manifest.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),ctx);
  return ctx;
}
function isbnValid(value) {
  const s=String(value || '').replace(/[-\s]/g,'');
  return /^\d{13}$/.test(s) && [...s].reduce((n,c,i)=>n+Number(c)*(i%2?3:1),0)%10===0;
}
try {
const allIds=new Set(), reports=[];
for(const file of fs.readdirSync(path.join(root,'data')).filter(f=>/(?:^|-)topics\.json$/.test(f) && !/^(uphysics|uchemistry)-/.test(f))) {
  for(const t of read(file))allIds.add(t.id);
}
for(const subject of ['uphysics','uchemistry']) {
  const ctx=subjects(subject), S=ctx.window.Subjects, prefix=subject==='uphysics'?'uphy':'uch';
  const topics=read(subject+'-topics.json'), qs=read(subject+'-questions.json'), deps=read(subject+'-dependencies.json');
  const sources=read(subject+'-sources.json'), coverage=read(subject+'-coverage.json');
  const byId=new Map(topics.map(t=>[t.id,t])), byQ=new Map(qs.map(q=>[q.id,q])), bookIds=new Set(sources.books.map(b=>b.id));
  const courses=S.coursesFor(subject), courseById=new Map(courses.map(c=>[c.id,c]));
  check(topics.length>0 && byId.size===topics.length,subject+' duplicate or empty topics');
  check(qs.length===2*topics.length && byQ.size===qs.length,subject+' question count/IDs');
  check(sources.books.length===bookIds.size,subject+' duplicate book IDs');
  check(S.read()===subject && S.data('topics.json',subject)===subject+'-topics.json',subject+' routing');
  if(requireReviewed) {
    const reviewFile=topics[0].review_record;
    check(typeof reviewFile==='string' && /^validation\//.test(reviewFile) && !reviewFile.includes('..'),subject+' invalid review record path');
    const review=JSON.parse(fs.readFileSync(path.join(root,reviewFile),'utf8'));
    check(/^PASS/.test(review.status || review.result || ''),subject+' review report not passed');
    const reviewedTopics=new Set(review.reviewed_topic_ids || []), reviewedQuestions=new Set(review.reviewed_question_ids || []);
    check(reviewedTopics.size===topics.length && topics.every(t=>reviewedTopics.has(t.id)),subject+' review topic coverage drift');
    check(reviewedQuestions.size===qs.length && qs.every(q=>reviewedQuestions.has(q.id)),subject+' review question coverage drift');
    for(const part of ['topics','questions','dependencies','sources','coverage']) {
      const filename=subject+'-'+part+'.json';
      const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',filename))).digest('hex');
      check(review.final_data_files_sha256?.[filename]===hash,subject+' reviewed data changed: '+filename);
    }
  }
  for(const b of sources.books) {
    if(b.isbn)check(isbnValid(b.isbn),b.id+' invalid ISBN-13');
    check(b.title && b.publisher && b.source_url,b.id+' incomplete book provenance');
    check(b.full_text_verified===false,b.id+' unsupported full-text claim');
  }
  for(const entry of [{search:'?target='+topics[0].id,hash:''},{search:'',hash:'#'+topics[0].id}]) {
    ctx.location.search=entry.search;ctx.location.hash=entry.hash;
    check(S.read()===subject,subject+' implicit subject route');
  }
  ctx.location.search='?subject='+subject;ctx.location.hash='';
  const covered=[];
  function walk(v) {
    if(!v || typeof v!=='object')return;
    if(Array.isArray(v)){v.forEach(walk);return;}
    for(const [key,value] of Object.entries(v)) {
      if(['topicIds','topic_ids'].includes(key) && Array.isArray(value))covered.push(...value); else walk(value);
    }
  }
  walk(coverage); const coverageIds=new Set(covered);
  covered.forEach(id=>check(byId.has(id),'Unresolved coverage '+id));

  check(S.universityScience(subject) && S.academic(subject) && !S.medical(subject),subject+' incorrect academic classification');
  check(S.unitLabel(subject)==='模块',subject+' user-facing unit label');
  const coverageCourses=coverage.courses || [];
  check(coverageCourses.length===courses.length,subject+' coverage module count');
  for(const course of courses){
    check(topics.some(t=>t.module===course.id),subject+' missing module '+course.id);
    const entry=coverageCourses.find(c=>(c.module||c.id)===course.id);
    check(!!entry,subject+' missing coverage module '+course.id);
  }
  for(const book of sources.books)check(topics.some(t=>t.textbook?.book===book.id),subject+' unused book '+book.id);

  for(const t of topics) {
    check(!allIds.has(t.id),'Cross-subject ID collision '+t.id); allIds.add(t.id);
    check(new RegExp('^'+prefix+'_'+t.module+'_\\d{3}$').test(t.id),t.id+' invalid ID');
    check(t.subject===subject && t.id.startsWith(prefix+'_'+t.module+'_'),t.id+' wrong subject/module');
    check(courseById.get(t.module)?.grade===t.grade,t.id+' invalid course grade encoding');
    check(t.description?.length>=20 && t.mastery_criteria?.length>=2,t.id+' missing learning content');
    check(t.epistemic_status===(subject==='uphysics'?'modern_physics':'modern_chemistry') && t.review_status,t.id+' missing epistemic/review status');
    if(requireReviewed){check(/独立AI.*复核.*完成/.test(t.review_status) && !/待独立/.test(t.review_status),t.id+' independent review incomplete');check(fs.existsSync(path.join(root,t.review_record||'__missing__')),t.id+' missing final review record');}
    check(t.external===false && t.semester==='全',t.id+' unsupported assessment flag');
    check(/^第[\d一二三四五六七八九十百]+章\s+.+/.test(t.chapter),t.id+' missing project learning-unit label');
    check(coverageIds.has(t.id),t.id+' missing curriculum mapping');
    check(t.textbook && bookIds.has(t.textbook.book),t.id+' missing book');
    check(t.textbook.chapter && t.textbook.section && t.textbook.verification,t.id+' missing locator/verification');
    check(/^https?:\/\//.test(t.textbook.source_url||''),t.id+' invalid source URL');
    check(!/undefined|\[object Object\]/.test(S.reference(t)),t.id+' broken display citation');
    const own=qs.filter(q=>q.topicId===t.id);
    check(own.length===2 && own.some(q=>q.difficulty==='basic') && own.some(q=>q.difficulty==='standard'),t.id+' incomplete two-question pair');
    check(own[0].prompt!==own[1].prompt,t.id+' repeated question');
    check(t.diagnostic_question?.question && t.diagnostic_question?.answer,t.id+' missing browser sample');
    const sample=byQ.get(t.id+'_q1');
    check(sample && t.diagnostic_question.question.includes(sample.prompt),t.id+' browser sample prompt drift');
    const correct=sample.choices.find(c=>c.key===sample.answer);
    check(t.diagnostic_question.answer.includes(correct.text),t.id+' browser sample answer drift');
    const c=S.computingChapter(t);
    check(c.volume===t.module && c.label===courseById.get(t.module).name,t.id+' wrong course UI');
  }
  let grading=0, shuffled=0;
  for(const q of qs) {
    check(byId.has(q.topicId),q.id+' dangling question');
    check(q.type==='choice' && q.choices?.length===4,q.id+' wrong choice count');
    check(q.prompt && q.explanation?.length>=12 && q.origin?.includes('原创'),q.id+' missing original explanation');
    check(q.textbook?.book===byId.get(q.topicId).textbook.book,q.id+' source mismatch');
    if(requireReviewed){check(/独立AI.*复核.*完成/.test(q.review_status||'') && !/待独立/.test(q.review_status),q.id+' independent review incomplete');check(q.review_record===byId.get(q.topicId).review_record,q.id+' mismatched review record');}
    check(q.choices.map(c=>c.key).sort().join('')==='ABCD',q.id+' choice keys');
    check(new Set(q.choices.map(c=>c.text.trim())).size===4,q.id+' duplicate choices');
    check(q.choices.filter(c=>c.key===q.answer).length===1,q.id+' invalid answer');
    for(const c of q.choices) { check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' grading'); grading++; }
    const ordered=Choice.ordered(q,'university-audit');
    check(JSON.stringify(ordered)===JSON.stringify(Choice.ordered(q,'university-audit')),q.id+' unstable choice order');
    check(ordered.map(c=>c.label).join('')==='ABCD' && new Set(ordered.map(c=>c.key)).size===4,q.id+' broken display order');
    for(const c of ordered) {check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' display/key mapping'); shuffled++;}
  }
  const degree=new Map(topics.map(t=>[t.id,0])), next=new Map(topics.map(t=>[t.id,[]])), edgeKeys=new Set();
  for(const e of deps) {
    check(byId.has(e.topicId) && byId.has(e.prerequisiteId),'Unresolved edge '+JSON.stringify(e));
    check(e.topicId!==e.prerequisiteId,'Self-edge '+e.topicId);
    const key=e.prerequisiteId+'>'+e.topicId;
    check(!edgeKeys.has(key),'Duplicate edge '+key); edgeKeys.add(key);
    check(['hard','soft'].includes(e.strength) && e.reason?.length>=8,key+' missing relationship justification');
    degree.set(e.topicId,degree.get(e.topicId)+1); next.get(e.prerequisiteId).push(e.topicId);
  }
  const queue=topics.filter(t=>degree.get(t.id)===0).map(t=>t.id), order=[];
  while(queue.length) {const id=queue.shift();order.push(id);for(const n of next.get(id)){degree.set(n,degree.get(n)-1);if(!degree.get(n))queue.push(n);}}
  check(order.length===topics.length,subject+' cycle');
  const graph=E.buildGraph(S.engineTopics(topics),deps,qs);
  check(new Set(graph.topics.map(t=>t.grade)).size===1,subject+' course stage normalization');
  let targetSessions=0,screenSessions=0;
  function simulate(ids,response,mode,limit) {
    const allowed=new Set(ids);
    let session=E.createSession(graph,ids,{mode,limit,seed:'university-audit'}), i=0, item;
    while((item=E.nextItem(graph,session))) {
      check(i++<limit+1,subject+' non-termination');
      if(mode==='screen')check(allowed.has(item.topicId),subject+' escaped selected course');
      session=E.applyAnswer(graph,session,item.topicId,response==='mixed'?(i%2?'wrong':'correct'):response);
    }
    const sum=E.summarize(graph,session), layout=E.layout(graph,session,sum);
    check(sum.finished && sum.asked<=limit,subject+' result/limit failure');
    check(sum.path.every(p=>byId.has(p.id)) && layout.nodes.every(n=>byId.has(n.id)),subject+' unknown result node');
    const position=new Map(sum.path.map((p,i)=>[p.id,i]));
    for(const e of deps)if(position.has(e.topicId) && position.has(e.prerequisiteId))check(position.get(e.prerequisiteId)<position.get(e.topicId),subject+' incorrect prerequisite order');
    const replay=E.replay(graph,session.targets,session.answers,{mode,limit:session.limit,seed:session.seed});
    check(JSON.stringify(replay.status)===JSON.stringify(session.status),subject+' restore mismatch');
    if(mode==='screen') {
      const chapters=E.chapterSummary(graph,session);
      check(chapters.reduce((n,c)=>n+c.total,0)===ids.length,subject+' chapter total');
      check(chapters.every(c=>c.volume && c.chapterName && c.chapterNo),subject+' malformed chapter group');
    } else if(response==='correct')check(sum.mastered.includes(ids[0]),subject+' correct target status');
    else if(response==='wrong'||response==='skip')check(sum.weak.includes(ids[0]),subject+' wrong target status');
  }
  for(const t of topics)for(const result of ['correct','wrong','mixed']) {simulate([t.id],result,'target',20);targetSessions++;}
  for(const course of [...courses.map(c=>c.id),'all'])for(const result of ['correct','wrong','mixed','skip']) {
    simulate(topics.filter(t=>course==='all'||t.module===course).map(t=>t.id),result,'screen',30);screenSessions++;
  }
  reports.push({subject,topics:topics.length,questions:qs.length,dependencies:deps.length,hard:deps.filter(e=>e.strength==='hard').length,soft:deps.filter(e=>e.strength==='soft').length,cross_module_dependencies:deps.filter(e=>byId.get(e.topicId).module!==byId.get(e.prerequisiteId).module).length,books:sources.books.length,coverage_topics:coverageIds.size,courses:courses.map(c=>({id:c.id,name:c.name,topics:topics.filter(t=>t.module===c.id).length,questions:qs.filter(q=>byId.get(q.topicId).module===c.id).length,learning_units:new Set(topics.filter(t=>t.module===c.id).map(t=>t.chapter)).size})),grading_checks:grading,shuffled_checks:shuffled,target_sessions:targetSessions,screen_sessions:screenSessions});
}
const preserved=[];
if(baseline) {
  for(const file of fs.readdirSync(path.join(baseline,'data')).filter(f=>f.endsWith('.json'))) {
    check(fs.readFileSync(path.join(root,'data',file)).equals(fs.readFileSync(path.join(baseline,'data',file))),'Existing data changed '+file);preserved.push(file);
  }
  check(fs.readFileSync(path.join(root,'diagnose/engine.js')).equals(fs.readFileSync(path.join(baseline,'diagnose/engine.js'))),'Original engine changed');
}
const ctx=subjects('uphysics'); let runtimeCount=0;
for(const [file,asset] of Object.entries(ctx.window.ToyDataFiles)) {
  let key,raw;
  vm.runInNewContext(fs.readFileSync(path.join(root,'data/runtime',asset),'utf8'),{window:{ToyData:{register:(k,r)=>{key=k;raw=r;}}}});
  check(key===file && raw===fs.readFileSync(path.join(root,'data',file),'utf8'),'Runtime/source drift '+file);runtimeCount++;
}
const hashes={};
for(const subject of ['uphysics','uchemistry'])for(const part of ['topics','questions','dependencies','sources','coverage']) {
  const name=subject+'-'+part+'.json';hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',name))).digest('hex');
}
const report={date:'2026-10-31',result:'PASS',subjects:reports,runtime_files:runtimeCount,preserved_existing_json:preserved,core_engine_unchanged:baseline?true:null,baseline_comparison:baseline?'performed':'not_run',require_reviewed:requireReviewed,assertions:checks,sha256:hashes,limitations:['程序检查数据结构、引用、覆盖映射、图的无环性及测评状态流；不能证明知识与答案语义正确。','AI交叉内容复核和真实浏览器检查另列报告；尚未经教师审核。','所选教材的出版社现行版次和公开目录已核验；未逐页核读全文，也不声称存在全国统一唯一指定的大学理化教材。']};
fs.writeFileSync(path.join(root,'validation/university-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
} catch (error) {
  const failure={date:'2026-10-31',result:'FAIL',assertions_completed:checks,require_reviewed:requireReviewed,error:error.message};
  fs.mkdirSync(path.join(root,'validation'),{recursive:true});
  fs.writeFileSync(path.join(root,'validation/university-validation.json'),JSON.stringify(failure,null,2)+'\n');
  console.error(JSON.stringify(failure,null,2));
  process.exitCode=1;
}
