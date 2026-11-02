#!/usr/bin/env node
/* v17: exact merged membership, bridge integrity, graph behavior and legacy records.
 * Run: node scripts/validate_subject_merges.cjs <v16-directory>
 * This verifies implementation properties; semantic bridge review is recorded separately.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const BASE=process.argv[2]?path.resolve(process.argv[2]):null;
const REPORT=path.join(ROOT,'validation/subject-merge-validation.json');
const E=require(path.join(ROOT,'diagnose/engine.js'));
const GROUPS={physics:['physics','uphysics'],chemistry:['chemistry','uchemistry'],tcm:['tcm','herbal']};
const NAMES=['math','english','physics','chemistry','biology','geography','cs408','med','tcm'];
const counts={physics:{topics:316,questions:632,original_dependencies:517},chemistry:{topics:355,questions:710,original_dependencies:526},tcm:{topics:213,questions:426,original_dependencies:281}};
const canonical=s=>({uphysics:'physics',uchemistry:'chemistry',herbal:'tcm'}[s]||s);
const read=(f,r=ROOT)=>fs.readFileSync(path.join(r,f),'utf8');
const json=(f,r=ROOT)=>JSON.parse(read(f,r));
const digest=(f,r=ROOT)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(r,f))).digest('hex');
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const hash=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
let assertions=0,activeGroup='setup',targetSessions=0,screenSessions=0;
const checks=[],results={},migrationCases=[],skipped=[];
let originalTopicsById,actualOriginalDependencies=0;
function ok(x,msg){assertions++;assert.ok(x,msg);}
function eq(a,b,msg){assertions++;assert.equal(stable(a),stable(b),msg);}
async function group(name,fn){activeGroup=name;await fn();checks.push(name);}

function environment(root=ROOT,search='',fragment='') {
 const location={search,hash:fragment,pathname:'/atlas/diagnose/index.html',href:'https://example.test/atlas/diagnose/index.html'+search+fragment};
 const window={DiagEngine:E,addEventListener(){}};
 const document={currentScript:{src:'https://example.test/atlas/assets/subjects.js'},createElement(){return {remove(){}};},head:{},querySelectorAll(){return [];}};
 const realm=vm.createContext({window,document,location,URL,URLSearchParams,setTimeout,clearTimeout,console,history:{replaceState(_a,_b,url){const u=new URL(url,location.href);location.search=u.search;location.hash=u.hash;location.href=u.href;}}});
 vm.runInContext(read('assets/data-manifest.js',root),realm);
 document.head.appendChild=script=>{
  const u=new URL(script.src);
  ok(u.pathname.startsWith('/atlas/data/runtime/'),'runtime supports nested deployment path');
  vm.runInContext(read('data/runtime/'+path.basename(u.pathname),root),realm);script.onload();
 };
 vm.runInContext(read('assets/subjects.js',root),realm);
 return {S:window.Subjects,window,realm};
}

async function dataset(env,subject){
 const S=env.S,parts={};
 for(const part of ['topics','questions','dependencies'])parts[part]=await(await S.fetch('data/'+S.data(part+'.json',subject),subject)).json();
 parts.topics=parts.topics.filter(t=>S.of(t)===canonical(subject));
 const ids=new Set(parts.topics.map(t=>t.id));
 parts.questions=parts.questions.filter(q=>ids.has(q.topicId));
 parts.dependencies=parts.dependencies.filter(e=>ids.has(e.topicId)&&ids.has(e.prerequisiteId));
 return parts;
}
function dag(topics,edges){
 const incoming=new Map(topics.map(t=>[t.id,0])),next=new Map(topics.map(t=>[t.id,[]])),pairs=new Set();
 for(const e of edges){
  ok(incoming.has(e.topicId)&&incoming.has(e.prerequisiteId),'both endpoints present');
  ok(e.topicId!==e.prerequisiteId,'no self prerequisite');
  const k=e.topicId+'<'+e.prerequisiteId;ok(!pairs.has(k),'no duplicate prerequisite pair');pairs.add(k);
  ok(['hard','soft'].includes(e.strength)&&typeof e.reason==='string'&&e.reason.trim(),'strength and reason');
  incoming.set(e.topicId,incoming.get(e.topicId)+1);next.get(e.prerequisiteId).push(e.topicId);
 }
 const q=topics.filter(t=>incoming.get(t.id)===0).map(t=>t.id);
 for(let i=0;i<q.length;i++)for(const id of next.get(q[i])){incoming.set(id,incoming.get(id)-1);if(!incoming.get(id))q.push(id);}
 eq(q.length,topics.length,'complete merged graph is acyclic');
}
function simulate(graph,targets,mode,policy,limit=20){
 const allowed=new Set(targets),seed='merge-v17-'+policy;
 let s=E.createSession(graph,targets,{mode,limit,seed}),steps=0;
 while(E.nextItem(graph,s)){
  const item=E.nextItem(graph,s);
  if(mode==='screen')ok(allowed.has(item.topicId),'screen does not expand outside chosen course/stage');
  const verdict=policy==='correct'?'correct':policy==='wrong'?'wrong':steps%3===0?'correct':steps%3===1?'wrong':'skip';
  const choice=item.question.choices?.find(c=>verdict==='correct'?c.key===item.question.answer:c.key!==item.question.answer);
  s=E.applyAnswer(graph,s,item.topicId,verdict,{text:verdict==='skip'?null:choice?.key});
  ok(++steps<=limit,'configured question limit respected');
 }
 const summary=E.summarize(graph,s);ok(summary.finished,'session finishes');eq(summary.asked,steps,'asked count');
 const replay=E.replay(graph,targets,s.answers,{mode,limit,seed});eq(E.summarize(graph,replay),summary,'deterministic final replay');
 const order=new Map(summary.path.map((v,i)=>[v.id,i]));
 for(const t of graph.topics)for(const e of graph.prereqs[t.id])if(order.has(t.id)&&order.has(e.id))ok(order.get(e.id)<order.get(t.id),'learning path respects all selected prerequisites');
 if(mode==='screen')screenSessions++;else targetSessions++;
 return s;
}

async function main(){
 if(!BASE)throw new Error('必须提供 v16-directory；正式验收须对照原始数据及旧版本会话，缺少基线不能判定通过。');
 const env=environment(),S=env.S,bridges=json('data/subject-bridge-dependencies.json');
 const source=json('data/subject-bridge-sources.json'),review=json('validation/subject-merge-content-review.json');
 await group('nine canonical subjects and deprecated URL aliases',()=>{
  eq(Object.keys(S.names).sort(),NAMES.slice().sort(),'nine subject navigation identities');
  eq(S.names.tcm,'中医药','unified display name');
  for(const [old,now] of Object.entries({uphysics:'physics',uchemistry:'chemistry',herbal:'tcm'})){
   eq(S.canonical(old),now,'legacy subject maps to new identity');
   eq(environment(ROOT,'?subject='+old).S.read(),now,'old explicit subject URL');
  }
  for(const [s,members] of Object.entries(GROUPS))eq(S.members(s),members,'data members');
  for(const [id,subject] of [['uphy_mechanics_001','physics'],['uch_structure_001','chemistry'],['herbal_materia_001','tcm'],['tcm_basics_001','tcm']]){
   eq(environment(ROOT,'?target='+id).S.read(),subject,'old target query');
   eq(environment(ROOT,'','#'+id).S.read(),subject,'old topic fragment');
  }
  for(const file of ['index.html','sources.html','explore/index.html','diagnose/index.html']){
   const html=read(file);eq((html.match(/data-subject="/g)||[]).length,9,'nine navigation links '+file);
   for(const s of NAMES)eq((html.match(new RegExp('data-subject="'+s+'"','g'))||[]).length,1,s+' navigation '+file);
  }
 });
 await group('all original source data and question IDs are preserved',()=>{
  const topicFiles=fs.readdirSync(path.join(ROOT,'data')).filter(f=>/(?:^|-)topics\.json$/.test(f));
  const questionFiles=fs.readdirSync(path.join(ROOT,'data')).filter(f=>/(?:^|-)questions\.json$/.test(f));
  const topics=topicFiles.flatMap(f=>json('data/'+f)),questions=questionFiles.flatMap(f=>json('data/'+f));
  originalTopicsById=new Map(topics.map(t=>[t.id,t]));
  actualOriginalDependencies=fs.readdirSync(path.join(BASE,'data')).filter(f=>/(?:^|-)dependencies\.json$/.test(f)).reduce((n,f)=>n+json('data/'+f,BASE).length,0);
  eq(actualOriginalDependencies,4898,'actual original dependency count');
  eq(topics.length,3308,'total topics unchanged');eq(questions.length,9769,'total questions unchanged');
  eq(new Set(topics.map(t=>t.id)).size,3308,'topic IDs remain unique');eq(new Set(questions.map(q=>q.id)).size,9769,'question IDs remain unique');
  if(BASE){
   const originals=fs.readdirSync(path.join(BASE,'data')).filter(f=>f.endsWith('.json'));eq(originals.length,64,'v16 baseline contains 64 original JSON');
   for(const file of originals)eq(digest('data/'+file),digest('data/'+file,BASE),'unchanged original '+file);
   eq(digest('diagnose/engine.js'),digest('diagnose/engine.js',BASE),'core engine unchanged');
  }
 });
 await group('new edges are exactly bound to independently reviewed source records',()=>{
  ok(bridges.length>0,'nonempty new bridges');ok(review.status.startsWith('PASS'),'independent review has passed');
  eq(review.final_data_sha256['subject-bridge-dependencies.json'],digest('data/subject-bridge-dependencies.json'),'bridge file review hash');
  eq(review.final_data_sha256['subject-bridge-sources.json'],digest('data/subject-bridge-sources.json'),'source file review hash');
  eq(review.edge_reviews.length,bridges.length,'every new edge has an actual semantic review');
  const byKey=new Map(review.edge_reviews.map(r=>[r.topicId+'<'+r.prerequisiteId,r]));
  for(const edge of bridges){
   ok(Object.hasOwn(GROUPS,edge.subject),'bridge remains inside an intended merged discipline');
   const r=byKey.get(edge.topicId+'<'+edge.prerequisiteId);ok(r,'review exists');
   eq(r.edge_sha256,hash(edge),'full edge fields match reviewed version');ok(r.verdict==='ACCEPTED'&&!r.open_findings?.length,'no unresolved edge finding');
   eq(r.topic_sha256,hash(originalTopicsById.get(edge.topicId)),'review binds actual target content');
   eq(r.prerequisite_sha256,hash(originalTopicsById.get(edge.prerequisiteId)),'review binds actual prerequisite content');
  }
  ok(source.relation_status.includes('教学建议'),'relationships are project teaching suggestions');
 });
 const dataBySubject={},graphs={};
 for(const subject of NAMES){
  const current=await dataset(env,subject);dataBySubject[subject]=current;
  const ids=new Set(current.topics.map(t=>t.id));
  await group(subject+': correct merged membership and complete graph',async()=>{
   eq(ids.size,current.topics.length,'no repeated topics after merge');
   eq(new Set(current.questions.map(q=>q.id)).size,current.questions.length,'no repeated questions after merge');
   ok(current.questions.every(q=>ids.has(q.topicId)),'question topic belongs to current discipline');
   dag(current.topics,current.dependencies);
   if(GROUPS[subject]){
    const members=GROUPS[subject],parts={};
    for(const part of ['topics','questions','dependencies'])parts[part]=members.flatMap(s=>json('data/'+s+'-'+part+'.json'));
    eq(parts.dependencies.length,counts[subject].original_dependencies,'original dependency count in merged discipline');
    parts.dependencies=parts.dependencies.concat(bridges.filter(e=>e.subject===subject));
    for(const part of ['topics','questions','dependencies'])eq(current[part],parts[part],'exact source union '+part);
    eq(current.topics.length,counts[subject].topics,'expected topic count');eq(current.questions.length,counts[subject].questions,'expected question count');
    const rawMap=new Map(current.topics.map(t=>[t.id,S.rawOf(t)]));
    for(const e of bridges.filter(e=>e.subject===subject))ok(rawMap.get(e.topicId)!==rawMap.get(e.prerequisiteId),'each new edge bridges original data groups');
    for(const member of members)for(const part of ['topics','questions','dependencies'])eq(await(await S.fetchRaw('data/'+member+'-'+part+'.json')).json(),json('data/'+member+'-'+part+'.json'),'raw provenance reads remain separate');
   }else if(BASE){
    const old=await dataset(environment(BASE),subject);
    for(const part of ['topics','questions','dependencies'])eq(current[part],old[part],'unaffected discipline '+part);
   }
   const normalized=S.engineTopics(current.topics);
   eq(normalized.map(t=>t.id),current.topics.map(t=>t.id),'engine normalization preserves every ID');
   ok(normalized.every(t=>t.subject===subject),'engine adapter records canonical subject');
   graphs[subject]=E.buildGraph(normalized,current.dependencies,current.questions);
   results[subject]={topics:current.topics.length,questions:current.questions.length,dependencies:current.dependencies.length,new_bridges:bridges.filter(e=>e.subject===subject).length};
   const probe=await dataset(env,subject);probe.topics[0].__mutation_probe=true;
   ok(!(await dataset(env,subject)).topics[0].__mutation_probe,'independent read objects');
  });
 }
 await group('stages, university modules and ten distinct traditional-medicine courses',()=>{
  for(const s of ['physics','chemistry']){
   const topics=dataBySubject[s].topics,uni=topics.filter(t=>/^uphy_|^uch_/.test(t.id));
   eq(topics.filter(t=>S.isUniversityTopic(t)).map(t=>t.id),uni.map(t=>t.id),'university detection '+s);
   const courses=S.coursesFor(s);eq(courses.length,s==='physics'?6:7,'module count '+s);
   for(const c of courses){
    const expected=uni.filter(t=>t.module===c.id);ok(expected.length>0,'nonempty university module');
    eq(S.courseFrom(c.id,s).grade,c.grade,'module lookup by id');eq(S.courseFrom(c.grade,s).id,c.id,'module lookup by grade');
    for(const t of expected)eq(S.computingChapter(t).volume,c.id,'university route stays module-based');
    for(const policy of ['correct','wrong'])simulate(graphs[s],expected.map(t=>t.id),'screen',policy);
   }
   for(const grade of [...new Set(topics.filter(t=>!S.isUniversityTopic(t)).map(t=>t.grade))]){
    const subset=topics.filter(t=>t.grade===grade);simulate(graphs[s],subset.map(t=>t.id),'screen','mixed');
   }
  }
  const courses=S.coursesFor('tcm');eq(courses.length,10,'ten combined courses');eq(new Set(courses.map(c=>c.id)).size,10,'no course-id collision');
  for(const c of courses){
   const expected=dataBySubject.tcm.topics.filter(t=>t.module===c.id);ok(expected.length>0,'nonempty traditional medicine course');
   for(const t of expected)eq(S.computingChapter(t).volume,c.id,'course lookup does not change across raw origins');
   for(const policy of ['correct','wrong'])simulate(graphs.tcm,expected.map(t=>t.id),'screen',policy);
  }
 });
 await group('every bridge endpoint participates in adaptive sessions and learning paths',()=>{
  for(const subject of Object.keys(GROUPS)){
   const graph=graphs[subject];
   for(const edge of bridges.filter(e=>e.subject===subject)){
    ok(E.ancestors(graph,edge.topicId).has(edge.prerequisiteId),'new prerequisite reaches target ancestor set');
    ok(graph.prereqs[edge.topicId].some(e=>e.id===edge.prerequisiteId&&e.strength===edge.strength),'new prerequisite reaches engine');
   }
   for(const id of new Set(bridges.filter(e=>e.subject===subject).map(e=>e.topicId)))for(const policy of ['wrong','correct','mixed'])simulate(graph,[id],'target',policy);
  }
 });
 await group('old sessions are validated without changing or deleting their records',()=>{
  const compatibility=require(path.join(ROOT,'diagnose/session-compatibility.js'));
  ok(typeof compatibility.inspect==='function','pure session compatibility check exported');
  const oldS=environment(BASE).S;
  const save=s=>({v:2,targets:s.targets,answers:s.answers,mode:s.mode,limit:s.limit,seed:s.seed,avoid:s.avoid,savedAt:'2026-11-01T00:00:00Z'});
  function answerOld(g,targets,mode,steps,seed){
   let s=E.createSession(g,targets,{seed,mode,limit:20,avoid:[g.bank[targets[0]][0].id]});
   for(let i=0;i<steps;i++){
    const item=E.nextItem(g,s);if(!item)break;
    s=E.applyAnswer(g,s,item.topicId,'wrong',{text:item.question.choices?.find(c=>c.key!==item.question.answer)?.key});
   }
   return s;
  }
  let changedGraphCases=0;
  for(const [subject,members] of Object.entries(GROUPS))for(const member of members){
   const graph=graphs[subject];
   const oldTopics=json('data/'+member+'-topics.json',BASE),oldDeps=json('data/'+member+'-dependencies.json',BASE),oldQuestions=json('data/'+member+'-questions.json',BASE);
   const oldGraph=E.buildGraph(oldS.engineTopics(oldTopics),oldDeps,oldQuestions);
   const choices=oldTopics.filter(t=>!t.external&&oldGraph.bank[t.id]?.length>1&&oldGraph.prereqs[t.id].some(p=>oldGraph.bank[p.id]?.length));
   const first=(choices.find(t=>bridges.some(e=>e.topicId===t.id))||choices[0]);ok(first,'v16 fixture target has old prerequisites '+member);
   const session=answerOld(oldGraph,[first.id],'target',6,'v16-migration-'+member),saved=save(session);
   const before=JSON.stringify(saved),good=compatibility.inspect(graph,saved,E);ok(good.ok,'real v16 graph record resumes: '+member+' '+good.reason);eq(good.session.answers,saved.answers,'recorded v16 question identities preserved');eq(JSON.stringify(saved),before,'legacy record remains untouched');
   const oldNext=E.nextItem(oldGraph,session)?.topicId||null,newNext=E.nextItem(graph,good.session)?.topicId||null;
   if(good.orderChanged||oldNext!==newNext)changedGraphCases++;
   const screenIds=oldTopics.filter(t=>!t.external&&oldGraph.bank[t.id]?.length).slice(0,5).map(t=>t.id);
   const screened=save(answerOld(oldGraph,screenIds,'screen',4,'v16-screen-'+member));ok(compatibility.inspect(graph,screened,E).ok,'v16 screen record keeps exact original targets');
   const editedAnswers=session.answers.map((a,i)=>({...a,result:i===0?'correct':a.result}));
   const edited=save(E.replay(oldGraph,session.targets,editedAnswers,{mode:session.mode,limit:session.limit,seed:session.seed,avoid:session.avoid}));
   const editedBefore=JSON.stringify(edited),corrected=compatibility.inspect(graph,edited,E);ok(corrected.ok,'v16 app-produced corrected history resumes: '+member+' '+corrected.reason);ok(corrected.orderChanged,'corrected history records changed expected order');eq(corrected.session.answers,edited.answers,'corrected historical question identities preserved');eq(JSON.stringify(edited),editedBefore,'corrected old archive untouched');
   const wrongQuestion=JSON.parse(before);wrongQuestion.answers[0].qid='missing_question';ok(!compatibility.inspect(graph,wrongQuestion,E).ok,'unknown question refuses unsafe replay');
   const alternateQuestion=JSON.parse(before);alternateQuestion.answers[0].qid=oldGraph.bank[session.answers[0].id].find(q=>q.id!==session.answers[0].qid).id;ok(!compatibility.inspect(graph,alternateQuestion,E).ok,'in-bank different selected question refuses unsafe replay');
   const wrongTarget=JSON.parse(before);wrongTarget.targets=['unknown_topic'];ok(!compatibility.inspect(graph,wrongTarget,E).ok,'unknown topic refuses unsafe replay');
   const outside=graph.topics.find(t=>!t.external&&!new Set(good.session.order).has(t.id)&&graph.bank[t.id]?.length);ok(outside,'foreign scope fixture exists');
   const foreign=answerOld(graph,[outside.id],'target',1,session.seed);ok(!compatibility.inspect(graph,{...saved,answers:foreign.answers},E).ok,'answer outside current prerequisite scope rejected');
   ok(!compatibility.inspect(graph,{...saved,mode:'screen'},E).ok,'screen excludes old prerequisite answers outside explicit targets');
   ok(!compatibility.inspect(graph,{...saved,limit:1},E).ok,'saved answer count cannot exceed limit');
   migrationCases.push({subject,original_subject:member,fixture_kind:'synthetic answers generated with unchanged v16 data and engine; not real user records',target:first.id,old_answers:session.answers.length,valid_record:'PASS',screen_record:'PASS',corrected_record:'PASS',unknown_question:'REJECTED',different_selected_question:'REJECTED',unknown_target:'REJECTED',out_of_scope:'REJECTED',over_limit:'REJECTED',source_immutable:true,order_changed:good.orderChanged,old_next:oldNext,new_next:newNext});
  }
  ok(changedGraphCases>0,'at least one actual v16 record exercises changed dependency ordering or continuation');
 });
 await group('all canonical topics are counted once and runtime payloads match source bytes',()=>{
  const topics=Object.values(dataBySubject).flatMap(d=>d.topics),questions=Object.values(dataBySubject).flatMap(d=>d.questions);
  eq(topics.length,3308,'nine disciplines contain every original topic exactly once');eq(new Set(topics.map(t=>t.id)).size,3308,'no cross-discipline duplicate topic');
  eq(questions.length,9769,'question total unchanged after consolidation');eq(new Set(questions.map(q=>q.id)).size,9769,'no duplicated bank');
  eq(Object.values(dataBySubject).reduce((n,d)=>n+d.dependencies.length,0),actualOriginalDependencies+bridges.length,'actual total dependencies equal original edges plus reviewed bridges');
  const manifest=env.window.ToyDataFiles,seen={};
  const context=vm.createContext({window:{ToyData:{register(f,raw){seen[f]=raw;}}}});
  for(const [file,payload] of Object.entries(manifest)){
   vm.runInContext(read('data/runtime/'+payload),context);eq(seen[file],read('data/'+file),'runtime source match '+file);
   ok(payload.includes(digest('data/runtime/'+payload).slice(0,12)),'content-addressed runtime name');
  }
  eq(Object.keys(manifest).length,64,'63 original and one bridge runtime payload');
 });
 return {status:'PASS',results,new_bridges:bridges.length,topic_total:Object.values(results).reduce((n,r)=>n+r.topics,0),question_total:Object.values(results).reduce((n,r)=>n+r.questions,0),dependency_total:Object.values(results).reduce((n,r)=>n+r.dependencies,0),original_dependency_total:actualOriginalDependencies,canonical_subjects:9,runtime_files:64};
}
main().then(result=>{
 const input_sha256=Object.fromEntries(['scripts/validate_subject_merges.cjs','assets/subjects.js','assets/data-manifest.js','diagnose/engine.js','diagnose/session-compatibility.js','data/subject-bridge-dependencies.json','data/subject-bridge-sources.json','validation/subject-merge-content-review.json'].map(f=>[f,digest(f)]));
 const report={schema_version:1,checked_date:'2026-11-02',...result,group_count:checks.length,groups:checks,assertions,target_sessions:targetSessions,screen_sessions:screenSessions,baseline_comparison:BASE?'performed':'not_performed',original_json_preserved:BASE?64:null,core_engine_unchanged:BASE?true:null,migration_cases:migrationCases,skipped,input_sha256,limitations:['本记录验证实现性质，新增关系的学科合理性由独立内容记录审阅。','原教材全文核验范围沿用已记录限制，本轮合并未提升其审核状态。','浏览器实际交互另有记录；模拟会话不是学生测量有效性验证。']};
 fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...result,groups:checks.length,assertions,target_sessions:targetSessions,screen_sessions:screenSessions}));
}).catch(error=>{
 const report={status:'FAIL',checked_date:'2026-11-02',failed_group:activeGroup,error:error.stack,completed_groups:checks,assertions};fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
});
