import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.02.js', import.meta.url), 'utf8');

// 1. Static CSS & Container Query Rule Validations
const requiredMarkers = [
  'container-type: inline-size',
  '@container (max-width: 600px)',
  '#preset-manager-main-panel:not(.pmm-mobile-layout-enabled) .pm-panel-container',
  '#preset-manager-main-panel:not(.pmm-mobile-layout-enabled) .preset-panel',
  '#preset-manager-main-panel:not(.pmm-mobile-layout-enabled) .pm-header',
  'flex-wrap: wrap !important',
  'width: 100% !important',
  'margin-left: 0 !important',
  'justify-content: flex-start !important',
  'flex-wrap: nowrap !important',
  'overflow-x: auto !important',
  'flex-shrink: 0 !important',
  '.pm-panel-container--branch-mode .pm-header > .header-right',
  '.pm-panel-container--merge-mode .pm-header > .header-right',
  '.pm-panel-container--favorite-mode .pm-header > .header-right',
  'scrollbar-width: thin !important',
];

for (const marker of requiredMarkers) {
  assert.ok(source.includes(marker), `workshop-v3.02.js 缺失必要容器查询规则：${marker}`);
}

// 2. Strict Desktop Scoping & Mobile Rule Isolation Checks
assert.ok(
  source.includes('@media (min-width: 769px) {\n        #preset-manager-main-panel:not(.pmm-mobile-layout-enabled) .pm-panel-container'),
  '容器类型定义必须限定在桌面端视口 (min-width: 769px) 且排除移动端布局类'
);

assert.ok(
  source.includes(':not(.pmm-mobile-layout-enabled) .pm-header'),
  '容器查询样式必须限定桌面端，不得覆盖移动端已有样式'
);

// Verify no JS resize observer / polling was added for header responsiveness
assert.ok(
  !source.includes('ResizeObserver(entries => { for (const entry of entries) { if (entry.target.classList.contains(\'pm-header\'))'),
  '不得使用 JS ResizeObserver 监听 header 尺寸，必须基于纯 CSS Container Query'
);

// 3. Functional / Layout Rule Checks
const cqIndex = source.indexOf('@container (max-width: 600px)');
assert.notEqual(cqIndex, -1, '找不到 @container (max-width: 600px) 声明');
const cqBlock = source.slice(cqIndex, source.indexOf('}\n    `;', cqIndex) + 2);

// Check that the container query resets margin-left and aligns flex-start
assert.ok(cqBlock.includes('margin-left: 0 !important'), '第二行工具按钮必须重置 margin-left: 0');
assert.ok(cqBlock.includes('justify-content: flex-start !important'), '第二行工具按钮必须左对齐排列');
assert.ok(cqBlock.includes('width: 100% !important'), '第二行工具按钮组必须占满容器整行宽度');
assert.ok(cqBlock.includes('flex: 0 0 100% !important'), '第二行工具按钮组必须强制 flex 换行');
assert.ok(cqBlock.includes('overflow-x: auto !important'), '超窄宽度下工具按钮栏支持横向滚动兜底');
assert.ok(cqBlock.includes('flex-shrink: 0 !important'), '工具按钮尺寸必须固定，禁止被压扁');

// Check that all 4 desktop modes are covered in the container query selector
for (const modeSelector of [
  '.pm-header > .header-right',
  '.pm-panel-container--branch-mode .pm-header > .header-right',
  '.pm-panel-container--merge-mode .pm-header > .header-right',
  '.pm-panel-container--favorite-mode .pm-header > .header-right'
]) {
  assert.ok(cqBlock.includes(modeSelector), `容器查询规则未覆盖该模式：${modeSelector}`);
}

console.log('test.95 回归通过：工坊顶部 header 成功实现基于面板容器自身宽度的 Container Query 响应式调整，窄面板换行左对齐横划兜底、宽面板恢复单行、全页面模式覆盖且移动端完全隔离。');
