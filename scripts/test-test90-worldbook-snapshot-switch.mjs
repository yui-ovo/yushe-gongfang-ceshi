import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../dist/worldbook-snapshots.js',import.meta.url),'utf8');

assert.match(source,/\.pmm-wbs-entry input\[data-toggle\] \{/,'Snapshot entries do not have a dedicated switch style');
assert.match(source,/width:44px!important;[^}]*height:26px!important;/,'Snapshot switch is not the agreed larger mobile-friendly size');
assert.match(source,/input\[data-toggle\]:after \{ content:none!important; display:none!important; \}/,'Theme checkbox ticks can still appear over the snapshot switch');
assert.match(source,/input\[data-toggle\]:checked:before \{ left:20px!important; \}/,'Enabled switch does not slide its thumb to the right');
assert.match(source,/input\[data-toggle\]:checked \{[^}]*background:var\(--pm-accent/,'Enabled switch does not follow the active theme accent');

console.log('test.90 回归通过：世界书快照条目使用更大、无勾号并跟随主题色的普通滑动开关。');
