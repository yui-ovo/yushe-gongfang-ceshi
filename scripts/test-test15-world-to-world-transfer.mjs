import assert from 'node:assert/strict';
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

console.log('test.15 回归通过：世界书互传原样复制字段，并按蓝色落点线重排 displayIndex 后标记为待保存草稿。');
