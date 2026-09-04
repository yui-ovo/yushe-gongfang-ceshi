import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'const _pmmWorldbookPresetDropBridge=',
  '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  "const n=Array.isArray(e.entries)?e.entries:[],t=String(e.targetSectionId||'');",
  "await E(n,String(e.targetId||''),'before'===e.position?'before':'after',t||void 0,void 0,!1)",
  'let _pmmSectionId=o;',
  'moveItemsToSectionById(_pmmCopiedIds,_pmmSectionId',
]) {
  assert.ok(workshop.includes(marker), `test.14 工坊主程序缺少显式拖入桥：${marker}`);
}

for (const marker of [
  'async function emitNativePresetDrop(target, additions, placement = null)',
  "const targetSectionId = String(placement?.targetSectionId || '');",
  'placement?.targetPanelComponent || target?.panelComponent',
  "...panel.querySelectorAll('.prompt-panel, .prompt-panel *')",
  "name === 'PromptPanel'",
  'source.onCrossPanelDrop',
  'targetDropHandler',
  'TOP.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  'const result = await bridge.drop({',
  'if (await emitNativePresetDrop(target, additions, placement))',
]) {
  assert.ok(worldbook.includes(marker), `test.14 世界书页面缺少显式桥调用：${marker}`);
}

const bridgeCall = worldbook.indexOf('const result = await bridge.drop({');
const groupedComponent = worldbook.indexOf('if (targetSectionId)');
const saveFallback = worldbook.indexOf('await savePresetEntries(target.name, insertPresetEntries', bridgeCall);
assert.ok(groupedComponent >= 0 && bridgeCall >= 0 && bridgeCall < groupedComponent, '分组落点必须优先通过工坊核心桥处理');
assert.ok(saveFallback > bridgeCall, '组外直接保存兜底必须保留在显式桥之后');

const nativePlacement = worldbook.slice(
  worldbook.indexOf('function nativeDropPlacement(event)'),
  worldbook.indexOf('function worldDropPlacement(event, sideName)'),
);
const nativeSection = worldbook.slice(
  worldbook.indexOf('function nativeDropSectionFromNode(node)'),
  worldbook.indexOf('function nativeDropPlacement(event)'),
);
for (const marker of [
  "[data-section-id],[data-preset-group-id]",
  "rawBaiBaiGroupId.startsWith('baibai_') ? rawBaiBaiGroupId : `baibai_${rawBaiBaiGroupId}`",
]) {
  assert.ok(nativeSection.includes(marker), `test.14 柏宝箱原生分组识别缺少实现：${marker}`);
}
const nativeTarget = worldbook.slice(
  worldbook.indexOf('function nativeDropTargetId(id)'),
  worldbook.indexOf('function nativeDropPlacement(event)'),
);
assert.ok(nativeTarget.includes('return nativeIds.has(candidate) ? candidate : \'\';'), 'test.14 必须过滤柏宝箱 UI 专用条目 ID，避免原生处理器静默中止');
for (const marker of [
  '[data-pm-identifier]',
  'targetSectionId',
  'const targetDispatcher = nativePresetDropDispatcher();',
  'const targetPanelComponent = targetDispatcher?.component || null;',
  'targetPanelComponent,',
  'nativeDropTargetId(card?.dataset?.promptId || card?.dataset?.pmIdentifier || \'\')',
  "section.querySelectorAll('.prompt-item[data-prompt-id],.prompt-card[data-prompt-id],[data-pm-identifier]')",
  'nativeDropSectionFromNode(item).section === section',
  "position: 'after'",
]) {
  assert.ok(nativePlacement.includes(marker), `test.14 分组落点识别缺少实现：${marker}`);
}

const groupedDrop = worldbook.slice(
  worldbook.indexOf('async function emitNativePresetDrop(target, additions, placement = null)'),
  worldbook.indexOf('function syncVisiblePresetEntries', worldbook.indexOf('async function emitNativePresetDrop(target, additions, placement = null)')),
);
assert.ok(groupedDrop.includes('if (targetSectionId) {'), '核心桥不可用时，分组落点应保留原生组件事件兜底');
assert.ok(groupedDrop.includes('placement?.targetPanelComponent || target?.panelComponent'), '核心桥失败时，分组落点必须能回退到工坊的原生拖入组件');
assert.ok(groupedDrop.includes('targetSectionId,'), '分组落点必须把分组 ID 交给工坊核心桥');
assert.ok(groupedDrop.includes("if (typeof dropHandler === 'function') await dropHandler(...args);"), '分组落点必须直接调用已发现的工坊拖入处理器');
assert.ok(groupedDrop.includes("placement?.position || 'after',\n          targetSectionId,\n          undefined,"), '分组落点没有把所属分组传给预设面板');
assert.ok(groupedDrop.indexOf('let bridge =') < groupedDrop.indexOf('if (targetSectionId)'), '分组落点必须先走携带分组 ID 的工坊核心桥');
assert.ok(groupedDrop.includes('未取得目标分组对应的工坊原生桥或预设面板'), '无法取得原生处理器时必须取消拖入，而不是写到组外');

const transfer = worldbook.slice(
  worldbook.indexOf('async function transferToNativeTop(move, forcedKeys = null, placement = null)'),
  worldbook.indexOf('async function transferWorldToWorld', worldbook.indexOf('async function transferToNativeTop(move, forcedKeys = null, placement = null)')),
);
assert.ok(transfer.includes("if (placement?.targetSectionId) {\n        notify('error', '目标分组已识别，但未取得工坊拖入处理器；已取消拖入以避免条目掉到组外');"), '分组拖入失败时不应落入直接保存兜底');

console.log('test.14 回归通过：世界书拖入会把柏宝箱分组 ID 交给与预设拖入共用的工坊核心桥。');
