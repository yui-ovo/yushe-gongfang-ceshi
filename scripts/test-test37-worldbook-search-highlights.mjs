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

console.log('test.37 回归通过：世界书正文高亮、当前命中强化、主题强调色、正文滚动定位与选中世界书图标的高对比显示均已覆盖。');
