import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'const _pmmWorldbookPresetDropBridge=',
  '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  'await E(n,String(e.targetId||\'\')',
]) {
  assert.ok(workshop.includes(marker), `test.14 工坊主程序缺少显式拖入桥：${marker}`);
}

for (const marker of [
  'async function emitNativePresetDrop(target, additions, placement = null)',
  'TOP.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  'const result = await bridge.drop({',
  'if (await emitNativePresetDrop(target, additions, placement))',
]) {
  assert.ok(worldbook.includes(marker), `test.14 世界书页面缺少显式桥调用：${marker}`);
}

const bridgeCall = worldbook.indexOf('const result = await bridge.drop({');
const componentFallback = worldbook.indexOf('const component = target?.panelComponent;', bridgeCall);
const saveFallback = worldbook.indexOf('await savePresetEntries(target.name, insertPresetEntries', componentFallback);
assert.ok(bridgeCall >= 0 && componentFallback > bridgeCall, '显式桥必须优先于旧组件事件兜底');
assert.ok(saveFallback > componentFallback, '直接保存兜底必须保留在显式桥与组件事件之后');

console.log('test.14 回归通过：世界书拖入通过工坊主程序显式桥进入原生预设缝合处理器。');
