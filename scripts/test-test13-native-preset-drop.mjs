import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'panelComponent: null',
  "if (!panelComponent && foundPrompts && typeof component.emit === 'function') panelComponent = component;",
  'async function emitNativePresetDrop(target, additions, placement = null)',
  "component.emit(\n        'cross-panel-drop'",
  'if (await emitNativePresetDrop(target, additions, placement))',
  "console.warn('[世界书缝合] 原生预设拖入链路不可用，改用直接保存兜底'",
]) {
  assert.ok(source.includes(marker), `test.13 原生预设拖入缺少实现：${marker}`);
}

const nativePath = source.indexOf('if (await emitNativePresetDrop(target, additions, placement))');
const fallbackPath = source.indexOf("await savePresetEntries(target.name, insertPresetEntries", nativePath);
assert.ok(nativePath >= 0 && fallbackPath > nativePath, '直接保存兜底必须位于原生跨卡片链路之后');

console.log('test.13 回归通过：世界书条目会交给上方预设组件原生跨卡片事件处理。');
