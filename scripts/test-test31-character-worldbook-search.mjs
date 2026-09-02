import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'worldBindings: new Map()',
  'function refreshCharacterWorldBindings()',
  "helperFunction('getCharacterNames')",
  "helperFunction('getCharWorldbookNames')",
  'addBinding(linked.primary, characterName);',
  'for (const extraName of linked.additional || []) addBinding(extraName, characterName);',
  'function boundCharacterNames(worldName)',
  'placeholder="搜索世界书或角色名"',
  "row.characters.some(name => name.toLocaleLowerCase().includes(query))",
  "sectionMarkup('bound', '角色绑定世界书', 'fa-user-group', boundRows, boundExpanded)",
  "sectionMarkup('unbound', '未绑定角色的世界书', 'fa-book', unboundRows, unboundExpanded)",
  '绑定角色：${h(characters.join(\'、\'))}',
  '.pmm-wb-picker-section-title',
]) {
  assert.ok(source.includes(marker), `test.31 角色世界书搜索缺少实现：${marker}`);
}

const pickerStart = source.indexOf('  function openSourcePicker(sideName)');
const pickerEnd = source.indexOf('  async function switchTopKind(kind)', pickerStart);
const picker = source.slice(pickerStart, pickerEnd);
assert.ok(
  picker.indexOf("const boundRows = rows.filter(row => row.characters.length > 0)")
    < picker.indexOf("sectionMarkup('bound', '角色绑定世界书'"),
  '角色绑定分组没有使用真实绑定结果',
);
assert.ok(
  picker.indexOf("sectionMarkup('bound', '角色绑定世界书'")
    < picker.indexOf("sectionMarkup('unbound', '未绑定角色的世界书'"),
  '选择弹窗没有把角色绑定世界书排在未绑定角色世界书之前',
);

const installedWorlds = ['月城设定', '日常补丁', '共同世界'];
const links = new Map(installedWorlds.map(name => [name, new Set()]));
const add = (world, character) => links.get(world)?.add(character);
add('月城设定', '月城澪');
add('共同世界', '月城澪');
add('共同世界', '林清墨');
add('卡内嵌但未导入', '月城澪');

const search = query => installedWorlds
  .map(name => ({ name, characters: [...links.get(name)] }))
  .filter(row => row.name.includes(query) || row.characters.some(name => name.includes(query)));

assert.deepEqual(search('月城').map(row => row.name), ['月城设定', '共同世界'],
  '输入角色名时没有找出该角色绑定的全部已安装世界书');
assert.equal(search('林清墨')[0]?.name, '共同世界', '额外角色绑定没有参与角色名搜索');
assert.equal(search('卡内嵌但未导入').length, 0, '未安装的卡内嵌世界书被错误加入选择列表');
assert.deepEqual([...links.get('共同世界')], ['月城澪', '林清墨'],
  '同一本世界书绑定多个角色时没有聚合为一个结果');

console.log('test.31 回归通过：世界书可按角色名查找，并按角色绑定状态分组。');
