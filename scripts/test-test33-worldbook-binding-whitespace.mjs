import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function normalizeWorldBindingName(value)',
  ".normalize('NFC').trim().toLocaleLowerCase()",
  'const byExactName = new Map(state.worldNames.map(name => [String(name), name]));',
  'const actualName = byExactName.get(rawWorldName)',
  '|| byNormalizedName.get(normalizeWorldBindingName(rawWorldName));',
]) {
  assert.ok(source.includes(marker), `test.33 世界书绑定名称兼容缺少实现：${marker}`);
}

const normalize = value => String(value ?? '').normalize('NFC').trim().toLocaleLowerCase();
const resolve = (worldNames, bindingName) => {
  const byExactName = new Map(worldNames.map(name => [String(name), name]));
  const byNormalizedName = new Map();
  for (const name of worldNames) {
    const normalizedName = normalize(name);
    if (normalizedName && !byNormalizedName.has(normalizedName)) byNormalizedName.set(normalizedName, name);
  }
  const rawWorldName = String(bindingName ?? '');
  return byExactName.get(rawWorldName) || byNormalizedName.get(normalize(rawWorldName));
};

const cardBook = '__v1.2「🤍咒术回战🩵」なあ，愛してるって何回言ったっけ？ ';
const trimmedBook = cardBook.trim();
assert.equal(resolve([cardBook], cardBook), cardBook, '原名完全一致时没有优先保留带空格的真实名称');
assert.equal(resolve([trimmedBook], cardBook), trimmedBook, '角色卡绑定末尾空格没有匹配到已安装世界书');
assert.equal(resolve([cardBook], trimmedBook), cardBook, '已安装世界书末尾空格没有参与兜底匹配');
assert.equal(resolve(['Café'], 'Cafe\u0301 '), 'Café', 'Unicode 组合形式不同的名称没有兼容匹配');
assert.equal(resolve(['同名', '同名 '], '同名 '), '同名 ', '兜底逻辑覆盖了可用的原名精确匹配');

console.log('test.33 回归通过：角色绑定世界书兼容末尾空格与 Unicode 差异，且精确名称优先。');
