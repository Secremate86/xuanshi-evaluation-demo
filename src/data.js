export const stages = [
  { id: 'source', title: '来源验证', short: '来源', subtitle: '声明与内容凭证', icon: 'shield', goal: '核对图片是否符合渠道声明的 OpenAI 来源；具体型号不能仅由来源凭证确认。' },
  { id: 'jpeg', title: 'JPEG 参数组合', short: 'JPEG', subtitle: '格式 · 尺寸 · 背景', icon: 'image', goal: '请求 1 张指定尺寸、不透明背景的 JPEG，核对实际文件编码和像素尺寸。' },
  { id: 'webp', title: 'WebP 与透明背景', short: 'WebP', subtitle: '多图 · 透明度 · 编码', icon: 'layers', goal: '同时请求 WebP、2 张图和指定尺寸；除基础 gpt-image-2 外，还要求透明背景。' },
  { id: 'svg', title: 'SVG 矢量输出', short: 'SVG', subtitle: '矢量结构 · 自定义尺寸', icon: 'vector', goal: '请求 1040×1024 的 SVG，验证返回真实矢量结构而非改扩展名的位图。' },
  { id: 'gif', title: 'GIF 动画输出', short: 'GIF', subtitle: '帧数 · 时长 · 自动尺寸', icon: 'play', goal: '请求自动尺寸的 GIF：恰好 2 帧，每帧 20 毫秒，且画面有变化。' },
  { id: 'quality', title: '非法质量拒绝', short: '质量', subtitle: '负向测试 · quality', icon: 'sliders', goal: '故意传入不支持的 quality=ultra，接口应明确拒绝，而不是静默接受。' },
  { id: 'size', title: '非法尺寸拒绝', short: '尺寸', subtitle: '负向测试 · size', icon: 'expand', goal: '故意传入不符合当前模型规范的尺寸，接口应返回 400/422 和错误说明。' },
];

const check = (name, expected, actual, status = 'pass') => ({ name, expected, actual, status });
export const models = [
  { id: '26f', name: 'gpt-image-2.6-flare', version: '2.6', variant: 'flare', color: '#6479c7', score: 3, available: '4 / 5', success: '5 / 5', seconds: 86 },
  { id: '26s', name: 'gpt-image-2.6-sunburst', version: '2.6', variant: 'sunburst', color: '#9b79b9', score: 2, available: '3 / 5', success: '3 / 5', seconds: 112 },
  { id: '25f', name: 'gpt-image-2.5-flare', version: '2.5', variant: 'flare', color: '#4b9a91', score: 4, available: '2 / 3', success: '3 / 3', seconds: 62 },
  { id: '25s', name: 'gpt-image-2.5-sunburst', version: '2.5', variant: 'sunburst', color: '#c59655', score: 4, available: '2 / 3', success: '3 / 3', seconds: 74 },
  { id: '2', name: 'gpt-image-2', version: '2', variant: '标准版', color: '#688da8', score: 4, available: '2 / 3', success: '3 / 3', seconds: 58 },
];

function createCase(model, stage, index) {
  const modern = model.version === '2.6';
  const unavailable = model.id === '26s' && ['webp', 'svg'].includes(stage.id);
  const size = modern ? (stage.id === 'webp' ? '1536x512' : '512x1536') : (stage.id === 'webp' ? '1536x864' : '1024x1536');
  const base = { id: `${model.id}-${stage.id}`, modelId: model.id, stageId: stage.id, title: stage.title, goal: stage.goal, gate: ['source','quality','size'].includes(stage.id), kind: 'case', duration: 4.2 + index * 2.1 + models.indexOf(model), http: 200, status: 'fail', request: {}, checks: [] };
  if(stage.id==='webp'&&model.id==='2'){
    base.title='WebP 多图（不测透明）';
    base.goal='请求 WebP、2 张图和指定尺寸；该模型规范不要求透明背景，此项不参与通过比例。';
  }
  if (stage.id === 'source') return { ...base, title: '图像来源验证', duration: 18.6, summary: '来源声明与预期不符', note: '来源验证请求与签名检查细节已封存。演示仅展示结论，不公开封存请求，也不据此识别具体模型。', request: null, checks: [check('来源声明', 'OpenAI', '逆向', 'fail'), check('C2PA 签名', '有效的官方签名', '未通过', 'fail'), check('型号与内容绑定', '封存校验通过', '封存', 'sealed')] };
  if (stage.id === 'jpeg') return { ...base, status: 'partial', summary: '请求 JPEG，实际返回 PNG', request: { model: model.name, n: 1, size, output_format: 'jpeg', quality: 'medium', output_compression: 50, background: 'opaque', ...(modern ? { complexity: 'medium' } : {}) }, checks: [check('接口请求', '2xx', '200'), check('图片数量', '1 张', '1 张'), check('实际编码', 'JPEG', 'PNG', 'fail'), check('精确尺寸', size, size), check('不透明背景', 'Alpha = 255', '全部像素不透明'), check('原图解码', '可完整解码', '解码成功')] };
  if (stage.id === 'webp') return { ...base, status: unavailable ? 'fail' : 'partial', http: unavailable ? 400 : 200, summary: unavailable ? '组合请求不可用 · 触发隔离复测' : '编码不符，且多图仅返回 1 张', request: { model: model.name, n: 2, size, output_format: 'webp', quality: modern ? 'high' : 'auto', output_compression: 100, ...(model.id !== '2' ? { background: 'transparent' } : {}), ...(modern ? { complexity: 'high' } : {}) }, checks: unavailable ? [check('接口请求', '2xx', '400', 'fail'), check('出图可用性', '生成 2 张图片', '未返回图片', 'fail')] : [check('接口请求', '2xx', '200'), check('实际编码', 'WebP', 'PNG', 'fail'), check('图片数量', '2 张', '1 张', 'fail'), check('精确尺寸', size, size), ...(model.id !== '2' ? [check('透明背景', '包含透明区域', '透明区域有效')] : []), check('原图解码', '可完整解码', '解码成功')] };
  if (stage.id === 'svg') return { ...base, http: unavailable ? 400 : 200, summary: unavailable ? '请求失败 · HTTP 400' : '返回位图，未检出矢量元素', request: { model: model.name, n: 1, size: '1040x1024', output_format: 'svg', quality: 'low', complexity: 'low' }, checks: unavailable ? [check('接口请求', '2xx', '400', 'fail')] : [check('接口请求', '2xx', '200'), check('实际编码', 'SVG', 'PNG', 'fail'), check('矢量结构', '包含矢量元素', '未检出', 'fail'), check('精确尺寸', '1040x1024', '1040x1024')] };
  if (stage.id === 'gif') return { ...base, status: 'pass', summary: '2 帧动画 · 所有检查通过', request: { model: model.name, size: 'auto', output_format: 'gif', quality: 'xhigh', complexity: 'low', frames: 2, frame_duration: 20 }, checks: [check('接口请求', '2xx', '200'), check('实际编码', 'GIF', 'GIF'), check('动画帧数', '2 帧', '2 帧'), check('逐帧时长', '20ms', '20ms'), check('画面变化', '帧间画面不同', '检测到变化'), check('自动尺寸', '记录实际尺寸', '1024x1024')] };
  const quality = stage.id === 'quality';
  return { ...base, summary: '应拒绝非法参数，实际返回 200', note: '硬门槛：非法参数未被拒绝，直接判定不合格。接口成功返回不代表符合参数契约。', request: { model: model.name, ...(quality ? { quality: 'ultra', size: '1024x1024' } : { size: modern ? '1016x1024' : '1537x1024' }) }, checks: [check('拒绝非法输入', '400 / 422', '200', 'fail'), check('结构化错误', 'error.message', '未返回错误', 'fail')] };
}

export const cases = models.flatMap(model => stages.filter(stage => model.version === '2.6' || !['svg', 'gif'].includes(stage.id)).map((stage, index) => createCase(model, stage, index)));
cases.push(
  { id: '26s-isolate-n', modelId: '26s', stageId: 'isolate', kind: 'retest', title: '单参数复测 · 图片数量', goal: '在最小请求中测试 n=2，其他能力参数使用默认值，排除组合参数干扰。', status: 'fail', summary: '单独设置 n=2，仍仅返回 1 张', duration: 8.4, http: 200, request: { model: 'gpt-image-2.6-sunburst', n: 2, size: '1024x1024' }, checks: [check('图片数量', '2 张', '1 张', 'fail')] },
  { id: '26s-isolate-complexity', modelId: '26s', stageId: 'isolate', kind: 'retest', title: '单参数复测 · 复杂度', goal: '在最小请求中测试 complexity=low。仅确认接收，未评估画面效果，也不能证明原请求的 high 有效。', status: 'partial', summary: '参数已接收 · 效果未评估', duration: 6.2, http: 200, request: { model: 'gpt-image-2.6-sunburst', complexity: 'low', size: '1024x1024' }, checks: [check('参数接收', '接受 complexity=low', '接收成功'), check('实际效果', '需对照采样', '未评估', 'sealed')] },
);
models.forEach(model => { model.seconds = Number(cases.filter(c => c.modelId === model.id).reduce((total, c) => total + c.duration, 0).toFixed(1)); });

export const statusLabels = { pass: '通过', fail: '失败', partial: '部分通过', sealed: '封存' };
export function filterCases({ modelIds = models.map(m => m.id), status = 'all', query = '' } = {}) {
  const term = query.trim().toLowerCase();
  return cases.filter(c => modelIds.includes(c.modelId) && (status === 'all' || (status === 'gate' ? c.gate : status === 'abnormal' ? c.status !== 'pass' : c.status === status)) && (!term || `${c.title} ${c.summary} ${c.goal} ${stages.find(s=>s.id===c.stageId)?.subtitle||''} ${models.find(m => m.id === c.modelId).name} ${Object.values(c.request||{}).join(' ')} ${c.checks.map(ch => ch.name).join(' ')}`.toLowerCase().includes(term)));
}
export function summarize(items = cases) {
  return { total: items.length, passed: items.filter(c => c.status === 'pass').length, failed: items.filter(c => c.status === 'fail').length, partial: items.filter(c => c.status === 'partial').length, retests: items.filter(c => c.kind === 'retest').length };
}
