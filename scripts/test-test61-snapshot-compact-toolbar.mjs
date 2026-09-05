import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.22.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位紧凑快照工具栏片段：${startMarker}`);
  return source.slice(start, end);
}

const editSwap = section('function restoreCaptureEditButton(button)', 'function mountTrigger()');
assert.ok(editSwap.includes("button.innerHTML = '<i class=\"fa-solid fa-floppy-disk\"></i>'"), '铅笔位置没有换成保存图标');
assert.ok(editSwap.includes('button.dataset.pmmSnapshotCaptureSave'), '保存图标没有快照专用点击身份');
assert.ok(editSwap.includes('button.dataset.pmmSnapshotOriginalHtml'), '退出快照模式时无法恢复铅笔');

const trigger = section('function mountTrigger()', 'function handleDocumentClick(event)');
assert.ok(trigger.includes("? '<i class=\"fa-solid fa-xmark\"></i>'"), '相机位置没有换成取消 X');
assert.ok(trigger.includes('turnEditIntoCaptureSave(currentEditButton)'), '快照模式没有在铅笔原位挂载保存');
assert.ok(!trigger.includes('turnImportIntoCaptureCancel'), '导入按钮不应再被快照模式替换');

const click = section('function handleDocumentClick(event)', 'function installStyle()');
assert.ok(click.indexOf('openCaptureSavePrompt();') < click.indexOf("closest?.('[data-pmm-snapshot-trigger]')"), '保存与取消按钮的行为位置写反');
assert.ok(click.includes('if (isCaptureMode()) void exitCaptureMode(true);'), '相机位置的 X 没有取消并恢复进入前开关');

const style = section('function installStyle()', 'function scheduleMount()');
const toolbarStyle = style.slice(0, style.indexOf('.pmm-switch-snapshot-overlay'));
assert.ok(toolbarStyle.includes('title-edit-btn.pmm-switch-snapshot-capture-save'), '紧凑保存按钮缺少状态样式');
assert.ok(!toolbarStyle.includes('width:32px!important'), '紧凑工具栏仍残留 32px 放大按钮');
assert.ok(!toolbarStyle.includes('min-width:29px!important'), '紧凑工具栏仍残留 29px 放大按钮');
assert.ok(!toolbarStyle.includes('min-height:29px!important'), '紧凑工具栏仍残留放大高度');

console.log('test.61 回归通过：快照模式在铅笔原位保存、相机原位取消，两者保持普通工具按钮尺寸。');
