import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function maxWorldDisplayIndex(data)',
  'addition.displayIndex = ++displayIndex;',
  'const persistedTarget = await loadWorldInfoFresh(target.name);',
  "throw new Error('目标世界书保存后未找到新条目')",
  'side.data.originalData.entries = side.data.originalData.entries.filter',
  'function showWorldDropIndicator(sideName)',
  "list?.classList.add('pmm-wb-list--drop-target')",
  '.pmm-wb-list.pmm-wb-list--drop-target{box-shadow:inset 0 3px 0',
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

console.log('test.15 回归通过：世界书互传原样复制字段，按官方 UID／displayIndex 流程保存并显示目标蓝线。');
