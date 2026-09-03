import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function openTextEditor({ host, title, original, sourceField, themeNodes, ariaLabel, onSave, searchable = false })',
  'function openPresetContentEditor(button)',
  "event.target.closest?.('.prompt-editor__expand-btn')",
  'event.stopImmediatePropagation?.();',
  "sourceField.dispatchEvent(new TOP.Event('input', { bubbles: true }))",
  "sourceField.dispatchEvent(new TOP.Event('change', { bubbles: true }))",
  "DOC.addEventListener('click', onPresetExpandClick, true);",
  "DOC.removeEventListener('click', onPresetExpandClick, true);",
  'width:min(92%,660px);height:min(82%,680px)',
  'width:94%;height:82%;max-height:calc(100dvh - 24px)',
]) {
  assert.ok(source.includes(marker), `test.11 预设正文放大编辑缺少实现：${marker}`);
}

assert.ok(
  source.indexOf("DOC.addEventListener('click', onPresetExpandClick, true);")
    < source.indexOf("DOC.addEventListener('click', onDocumentClick, true);"),
  '预设放大入口应先于通用点击处理，以拦截原生全屏编辑器',
);

console.log('test.11 回归通过：预设与世界书共用只含正文的留边编辑框，并保留保存与撤销链路。');
