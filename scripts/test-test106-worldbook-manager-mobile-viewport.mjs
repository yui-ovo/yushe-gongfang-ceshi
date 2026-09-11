import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');
const snapshotSource = fs.readFileSync(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');

assert.ok(source.includes("host.classList.add('pmm-worldbook-browser-viewport');"), '普通手机浏览器应启用世界书管理可视区类');
assert.ok(source.includes("position:'absolute', inset:'auto', left:`${pageLeft}px`, top:`${pageTop}px`"), '世界书管理根节点应使用页面坐标避开失效的 fixed 定位链');
assert.ok(source.includes("height:`${visibleHeight}px`, 'min-height':`${visibleHeight}px`, 'max-height':`${visibleHeight}px`"), '世界书管理根节点应取得明确的像素高度');
assert.ok(source.includes("const panelHeight = Math.max(1, Math.floor(visibleHeight - verticalPadding));"), '双栏容器高度应从可视区扣除遮罩内边距');
assert.ok(source.includes("grid-template-rows:minmax(0,1fr) var(--pmm-toolbar-h,40px) minmax(0,1fr)!important"), '移动浏览器应强制恢复上下双栏网格');
assert.ok(source.includes("if (IS_TAURI) return false;"), 'Tauri 的正常 WebView 布局不得被浏览器补丁改写');
assert.ok(source.includes("setStatus('读取世界书…');\n    renderPanels();\n    bindMobileWorldbookViewport();"), '异步读取世界书前应先渲染可见骨架并绑定可视区');
assert.ok(source.includes('worldbookViewportCleanup?.();'), '关闭世界书管理时必须清理可视区监听与内联尺寸');

assert.ok(!snapshotSource.includes('const useFixedKeyboardViewport = isIOS && keyboardTarget && !!vv;'), 'test.42 误改的世界书快照定位逻辑应完整撤回');

console.log('test.43 worldbook manager mobile viewport regression checks passed');
