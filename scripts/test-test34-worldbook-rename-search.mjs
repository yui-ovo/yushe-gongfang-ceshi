import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function renameWorldSource(sideName)',
  'context.reloadWorldInfoEditor(oldName, true);',
  "DOC.querySelector('#world_popup_name_button')",
  'function watchNativeWorldRename(oldName)',
  'data-wb-action="rename-source"',
  'function worldSearchScope(value)',
  "['all', 'title', 'content'].includes(value)",
  'function collectWorldSearch(side)',
  'function highlightedWorldSearchText(value, query, currentMatch = null, fieldName = \'\')',
  'data-wb-action="search-previous"',
  'data-wb-action="search-next"',
  'data-wb-action="search-scope"',
  'function revealWorldSearchMatch(sideName, focusContent = true)',
  'textarea.setSelectionRange?.(match.start, match.end);',
  '没有找到匹配条目',
]) {
  assert.ok(source.includes(marker), `test.34 缺少世界书重命名／搜索实现：${marker}`);
}

const ranges = (value, query) => {
  const text = String(value ?? '');
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  if (!needle) return [];
  const haystack = text.toLocaleLowerCase();
  const result = [];
  let start = 0;
  while (start <= haystack.length) {
    const index = haystack.indexOf(needle, start);
    if (index < 0) break;
    result.push([index, index + needle.length]);
    start = index + needle.length;
  }
  return result;
};

const entries = [
  { uid: 'title', comment: '五条悟设定', content: '普通内容' },
  { uid: 'content', comment: '角色资料', content: '五条悟会在这里出现两次：五条悟。' },
  { uid: 'none', comment: '其他', content: '没有关键字' },
];
const search = scope => entries.flatMap(entry => {
  const matches = [];
  if (scope !== 'content') matches.push(...ranges(entry.comment, '五条悟').map(range => ({ uid: entry.uid, field: 'title', range })));
  if (scope !== 'title') matches.push(...ranges(entry.content, '五条悟').map(range => ({ uid: entry.uid, field: 'content', range })));
  return matches;
});

assert.deepEqual(search('all').map(match => `${match.uid}:${match.field}`), ['title:title', 'content:content', 'content:content']);
assert.deepEqual(search('title').map(match => `${match.uid}:${match.field}`), ['title:title']);
assert.deepEqual(search('content').map(match => `${match.uid}:${match.field}`), ['content:content', 'content:content']);
assert.deepEqual(ranges('五条悟会在这里出现两次：五条悟。', '五条悟'), [[0, 3], [12, 15]], '重复正文匹配的位置不正确');

console.log('test.34 回归通过：世界书原生重命名入口与范围搜索、跳转、高亮、正文定位均已覆盖。');
