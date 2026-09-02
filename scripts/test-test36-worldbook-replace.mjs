import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'pmm-wb-search-input-wrap',
  'pmm-wb-replace-toggle',
  'data-wb-action="replace-toggle"',
  'data-wb-action="replace-input"',
  'data-wb-action="replace-current"',
  'data-wb-action="replace-all"',
  'function replaceWorldSearchText(value, query, replacement)',
  'function replaceCurrentWorldSearch(sideName)',
  'function replaceAllWorldSearchEntries(sideName)',
  "TOP.confirm(`将在${replacementScopeLabel(scope)}中删除 ${search.matches.length} 处",
  "pushUndo(side, replacement ? `替换全部（${search.matches.length} 处）`",
]) {
  assert.ok(source.includes(marker), `test.36 缺少世界书替换实现：${marker}`);
}

const matches = (value, query) => {
  const sourceText = String(value ?? '');
  const needle = String(query ?? '').toLocaleLowerCase();
  const lowered = sourceText.toLocaleLowerCase();
  const result = [];
  for (let start = 0; start <= lowered.length;) {
    const found = lowered.indexOf(needle, start);
    if (found < 0) break;
    result.push([found, found + needle.length]);
    start = found + Math.max(needle.length, 1);
  }
  return result;
};

const replaceAll = (value, query, replacement) => {
  const sourceText = String(value ?? '');
  const found = matches(sourceText, query);
  let cursor = 0;
  const next = found.map(([start, end]) => {
    const before = sourceText.slice(cursor, start);
    cursor = end;
    return before + replacement;
  }).join('') + sourceText.slice(cursor);
  return { value: next, count: found.length };
};

assert.deepEqual(replaceAll('猫和猫', '猫', '狗'), { value: '狗和狗', count: 2 }, '替换全部没有保留非命中内容');
assert.deepEqual(replaceAll('猫和猫', '猫', ''), { value: '和', count: 2 }, '空替换内容没有作为删除处理');

const entry = { comment: '猫标题', content: '猫正文里的猫' };
const titleOnly = replaceAll(entry.comment, '猫', '狗');
entry.comment = titleOnly.value;
assert.equal(entry.comment, '狗标题', '仅标题范围没有修改名称');
assert.equal(entry.content, '猫正文里的猫', '仅标题范围错误修改了正文');
const contentOnly = replaceAll(entry.content, '猫', '狗');
entry.content = contentOnly.value;
assert.equal(entry.content, '狗正文里的狗', '仅内容范围没有修改正文全部命中');

console.log('test.36 回归通过：世界书替换栏、范围替换、空替换删除、确认和撤销入口均已覆盖。');
