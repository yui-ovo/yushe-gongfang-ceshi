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

const relay = section('function relayDesktopEdgeRelease(ownerDocument, event)', 'function bindDesktopEdgeReleaseBridge(root)');
for (const snippet of [
  'const releaseDocument = legacyFloatingReleaseDocument(ownerDocument);',
  'releaseDocument === ownerDocument',
  "new MouseEventCtor('mouseup'",
  'releaseDocument.dispatchEvent',
]) {
  assert.ok(relay.includes(snippet), `桌面悬浮入口缺少 mouseup 回传行为：${snippet}`);
}

const bridge = section('function bindDesktopEdgeReleaseBridge(root)', 'function syncSelectOptions(root)');
for (const snippet of [
  "root?.querySelector?.(':scope > .edge-tab')",
  "edge.dataset.pmmDesktopEdgeReleaseBound === '1'",
  "edge.addEventListener('pointerdown'",
  "edge.addEventListener('pointerup'",
  "edge.addEventListener('pointercancel'",
  'if (isMobile()',
  "typeof ownerWindow?.PointerEvent === 'function'",
  'relayDesktopEdgeRelease(ownerDocument, event);',
  "edge.addEventListener('mouseup', ensureExpanded, true)",
  "edge.addEventListener('click', ensureExpanded, true)",
  "root.classList.add('pmm-desktop-forced-open')",
  "root.classList.remove('pmm-desktop-forced-open')",
]) {
  assert.ok(bridge.includes(snippet), `桌面悬浮入口缺少关键桥接行为：${snippet}`);
}
assert.ok(!bridge.includes('pmm-floating-mobile-open'), '桌面入口桥接不应接管手机的展开状态');
assert.ok(source.includes('.pmm-desktop-forced-open>.panel-wrapper{display:flex!important}'), '桌面入口缺少无法触发原回调时的面板显示兜底');
assert.ok(source.includes('.pmm-desktop-forced-open>.edge-tab{display:none!important}'), '桌面入口展开兜底后没有隐藏箭头');

const syncRoot = section('function syncRoot(root)', 'function sync()');
assert.ok(syncRoot.includes('bindDesktopEdgeReleaseBridge(root);'), '悬浮面板同步时没有绑定桌面入口桥接');

console.log('test.44 回归通过：桌面 iframe 内的悬浮箭头会回传 mouseup，且原回调失效时仍可显示面板，手机入口不受影响。');
