import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function isUnsupportedPresetToWorldDrop(targetSide)',
  "return state.topType === 'preset' && dragPayload?.from === 'top' && targetSide === 'bottom';",
  'function setUnsupportedPresetToWorldDrop(event, unsupported)',
  "event.dataTransfer.dropEffect = 'none';",
  "notify('info', '当前仅支持世界书条目拖入预设');",
  "activeChip.dataset.pmmWbMultiDragForbidden = 'true';",
  "label.textContent = '不支持拖入';",
  '.pmm-wb-multi-drag-float[data-pmm-wb-multi-drag-forbidden="true"]',
]) {
  assert.ok(source.includes(marker), `test.42 单向拖入缺少实现：${marker}`);
}

const dragOver = source.slice(
  source.indexOf('function onDragOver(event)'),
  source.indexOf('function onDragMove(event)'),
);
const dragOverGuard = dragOver.indexOf('if (isUnsupportedPresetToWorldDrop(targetSide))');
const sameSideGuard = dragOver.indexOf('if (!targetSide || targetSide === dragPayload.from)');
assert.ok(dragOverGuard >= 0 && sameSideGuard > dragOverGuard, '预设拖到下方世界书必须在通用跨卡片处理前被拦截');
assert.ok(dragOver.slice(dragOverGuard, sameSideGuard).includes("dropEffect = 'none'"), '禁用落点必须请求浏览器显示禁止拖放状态');
assert.ok(dragOver.slice(dragOverGuard, sameSideGuard).includes('clearWorldDropIndicators();'), '禁用落点不得显示世界书插入线');

const drop = source.slice(
  source.indexOf('function onDrop(event)'),
  source.indexOf('function onDocumentClick(event)'),
);
const dropGuard = drop.indexOf('if (isUnsupportedPresetToWorldDrop(targetSide))');
const transfer = drop.indexOf('void transfer(payload.from, false, payload.keys, placement);');
assert.ok(dropGuard >= 0 && transfer > dropGuard, '禁用落点必须在通用 transfer 前拦截');
assert.ok(!drop.slice(dropGuard, transfer).includes('void transfer('), '预设拖到世界书时不得写入任何世界书条目');

console.log('test.42 回归通过：预设可在上方内部整理，但拖到下方世界书时显示禁止并取消。');
