import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
for (const marker of [
  "text: '空变量项指：只有变量名，里面没有内容的变量。例如：'",
  "example: `{{setvar::${text(variableName) || '变量名'}:: }}`",
  'class="pmm-variable-note"',
  '.pmm-variable-note{margin:0',
  'font-size:9px',
  'font-style:italic',
  '.pmm-variable-note code{font-family:ui-monospace',
  'font-style:normal',
  'emptyVariableNote(oldName)',
  'emptyVariableNote()',
  'emptyVariableNote(noteVariableName)',
  'test.22 已加载：空变量项改为顶部小字示例',
]) {
  assert.ok(source.includes(marker), `test.22 顶部空变量说明缺少实现：${marker}`);
}

const renameStart = source.indexOf('async function batchRenameSelectedVariables');
const stripEnd = source.indexOf('function updateBasketBadges', renameStart);
assert.ok(renameStart >= 0 && stripEnd > renameStart, '无法定位变量弹窗文案');
const uiCopy = source.slice(renameStart, stripEnd);
assert.ok(
  uiCopy.includes('旧 G（已找到 ${preview.oldGetOccurrences} 处）和旧的同名空变量项（已找到 ${preview.oldEmptySetOccurrences} 处）'),
  '部分改名没有把 G 与空变量项数量合并进说明',
);
assert.ok(
  uiCopy.includes('G（已找到 ${preview.oldGetOccurrences} 处）和同名空变量项（已找到 ${preview.oldEmptySetOccurrences} 处）都会一起改成'),
  '完整改名没有把 G 与空变量项数量合并进说明',
);
assert.ok(!uiCopy.includes('（只有变量名，无内容）'), '按钮说明中不应继续出现突兀的括号解释');

console.log('test.22 回归通过：三个变量弹窗顶部显示小号斜体定义与等宽示例，选项正文已精简。');
