import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位：${startMarker}`);
  return source.slice(start, end);
}

const standalone = section("const PMM_ID = 'pm-standalone-mobile-v1';", '/* ===== 个人测试通道：底部工具栏“世界书”入口 ===== */');
const makeFab = section('function makeFab(doc)', 'function visiblePanelContainer(doc)');
const scan = section('function scan(doc)', 'docs.forEach(doc => {');

for (const snippet of [
  'const topDoc = (() => {',
  'const docs = [...new Set([document, parentDoc, topDoc].filter(Boolean))];',
  '@media screen and (min-width: 769px)',
  '#pm-mobile-fab-standalone {',
  '#preset-manager-floating-panel {',
]) {
  assert.ok(standalone.includes(snippet), `桌面没有复用独立入口：${snippet}`);
}

assert.ok(
  makeFab.includes('if (!doc || !doc.body || !fabRuntimeIsCurrent() || !fabIsEnabled()) return;'),
  '独立入口仍被错误限制为手机宽度',
);
assert.ok(makeFab.includes('[topDoc, parentDoc, doc, document]'), '独立入口没有在顶层页面查找主面板');
assert.ok(makeFab.includes('const hostDoc = topDoc?.body ? topDoc : parentDoc;'), '独立入口没有把主面板挂到顶层页面');
assert.ok(scan.indexOf('makeFab(doc);') < scan.indexOf('if (!isMobile()) return;'), '桌面扫描没有创建独立入口');

for (const obsoleteSnippet of [
  'pmmDesktopEdgeReleaseBound',
  'pmm-desktop-forced-open',
  'pmm-desktop-direct-open',
  'bindDesktopDirectEntry',
  'pmmDesktopDirectEntryBound',
]) {
  assert.ok(!source.includes(obsoleteSnippet), `仍残留旧桌面箭头补丁：${obsoleteSnippet}`);
}

console.log('test.44 回归通过：桌面已复用手机独立入口，旧悬浮面板箭头不再参与交互。');
