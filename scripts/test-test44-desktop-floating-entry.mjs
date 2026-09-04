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
assert.ok(!source.includes('pmmDesktopEdgeReleaseBound'), '电脑端残留了旧的跨文件 mouseup 桥接');
assert.ok(!source.includes('pmm-desktop-forced-open'), '电脑端残留了旧的根节点强制展开样式');
const desktopDirect = section('function bindDesktopDirectEntry(currentDocument)', 'function syncRoot(root)');
for (const snippet of [
  "currentDocument.addEventListener('pointerup', finish, true)",
  "currentDocument.addEventListener('click', click, true)",
  "activePress.root.classList.add('pmm-desktop-direct-open')",
  "collapseRoot.classList.remove('pmm-desktop-direct-open')",
  'if (activePress.moved) return;',
]) {
  assert.ok(desktopDirect.includes(snippet), `桌面独立入口缺少关键行为：${snippet}`);
}
assert.ok(source.includes('.pmm-desktop-direct-open>.panel-wrapper{display:flex!important}'), '桌面独立入口没有显示工具栏');
assert.ok(source.includes('.pmm-desktop-direct-open>.edge-tab{display:none!important}'), '桌面独立入口展开后没有隐藏箭头');
assert.ok(syncRoot.includes("root.classList.remove('pmm-desktop-direct-open');"), '切到手机端时没有清除电脑入口状态');

console.log('test.44 回归通过：电脑端使用跨 document 的独立短按入口，拖动和手机入口均不受影响。');
