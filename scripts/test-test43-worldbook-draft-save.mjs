import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位：${startMarker}`);
  return source.slice(start, end);
}

for (const marker of [
  "savedData: null, dirty: false",
  'function markWorldDraftDirty(side)',
  'function discardWorldDraft(side)',
  'function reloadOpenNativeWorldbook(name)',
  "data-wb-dirty=\"true\"",
  '.pmm-wb-tool[data-wb-action="save"][data-wb-dirty="true"]',
]) {
  assert.ok(source.includes(marker), `test.43 缺少世界书草稿保存实现：${marker}`);
}

const updateField = section('async function updateField(target)', 'async function deleteSelected(sideName)');
assert.ok(updateField.includes('markWorldDraftDirty(side);'), '编辑字段后没有标记为草稿');
assert.ok(!updateField.includes('saveWorldSide('), '编辑字段时不应直接保存');

const deleteSelected = section('async function deleteSelected(sideName)', 'function nativeWorldEditorSelectedName()');
assert.ok(deleteSelected.includes('markWorldDraftDirty(side);'), '删除条目后没有标记为草稿');
assert.ok(!deleteSelected.includes('saveWorldSide('), '删除条目时不应直接保存');

const saveAction = section("if (action === 'save')", "if (action === 'exit')");
assert.ok(saveAction.includes('if (!side?.dirty) return;'), '无草稿时保存不应写回旧快照');
assert.ok(saveAction.includes('await saveWorldSide(side);'), '点击高亮保存按钮没有写入草稿');

const saveSide = section('async function saveWorldSide(side)', 'async function savePresetEntries');
assert.ok(saveSide.includes('await context.saveWorldInfo(side.name, clone(side.data), true);'), '保存没有写入工坊草稿');
assert.ok(saveSide.includes('side.savedData = clone(side.data);'), '保存后没有更新已保存快照');
assert.ok(saveSide.includes('side.dirty = false;'), '保存后没有清除高亮状态');
assert.ok(saveSide.includes('await reloadOpenNativeWorldbook(side.name);'), '保存后没有刷新当前同名原生世界书');

const nativeSelection = section('function nativeWorldEditorSelectedName()', 'function watchNativeWorldRename(oldName)');
assert.ok(nativeSelection.includes('selectedOptions?.[0]?.textContent'), '原生世界书当前选择应读取选项名称，而非数值索引');
assert.ok(!nativeSelection.includes('select?.value'), '原生世界书当前选择不能拿数值索引与世界书名称比较');

const nativeReload = section('async function reloadOpenNativeWorldbook(name)', 'async function saveWorldSide(side)');
assert.ok(nativeReload.includes("DOC.querySelector('#world_editor_select')"), '保存后没有定位当前原生世界书选择框');
assert.ok(nativeReload.includes("jQuery(select).trigger('change')"), '保存后没有复用原生世界书的 change 重载路径');
assert.ok(nativeReload.includes("select.dispatchEvent(new TOP.Event('change'"), '无 jQuery 时没有原生 change 重载兜底');

const close = section('function close()', 'function cleanup()');
assert.ok(!close.includes('saveWorldSide('), '关闭工坊时不应自动保存草稿');

const sourceChange = section('function onDocumentChange(event)', 'function onDocumentInput(event)');
assert.ok(sourceChange.includes('discardWorldDraft(side);'), '切换世界书时没有丢弃未保存草稿');
assert.ok(!sourceChange.includes('confirm('), '切换世界书时不应弹出保存确认');

console.log('test.43 回归通过：世界书采用本地草稿，保存高亮、显式落盘、原生页刷新与静默丢弃均已覆盖。');
