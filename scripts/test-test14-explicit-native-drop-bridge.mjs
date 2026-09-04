import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'const _pmmWorldbookPresetDropBridge=',
  '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  'await E(n,String(e.targetId||\'\')',
  'let _pmmSectionId=o;',
  'moveItemsToSectionById(_pmmCopiedIds,_pmmSectionId',
]) {
  assert.ok(workshop.includes(marker), `test.14 工坊主程序缺少显式拖入桥：${marker}`);
}

for (const marker of [
  'async function emitNativePresetDrop(target, additions, placement = null)',
  "const targetSectionId = String(placement?.targetSectionId || '');",
  'TOP.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  'const result = await bridge.drop({',
  'if (await emitNativePresetDrop(target, additions, placement))',
]) {
  assert.ok(worldbook.includes(marker), `test.14 世界书页面缺少显式桥调用：${marker}`);
}

const bridgeCall = worldbook.indexOf('const result = await bridge.drop({');
const groupedComponent = worldbook.indexOf('if (targetSectionId)');
const saveFallback = worldbook.indexOf('await savePresetEntries(target.name, insertPresetEntries', bridgeCall);
assert.ok(groupedComponent >= 0 && bridgeCall > groupedComponent, '分组落点必须优先于旧显式桥处理');
assert.ok(saveFallback > bridgeCall, '组外直接保存兜底必须保留在显式桥之后');

const nativePlacement = worldbook.slice(
  worldbook.indexOf('function nativeDropPlacement(event)'),
  worldbook.indexOf('function worldDropPlacement(event, sideName)'),
);
for (const marker of [
  "closest?.('[data-section-id]')",
  'targetSectionId',
  "section.querySelectorAll('.prompt-item[data-prompt-id],.prompt-card[data-prompt-id]')",
  "position: 'after'",
]) {
  assert.ok(nativePlacement.includes(marker), `test.14 分组落点识别缺少实现：${marker}`);
}

const groupedDrop = worldbook.slice(
  worldbook.indexOf('async function emitNativePresetDrop(target, additions, placement = null)'),
  worldbook.indexOf('function syncVisiblePresetEntries', worldbook.indexOf('async function emitNativePresetDrop(target, additions, placement = null)')),
);
assert.ok(groupedDrop.includes('if (targetSectionId) {'), '分组落点应优先走原生组件事件');
assert.ok(groupedDrop.includes("'cross-panel-drop',\n          additions,\n          placement?.targetId || '',\n          placement?.position || 'after',\n          targetSectionId,"), '分组落点没有把所属分组传给预设面板');
assert.ok(groupedDrop.indexOf('if (targetSectionId)') < groupedDrop.indexOf('let bridge ='), '分组落点不得先走丢失分组信息的旧桥接');
assert.ok(groupedDrop.includes('已取消拖入以免条目掉到分组外'), '无法确认分组时必须取消拖入，而不是写到组外');

const transfer = worldbook.slice(
  worldbook.indexOf('async function transferToNativeTop(move, forcedKeys = null, placement = null)'),
  worldbook.indexOf('async function transferWorldToWorld', worldbook.indexOf('async function transferToNativeTop(move, forcedKeys = null, placement = null)')),
);
assert.ok(transfer.includes("if (placement?.targetSectionId) {\n        notify('error', '没有确认目标分组，已取消拖入，避免条目掉到分组外');"), '分组拖入失败时不应落入直接保存兜底');

console.log('test.14 回归通过：世界书拖入能把柏宝箱分组落点交给原生预设处理器。');
