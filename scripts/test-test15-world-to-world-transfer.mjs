import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function worldInsertionIndex(entries, placement = null)',
  'function insertWorldEntries(target, sourceKind, entries, placement = null)',
  'ordered.splice(insertionIndex, 0, ...added);',
  'entry.displayIndex = index;',
  'const persistedTarget = await loadWorldInfoFresh(target.name);',
  "throw new Error('目标世界书保存后未找到新条目')",
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

const saveIndex = source.indexOf('await saveWorldSide(target);', source.indexOf('async function transferWorldToWorld'));
const verifyIndex = source.indexOf('const persistedTarget = await loadWorldInfoFresh(target.name);', saveIndex);
const successIndex = source.indexOf("notify('success', `已${move ? '移动' : '复制'}", verifyIndex);
assert.ok(saveIndex >= 0 && verifyIndex > saveIndex && successIndex > verifyIndex, '成功提示必须位于目标世界书落盘复查之后');

console.log('test.15 回归通过：世界书互传原样复制字段，并按蓝色条目落点线重排 displayIndex 后复查落盘结果。');
