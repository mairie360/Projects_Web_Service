const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { requireTs } = require('./support/typescript.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
const { createFrontHarness } = require('./support/front-harness.cjs');
const f = require('./support/bff-fixtures.cjs');
const { projectToFormState } = requireTs('src/lib/projectPageState.ts');
const Page = requireTs('src/app/page.tsx').default;
const harness = createFrontHarness();
let view;
const first = f.projectListItem(), second = f.projectListItem({ id:'project-2', title:'Autre projet intact' });
const task = f.projectTask();
before(() => harness.start());
after(() => harness.stop());
beforeEach(() => { harness.reset(); harness.signIn(f.jwt(f.agents.marie.id)); harness.location.search = ''; });
afterEach(() => { view?.unmount(); view = undefined; assert.deepEqual(harness.violations(), []); });
async function loaded() {
  harness.bffProject.on('get','/projects-page',{body:f.projectsPage([first,second])});
  harness.bffProject.on('get','/projects/{projectId}',({pathParams})=>({body:f.projectDetails(pathParams.projectId===first.id?first:second,[task])}));
  view=mount(React.createElement(Page)); await view.waitFor(html=>!html.includes('Chargement des projets'));
}
async function perform(operation) {
  const workspace=view.props('ProjectsWorkspace');
  if(operation==='inline') await workspace.updateProjectFromForm(first.id,projectToFormState(first)).catch(()=>undefined);
  if(operation==='card') {
    if(!view.find('CreateProjectModal').length) await workspace.openEditProject(first);
    await view.props('CreateProjectModal').onSubmit({preventDefault(){}});
  }
  if(operation==='move') await workspace.moveProjectStatus(first,'done');
  if(operation==='close'||operation==='review') await workspace.closeProject(first.id,operation==='close'?'done':'review');
}
function wrongReceipt(kind) {
  if(kind==='foreign') return f.projectDetails({...second,title:'Ne pas appliquer ce reçu étranger'},[task]);
  return f.projectDetails({...first,title:'Titre non vérifié'},kind==='duplicates'?[task,{...task,title:'ID répété'}]:[{...task,id:' '}]);
}
function rejectReceipt(operation,kind='foreign') {
  harness.bffProject.on('patch',operation==='close'||operation==='review'?'/projects/{projectId}/close':'/projects/{projectId}',{body:wrongReceipt(kind)});
}
for(const operation of ['inline','card','move','close','review']) {
  for(const kind of ['foreign','duplicates','empty-task-id']) {
    test(`${operation} rejects an accepted ${kind} receipt without replacing any project or replaying the write`,async()=>{
      await loaded();
      await view.act(()=>view.props('ProjectsWorkspace').openProjectDetails(first));
      if(operation==='card') await view.act(()=>view.props('ProjectsWorkspace').openEditProject(first));
      const rows=structuredClone(view.props('ProjectsWorkspace').projects);
      const selected=structuredClone(view.props('ProjectDetailModal').project);
      rejectReceipt(operation,kind);
      harness.bffProject.on('get','/projects-page',harness.errorReply(503,f.apiError('READ','Catalogue indisponible')));
      await view.act(()=>perform(operation));
      assert.deepEqual(view.props('ProjectsWorkspace').projects,rows);
      assert.deepEqual(view.props('ProjectDetailModal').project,selected);
      assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(first.id),true);
      assert.equal(view.props('ProjectDetailModal').projectVerificationRequired,true);
      assert.match(view.text(),/acceptée.*confirmation.*incohérente/);
      assert.doesNotMatch(view.text(),/Ne pas appliquer ce reçu étranger|Titre non vérifié|ID répété/);
      if(operation==='card') {
        assert.equal(view.props('CreateProjectModal').form.title,first.title);
        assert.equal(view.props('CreateProjectModal').verificationRequired,true);
      }
      await view.act(()=>perform(operation));
      assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
    });
  }
}

test('only a coherent requested project GET clears uncertainty, preserves card draft and enables a deliberate new write',async()=>{
  await loaded(); await view.act(()=>view.props('ProjectsWorkspace').openEditProject(first));
  await view.act(()=>view.props('CreateProjectModal').onChange({title:'Mon brouillon conservé'}));
  rejectReceipt('card'); await view.act(()=>perform('card'));
  for(const reply of [harness.errorReply(503,f.apiError('READ','Lecture toujours refusée')),{body:wrongReceipt('foreign')},{body:wrongReceipt('duplicates')}]) {
    harness.bffProject.on('get','/projects/{projectId}',reply);
    await view.act(()=>view.props('ProjectsWorkspace').verifyProjectReceipt(first.id));
    assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(first.id),true);
    assert.equal(view.props('CreateProjectModal').form.title,'Mon brouillon conservé');
    assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
  }
  const official={...first,title:'Valeur officielle vérifiée',permissions:{...first.permissions,canClose:false}};
  harness.bffProject.on('get','/projects/{projectId}',{body:f.projectDetails(official,[task])});
  await view.act(()=>view.props('ProjectsWorkspace').verifyProjectReceipt(first.id));
  assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.size,0);
  assert.equal(view.props('ProjectsWorkspace').projects[0].title,official.title);
  assert.equal(view.props('ProjectsWorkspace').projects[1].title,second.title);
  assert.equal(view.props('CreateProjectModal').form.title,'Mon brouillon conservé');
  assert.equal(view.props('CreateProjectModal').verificationRequired,false);
  assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
  harness.bffProject.on('patch','/projects/{projectId}',{body:f.projectDetails(official,[task])});
  await view.act(()=>perform('card'));
  assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,2);
});

test('uncertainty belongs to the requested project, not its foreign receipt or another open detail',async()=>{
  await loaded(); await view.act(()=>view.props('ProjectsWorkspace').openProjectDetails(second));
  rejectReceipt('move'); await view.act(()=>perform('move'));
  assert.equal(view.props('ProjectDetailModal').project.id,second.id);
  assert.equal(view.props('ProjectDetailModal').projectVerificationRequired,false);
  assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(second.id),false);
  harness.bffProject.on('patch','/projects/{projectId}',{body:f.projectDetails({...second,status:'done'},[task])});
  await view.act(()=>view.props('ProjectsWorkspace').moveProjectStatus(second,'done'));
  assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,2);
  assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(first.id),true);
});

test('a project detail read begun before the uncertain receipt cannot unlock or replace its target',async t=>{
  await loaded(); await view.act(()=>view.props('ProjectsWorkspace').openProjectDetails(first));
  let release,held=0,pending;
  const gate=new Promise(resolve=>{release=resolve;});const fetch=global.fetch;
  t.mock.method(global,'fetch',async(input,init)=>{const response=await fetch(input,init);if(input===`/projects/${first.id}`&&!held){++held;await gate;}return response;});
  try{
    await view.act(()=>{pending=view.props('ProjectDetailModal').onRetry();});await view.waitFor(()=>held>0);
    rejectReceipt('move');await view.act(()=>perform('move'));
    release();await pending;await view.settle();
    assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(first.id),true);
    assert.match(view.props('ProjectDetailModal').refreshError,/confirmation de projet.*incohérente/);
    assert.equal(view.props('ProjectDetailModal').project.title,first.title);
    assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
  }finally{release();await pending;await view.settle();}
});

test('catalogue success and closing the card do not clear uncertainty; reopening needs a coherent project detail',async()=>{
  await loaded();await view.act(()=>view.props('ProjectsWorkspace').openEditProject(first));
  rejectReceipt('card');await view.act(()=>perform('card'));
  await view.act(()=>view.props('CreateProjectModal').onClose());
  await view.act(()=>view.props('ProjectsWorkspace').retryProjectsPage());
  assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(first.id),true);
  harness.bffProject.on('get','/projects/{projectId}',harness.errorReply(503,f.apiError('READ','Fiche toujours refusée')));
  await view.act(()=>view.props('ProjectsWorkspace').openEditProject(first));
  assert.equal(view.props('CreateProjectModal').verificationRequired,true);
  await view.act(()=>perform('card'));
  assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
  await view.act(()=>view.props('CreateProjectModal').onClose());
  harness.bffProject.on('get','/projects/{projectId}',{body:f.projectDetails(first,[task])});
  await view.act(()=>view.props('ProjectsWorkspace').openEditProject(first));
  assert.equal(view.props('CreateProjectModal').verificationRequired,false);
  assert.equal(view.props('CreateProjectModal').form.title,first.title);
});

test('a double verification is one GET; changing detail selection cannot reopen or retarget it',async t=>{
  await loaded();await view.act(()=>view.props('ProjectsWorkspace').openProjectDetails(first));
  rejectReceipt('close');await view.act(()=>perform('close'));
  let release,held=0,pending;
  const gate=new Promise(resolve=>{release=resolve;});const fetch=global.fetch;
  t.mock.method(global,'fetch',async(input,init)=>{const response=await fetch(input,init);if(input===`/projects/${first.id}`&&!held){++held;await gate;}return response;});
  const before=harness.bffProject.calls('/projects/{projectId}','get').length;
  try{
    await view.act(()=>{pending=view.props('ProjectsWorkspace').verifyProjectReceipt(first.id);});await view.waitFor(()=>held>0);
    await view.act(()=>view.props('ProjectsWorkspace').verifyProjectReceipt(first.id));
    assert.equal(harness.bffProject.calls('/projects/{projectId}','get').length,before+1);
    await view.act(()=>view.props('ProjectDetailModal').onClose());
    await view.act(()=>view.props('ProjectsWorkspace').openProjectDetails(second));
    release();await pending;await view.settle();
    assert.equal(view.props('ProjectDetailModal').project.id,second.id);
    assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.size,0);
    assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
  }finally{release();await pending;await view.settle();}
});

test('fresh verified edit and close permissions are consumed without allowing another write',async()=>{
  await loaded();await view.act(()=>view.props('ProjectsWorkspace').openEditProject(first));
  rejectReceipt('card');await view.act(()=>perform('card'));
  const denied={...first,permissions:{...first.permissions,canEdit:false,canClose:false}};
  harness.bffProject.on('get','/projects/{projectId}',{body:f.projectDetails(denied,[task])});
  await view.act(()=>view.props('ProjectsWorkspace').verifyProjectReceipt(first.id));
  assert.equal(view.props('CreateProjectModal').verificationRequired,false);
  assert.equal(view.props('CreateProjectModal').canSave,false);
  await view.act(()=>perform('card'));await view.act(()=>perform('inline'));await view.act(()=>perform('close'));
  assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
});

test('a current forbidden verification retains uncertainty and never sends a write',async()=>{
  await loaded();rejectReceipt('move');await view.act(()=>perform('move'));
  harness.bffProject.on('get','/projects/{projectId}',harness.errorReply(403,f.apiError('FORBIDDEN','Vérification interdite')));
  await view.act(()=>view.props('ProjectsWorkspace').verifyProjectReceipt(first.id));
  assert.equal(view.props('ProjectsWorkspace').unverifiedProjectIds.has(first.id),true);
  assert.equal(view.props('ProjectsWorkspace').projectVerificationErrors.get(first.id),'Vérification interdite');
  assert.equal(harness.location.reloads,0);
  assert.equal(harness.bffProject.requests.filter(r=>r.method!=='GET').length,1);
});
