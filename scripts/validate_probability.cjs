#!/usr/bin/env node
/* Probability extension: structural, provenance, graph and assessment checks.
 * Usage: node scripts/validate_probability.cjs [v14-baseline] [--require-reviewed]
 * Content correctness is reviewed separately; these checks do not certify it.
 */
'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const assert=require('node:assert/strict'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'), args=process.argv.slice(2);
const baselineArg=args.find(x=>!x.startsWith('--'));
const baseline=baselineArg?path.resolve(baselineArg):null;
const requireReviewed=args.includes('--require-reviewed');
const E=require(path.join(root,'diagnose/engine.js'));
const Choice=require(path.join(root,'diagnose/choice-order.js'));
const parts=['topics','questions','dependencies','sources','coverage'];
const prefix='math-probability-', reportFile=path.join(root,'validation/probability-validation.json');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'data',n),'utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let checks=0;
function check(test,label){checks++;assert.ok(test,label);}
function isbnValid(value){const s=String(value||'').replace(/[-\s]/g,'');return /^\d{13}$/.test(s)&&[...s].reduce((a,c,i)=>a+Number(c)*(i%2?3:1),0)%10===0;}
function loadSubjects(){
  const ctx={window:{},URL,URLSearchParams,location:{search:'?subject=math',hash:''},setTimeout,clearTimeout};
  vm.createContext(ctx);
  for(const file of ['assets/data-manifest.js','assets/subjects.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
  return ctx;
}
function dag(nodes,edges,label){
  const ids=new Set(nodes.map(t=>t.id)), indegree=new Map([...ids].map(id=>[id,0]));
  const next=new Map([...ids].map(id=>[id,[]])), seen=new Set();
  for(const e of edges){
    check(ids.has(e.topicId)&&ids.has(e.prerequisiteId),label+' unresolved edge');
    check(e.topicId!==e.prerequisiteId,label+' self edge');
    const key=e.prerequisiteId+'>'+e.topicId;
    check(!seen.has(key),label+' duplicate edge '+key);seen.add(key);
    indegree.set(e.topicId,indegree.get(e.topicId)+1);next.get(e.prerequisiteId).push(e.topicId);
  }
  const queue=[...ids].filter(id=>indegree.get(id)===0), order=[];
  for(let i=0;i<queue.length;i++){
    const id=queue[i];order.push(id);
    for(const child of next.get(id)){indegree.set(child,indegree.get(child)-1);if(!indegree.get(child))queue.push(child);}
  }
  check(order.length===ids.size,label+' contains cycle');return order;
}
try {
  check(args.every(x=>x===baselineArg||x==='--require-reviewed'),'unsupported argument');
  const ctx=loadSubjects(), S=ctx.window.Subjects;
  const topics=read(prefix+'topics.json'), questions=read(prefix+'questions.json');
  const dependencies=read(prefix+'dependencies.json'), sources=read(prefix+'sources.json'), coverage=read(prefix+'coverage.json');
  const byId=new Map(topics.map(t=>[t.id,t])), byQ=new Map(questions.map(q=>[q.id,q]));
  const modules=['events','univariate','multivariate','moments','limits','sampling','estimation','testing'];
  const chapterNames=['概率论的基本概念','随机变量及其分布','多维随机变量及其分布','随机变量的数字特征','大数定律及中心极限定理','样本及抽样分布','参数估计','假设检验'];
  const numerals=['一','二','三','四','五','六','七','八'];
  const officialSections=[
    ['随机试验','样本空间、随机事件','频率与概率','等可能概型','条件概率','独立性'],
    ['随机变量','离散型随机变量及其分布律','随机变量的分布函数','连续型随机变量及其概率密度','随机变量的函数的分布'],
    ['二维随机变量','边缘分布','条件分布','相互独立的随机变量','两个随机变量的函数的分布'],
    ['数学期望','方差','协方差及相关系数','协方差矩阵与多元正态分布','其他数字特征'],
    ['大数定律','中心极限定理'],['随机样本','直方图和箱线图','抽样分布'],
    ['点估计','基于截尾样本的最大似然估计','估计量的评选标准','区间估计','正态总体均值与方差的区间估计','(0－1)分布参数的区间估计','单侧置信区间','贝叶斯估计'],
    ['假设检验','正态总体均值的假设检验','正态总体方差的假设检验','置信区间与假设检验之间的关系','样本容量的选取','分布拟合检验','列联表的独立性检验和齐一性检验','假设检验问题的p值法']
  ];
  check(topics.length===100 && byId.size===100,'100 unique course topics');
  check(questions.length===200 && byQ.size===200,'200 unique questions');
  check(Object.keys(S.names).length===10,'course must not create an eleventh subject');
  check(coverage.grade===17&&coverage.course_id==='probability_statistics','coverage identity');
  check(coverage.chapters.length===8,'eight chapter coverage records');
  const covered=coverage.chapters.flatMap(c=>c.topic_ids||[]);
  check(covered.length===100&&new Set(covered).size===100&&covered.every(id=>byId.has(id)),'exact coverage IDs');
  check(sources.subject==='math'&&sources.course_id==='probability_statistics','source identity');
  check(sources.books.length===1,'one primary textbook');
  const book=sources.books[0];
  check(book.id==='prob_zju6_2026'&&Number(book.edition)===6,'sixth edition identity');
  check(book.isbn==='9787040666892'&&isbnValid(book.isbn),'textbook ISBN');
  check(book.publication_date==='2026-02'&&book.latest_printing_date==='2026-07','edition/printing date precision');
  check(book.publisher==='高等教育出版社'&&book.full_text_verified===false,'publisher and full text boundary');
  check(/^https:\/\/xuanshu\.hep\.com\.cn\//.test(book.source_url),'official textbook URL');
  const exam=sources.exam_basis;
  check(exam.year===2027&&exam.issuer==='教育部教育考试院','latest exam metadata');
  check(exam.isbn==='9787040684049'&&isbnValid(exam.isbn),'exam ISBN');
  check(exam.publication_date==='2026-09'&&exam.metadata_verified===true&&exam.full_text_verified===false,'exam metadata versus unread full text');
  check(sources.scope_note&&exam.scope_note,'visible scope limits');
  const scopeRefs=sources.scope_references||sources.scope_supporting_sources||[];
  const scopeIds=new Set(scopeRefs.map(x=>x.id));
  check(scopeIds.size===scopeRefs.length&&scopeIds.has('prep_2026_810')&&scopeIds.has('prep_2023_solutions'),'scope reference IDs');
  for(const ref of scopeRefs){check(ref.title&&/^https:\/\//.test(ref.source_url||ref.url||''),'scope provenance');if(ref.isbn)check(isbnValid(ref.isbn),'scope source ISBN');}
  const allTopics=[], allQuestions=[], allDependencies=[];
  for(const f of fs.readdirSync(path.join(root,'data')).filter(f=>f.endsWith('.json'))){
    if(/(?:^|-)topics\.json$/.test(f))allTopics.push(...read(f));
    if(/(?:^|-)questions\.json$/.test(f))allQuestions.push(...read(f));
    if(/(?:^|-)dependencies\.json$/.test(f))allDependencies.push(...read(f));
  }
  check(new Set(allTopics.map(t=>t.id)).size===allTopics.length,'global topic ID collision');
  check(new Set(allQuestions.map(q=>q.id)).size===allQuestions.length,'global question ID collision');
  const mathTopics=allTopics.filter(t=>S.of(t)==='math'), mathIds=new Set(mathTopics.map(t=>t.id));
  const mathQuestions=allQuestions.filter(q=>mathIds.has(q.topicId));
  const mathDeps=allDependencies.filter(e=>mathIds.has(e.topicId)&&mathIds.has(e.prerequisiteId));
  check(mathTopics.length===974&&mathQuestions.length===3699,'merged math counts');
  check(mathTopics.filter(t=>t.grade===15).length===46&&mathTopics.filter(t=>t.grade===16).length===26,'old university math courses');
  const scopeCounts={shared:0,math1:0,supplement:0};
  for(let i=0;i<topics.length;i++){
    const t=topics[i], mi=modules.indexOf(t.module);
    check(t.id===`cnm_ps${String(i+1).padStart(3,'0')}`,'stable contiguous topic ID');
    check(t.subject==='math'&&t.grade===17&&t.semester==='全'&&t.external===false,t.id+' course flags');
    check(mi>=0&&t.domain==='概率论与数理统计'&&t.epistemic_status==='modern_mathematics',t.id+' learning identity');
    check(t.description?.length>=40&&t.mastery_criteria?.length>=2&&t.mastery_criteria.every(x=>x.length>=10),t.id+' learning content');
    const chapter=`第${numerals[mi]}章 ${chapterNames[mi]}`;
    check(t.chapter===`概率论与数理统计 ${chapter} ${mi+1}`,t.id+' project chapter');
    check(t.textbook?.book===book.id&&t.textbook.edition===6&&t.textbook.chapter===chapter,t.id+' textbook edition/chapter');
    const locators=(t.textbook.section||'').split('；').map(s=>/^§(\d+)\s+(.+?)(?:（本节内主题：.+）)?$/.exec(s.trim()));
    check(locators.length>0&&locators.every(locator=>locator&&officialSections[mi][Number(locator[1])-1]===locator[2]),t.id+' official parent sections');
    check(t.textbook.source_url===book.source_url&&t.textbook.verification?.includes('未逐页核验'),t.id+' locator evidence boundary');
    check(!t.textbook.pages&&!t.textbook.page,t.id+' unsupported exact pages');
    const parsed=E.parseChapter(t.chapter);
    check(parsed.volume==='概率论与数理统计'&&parsed.chapterNo===`第${numerals[mi]}章`&&parsed.chapterName===chapterNames[mi],t.id+' engine chapter parsing');
    check(S.engineTopics([t])[0].grade===15,t.id+' stage normalization');
    check(coverage.chapters.find(c=>c.module===t.module)?.topic_ids.includes(t.id),t.id+' chapter coverage');
    check(Object.hasOwn(scopeCounts,t.exam_scope?.track),t.id+' scope category');scopeCounts[t.exam_scope.track]++;
    check(t.exam_scope.basis_ids?.length&&t.exam_scope.basis_ids.every(id=>scopeIds.has(id)),t.id+' scope provenance');
    check(/2027.*未逐条核验/.test(t.exam_scope.verification),t.id+' exam fulltext status');
    const pair=questions.filter(q=>q.topicId===t.id);
    check(pair.length===2&&pair[0].difficulty==='basic'&&pair[1].difficulty==='standard',t.id+' two distinct levels');
    check(pair[0].prompt!==pair[1].prompt,t.id+' repeated prompt');
    check(t.diagnostic_question.question===pair[0].prompt&&t.diagnostic_question.answer===pair[0].choices.find(c=>c.key===pair[0].answer)?.text,t.id+' browser sample drift');
    check(S.reference(t).includes('第六版')&&!/undefined|\[object Object\]/.test(S.reference(t)),t.id+' displayed citation');
  }
  let gradingChecks=0,shuffledChecks=0;
  const correctKeys={A:0,B:0,C:0,D:0};
  for(const q of questions){
    const t=byId.get(q.topicId);
    check(!!t&&new RegExp('^'+q.topicId+'_q[12]$').test(q.id),q.id+' ownership');
    check(q.type==='choice'&&q.choices.length===4&&q.choices.map(c=>c.key).sort().join('')==='ABCD',q.id+' four choices');
    check(new Set(q.choices.map(c=>c.text.trim())).size===4,q.id+' duplicate option text');
    check(q.choices.filter(c=>c.key===q.answer).length===1,q.id+' valid answer key');correctKeys[q.answer]++;
    check(q.prompt&&q.explanation?.length>=12&&q.origin?.includes('原创'),q.id+' question content');
    check(JSON.stringify(q.textbook)===JSON.stringify(t.textbook)&&JSON.stringify(q.exam_scope)===JSON.stringify(t.exam_scope),q.id+' provenance matches topic');
    for(const c of q.choices){check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' answer-key grading');gradingChecks++;}
    const ordered=Choice.ordered(q,'probability-audit');
    check(JSON.stringify(ordered)===JSON.stringify(Choice.ordered(q,'probability-audit')),q.id+' repeatable shuffle');
    check(ordered.map(c=>c.label).join('')==='ABCD'&&new Set(ordered.map(c=>c.key)).size===4,q.id+' display labels and retained keys');
    for(const c of ordered){check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' shuffled grading');shuffledChecks++;}
  }
  check(Object.values(correctKeys).every(x=>x>0),'answer key variety');
  for(const e of dependencies){
    check(byId.has(e.topicId)&&mathIds.has(e.prerequisiteId),'new edge must target course and reference math');
    check(['hard','soft'].includes(e.strength)&&e.reason?.length>=8,e.topicId+' justified edge');
  }
  dag(mathTopics,mathDeps,'combined math graph');
  const graph=E.buildGraph(S.engineTopics(mathTopics),mathDeps,mathQuestions);
  let targetSessions=0,screenSessions=0;
  function simulate(ids,mode,response,limit=20){
    const allowed=new Set(ids);
    let session=E.createSession(graph,ids,{mode,limit,seed:'probability-audit'}), i=0,item;
    while((item=E.nextItem(graph,session))){
      check(i++<limit,mode+' bounded termination');
      check(mathIds.has(item.topicId),'resolved assessment topic');
      if(mode==='screen')check(allowed.has(item.topicId),'screen remains within selected course/chapter');
      session=E.applyAnswer(graph,session,item.topicId,response==='mixed'?(i%2?'wrong':'correct'):response);
    }
    const sum=E.summarize(graph,session),layout=E.layout(graph,session,sum);
    check(sum.finished&&sum.asked<=limit,'finished assessment within budget');
    check(sum.path.every(x=>mathIds.has(x.id))&&layout.nodes.every(x=>mathIds.has(x.id)),'resolved learning path');
    const pos=new Map(sum.path.map((x,i)=>[x.id,i]));
    for(const e of mathDeps)if(pos.has(e.topicId)&&pos.has(e.prerequisiteId))check(pos.get(e.prerequisiteId)<pos.get(e.topicId),'prerequisites before dependents');
    const replay=E.replay(graph,session.targets,session.answers,{mode,limit:session.limit,seed:session.seed});
    check(JSON.stringify(replay.status)===JSON.stringify(session.status),'restored session status');
    if(mode==='target'&&response==='correct')check(sum.mastered.includes(ids[0]),'correct target mastery');
    if(mode==='target'&&response==='wrong')check(sum.weak.includes(ids[0]),'two wrong answers create weakness');
    if(mode==='target'&&response==='mixed')check(sum.shaky.includes(ids[0]),'wrong then correct produces shaky target');
    if(mode==='screen'){
      const chapters=E.chapterSummary(graph,session);
      check(chapters.reduce((n,c)=>n+c.total,0)===ids.length,'screen chapter totals');
      check(chapters.every(c=>c.volume==='概率论与数理统计'&&c.chapterNo&&c.chapterName),'screen course chapter names');
    }
  }
  for(const t of topics)for(const response of ['correct','wrong','mixed']){simulate([t.id],'target',response);targetSessions++;}
  for(const module of [...modules,'all'])for(const response of ['correct','wrong','mixed','skip']){
    simulate(topics.filter(t=>module==='all'||t.module===module).map(t=>t.id),'screen',response);screenSessions++;
  }
  const preserved=[];
  if(baseline){
    check(fs.existsSync(path.join(baseline,'data')),'baseline exists');
    for(const f of fs.readdirSync(path.join(baseline,'data')).filter(f=>f.endsWith('.json'))){
      check(fs.readFileSync(path.join(root,'data',f)).equals(fs.readFileSync(path.join(baseline,'data',f))),'existing JSON changed '+f);preserved.push(f);
    }
    check(preserved.length===49,'v14 has 49 JSON baseline files');
    check(fs.readFileSync(path.join(root,'diagnose/engine.js')).equals(fs.readFileSync(path.join(baseline,'diagnose/engine.js'))),'core engine changed');
  }
  for(const p of parts)check(ctx.window.ToyDataFiles[prefix+p+'.json'],'missing new runtime payload '+p);
  let runtimeFiles=0;
  for(const [file,asset] of Object.entries(ctx.window.ToyDataFiles)){
    let key,raw;
    vm.runInNewContext(fs.readFileSync(path.join(root,'data/runtime',asset),'utf8'),{window:{ToyData:{register:(k,r)=>{key=k;raw=r;}}}});
    check(key===file&&raw===fs.readFileSync(path.join(root,'data',file),'utf8'),'runtime/source mismatch '+file);runtimeFiles++;
  }
  check(runtimeFiles===53,'53 runtime payloads');
  const hashes={};for(const p of parts){const f=prefix+p+'.json';hashes[f]=hash(path.join(root,'data',f));}
  if(requireReviewed){
    const record='validation/probability-content-review.json';
    check(topics.every(t=>t.review_record===record)&&questions.every(q=>q.review_record===record),'review records assigned after review');
    const review=JSON.parse(fs.readFileSync(path.join(root,record),'utf8'));
    check(/^PASS/.test(review.status),'independent content review passed');
    const reviewedTopics=new Set(review.reviewed_topic_ids||[]), reviewedQuestions=new Set(review.reviewed_question_ids||[]);
    check(reviewedTopics.size===100&&topics.every(t=>reviewedTopics.has(t.id)),'reviewed topic coverage');
    check(reviewedQuestions.size===200&&questions.every(q=>reviewedQuestions.has(q.id)),'reviewed question coverage');
    for(const [f,h] of Object.entries(hashes))check(review.final_data_files_sha256?.[f]===h,'data changed after review '+f);
    for(const item of [...topics,...questions])check(/独立AI.*复核.*完成/.test(item.review_status)&&!/待独立/.test(item.review_status),item.id+' unfinished review status');
  }
  const result={date:'2026-10-31',status:'PASS',assertions:checks,require_reviewed:requireReviewed,
    course:{topics:topics.length,questions:questions.length,dependencies:dependencies.length,hard:dependencies.filter(e=>e.strength==='hard').length,soft:dependencies.filter(e=>e.strength==='soft').length,cross_course_dependencies:dependencies.filter(e=>!byId.has(e.prerequisiteId)).length,chapters:coverage.chapters.map(c=>({module:c.module,title:c.title,topics:c.topic_ids.length,questions:c.topic_ids.length*2})),exam_scope_counts:scopeCounts},
    total:{subjects:10,topics:allTopics.length,questions:allQuestions.length,dependencies:allDependencies.length},math:{topics:mathTopics.length,questions:mathQuestions.length,dependencies:mathDeps.length},
    grading_checks:gradingChecks,shuffled_checks:shuffledChecks,correct_answer_keys:correctKeys,target_sessions:targetSessions,screen_sessions:screenSessions,runtime_files:runtimeFiles,
    baseline_comparison:baseline?'performed':'not_run',preserved_existing_json:preserved,core_engine_unchanged:baseline?true:null,sha256:hashes,
    limitations:['程序验证结构、来源字段、已读公开父节目录、图无环性及测评状态流；不能代替内容和答案语义复核。','2027大纲书目已确认，未取得全文；教材正文未逐页核验。','内容的独立AI阅读、独立数值复算与真实浏览器检查另列报告，尚未经教师审核。']};
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(error){
  const result={date:'2026-10-31',status:'FAIL',assertions_completed:checks,require_reviewed:requireReviewed,error:error.message};
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');
  console.error(JSON.stringify(result,null,2));process.exitCode=1;
}
