import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.02.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位快照模式片段：${startMarker}`);
  return source.slice(start, end);
}

for (const marker of [
  'PMM_SWITCH_SNAPSHOTS_TEST52',
  'let captureMode = null',
  'function enterCaptureMode()',
  'function exitCaptureMode(showNotice = false)',
  'function renderCaptureSavePrompt()',
  'function finishCaptureSnapshot()',
  'data-pmm-snapshot-action="save-capture"',
  'data-pmm-snapshot-capture-cancel',
  'is-capture-mode',
  'pmm-switch-snapshot-capture-mode',
]) {
  assert.ok(source.includes(marker), `test.51 缺少快照模式：${marker}`);
}

const enter = section('function enterCaptureMode()', 'function renderCaptureSavePrompt()');
assert.ok(enter.includes("captureMode = { presetName }"), '进入快照模式没有绑定当前预设');
assert.ok(enter.includes('closeOverlay();'), '新建快照没有返回预设页面');
assert.ok(enter.includes('已进入快照模式'), '进入快照模式没有给出明确提示');
assert.ok(enter.includes('defaultSnapshotForCurrentPreset()'), '没有默认状态时仍可能错误进入快照模式');

const savePrompt = section('function renderCaptureSavePrompt()', 'function openCaptureSavePrompt()');
assert.ok(savePrompt.includes('保存为'), '高亮保存按钮没有弹出命名界面');
assert.ok(savePrompt.includes('保存后退出快照模式'), '命名界面没有说明保存后的状态');

const finish = section('function finishCaptureSnapshot()', 'function renderFirstDefaultPrompt()');
assert.ok(finish.includes('saveNewSnapshot(composer?.name'), '快照模式保存没有复用完整快照保存链路');
assert.ok(finish.includes('exitCaptureMode();'), '保存快照后没有退出快照模式');
assert.ok(finish.includes('closeOverlay();'), '保存快照后没有回到预设页面');

const overlay = section('function ensureOverlay()', 'function openOverlay()');
assert.ok(overlay.includes("action === 'new') enterCaptureMode()"), '新建快照仍留在旧弹窗而没有进入快照模式');
assert.ok(overlay.includes("action === 'save-capture') finishCaptureSnapshot()"), '保存高亮按钮没有写入快照');
assert.ok(overlay.includes("action === 'return-capture') closeOverlay()"), '命名取消不应退出或保存快照');

const trigger = section('function mountTrigger()', 'function handleDocumentClick(event)');
assert.ok(trigger.includes("const nextTitle = captureActive ? '保存快照' : '开关快照'"), '相机按钮没有切换为保存按钮');
assert.ok(trigger.includes('fa-floppy-disk'), '快照模式没有使用保存图标');
assert.ok(trigger.includes('turnImportIntoCaptureCancel(importButton)'), '快照模式没有安全退出入口');

const click = section('function handleDocumentClick(event)', 'function installStyle()');
assert.ok(click.includes('exitCaptureMode(true)'), '取消快照模式没有退出');
assert.ok(click.includes('if (isCaptureMode()) openCaptureSavePrompt();'), '高亮保存按钮没有打开命名界面');

assert.ok(source.includes('pmm-switch-snapshot-capture-mode{outline:'), '快照模式没有给整个预设添加醒目边框');

console.log('test.51 回归通过：新建快照回到预设进入录制模式，主题边框与高亮保存按钮可见，保存命名后退出，取消安全保留当前开关。');
