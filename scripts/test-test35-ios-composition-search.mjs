import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function worldSearchView(side)',
  'function renderWorldListMarkup(sideName, side, view)',
  'function refreshWorldSearchResults(sideName)',
  'list.innerHTML = renderWorldListMarkup(sideName, side, view);',
  "resetWorldSearch(input.dataset.wbSide);",
]) {
  assert.ok(source.includes(marker), `test.35 缺少 iOS 搜索输入保活实现：${marker}`);
}

const inputHandlerStart = source.indexOf('function onDocumentInput(event)');
const inputHandlerEnd = source.indexOf('function installStyle()', inputHandlerStart);
assert.ok(inputHandlerStart >= 0 && inputHandlerEnd > inputHandlerStart, '找不到世界书搜索输入处理器');
const inputHandler = source.slice(inputHandlerStart, inputHandlerEnd);
assert.equal(inputHandler.includes('renderPanels()'), false, '每次输入仍会重建整张世界书卡片，iOS 中文输入法会被打断');
assert.equal(inputHandler.includes('refocus: true'), false, '每次输入不应通过重新聚焦恢复键盘');

console.log('test.35 回归通过：世界书搜索输入只刷新结果区，iOS 中文输入法不会因重建输入框中断。');
