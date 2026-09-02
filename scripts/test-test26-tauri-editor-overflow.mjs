import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../patches/test26-tauri-editor-overflow.js', import.meta.url), 'utf8');

assert.ok(source.includes(runtime.trim()), 'test.26 Tauri iOS 防溢出补丁没有进入业务入口');
assert.ok(runtime.includes('PMM_TAURI_EDITOR_OVERFLOW_TEST26'), '缺少 test.26 运行标记');

const tauriRead = runtime.indexOf('TOP.__TAURITAVERN__');
const hardGuard = runtime.indexOf('if (!tauriHost || !isIOS) return;');
const styleInstall = runtime.indexOf('function installStyle()');
assert.ok(tauriRead >= 0 && hardGuard > tauriRead && styleInstall > hardGuard, '必须在安装任何样式与监听前硬隔离非 Tauri iOS 环境');
assert.ok(runtime.includes('/iPad|iPhone|iPod/i.test(ua)'), '缺少 Tauri iOS 平台识别');

for (const marker of [
  'html.${ROOT_CLASS} ${PANEL_SELECTOR} .prompt-editor',
  'width: calc(100% - 20px) !important',
  'margin-right: 20px !important',
  'white-space: pre-wrap !important',
  'overflow-wrap: anywhere !important',
  'word-break: break-word !important',
  'overflow-x: hidden !important',
  'grid-template-areas:',
  '"label-icon label tools tools"',
  '". . count expand" !important',
  'element.scrollWidth',
  'header.clientWidth + 1',
  'new win.ResizeObserver(schedule)',
  'new win.MutationObserver(schedule)',
]) {
  assert.ok(runtime.includes(marker), `test.26 缺少实现：${marker}`);
}

assert.ok(runtime.includes("header.classList.toggle(COMPACT_CLASS, needsCompactLayout(header))"), '字符数与全屏键必须只在真实放不下时换行');
assert.ok(runtime.includes("DOC.documentElement.classList.remove(ROOT_CLASS)"), '清理时必须移除 Tauri iOS 专用根样式');
assert.ok(runtime.includes('test.26 已加载：TauriTavern iOS'), '缺少 test.26 加载标记');

console.log('test.26 回归通过：旧版编辑器防裁切只作用于 Tauri iOS，内容标题仅在真实溢出时换行。');
