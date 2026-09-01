import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

assert.ok(
  source.includes('.pmm-wb-kind-switch{display:inline-flex;align-items:center;gap:1px;padding:2px;border-radius:7px;background:color-mix'),
  '预设／世界书切换没有恢复为相连的分段按钮',
);
assert.ok(
  source.includes('.pmm-wb-kind-switch button.is-active{background:var(--pm-quote-color,#3b82f6);color:#fff;opacity:1}'),
  '当前预设／世界书入口没有独立高亮',
);
assert.ok(
  !source.includes("notify('info', '上方已切回预设"),
  '切回预设时仍会弹出说明通知',
);

console.log('test.7 世界书切换回归通过：分段按钮相连，切换不弹说明通知。');
