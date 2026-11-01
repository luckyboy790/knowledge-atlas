#!/usr/bin/env node
/* Validate actual browser-downloaded QA exports against final mathematics data. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'), reportPath=path.join(root,'validation/probability-browser-export-validation.json');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const Choice=require(path.join(root,'diagnose/choice-order.js')), E=require(path.join(root,'diagnose/engine.js'));
const context={window:{},URL,URLSearchParams,location:{search:'?subject=math',hash:''}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),context);
const S=context.window.Subjects;
const cases=[['validation/probability-browser-target-export.json','target'],['validation/probability-browser-screen-export.json','screen']];
let assertions=0;
const files=[];
function equal(a,b,label){assertions++;assert.deepEqual(a,b,label);}
function check(value,label){assertions++;assert.ok(value,label);}
try {
  const topics=['topics.json','math-university-topics.json','math-probability-topics.json'].flatMap(f=>read('data/'+f)).filter(t=>S.of(t)==='math');
  const byId=new Map(topics.map(t=>[t.id,t]));
  const questions=['questions.json','math-university-questions.json','math-probability-questions.json'].flatMap(f=>read('data/'+f)).filter(q=>byId.has(q.topicId));
  const bank=new Map(questions.map(q=>[q.id,q]));
  const dependencies=['dependencies.json','math-university-dependencies.json','math-probability-dependencies.json'].flatMap(f=>read('data/'+f)).filter(e=>byId.has(e.topicId)&&byId.has(e.prerequisiteId));
  const graph=E.buildGraph(S.engineTopics(topics),dependencies,questions);
  const courseIds=read('data/math-probability-topics.json').map(t=>t.id);
  for(const [file,mode] of cases){
    const data=read(file);
    equal(data.subject,'math',file+' mathematics identity');equal(data.mode,mode,file+' mode');
    equal(data.answers.length,data.asked,'answer count');equal(data.finished,true,'finished');
    check(data.generatedAt&&data.seed,'export timestamp and session seed');
    check(data.targets.every(t=>courseIds.includes(t.id)),'course target ownership');
    let session=E.createSession(graph,data.targets.map(t=>t.id),{mode,limit:data.limit,seed:data.seed});
    let changedDisplayKeys=0;
    for(const [index,item] of data.answers.entries()){
      const q=bank.get(item.questionId);check(q,'question exists: '+item.questionId);
      equal(item.order,index+1,'record order');equal(item.topicId,q.topicId,'topic ID');equal(item.name,byId.get(q.topicId).name,'topic name');
      equal(item.prompt,q.prompt,'prompt');equal(item.explanation,q.explanation,'explanation');equal(item.referenceAnswer,q.answer,'reference key');
      const next=E.nextItem(graph,session);check(next,'replay next item');equal(next.question.id,q.id,'replay question and seed');
      if(q.type==='choice'){
        const displayed=Choice.ordered(q,data.seed);equal(item.displayedChoices,displayed,'displayed choices');
        const answer=displayed.find(c=>c.key===q.answer);equal(item.referenceAnswerDisplay,answer.label+'. '+answer.text,'reference display');
        if(answer.key!==answer.label)changedDisplayKeys++;
        if(item.result==='skip')check(item.userAnswer===null||item.userAnswer===''||item.userAnswer===undefined,'skip carries no chosen key');
        else {
          const chosen=displayed.find(c=>c.key===item.userAnswer);check(chosen,'chosen original key');
          equal(item.userAnswerDisplay,chosen.label+'. '+chosen.text,'chosen display');
          equal(item.result,E.judgeQuestion(q,chosen.key).verdict,'grading original key');
        }
      }
      if(mode==='screen')check(courseIds.includes(item.topicId),'whole-course screen stays in scope');
      session=E.applyAnswer(graph,session,item.topicId,item.result,{text:item.userAnswer});
    }
    const summary=E.summarize(graph,session);
    for(const key of ['asked','limit','finished','limitReached'])equal(data[key],summary[key],'summary '+key);
    for(const key of ['weak','shaky','mastered','untested'])equal(data[key].map(x=>x.id),summary[key],'summary IDs '+key);
    equal(data.path.map(x=>[x.id,x.status]),summary.path.map(x=>[x.id,x.status]),'learning path');
    if(mode==='target'){
      equal(data.targets.length,1,'single target');check(data.asked>=3,'target includes prerequisite follow-up');
      equal(data.answers.slice(0,2).map(a=>[a.topicId,a.result]),[[data.targets[0].id,'wrong'],[data.targets[0].id,'wrong']],'two wrong target answers');
      const prerequisites=new Set(E.ancestors(graph,[data.targets[0].id]));
      check(prerequisites.has(data.answers[2].topicId),'third question backtracks to a prerequisite');
      check(data.weak.some(t=>t.id===data.targets[0].id),'weak target recorded');
    } else {
      equal(data.targets.map(t=>t.id),courseIds,'full course targets');equal(data.limit,20,'20-question setting');equal(data.asked,20,'20-question termination');equal(data.limitReached,true,'limit reached');
      const chapters=E.chapterSummary(graph,session);
      equal(data.chapters.map(c=>[c.label,c.total,c.mastered,c.shaky,c.weak,c.untested]),chapters.map(c=>[c.label,c.total,c.mastered,c.shaky,c.weak,c.untested]),'chapter aggregation');
      equal(data.chapters.length,8,'eight chapters');equal(data.chapters.reduce((n,c)=>n+c.total,0),courseIds.length,'chapter total');
    }
    files.push({file,mode,records:data.asked,reference_keys_differing_from_display_labels:changedDisplayKeys,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),status:'PASS'});
  }
  check(files.some(f=>f.reference_keys_differing_from_display_labels>0),'actual samples exercise nontrivial key/display-label mapping');
  const report={schema_version:1,checked_on:new Date().toISOString(),status:'PASS',assertions,files,record_count:files.reduce((n,f)=>n+f.records,0),
    method:'检查真实浏览器下载的两份验收作答文件；逐条对照最终题库、seed选项排列、原始评分键、显示标签，并重放引擎验证状态和章节汇总。',
    limits:['这些是本任务合成验收作答，不含真实学生记录。','数学语义、教材与考研范围核验另有内容复核报告。']};
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',assertions,record_count:report.record_count,files:files.length}));
}catch(error){
  const report={schema_version:1,checked_on:new Date().toISOString(),status:'FAIL',assertions_completed:assertions,error:error.message};
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
}
