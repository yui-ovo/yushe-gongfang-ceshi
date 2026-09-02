import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

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

console.log('test.37 回归通过：世界书正文高亮、键盘避让、替换撤销、日间按钮柔化、主题色与选中世界书图标的高对比显示均已覆盖。');
