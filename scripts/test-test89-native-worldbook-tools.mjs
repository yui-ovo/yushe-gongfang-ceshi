import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../dist/worldbook-snapshots.js',import.meta.url),'utf8');

assert.match(source,/data-pmm-native-worldbook-action="batch"/,'Native worldbook header is missing the batch manager');
assert.match(source,/data-pmm-native-worldbook-action="snapshot"/,'Native worldbook header is missing the snapshot camera');
assert.match(source,/void open\('global','',false\)/,'Worldbook camera does not open the global snapshot page directly');
assert.match(source,/optionalHelper\('deleteWorldbook'\)/,'Batch deletion does not reuse Tavern Helper worldbook deletion');
assert.match(source,/搜索、多选并删除世界书/,'Batch manager has expanded beyond the agreed search/select/delete scope');
assert.doesNotMatch(source,/批量挂载|批量导出|根据所选世界书直接新建分组/,'Batch manager contains unapproved extra actions');
assert.match(source,/角色绑定世界书/,'Batch manager does not group character-bound worldbooks');
assert.match(source,/非角色绑定世界书/,'Batch manager does not group unbound worldbooks');
assert.match(source,/row\.characters\.length/,'Batch grouping does not use actual character bindings');
assert.doesNotMatch(source,/renderBatch\(\);batchOverlay\.querySelector\('\.pmm-wbs-batch-search'\)\?\.focus\(\)/,'Opening batch manager still forces the search field to focus');
assert.match(source,/names\.length<nativeCatalogNames\.length/,'Native catalog deletion is not distinguished from a rename');
assert.match(source,/engine\.reconcileBooks\(current\)/,'Native worldbook deletion does not reconcile snapshot group references');

console.log('Native worldbook tools passed: compact header entries, scoped batch deletion and group reconciliation.');
