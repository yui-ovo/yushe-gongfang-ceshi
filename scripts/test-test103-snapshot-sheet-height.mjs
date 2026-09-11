import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.02.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');

const sheetStart = worldbook.indexOf('/* Let short snapshot sheets hug their content');
const sheetEnd = worldbook.indexOf('.pmm-wbs-source-section[hidden]', sheetStart);
assert.ok(sheetStart >= 0 && sheetEnd > sheetStart, '找不到快照弹窗自然高度规则');
const sheet = worldbook.slice(sheetStart, sheetEnd);

assert.ok(sheet.includes('.pmm-wbs-dialog:not(.is-editing):not(.pmm-wbs-batch-dialog),.pmm-snapshot-hub-preset .pmm-switch-snapshot-dialog'), '预设与世界书快照必须共用自然高度规则');
assert.ok(sheet.includes('height:auto!important;'), '快照弹窗不能再固定为单一高度');
assert.ok(sheet.includes('max-height:min(50dvh,var(--wbs-sheet-max-height,var(--pmm-switch-snapshot-sheet-max-height,50dvh)))!important;'), '快照弹窗必须限制为真实可视区的一半');
assert.ok(!sheet.includes('height:min(460px'), '快照弹窗不得继续固定为 460px');
assert.ok(sheet.includes('.pmm-wbs-dialog:not(.is-editing):not(.pmm-wbs-batch-dialog) .pmm-wbs-body,.pmm-snapshot-hub-preset .pmm-switch-snapshot-list { flex:0 1 auto!important; min-height:0!important; max-height:none!important; overflow:auto!important; }'), '超过半屏时必须由世界书正文或预设快照列表内部滚动，并允许列表撑满半屏余量');
assert.ok(worldbook.includes("overlay.style.setProperty('--wbs-sheet-max-height', `${Math.max(1,Math.floor(visibleHeight/2))}px`);"), '世界书必须按真实可视区同步半屏上限');
assert.ok(workshop.includes("overlay.style.setProperty('--pmm-switch-snapshot-sheet-max-height', `${Math.max(1, Math.floor(height / 2))}px`, 'important');"), '预设快照必须按真实可视区同步半屏上限');
assert.ok(workshop.includes("overlay.style.removeProperty('--pmm-switch-snapshot-sheet-max-height');"), '预设快照关闭后必须清理可视区高度变量');
assert.ok(worldbook.includes('.pmm-wbs-dialog.is-editing { height:min(680px'), '世界书快照编辑器仍应保留原有大号编辑高度');
assert.ok(worldbook.includes('.pmm-wbs-batch-dialog { height:min(560px'), '世界书批量管理不应被半屏快照规则误伤');

console.log('test.40 快照弹窗高度回归通过：预设与世界书会按内容增长，超过真实可视区一半时仅内部列表滚动。');
