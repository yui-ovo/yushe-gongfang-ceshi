import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function worldInsertionIndex(entries, placement = null)',
  'function insertWorldEntries(target, sourceKind, entries, placement = null)',
  'ordered.splice(insertionIndex, 0, ...added);',
  'entry.displayIndex = index;',
  'markWorldDraftDirty(target);',
  'side.data.originalData.entries = side.data.originalData.entries.filter',
  'function showWorldDropIndicator(sideName, placement)',
  "card.classList.add(placement?.position === 'before'",
  '.pmm-wb-entry--drop-before::before,.pmm-wb-entry--drop-after::after',
  'function reorderWorldEntriesForDisplay(entries, keys, placement = null)',
  'async function reorderWorldEntries(sideName, keys, placement = null)',
  "pushUndo(side, '调整世界书显示顺序'",
  "await enqueue('调整世界书显示顺序'",
  "event.dataTransfer.dropEffect = 'move'",
]) {
  assert.ok(source.includes(marker), `test.15 世界书互传缺少实现：${marker}`);
}

const cloneStart = source.indexOf('function worldToWorld(entry, data)');
const cloneEnd = source.indexOf('\n  }', cloneStart);
const cloneBody = source.slice(cloneStart, cloneEnd);
assert.ok(cloneBody.includes('...clone(entry)'), '世界书互传必须完整克隆原条目');
assert.ok(!cloneBody.includes('WORLD_DEFAULTS'), '世界书互传不能用默认模板覆盖原条目字段');

const transferStart = source.indexOf('async function transferWorldToWorld');
const transferEnd = source.indexOf('async function transfer(fromName', transferStart);
const transfer = source.slice(transferStart, transferEnd);
assert.ok(transfer.includes('markWorldDraftDirty(target);'), '世界书互传后没有标记目标世界书为未保存草稿');
assert.ok(!transfer.includes('saveWorldSide('), '世界书互传不应在点击保存前写入世界书文件');
assert.ok(!transfer.includes('loadWorldInfoFresh('), '世界书互传不应重新读取并覆盖当前草稿');

const entryKeyStart = source.indexOf('function entryKey(entry)');
const entryKeyEnd = source.indexOf('function entryTitle(entry)', entryKeyStart);
const insertionStart = source.indexOf('function worldInsertionIndex(entries, placement = null)');
const insertionEnd = source.indexOf('function setStatus(text)', insertionStart);
const reorderStart = source.indexOf('function reorderWorldEntriesForDisplay(entries, keys, placement = null)');
const reorderEnd = source.indexOf('async function reorderWorldEntries(sideName, keys, placement = null)', reorderStart);
assert.ok(entryKeyStart >= 0 && entryKeyEnd > entryKeyStart, '无法定位世界书条目键逻辑');
assert.ok(insertionStart >= 0 && insertionEnd > insertionStart, '无法定位世界书落点逻辑');
assert.ok(reorderStart >= 0 && reorderEnd > reorderStart, '无法定位同书显示排序逻辑');
const displayReorderApi = vm.runInNewContext(
  `(() => {
    ${source.slice(entryKeyStart, entryKeyEnd)}
    ${source.slice(insertionStart, insertionEnd)}
    ${source.slice(reorderStart, reorderEnd)}
    return { reorderWorldEntriesForDisplay };
  })()`,
  { Array, Set, String, Number, Math },
);
const displayEntries = [
  { uid:0, displayIndex:20, order:2, comment:'A' },
  { uid:1, displayIndex:21, order:96, comment:'B' },
  { uid:2, displayIndex:22, order:50, comment:'C' },
  { uid:3, displayIndex:23, order:100, comment:'D' },
];
const reordered = displayReorderApi.reorderWorldEntriesForDisplay(
  displayEntries,
  ['2', '3'],
  { targetKey:'0', position:'before' },
);
assert.deepEqual(
  Array.from(reordered, entry => entry.comment),
  ['C', 'D', 'A', 'B'],
  '同一本世界书多选拖动没有保持选中条目的相对顺序并放到指定位置',
);
assert.deepEqual(
  Array.from(reordered, entry => entry.displayIndex),
  [20, 21, 22, 23],
  '同一本世界书重排没有只连续整理显示顺序',
);
assert.deepEqual(
  Array.from(reordered, entry => entry.order),
  [50, 100, 2, 96],
  '同一本世界书拖动错误地改写了酒馆实际注入顺序',
);
assert.equal(
  displayReorderApi.reorderWorldEntriesForDisplay(reordered, ['2'], { targetKey:'2', position:'before' }),
  null,
  '拖到自身上不应产生无意义的重排',
);

console.log('test.15 回归通过：世界书互传及同书内重排均只调整 displayIndex，不会改写酒馆实际注入顺序。');
