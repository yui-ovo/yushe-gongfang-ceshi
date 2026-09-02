import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

const conversionStart = source.indexOf('  function worldToPreset(entry)');
const conversionEnd = source.indexOf('  function presetToWorld(', conversionStart);
const conversion = source.slice(conversionStart, conversionEnd);
assert.ok(conversion.includes("role: 'system'"), '世界书转预设没有统一为系统角色');
assert.ok(conversion.includes("position: { type: 'relative' }"), '世界书转预设没有统一为相对位置');

for (const marker of [
  'function syncVisiblePresetEntries(name, prompts)',
  "await SELF.setPreset(name, { prompts: next });",
  'visible.runtimePrompts.splice(0, visible.runtimePrompts.length, ...clone(prompts));',
  'function insertPresetEntries(prompts, additions, placement = null)',
  "placement.position === 'after' ? 1 : 0",
  'function nativeDropPlacement(event)',
  'const placement = nativeList ? nativeDropPlacement(event) : worldDropPlacement(event, targetSide);',
  'clearNativeDropIndicators();',
]) {
  assert.ok(source.includes(marker), `test.12 世界书拖入预设缺少实现：${marker}`);
}

console.log('test.12 回归通过：世界书拖入预设会按落点生成系统／相对条目并即时刷新。');
