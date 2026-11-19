import { models, stages, cases, filterCases, summarize, statusLabels } from './data.js';

const phoneLayout = window.matchMedia('(max-width:650px), (max-width:950px) and (max-height:500px)');

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 10 9 5 9-5M3 18l9 5 9-5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-7 5 8"/>',
  vector: '<path d="M4 7h16M7 7c0 8 10 8 10 0"/><rect x="2" y="4" width="5" height="5"/><rect x="17" y="4" width="5" height="5"/><rect x="9" y="16" width="6" height="5"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  sliders: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M10 15v6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  refresh: '<path d="M20 7A9 9 0 1 0 21 13M20 2v6h-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 2v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  git: '<circle cx="7" cy="5" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="7" cy="19" r="2"/><path d="M7 7v10m10-9c0 5-10 2-10 7"/>',
  list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h1m-1 7h1m-1 7h1"/>',
  code: '<path d="m7 6-6 6 6 6m10-12 6 6-6 6M14 3l-4 18"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = { view: 'lanes', status: 'all', query: '', model: 'all', compact: false, selected: null, tab: 'checks', replay: -1, timer: null, batch: 1, running: false };
let lastFocus;
let lastFocusCase;
const app = document.querySelector('#app');
const overlay = document.querySelector('#overlay-root');
const items = () => filterCases({ modelIds: state.model === 'all' ? models.map(m => m.id) : [state.model], status: state.status, query: state.query });
const badge = (status, text = statusLabels[status]) => `<span class="badge ${status}"><span></span>${text}</span>`;

function shell() {
  const totals=summarize();
  app.innerHTML = `
  <a class="skip-link" href="#results-content">跳到测评结果</a>
  <aside class="sidebar">
    <a class="brand" href="./" aria-label="玄石测评首页"><img src="./icon.svg" alt=""/><div>玄石测评</div></a>
    <nav aria-label="工作空间导航">
      <button class="nav-item active" data-action="home">${icon('activity')}<span>我的测评</span><span class="nav-count">1</span></button>
      <button class="nav-item" data-action="compare">${icon('layers')}<span>模型对比</span></button>
      <button class="nav-item" data-action="suite">${icon('grid')}<span>用例实验室</span><span class="new-dot"></span></button>
    </nav>
    <div class="sidebar-bottom"><button class="nav-item" data-action="help">${icon('help')}<span>测评说明</span></button></div>
  </aside>
  <div class="main-shell">
    <header class="topbar"><div class="breadcrumbs">渠道测评 <span>/</span><span class="batch-id">批次 XS-20261119-${String(state.batch).padStart(2,'0')}</span></div><div class="topbar-right"><span class="demo-pill">模拟数据</span><button class="icon-button mobile-menu" data-action="menu" aria-label="打开工作空间菜单">${icon('grid')}</button></div></header>
    <main>
      <section class="page-heading"><div><h1>GPT-image 渠道测评</h1><p class="channel-name"><span class="provider-logo">N</span>nxaiapp.com</p></div><div class="heading-actions"><button class="button" data-action="export">${icon('download')}导出报告</button><button class="button primary" data-action="rerun">${icon('refresh')}重新测评</button></div></section>
      <section class="metrics" aria-label="测评概览">
      <div class="metric"><div>综合评分</div><strong>0<span>/ 100</span></strong><button class="metric-foot danger-text" data-action="score">硬门槛未通过 ${icon('info')}</button></div>
      <div class="metric"><div>测评模型</div><strong>5<span>个</span></strong></div>
      <div class="metric"><div>完成用例</div><strong>${totals.total}<span>/ ${totals.total}</span></strong><span class="metric-foot"><b class="green-text">${totals.passed} 通过</b><span class="metric-separator">·</span>${totals.total-totals.passed} 含异常</span></div>
      <div class="metric"><div>批次耗时</div><strong>24<span>分 08 秒</span></strong></div>
      </section>
      <section class="results-panel"><div class="results-title"><div><span class="section-icon">${icon('git')}</span><h2>测评轨迹</h2></div><div class="view-switch" role="group" aria-label="视图切换"><button data-view="lanes" class="selected">${icon('git')}泳道视图</button><button data-view="table">${icon('list')}列表视图</button></div></div>
      <div class="toolbar"><div class="filter-tabs" role="group" aria-label="用例状态筛选"><button data-status="all" class="selected">全部用例 <span>${totals.total}</span></button><button data-status="abnormal">仅看异常 <span>${totals.total-totals.passed}</span></button><button data-status="gate">硬门槛 <span>15</span></button><button data-status="pass">已通过 <span>${totals.passed}</span></button></div><div class="toolbar-actions"><label class="search-box">${icon('search')}<input id="search" placeholder="搜索用例…" aria-label="搜索用例" autocomplete="off"/></label><label class="model-filter"><select id="model-filter" aria-label="筛选模型"><option value="all">全部模型</option>${models.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select>${icon('down')}</label><button class="icon-button" data-action="compact" aria-label="切换紧凑布局" title="切换紧凑布局" aria-pressed="false">${icon('sliders')}</button></div></div>
      <div class="canvas-top"><span><b id="visible-count">31</b> 项用例</span><div class="legend"><span><b class="symbol-pass">✓</b>通过</span><span><b class="symbol-partial">−</b>部分通过</span><span><b class="symbol-fail">×</b>失败</span><span><b class="symbol-gate">!</b>硬门槛</span><span><i class="branch-line"></i>复测</span></div><button class="text-button replay-button" data-action="replay">${icon('play')}回放轨迹</button></div>
      <div class="graph-guide"><span class="scroll-hint">左右滑动查看模型 →</span></div>
      <div id="results-content" tabindex="-1"></div>
      </section>
      <footer class="page-footer"><span>玄石测评 <i>·</i> 全部为模拟数据，不代表真实渠道能力</span><button class="text-button" data-action="help">使用说明 ${icon('help')}</button></footer>
    </main>
  </div>`;
  renderResults();
}

function renderNode(c) {
  const model = models.find(m => m.id === c.modelId);
  const active = state.replay === stages.findIndex(s=>s.id === c.stageId);
  return `<button class="case-node ${c.status} ${c.gate ? 'hard-gate' : ''} ${active ? 'replaying' : ''}" data-case="${c.id}" aria-label="${model.name}，${c.title}，${c.gate?'硬门槛失败':statusLabels[c.status]}"><span class="node-marker ${c.status}">${c.gate ? '!' : c.status === 'pass' ? icon('check') : c.status === 'fail' ? '×' : '−'}</span><span class="node-content"><span class="node-top"><strong>${c.title}</strong></span><span class="node-bottom"><span class="node-result ${c.status}">${c.gate?'硬门槛失败':statusLabels[c.status]}</span>${icon('chevron')}</span></span></button>`;
}

function renderResults() {
  const visible = items();
  const caseStage = c => c.stageId === 'isolate' ? 'webp' : c.stageId;
  const rowClass = stageId => visible.some(c=>caseStage(c)===stageId&&c.kind==='retest') ? ' retest-row' : '';
  const scopedModels = state.model === 'all' ? models : models.filter(m => m.id === state.model);
  const selectedModels = scopedModels.filter(m => visible.some(c => c.modelId === m.id));
  const visibleStages = (state.status === 'all' && !state.query) ? stages : stages.filter(s => visible.some(c => caseStage(c) === s.id));
  document.querySelector('.scroll-hint').textContent = `左右滑动查看 ${selectedModels.length} 个模型 →`;
  document.querySelector('.graph-guide').hidden = selectedModels.length < 2 || state.view === 'table';
  document.querySelector('.replay-button').disabled = state.view === 'table';
  document.querySelector('.replay-button').title = state.view === 'table' ? '切换到泳道视图后可回放' : '按执行阶段回放当前筛选结果';
  document.querySelector('#visible-count').textContent = visible.length;
  document.querySelectorAll('[data-status]').forEach(el=>{
    el.classList.toggle('selected', el.dataset.status === state.status);
    el.setAttribute('aria-pressed',el.dataset.status === state.status);
    el.querySelector('span').textContent = filterCases({modelIds:scopedModels.map(m=>m.id),query:state.query,status:el.dataset.status}).length;
  });
  document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('selected', el.dataset.view === state.view));
  const content = document.querySelector('#results-content');
  if (!visible.length) { content.innerHTML = `<div class="empty-state">${icon('search')}<h3>没有匹配的用例</h3><p>试试其他关键词，或重置筛选条件。</p><button class="button" data-action="reset">重置筛选</button></div>`; return; }
  if (state.view === 'table') {
    if (phoneLayout.matches) {
      content.innerHTML = `<div class="mobile-case-list">${visible.map(c => `<button class="mobile-case-card" data-case="${c.id}"><span class="mobile-case-heading"><strong>${c.title}</strong>${badge(c.status)}</span><span class="mobile-case-model">${models.find(m=>m.id===c.modelId).name}</span></button>`).join('')}</div>`;
      return;
    }
    content.innerHTML = `<div class="table-scroll"><table class="case-table"><thead><tr><th>用例名称</th><th>模型</th><th>结果</th><th>检查项</th><th>耗时</th><th></th></tr></thead><tbody>${visible.map(c=>`<tr><td><button class="table-link" data-case="${c.id}">${c.kind === 'retest' ? icon('git') : icon(stages.find(s=>s.id === c.stageId)?.icon)}${c.title}</button></td><td><span class="model-dot" style="background:${models.find(m=>m.id === c.modelId).color}"></span>${models.find(m=>m.id === c.modelId).name}</td><td>${badge(c.status)}</td><td>${c.checks.filter(ch=>ch.status === 'pass').length} / ${c.checks.length}</td><td>${c.duration.toFixed(1)} 秒</td><td><button class="icon-button" data-case="${c.id}" aria-label="查看${c.title}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div>`;
    return;
  }
  content.innerHTML = `<div class="graph-scroll" tabindex="0" role="region" aria-label="模型泳道，可左右滚动"><div class="graph ${state.compact ? 'compact' : ''}" style="--lanes:${selectedModels.length}">
    <div class="stage-axis"><div class="axis-head">阶段</div>${visibleStages.map(s=>`<div class="axis-row${rowClass(s.id)}"><b>${s.short}</b></div>`).join('')}</div>
    ${selectedModels.map(m=>{
      const modelCases=cases.filter(c=>c.modelId===m.id);
      const stats=summarize(modelCases);
      return `<section class="lane" style="--lane-color:${m.color}" aria-label="${m.name}泳道"><header class="lane-header"><h3 title="flare / sunburst 是渠道提供的模型后缀，不代表能力等级">${m.name}</h3><div class="lane-meta"><span class="lane-status">${stats.passed}/${stats.total} 通过</span>${stats.retests ? `<span>${stats.retests} 次复测</span>` : ''}</div></header><div class="lane-track">${visibleStages.map(s=>{
        const c=visible.find(c=>c.modelId===m.id && c.stageId===s.id && c.kind!=='retest');
        const retests=visible.filter(c=>c.modelId===m.id && caseStage(c)===s.id && c.kind==='retest');
        return `<div class="stage-cell${rowClass(s.id)}">${c?renderNode(c):`<div class="skipped-node"><span></span><div>${cases.some(c=>c.modelId===m.id&&c.stageId===s.id)?'已隐藏':'不适用'}</div></div>`}${retests.length?`<div class="retest-branch">${retests.map(c=>`<button data-case="${c.id}" class="branch-node ${c.status} ${state.replay===stages.indexOf(s)?'replaying':''}" aria-label="${m.name}，${c.title}，${statusLabels[c.status]}"><span class="branch-label">${c.title.replace('单参数复测 · ','')}</span><span class="branch-result">${statusLabels[c.status]}</span></button>`).join('')}</div>`:''}</div>`;
      }).join('')}</div></section>`;
    }).join('')}</div></div>`;
}

function toast(text) {
  const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>el.classList.remove('visible'), 3000);
}
function openOverlay(html, drawer = false) {
  if (!overlay.childElementCount) { lastFocus = document.activeElement; lastFocusCase = lastFocus?.dataset.case; }
  overlay.innerHTML = `<div class="overlay-backdrop" data-dismiss="true"></div><section class="${drawer ? 'detail-drawer' : 'modal'}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">${html}</section>`;
  document.body.classList.add('overlay-open');
  overlay.querySelector('[role="dialog"]').focus();
}
function closeOverlay() { overlay.innerHTML = ''; document.body.classList.remove('overlay-open'); state.selected = null; const target=lastFocus?.isConnected?lastFocus:lastFocusCase?document.querySelector(`[data-case="${lastFocusCase}"]`):document.querySelector('.results-title'); target?.focus(); document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.action==='home')); }
const closeButton = () => `<button class="icon-button close-button" data-action="close" aria-label="关闭弹窗">${icon('close')}</button>`;

function detail(id, tab = 'checks') {
  const c = cases.find(c=>c.id===id); if (!c) return;
  state.selected = id; state.tab = tab;
  const model = models.find(m=>m.id === c.modelId);
  const passing = c.checks.filter(ch=>ch.status==='pass').length;
  const filtered = items();
  const position = filtered.findIndex(item => item.id === c.id);
  let body;
  if (tab === 'checks') {
    body = `<div class="checks-heading"><strong>检查明细</strong><span>${passing} / ${c.checks.length} 项通过</span></div>${c.checks.map(ch => `<article class="check-card"><div><span class="check-symbol ${ch.status}">${ch.status==='pass'?'✓':ch.status==='sealed'?icon('shield'):'×'}</span><strong>${ch.name}</strong><span class="check-status ${ch.status}">${ch.status==='sealed'?'未公开/未评估':statusLabels[ch.status]}</span></div><dl><dt>预期</dt><dd>${ch.expected}</dd><dt>实际</dt><dd class="${ch.status==='fail'?'danger-text':''}">${ch.actual}</dd></dl></article>`).join('')}`;
  } else if (tab === 'request') {
    body = c.request ? `<div class="checks-heading"><strong>模拟请求参数</strong><button class="text-button" data-action="copy">${icon('copy')}复制</button></div><pre>${esc(JSON.stringify(c.request,null,2))}</pre><p class="code-note">仅展示参数结构，不包含真实令牌或接口请求。</p>` : `<div class="sealed-state">${icon('shield')}<h3>来源验证细节不公开</h3><p>“封存”指检查策略不对外公开；不代表此项通过，也不能据此确认具体型号。</p></div>`;
  } else {
    body = `<div class="checks-heading"><strong>模拟响应摘要</strong><span>非原始响应</span></div><pre>${esc(JSON.stringify({http_status:c.http,result:statusLabels[c.status],findings:c.checks.map(ch=>({check:ch.name,actual:ch.actual,status:ch.status==='sealed'?'未公开/未评估':statusLabels[ch.status]}))},null,2))}</pre>`;
  }
  openOverlay(`
    <header class="drawer-top"><span>${icon(c.kind==='retest'?'git':'activity')}用例检查详情</span>${closeButton()}</header>
    <div class="drawer-heading"><div class="eyebrow">${c.kind==='retest'?'单参数复测':'基础用例'} · 模拟结果</div><h2 id="dialog-title">${c.title}</h2><p><span class="model-dot" style="background:${model.color}"></span>${model.name}</p>${badge(c.status,c.gate?'硬门槛失败':statusLabels[c.status])}<span class="detail-duration">${icon('clock')}请求耗时 ${c.duration.toFixed(1)} 秒</span></div>
    <div class="detail-summary ${c.status}">${icon(c.status==='pass'?'check':'info')}<div><strong>${c.summary}</strong>${c.note?`<p>${c.note}</p>`:''}</div></div>
    ${c.id==='26s-webp'?`<div class="related-cases"><span>组合失败后，一次只改一个参数再试：</span>${cases.filter(item=>item.modelId===c.modelId&&item.kind==='retest').map(item=>`<button class="button" data-case="${item.id}">${item.title.replace('单参数复测 · ','')} · ${statusLabels[item.status]} ${icon('chevron')}</button>`).join('')}</div>`:c.kind==='retest'?`<div class="related-cases"><button class="text-button" data-case="26s-webp">← 查看触发本次复测的 WebP 组合用例</button></div>`:''}
    <div class="detail-tabs"><button data-tab="checks" class="${tab==='checks'?'selected':''}">检查结果 <span>${c.checks.length}</span></button><button data-tab="request" class="${tab==='request'?'selected':''}">请求参数</button><button data-tab="response" class="${tab==='response'?'selected':''}">响应摘要</button></div>
    <div class="detail-body"><p class="detail-goal"><strong>测试目的：</strong>${c.goal}</p><button class="text-button compare-case" data-action="compare-stage" data-stage="${c.stageId==='isolate'?'webp':c.stageId}">${icon('layers')}跨模型比较此用例</button>${c.kind==='retest'?`<details class="retest-diff"><summary>与原始 WebP 请求的参数差异</summary><p>原始组合失败后改用最小请求，不代表原组合已恢复。</p><dl>${[...new Set([...Object.keys(cases.find(item=>item.id==='26s-webp').request),...Object.keys(c.request)])].filter(key=>key!=='model').map(key=>`<dt>${esc(key)}</dt><dd>${esc(cases.find(item=>item.id==='26s-webp').request[key]??'未设置')} → ${esc(c.request[key]??'未设置（默认）')}</dd>`).join('')}</dl>${cases.filter(item=>item.kind==='retest'&&item.id!==c.id).map(item=>`<button class="text-button" data-case="${item.id}">查看另一次复测：${item.title.replace('单参数复测 · ','')} →</button>`).join('')}</details>`:''}${body}</div>
    <footer class="drawer-footer"><span>${position>=0?`当前筛选 ${position+1}/${filtered.length}`:'关联用例 · 不在当前筛选内'}</span><button class="button" data-action="next" ${filtered.length<2&&position>=0?'disabled':''}>${position<0?'返回筛选结果':'下一个用例'} ${icon('arrow')}</button></footer>`, true);
}

function rerunModal() {
  openOverlay(`<div class="modal-heading"><span class="modal-symbol">${icon('refresh')}</span>${closeButton()}<h2 id="dialog-title">重新运行测评</h2><p>面向全批次 5 个模型，不受当前筛选影响。</p></div><div class="rerun-options"><label><input type="radio" name="scope" value="abnormal" checked/><div><strong>只补测异常项 <span>${summarize().total-summarize().passed} 个用例</span></strong><p>复查失败与部分通过的用例，快速定位问题。</p></div></label><label><input type="radio" name="scope" value="all"/><div><strong>完整重新测评 <span>31 个用例</span></strong><p>重新执行 5 个模型的全部用例和单参数复测。</p></div></label></div><div class="modal-note">${icon('info')}这是前端模拟演示，不会发送真实 API 请求或产生费用。</div><div class="modal-actions"><button class="button" data-action="close">取消</button><button class="button primary" data-action="run">${icon('play')}开始模拟测评</button></div>`);
}
function scoring() {
  openOverlay(`<div class="modal-heading">${closeButton()}<h2 id="dialog-title">为什么有通过用例，仍是 0 分？</h2><p>单个用例通过，不代表模型满足接入的最低要求。</p></div><div class="help-content"><h3>1. 先检查硬门槛</h3><p>本批次 5/5 模型均出现：来源声明不符、非法参数未拒绝。任一硬门槛失败即判不合格，不能靠其他通过项抵消。</p><h3>2. 再看评分口径</h3><p>原始满分 20 = 来源 12 + 参数 8。来源不符时，原始结果被记为 −1，这是“不合格”标记，不是常规负分。</p><h3>3. 换算为百分制展示</h3><p>百分制 = max(原始结果, 0) ÷ 20 × 100。五个模型均为 0/100，批次取等权平均，所以也是 0/100。</p><div class="modal-note">${summarize().passed} 个通过的是用例；评分面向模型，两者统计对象不同。复杂度复测只确认接收，效果未评估，归入“部分通过”而非通过。全部为模拟结果。</div></div><div class="modal-actions"><button class="button" data-action="help">完整测评说明</button><button class="button primary" data-action="issues">查看全部硬门槛</button></div>`);
}
function help() {
  openOverlay(`<div class="modal-heading"><span class="modal-symbol">${icon('shield')}</span>${closeButton()}<h2 id="dialog-title">测评说明</h2><p>纯前端演示，所有数据均为编造的示例。</p></div><div class="help-content"><h3>如何阅读泳道</h3><p>每列代表一个模型，线条依次连接测试用例。✓ 通过；− 部分通过；× 失败；! 表示影响接入结论的硬门槛。节点右侧是单次请求耗时，不是累计时间；批次总时长还包含排队和等待。</p><h3>常见术语，用白话解释</h3><p><strong>模型规范（原称“契约”）：</strong>某个版本承诺支持哪些参数、尺寸和格式。旧版不含 SVG/GIF，故显示“不适用”，不计为失败。</p><p><strong>封存：</strong>来源验证的请求和检查策略不公开，只展示可公开的结论；不代表通过，也不证明具体型号。</p><p><strong>单参数复测（原称“隔离复测”）：</strong>组合请求失败后，一次只改变一个参数再试，用来缩小原因范围。</p><p><strong>快速批量校验：</strong>用少量请求检查多模型基本能力，不验证所有能力效果。评分版本仅标记采用的规则。</p><p><strong>flare / sunburst：</strong>渠道提供的模型名称后缀，不代表本页评定的能力等级。</p><h3>为什么通过项不等于模型合格？</h3><p>满分 20 = 来源 12 + 参数 8。硬门槛失败后不合格，原始标记 −1 按 max(−1,0) ÷ 20 × 100 显示为 0/100，不能按绿色节点比例计分。</p></div><div class="modal-actions"><button class="button" data-action="score">查看评分规则</button><button class="button primary" data-action="close">明白了</button></div>`);
}
function suite() {
  openOverlay(`<div class="modal-heading">${closeButton()}<h2 id="dialog-title">用例实验室</h2><p>模型规范说明各版本承诺支持的参数与格式。</p></div><div class="help-content suite-content">${stages.map((s,i)=>`<div class="suite-row"><span>0${i+1}</span>${icon(s.icon)}<div><strong>${s.title}</strong><p>${s.goal}</p></div><b>${['svg','gif'].includes(s.id)?'2.6 专属':'全部模型'}</b></div>`).join('')}<div class="modal-note">${icon('git')}组合请求失败后，一次只改一个参数再试。本批次另有 2 次单参数复测。</div></div><div class="modal-actions"><button class="button primary" data-action="close">返回轨迹</button></div>`);
}
function comparison() {
  openOverlay(`<div class="modal-heading">${closeButton()}<h2 id="dialog-title">模型能力对比</h2><p>相同渠道 · 全批次结果（不受当前筛选影响）</p></div><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>模型 / 规范</th><th>参数分</th><th>用例通过</th><th>正向请求成功</th><th>结论与证据</th></tr></thead><tbody>${models.map(m=>{
    const modelCases=cases.filter(c=>c.modelId===m.id), stats=summarize(modelCases);
    const positive=modelCases.filter(c=>['jpeg','webp','svg','gif'].includes(c.stageId));
    return `<tr><td><span class="model-dot" style="background:${m.color}"></span>${m.name}<small>${m.version} 版规范 · 来源 0/12</small></td><td data-label="参数分"><b>${m.score}</b> / 8</td><td data-label="用例通过">${stats.passed} / ${stats.total}</td><td data-label="正向请求成功">${positive.filter(c=>c.http>=200&&c.http<300).length} / ${positive.length}</td><td data-label="结论与证据"><button class="text-button" data-inspect="${m.id}">不合格 · 0/100 ${icon('chevron')}</button></td></tr>`;
  }).join('')}</tbody></table></div><div class="modal-note">用例通过含单参数复测；正向请求只统计 JPEG、WebP、SVG、GIF 的 HTTP 2xx（不含来源、负向测试和复测），不代表格式或画面符合要求。旧版 SVG/GIF 不适用，不计入分母。<br/>所有模型均触发硬门槛：原始结果 −1 为不合格标记，换算百分制为 0/100。参数分是独立模拟评分，不能代替接入结论。</div><div class="modal-actions"><button class="button" data-action="score">评分规则</button><button class="button primary" data-action="close">返回测评</button></div>`);
  overlay.querySelector('.modal').classList.add('comparison-modal');
}

function compareStage(stageId='webp') {
  const stage=stages.find(s=>s.id===stageId)||stages[2];
  const aligned=models.map(m=>cases.find(c=>c.modelId===m.id&&c.stageId===stage.id));
  const checkNames=[...new Set(aligned.flatMap(c=>c?.checks.map(ch=>ch.name)||[]))];
  const row=(label,render)=>`<tr><th scope="row">${esc(label)}</th>${aligned.map((c,i)=>`<td>${render(c,models[i])}</td>`).join('')}</tr>`;
  openOverlay(`<div class="modal-heading">${closeButton()}<h2 id="dialog-title">跨模型检查对照</h2><p>全批次相同用例对齐；检查集合不同，不能只比较通过比例。</p><label class="matrix-picker">选择用例 <select id="comparison-stage">${stages.map(s=>`<option value="${s.id}" ${s.id===stage.id?'selected':''}>${s.title}</option>`).join('')}</select></label></div><p class="matrix-hint">← 左右滑动对照模型；左侧检查名保持固定 →</p><div class="matrix-scroll" tabindex="0" role="region" aria-label="跨模型检查与请求参数对照"><table class="check-matrix"><thead><tr><th>检查 / 请求参数</th>${models.map(m=>`<th scope="col">${m.name}<small>${m.version} 版规范</small></th>`).join('')}</tr></thead><tbody>${checkNames.map(name=>row(name,c=>{
    if(!c)return '<span class="matrix-muted">不适用（不计分）</span>';
    const ch=c.checks.find(ch=>ch.name===name);
    if(!ch)return `<span class="matrix-muted">${c.http>=400?'未执行（请求失败）':name==='透明背景'&&!('background' in c.request)?'不适用（未要求）':'未评估'}</span>`;
    return `<strong class="matrix-${ch.status}">${ch.status==='sealed'?'未公开/未评估':statusLabels[ch.status]}</strong><small>预期：${esc(ch.expected)}<br/>实际：${esc(ch.actual)}</small>`;
  })).join('')}${['n','size','output_format','quality','background','complexity'].map(key=>row(key,c=>!c?'不适用':c.request===null?'不公开':esc(c.request[key]??'未设置（默认）'))).join('')}${row('查看完整证据',c=>c?`<button class="text-button" data-case="${c.id}">打开用例 ${icon('chevron')}</button>`:'不适用')}</tbody></table></div><div class="modal-note">基础 gpt-image-2 的 WebP 不要求透明背景；旧版 SVG/GIF 不适用。未执行、未评估与失败不同。</div><div class="modal-actions"><button class="button" data-action="compare">模型概览</button><button class="button primary" data-action="close">返回测评</button></div>`);
  overlay.querySelector('.modal').classList.add('comparison-modal');
}

function toggleReplay() {
  if (state.timer) { clearInterval(state.timer); state.timer=null; state.replay=-1; }
  else { state.replay=0; state.timer=setInterval(()=>{ state.replay++; if (state.replay>=stages.length) { clearInterval(state.timer); state.timer=null; state.replay=-1; toast('轨迹回放完成 · 点击任意节点查看详情'); } renderResults(); updateReplay(); },1200); }
  renderResults(); updateReplay();
}
function updateReplay() { const el=document.querySelector('.replay-button'); el.innerHTML=`${icon(state.timer?'pause':'play')}${state.timer?'暂停回放':'回放轨迹'}`; }
function reset() { state.status='all'; state.model='all'; state.query=''; document.querySelector('#search').value=''; document.querySelector('#model-filter').value='all'; renderResults(); }

document.addEventListener('click', async e=>{
  const inspect=e.target.closest('[data-inspect]');if(inspect){closeOverlay();reset();state.model=inspect.dataset.inspect;document.querySelector('#model-filter').value=state.model;renderResults();document.querySelector('.results-panel').scrollIntoView({behavior:'smooth',block:'start'});return;}
  const node=e.target.closest('[data-case]')||e.target.closest('.case-table tbody tr')?.querySelector('[data-case]'); if(node){node.focus();detail(node.dataset.case);return;}
  const view=e.target.closest('[data-view]'); if(view){if(state.timer)toggleReplay();state.view=view.dataset.view;renderResults();return;}
  const status=e.target.closest('[data-status]'); if(status){state.status=status.dataset.status;renderResults();return;}
  const tab=e.target.closest('[data-tab]'); if(tab){detail(state.selected,tab.dataset.tab);overlay.querySelector(`[data-tab="${tab.dataset.tab}"]`).focus();return;}
  if(e.target.matches('[data-dismiss]')) { if(!state.running)closeOverlay(); return; }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  if(action==='close'){if(!state.running)closeOverlay();}
  if(action==='help')help();
  if(action==='score')scoring();
  if(action==='compare-stage')compareStage(e.target.closest('[data-stage]')?.dataset.stage);
  if(action==='menu')openOverlay(`<div class="modal-heading">${closeButton()}<h2 id="dialog-title">工作空间</h2><p>测评工具与帮助</p></div><nav class="mobile-navigation" aria-label="移动端工作空间导航"><button data-action="compare">${icon('layers')}模型对比${icon('chevron')}</button><button data-action="suite">${icon('grid')}用例实验室${icon('chevron')}</button><button data-action="help">${icon('help')}测评说明${icon('chevron')}</button></nav><div class="modal-actions"><button class="button" data-action="close">返回测评</button></div>`);
  if(action==='suite'||action==='compare'){if(action==='suite')suite();else comparison();document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.action===action));}
  if(action==='home'){reset();window.scrollTo({top:0,behavior:'smooth'});}
  if(action==='reset')reset();
  if(action==='rerun')rerunModal();
  if(action==='compact'){state.compact=!state.compact;document.querySelector('[data-action="compact"]').setAttribute('aria-pressed',state.compact);renderResults();}
  if(action==='issues'){if(overlay.childElementCount)closeOverlay();state.status='gate';state.model='all';state.query='';document.querySelector('#search').value='';document.querySelector('#model-filter').value='all';renderResults();document.querySelector('.results-panel').scrollIntoView({behavior:'smooth',block:'start'});toast(`已定位全批次 ${items().length} 个硬门槛异常用例`);}
  if(action==='replay')toggleReplay();
  if(action==='next'){const visible=items();const current=visible.findIndex(c=>c.id===state.selected);if(visible.length)detail(visible[(current+1)%visible.length].id);}
  if(action==='copy'){try{await navigator.clipboard.writeText(JSON.stringify(cases.find(c=>c.id===state.selected).request,null,2));toast('请求参数已复制');}catch{toast('浏览器禁止复制，请手动选择参数内容');}}
  if(action==='export'){const blob=new Blob([JSON.stringify({说明:'纯前端模拟数据，不代表真实渠道表现',channel:'nxaiapp.com',batch:state.batch,models,cases,summary:summarize()},null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='玄石测评-模拟测评报告.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('模拟测评报告已导出');}
  if(action==='history')openOverlay(`<div class="modal-heading">${closeButton()}<h2 id="dialog-title">我的测评</h2><p>工作空间中的模拟测评记录。</p></div><button class="history-card" data-action="close"><span class="history-icon">${icon('image')}</span><div><strong>GPT-image 渠道测评</strong><p>nxaiapp.com · 5 个模型 · 31 个用例</p></div>${badge('fail','含异常')}${icon('chevron')}</button><div class="modal-actions"><button class="button" data-action="close">返回详情</button></div>`);
  if(action==='run'){
    const scope=overlay.querySelector('input[name="scope"]:checked').value;
    state.running=true;
    openOverlay(`<div class="simulation"><span class="spinner"></span><h2 id="dialog-title">正在模拟测评</h2><p>正在执行 ${scope==='all'?cases.length:filterCases({status:'abnormal'}).length} 个用例…</p><div class="simulation-progress"><i></i></div><small>无网络请求 · 无费用 · 约 3 秒完成</small></div>`);
    setTimeout(()=>{state.running=false;state.batch++;closeOverlay();document.querySelector('.batch-id').textContent=`批次 XS-20261119-${String(state.batch).padStart(2,'0')}`;state.status=scope==='all'?'all':'abnormal';renderResults();toast('模拟重测已完成，结果沿用演示数据');},2800);
  }
});
document.addEventListener('input',e=>{if(e.target.id==='search'){state.query=e.target.value;renderResults();}});
document.addEventListener('change',e=>{if(e.target.id==='model-filter'){state.model=e.target.value;renderResults();}if(e.target.id==='comparison-stage'){compareStage(e.target.value);document.querySelector('#comparison-stage').focus();}});
phoneLayout.addEventListener('change',()=>renderResults());
document.addEventListener('keydown',e=>{
  if(!overlay.childElementCount){
    const node=e.target.closest('[data-case]');
    if(node&&['ArrowDown','ArrowUp'].includes(e.key)){const nodes=[...document.querySelectorAll('#results-content [data-case]')];const index=nodes.indexOf(node);e.preventDefault();nodes[(index+(e.key==='ArrowDown'?1:-1)+nodes.length)%nodes.length]?.focus();}
    return;
  }
  if(state.selected&&e.key==='ArrowRight'&&!e.target.matches('input,pre')){e.preventDefault();document.querySelector('[data-action="next"]:not(:disabled)')?.click();return;}
  if(e.key==='Escape'&&!state.running)closeOverlay();
  if(e.key==='Tab'){
    const focusables=[...overlay.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex="0"]')].filter(el=>{
      if(el.disabled||!el.getClientRects().length||el.closest('[inert]'))return false;
      const closedDetails=el.closest('details:not([open])');
      return !closedDetails||closedDetails.querySelector(':scope > summary')?.contains(el);
    });
    if(!focusables.length){e.preventDefault();return;}
    const first=focusables[0],last=focusables.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement.matches('[role="dialog"]'))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement.matches('[role="dialog"]'))){e.preventDefault();first.focus();}
  }
});
shell();
