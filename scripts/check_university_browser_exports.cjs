/* Compare actual browser-downloaded QA exports with the release question banks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const Choice=require(path.join(root,'diagnose/choice-order.js'));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const reportPath=path.join(root,'validation/university-browser-export-validation.json');
const cases=[
  ['validation/university-uphysics-browser-target-export.json','uphysics','target',3],
  ['validation/university-uphysics-browser-screen-export.json','uphysics','screen',20],
  ['validation/university-uchemistry-browser-target-export.json','uchemistry','target',2],
];
const rows=[];
let assertions=0;
function eq(a,b,label){assertions++;assert.deepEqual(a,b,label);}
try {
  for(const [file,subject,mode,count] of cases){
    const data=read(file), bank=new Map(read('data/'+subject+'-questions.json').map(q=>[q.id,q]));
    const topics=new Map(read('data/'+subject+'-topics.json').map(t=>[t.id,t]));
    eq(data.subject,subject,file+' subject');eq(data.mode,mode,file+' mode');
    eq(data.asked,count,file+' asked');eq(data.answers.length,count,file+' records');eq(data.finished,true,file+' finished');
    for(const [index,item] of data.answers.entries()){
      const q=bank.get(item.questionId);assertions++;assert.ok(q,item.questionId);
      eq(item.order,index+1,'order');eq(item.topicId,q.topicId,'topic ID');eq(item.name,topics.get(q.topicId).name,'topic name');
      eq(item.prompt,q.prompt,'prompt');eq(item.explanation,q.explanation,'explanation');eq(item.referenceAnswer,q.answer,'answer key');
      const ordered=Choice.ordered(q,data.seed);eq(item.displayedChoices,ordered,'seed/displayed choices');
      const ref=ordered.find(c=>c.key===q.answer);eq(item.referenceAnswerDisplay,ref.label+'. '+ref.text,'reference display');
      if(item.result==='skip'){
        assertions++;assert.ok(item.userAnswer===null || item.userAnswer==='' || item.userAnswer===undefined,'skip answer');
      } else {
        const chosen=ordered.find(c=>c.key===item.userAnswer);assertions++;assert.ok(chosen,'selected key');
        eq(item.userAnswerDisplay,chosen.label+'. '+chosen.text,'selected display');
        eq(item.result,item.userAnswer===q.answer?'correct':'wrong','actual answer verdict');
      }
      if(mode==='screen')eq(topics.get(item.topicId).module,'oscillations_waves','screen scope');
    }
    if(subject==='uchemistry'){
      eq(data.answers.map(a=>[a.questionId,a.result]),[['uch_analysis_018_q2','wrong'],['uch_analysis_018_q1','correct']],'observed chemistry sequence');
      eq(data.shaky.map(t=>t.id),['uch_analysis_018'],'shaky target');eq(data.weak,[],'no weak');eq(data.mastered,[],'no mastered');
      eq(data.untested.length,3,'untested');eq(data.path.map(t=>t.status),['shaky'],'learning path');
    }
    rows.push({file,subject,mode,records:count,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),result:'PASS'});
  }
  const report={checked_date:'2026-10-31',result:'PASS',files:rows,record_count:rows.reduce((n,r)=>n+r.records,0),assertions,
    method:'三个文件均通过浏览器实际点击导出JSON取得；本脚本检查与最终题库和会话选项排列的一致性。语义与数值答案另由内容复核及独立复算记录支持。',
    limits:['这些文件是验收用合成作答，不含真实学生记录。','浏览器覆盖为报告列出的限定流程，不代表穷尽所有设备和输入。']};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,record_count:report.record_count,assertions}));
} catch(error){
  const report={result:'FAIL',assertions_completed:assertions,error:error.message};fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.error(report);process.exitCode=1;
}
