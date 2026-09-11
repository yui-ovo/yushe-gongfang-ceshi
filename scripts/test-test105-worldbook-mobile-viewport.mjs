import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');
const start = source.indexOf('function bindViewport()');
const end = source.indexOf('function say(', start);
assert.ok(start >= 0 && end > start, '无法定位世界书可视区适配逻辑');
const viewport = source.slice(start, end);

for (const marker of [
  'const isIOS = /iPad|iPhone|iPod/i.test(userAgent)',
  'const useFixedKeyboardViewport = isIOS && keyboardTarget && !!vv',
  "position:useFixedKeyboardViewport?'fixed':'absolute'",
  'vv?.pageLeft',
  'vv?.pageTop',
  'TOP.scrollX || TOP.pageXOffset || 0',
  'TOP.scrollY || TOP.pageYOffset || 0',
  'for (const delay of [80, 180, 360])',
  "[overlay, 'focusin', settleViewport]",
  "[overlay, 'focusout', settleViewport]",
  'settleTimers.clear()',
]) {
  assert.ok(viewport.includes(marker), `世界书 iOS 可视区修复缺少：${marker}`);
}

assert.ok(!viewport.includes("const values={position:'fixed'"), '世界书弹窗仍在普通状态强制使用 fixed');
assert.ok(viewport.includes("overlay.style.setProperty('--wbs-visible-height', `${visibleHeight}px`, 'important');"), '世界书真实可视高度变量没有可靠覆盖主题样式');
assert.ok(viewport.includes('if (!overlay?.isConnected) return;'), '关闭弹窗后延迟视口更新仍可能操作旧节点');

console.log('test.42 回归通过：世界书弹窗复用预设的手机页面坐标定位，首次打开和键盘切换均会延迟校准。');
