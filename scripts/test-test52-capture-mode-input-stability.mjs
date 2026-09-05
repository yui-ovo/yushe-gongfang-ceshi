import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.09.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位快照模式稳定性片段：${startMarker}`);
  return source.slice(start, end);
}

for (const marker of [
  'PMM_SWITCH_SNAPSHOTS_TEST52',
  'function restoreCaptureImportButton(button)',
  'function turnImportIntoCaptureCancel(button)',
  'data-pmm-snapshot-import-stashed',
  'data-pmm-snapshot-capture-cancel',
]) {
  assert.ok(source.includes(marker), `test.52 缺少快照模式稳定性修复：${marker}`);
}

const replaceImport = section('function turnImportIntoCaptureCancel(button)', 'function mountTrigger()');
assert.ok(replaceImport.includes('button.dataset.pmmSnapshotOriginalTitle'), '临时替换导入按钮时没有保留原标题');
assert.ok(replaceImport.includes('button.dataset.pmmSnapshotOriginalHtml'), '临时替换导入按钮时没有保留原图标');
assert.ok(replaceImport.includes("if (!button || button.dataset.pmmSnapshotImportStashed) return;"), '导入按钮每次重绘仍会被反复替换');

const restoreImport = section('function restoreCaptureImportButton(button)', 'function turnImportIntoCaptureCancel(button)');
assert.ok(restoreImport.includes('delete button.dataset.pmmSnapshotCaptureCancel'), '退出快照模式没有恢复导入按钮的点击身份');
assert.ok(restoreImport.includes('button.innerHTML = button.dataset.pmmSnapshotOriginalHtml'), '退出快照模式没有恢复导入图标');

const trigger = section('function mountTrigger()', 'function handleDocumentClick(event)');
assert.ok(trigger.includes("host.querySelector('[data-pmm-snapshot-import-stashed], [title=\"导入\"]')"), '快照模式没有复用原导入位置作为取消');
assert.ok(!trigger.includes('host.insertBefore(cancel, button.nextSibling)'), '快照模式仍额外插入取消按钮并挤动工具栏');
assert.ok(trigger.includes('if (button.innerHTML !== nextMarkup)'), '快照入口重绘没有避免重复改写 DOM');
assert.ok(trigger.includes('turnImportIntoCaptureCancel(importButton)'), '导入按钮没有切换为取消');

const cleanup = section('cleanup()', '  };\n  install();');
assert.ok(cleanup.includes("querySelectorAll?.('[data-pmm-snapshot-import-stashed]').forEach(restoreCaptureImportButton)"), '扩展重载时没有恢复被临时替换的导入按钮');
assert.ok(cleanup.includes("querySelectorAll?.('[data-pmm-snapshot-native-save-stashed]').forEach(restoreCaptureNativeSaveButton)"), '扩展重载时没有恢复被临时禁用的原生保存按钮');

console.log('test.52 回归通过：快照模式复用导入位置为取消，重绘不会循环创建按钮，退出及热重载都会恢复导入。');
