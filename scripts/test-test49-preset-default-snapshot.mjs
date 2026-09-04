import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.98.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位预设默认片段：${startMarker}`);
  return source.slice(start, end);
}

for (const marker of [
  'PMM_SWITCH_SNAPSHOTS_TEST50',
  'function isDefaultSnapshot(snapshot)',
  'function defaultSnapshotForCurrentPreset()',
  'function saveDefaultSnapshot()',
  'data-pmm-snapshot-action="save-default"',
  'data-pmm-snapshot-action="apply-default"',
  "action === 'save-default' || action === 'update-default'",
  "action === 'apply-default'",
]) {
  assert.ok(source.includes(marker), `test.49 缺少预设默认功能：${marker}`);
}

const saveDefault = section('function saveDefaultSnapshot()', 'function saveNewSnapshot(inputName)');
assert.ok(saveDefault.includes("name: '预设默认'"), '预设默认没有使用固定名称');
assert.ok(saveDefault.includes("kind: 'default'"), '预设默认没有与角色快照隔离');
assert.ok(saveDefault.includes('isDefault: true'), '预设默认没有持久化默认标记');
assert.ok(saveDefault.includes('states: makeStates(prompts)'), '预设默认没有冻结全部开关');
assert.ok(saveDefault.includes('writeStore(store)'), '预设默认没有写入本地存储');
assert.ok(saveDefault.includes('isBranchMode()'), '分支模式下仍可能错误保存预设默认');

const defaultLookup = section('function defaultSnapshotForCurrentPreset()', 'function snapshotsForCurrentPreset()');
assert.ok(defaultLookup.includes('text(snapshot.presetName) === presetName'), '预设默认没有按预设隔离');
assert.ok(defaultLookup.includes('isDefaultSnapshot(snapshot)'), '预设默认没有识别默认标记');

const list = section('function snapshotsForCurrentPreset()', 'function saveDefaultSnapshot()');
assert.ok(list.includes('!isDefaultSnapshot(snapshot)'), '角色快照列表错误混入预设默认');

const overlay = section('function renderOverlay()', 'function openOverlay()');
assert.ok(overlay.includes('保存当前为默认'), '首次使用没有明确保存默认入口');
assert.ok(overlay.includes('恢复默认'), '已保存默认没有一键恢复入口');
assert.ok(overlay.includes('用当前开关更新默认'), '已保存默认无法明确更新');

const apply = section('async function applySnapshot(id)', 'function renameSnapshot(id)');
assert.ok(apply.includes("await setPreset(presetName, { prompts: clone(nextPrompts) })"), '恢复默认没有写回真实预设');
assert.ok(apply.includes("await setPreset('in_use', { prompts: clone(nextPrompts) })"), '恢复默认没有同步当前运行预设');

console.log('test.49 回归通过：每个主预设可独立保存、更新并一键恢复预设默认；角色快照不会混入默认。');
