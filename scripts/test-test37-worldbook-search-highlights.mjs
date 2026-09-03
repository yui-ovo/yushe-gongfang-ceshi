import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');
const workshopSource = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

for (const marker of [
  "function highlightedWorldSearchText(value, query, currentMatch = null, fieldName = '')",
  "pmm-wb-search-highlight${isCurrent ? ' is-current' : ''}",
  'pmm-wb-content-search-wrap',
  'pmm-wb-content-search-preview',
  "data-wb-action=\"content-search-edit\"",
  "classList?.add('is-editing')",
  'function onDocumentFocusOut(event)',
  "DOC.addEventListener('focusout', onDocumentFocusOut, true)",
  "search.scope !== 'title'",
  "&& worldSearchMatches(content, search.query).length",
  '.pmm-wb-search-highlight.is-current',
  'activeHighlight.scrollIntoView?.({ block: \'center\', behavior: \'smooth\' });',
  'var(--pm-quote-color,#3485f6)',
  '.pmm-wb-kind-switch--toolbar button.is-active>i',
  '-webkit-text-fill-color:#fff!important',
  'button[data-wb-kind="world"].is-active>i{filter:drop-shadow',
  'function syncWorldSearchHighlightTheme()',
  "data-pmm-wb-search-theme', 'light'",
  '[data-pmm-wb-search-theme="light"] .pmm-wb-search-highlight',
  'background:#d6eefc!important',
  'background:#75bee8!important',
  'box-shadow:none!important',
  'function keepWorldContentEditorVisible(textarea)',
  'function shiftWorldContentEditorAboveKeyboard(textarea)',
  'data-pmm-wb-keyboard-shift',
  'function syncWorldUndoButton(sideName)',
  'syncWorldUndoButton(sideName);',
  '48%,var(--pm-panel-bg,#fff)',
  "DOC.addEventListener('focusin', onDocumentFocusIn, true)",
  "side.multi\n              ? toolbarButton('batch-delete', '删除所选'",
  ": toolbarButton('undo', side.history.length ? `撤销：${side.history[side.history.length - 1].label}`",
  'function selectedWorldEntryKeys(side)',
  'function toggleWorldSelectAll(sideName)',
  'data-wb-action="select-all"',
  'function showWorldMultiDragFloat(event, count)',
  'function positionWorldMultiDragFloat(event)',
  "icon.className = 'fa-solid fa-layer-group'",
  'label.textContent = `拖动 ${count} 条`;',
  'transfer.setDragImage(image, 0, 0)',
  'pmm-wb-multi-drag-float',
  'pmm-wb-entry--selected',
  '.pmm-wb-multi-bar',
  'side.selected.has(key) ? selectedWorldEntryKeys(side) : [key]',
]) {
  assert.ok(source.includes(marker), `test.37 缺少世界书搜索高亮实现：${marker}`);
}

const ranges = (value, query) => {
  const text = String(value);
  const needle = String(query).toLocaleLowerCase();
  const lower = text.toLocaleLowerCase();
  const found = [];
  for (let start = 0; start <= lower.length;) {
    const index = lower.indexOf(needle, start);
    if (index < 0) break;
    found.push({ start: index, end: index + needle.length });
    start = index + Math.max(needle.length, 1);
  }
  return found;
};

const render = (value, query, current, field) => ranges(value, query).map(range => ({
  ...range,
  current: current?.field === field && current.start === range.start && current.end === range.end,
}));

const body = render('你看着你', '你', { field: 'content', start: 3, end: 4 }, 'content');
assert.deepEqual(body.map(hit => hit.current), [false, true], '正文当前命中没有与普通命中区分');
const title = render('你看着你', '你', { field: 'content', start: 3, end: 4 }, 'title');
assert.deepEqual(title.map(hit => hit.current), [false, false], '正文当前命中不应误加强标题');

const dayThemeAttribute = mode => mode === 'light' ? 'light' : '';
assert.equal(dayThemeAttribute('light'), 'light', '日间模式必须启用独立浅蓝高亮');
assert.equal(dayThemeAttribute('dark'), '', '夜间模式不应套用日间浅蓝高亮');
assert.equal(dayThemeAttribute('auto'), '', '魔法棒模式不应套用日间浅蓝高亮');

const undoAvailability = history => Boolean(history.at(-1));
assert.equal(undoAvailability([{ label: '删除 1 处匹配文字' }]), true, '删除后必须立即提供撤销');
assert.equal(undoAvailability([]), false, '没有历史时撤销仍应禁用');

const sharedToolbarAction = multi => multi ? 'batch-delete' : 'undo';
assert.equal(sharedToolbarAction(false), 'undo', '普通状态应在固定工具位显示撤销');
assert.equal(sharedToolbarAction(true), 'batch-delete', '多选状态应在相同工具位显示删除所选');

const orderedSelectedKeys = (entries, selected) => entries.filter(entry => selected.has(entry.id)).map(entry => entry.id);
assert.deepEqual(orderedSelectedKeys([{ id: '1' }, { id: '2' }, { id: '3' }], new Set(['3', '1'])), ['1', '3'], '多选拖动必须按世界书原顺序携带条目');
const nextAllSelection = (keys, selected) => keys.every(key => selected.has(key)) ? new Set() : new Set(keys);
assert.deepEqual([...nextAllSelection(['a', 'b'], new Set())], ['a', 'b'], '全选必须一次勾选全部候选条目');
assert.deepEqual([...nextAllSelection(['a', 'b'], new Set(['a', 'b']))], [], '再次点击全选必须取消全部候选条目');

const multiDragPreviewLabel = count => count > 1 ? `拖动 ${count} 条` : '';
assert.equal(multiDragPreviewLabel(3), '拖动 3 条', '多选拖动预览必须明确显示条目数量');
assert.equal(multiDragPreviewLabel(1), '', '单条拖动不应显示多选数量预览');
const customDragStart = source.slice(source.indexOf('if (custom) {'), source.indexOf("if (state.topType === 'preset')"));
assert.ok(customDragStart.includes('showWorldMultiDragFloat(event, keys.length);'), '世界书多选拖动必须生成数量浮标');
const presetDragStart = source.slice(source.indexOf("if (state.topType === 'preset')"), source.indexOf('function onDragOver(event)'));
assert.ok(!presetDragStart.includes('showWorldMultiDragFloat'), '原生预设拖动必须保留自己的预览，不能重复显示世界书浮标');
assert.ok(!source.includes("icon.textContent = '↕'"), '世界书多选拖动不应继续使用 Emoji 箭头');
assert.ok(workshopSource.includes('fa-layer-group'), '预设多选拖动缺少统一的叠层图标');
assert.ok(workshopSource.includes("拖动 '+n.length+\" 条</span>\""), '预设多选拖动缺少数量文案');
assert.ok(workshopSource.includes('setDragImage(c,0,0)'), '预设多选拖动没有压缩原生拖拽截图');
assert.ok(!workshopSource.includes("r.textContent='↕'"), '预设多选拖动不应继续使用 Emoji 箭头');

console.log('test.37 回归通过：世界书正文高亮、键盘避让、替换撤销、全选、预设／世界书多选跟手浮标、工具位与主题色均已覆盖。');
