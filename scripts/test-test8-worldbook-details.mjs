import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'data-wb-action="content-expand"',
  'function openContentEditor(sideName, key)',
  "if (action === 'content-expand') return openContentEditor(sideName, key);",
  "pushUndo(side, '编辑世界书正文'",
  '.pmm-wb-editor-overlay{position:absolute;inset:0',
  '.pmm-wb-details{padding:7px 9px 9px',
  'font-size:10.5px!important',
  '.pmm-wb-title-row .pmm-wb-strategy{align-self:flex-end;height:26px!important',
  '.pmm-wb-toggle{width:25px!important;height:14px!important',
]) {
  assert.ok(source.includes(marker), `test.8 世界书紧凑详情缺少实现：${marker}`);
}

assert.ok(
  source.includes("state.host?.querySelector('.pmm-wb-editor-overlay')?.remove();"),
  '关闭世界书页面时没有清理放大编辑层',
);

console.log('test.8 世界书详情回归通过：字号与控件紧凑，正文支持放大编辑、保存和撤销。');
