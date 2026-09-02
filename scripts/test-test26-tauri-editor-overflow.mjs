import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../patches/test26-tauri-editor-overflow.js', import.meta.url), 'utf8');

assert.ok(source.includes(runtime.trim()), 'test.27 Tauri iOS 防溢出补丁没有进入业务入口');
assert.ok(runtime.includes('PMM_TAURI_EDITOR_OVERFLOW_TEST27'), '缺少 test.27 运行标记');

const tauriRead = runtime.indexOf('scope?.__TAURI_RUNNING__ === true');
const hardGuard = runtime.indexOf('if (!tauriDetected || !isIOS) return;');
const styleInstall = runtime.indexOf('function installStyle()');
assert.ok(tauriRead >= 0 && hardGuard > tauriRead && styleInstall > hardGuard, '必须在安装任何样式与监听前硬隔离非 Tauri iOS 环境');
assert.ok(runtime.includes('/iPad|iPhone|iPod/i.test(ua)'), '缺少 Tauri iOS 平台识别');
assert.ok(runtime.includes('scope?.__TAURITAVERN__'), '必须兼容完整平台 ABI 标记');
assert.ok(runtime.includes('for (const scope of [TOP, window])'), '必须同时识别顶层窗口与脚本当前窗口');

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
  assert.ok(runtime.includes(marker), `test.27 缺少实现：${marker}`);
}

assert.ok(runtime.includes("header.classList.toggle(COMPACT_CLASS, needsCompactLayout(header))"), '字符数与全屏键必须只在真实放不下时换行');
assert.ok(runtime.includes("DOC.documentElement.classList.remove(ROOT_CLASS)"), '清理时必须移除 Tauri iOS 专用根样式');
assert.ok(runtime.includes('test.27 已加载：已通过 Tauri 早期标记'), '缺少 test.27 加载标记');

console.log('test.27 回归通过：早期 Tauri 标记可启动 iOS 防裁切，普通浏览器保持硬隔离。');
