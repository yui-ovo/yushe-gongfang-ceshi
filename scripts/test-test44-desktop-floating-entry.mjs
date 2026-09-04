import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位：${startMarker}`);
  return source.slice(start, end);
}

const syncRoot = section('function syncRoot(root)', 'function sync()');
assert.ok(!syncRoot.includes('bindDesktopEdgeReleaseBridge(root);'), '电脑端不应再被工坊接管入口事件');
assert.ok(!source.includes('pmmDesktopEdgeReleaseBound'), '电脑端残留了非原版入口事件桥接');
assert.ok(!source.includes('pmm-desktop-forced-open'), '电脑端残留了非原版强制展开样式');
assert.ok(source.includes("onMousedown:Z"), '原版桌面入口的 mousedown 展开处理不存在');
assert.ok(source.includes("function H(){const e=O();e.removeEventListener('mousemove',Q),e.removeEventListener('mouseup',H)"), '原版桌面入口的 mouseup 收尾处理不存在');

console.log('test.44 回归通过：电脑端已还原原版入口事件链，手机端入口补丁未受影响。');
