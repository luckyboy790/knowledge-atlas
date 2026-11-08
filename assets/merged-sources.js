/* Counts for the three canonical source groups. Individual book renderers use raw members. */
(function(){
  'use strict';
  ['physics','chemistry','tcm'].forEach(function(subject){
    const host=document.getElementById(subject+'-merged-summary');
    if(!host)return;
    Promise.all(['topics','questions','dependencies'].map(function(kind){return Subjects.fetch('data/'+subject+'-'+kind+'.json',subject).then(function(r){return r.json();});})).then(function(values){
      const topics=values[0], questions=values[1], edges=values[2];
      host.textContent='合并后共 '+topics.length+' 个知识点、'+questions.length+' 道练习、'+edges.length+' 条先修关系。'+(subject==='tcm'?'中医四门基础课程与中药六门核心课程在同一图谱中呈现。':'中学内容与大学 '+Subjects.coursesFor(subject).length+' 个核心模块在同一图谱中呈现。');
    }).catch(function(error){host.textContent='合并范围未能载入：'+error.message+'。各原始教材记录保留在下方。';});
  });
})();
