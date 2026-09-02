import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

assert.equal(manifest.hooks?.update, 'onUpdate', 'manifest 必须注册酒馆官方 update 钩子');
for (const marker of [
  'export function onUpdate()',
  'scheduleNativeSingleUpdateReload()',
  "block.querySelector('.btn_update .fa-spin, .btn_update.fa-spin')",
  'bulkExtensionUpdateInProgress = true',
  "[...toolbar.querySelectorAll('button')].slice(0, 2)",
  'NATIVE_UPDATE_RELOAD_DELAY = 1_000',
  'RAPID_VERSION_CHECK_INTERVAL = 750',
  "document.addEventListener('click', handleNativeExtensionManagerClick, true)",
  'if (versionCheckBusy || bulkExtensionUpdateInProgress',
]) {
  assert.ok(entry.includes(marker), `test.21 即时更新刷新缺少实现：${marker}`);
}

const hookStart = entry.indexOf('export function onUpdate()');
const hookEnd = entry.indexOf('function startVersionWatcher()', hookStart);
assert.ok(hookStart >= 0 && hookEnd > hookStart, '无法定位 update 钩子');
const hookBody = entry.slice(hookStart, hookEnd);
assert.ok(!hookBody.includes('notify('), 'update 钩子不应重复制造提示，应保留酒馆原生成功提示');

console.log('test.21 回归通过：单独更新保留酒馆原生提示后自动刷新，批量更新不抢先刷新，并保留快速与定时检测兜底。');
