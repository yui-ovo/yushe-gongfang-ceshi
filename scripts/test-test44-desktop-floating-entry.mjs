import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位：${startMarker}`);
  return source.slice(start, end);
}

const releaseDocument = section('function legacyFloatingReleaseDocument(ownerDocument)', 'function bindDesktopEdgeReleaseBridge(root)');
assert.ok(releaseDocument.includes('SELF.frameElement ? SELF.parent.document : ownerDocument'), '没有按原悬浮面板的父页面规则取得 mouseup 接收方');

const bridge = section('function bindDesktopEdgeReleaseBridge(root)', 'function syncSelectOptions(root)');
for (const snippet of [
  "root?.querySelector?.(':scope > .edge-tab')",
  "edge.dataset.pmmDesktopEdgeReleaseBound === '1'",
  "edge.addEventListener('mouseup'",
  'if (isMobile()',
  'const releaseDocument = legacyFloatingReleaseDocument(ownerDocument);',
  'releaseDocument === ownerDocument',
  "new MouseEventCtor('mouseup'",
  'releaseDocument.dispatchEvent',
]) {
  assert.ok(bridge.includes(snippet), `桌面悬浮入口缺少关键桥接行为：${snippet}`);
}
assert.ok(!bridge.includes('pmm-floating-mobile-open'), '桌面入口桥接不应接管手机的展开状态');

const syncRoot = section('function syncRoot(root)', 'function sync()');
assert.ok(syncRoot.includes('bindDesktopEdgeReleaseBridge(root);'), '悬浮面板同步时没有绑定桌面入口桥接');

console.log('test.44 回归通过：桌面 iframe 内的悬浮箭头会把 mouseup 回传给原处理器，手机入口不受影响。');
