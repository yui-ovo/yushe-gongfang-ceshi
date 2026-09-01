import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

const requiredMarkers = [
  '__PMM_WORLDBOOK_SLOT_TEST1__',
  'data-pmm-worldbook-placeholder',
  "button.className = 'panel-btn pmm-worldbook-placeholder'",
  "icon.className = 'fa-solid fa-book-atlas'",
  "label.textContent = '世界书'",
  "DOC.querySelectorAll('.side-panel-root .panel-buttons')",
  'toolbar.append(button)',
  'event.preventDefault()',
  'event.stopPropagation()',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    throw new Error(`世界书占位入口缺少实现标记：${marker}`);
  }
}

if (!source.includes('.side-panel-root .panel-btn {') || !source.includes('flex: 1 1 0 !important;')) {
  throw new Error('底部工具栏没有保留固定外框内的按钮均分布局');
}

console.log('test.1 世界书占位入口检查通过。');
