import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function positionRoleOptions(entry)',
  '@D ${roleIcon} [${h(roleLabel)}]在深度',
  'data-wb-field="positionRole"',
  "if (fieldName === 'positionRole')",
  "overlay.style.setProperty('--pmm-wb-editor-bg'",
  "overlay.style.setProperty('--pmm-wb-editor-field-bg'",
  "overlay.style.setProperty('--pmm-wb-editor-text'",
  "overlay.style.setProperty('--pmm-wb-editor-accent'",
  '.pmm-wb-details textarea{min-height:132px!important',
  '.pmm-wb-details textarea{min-height:118px!important',
]) {
  assert.ok(source.includes(marker), `test.9 世界书原生角色／主题缺少实现：${marker}`);
}

const detailsStart = source.indexOf('  function renderDetails(sideName, entry, key)');
const detailsEnd = source.indexOf('  function openContentEditor(sideName, key)', detailsStart);
const details = source.slice(detailsStart, detailsEnd);
assert.ok(!details.includes('<span>角色</span>'), '角色仍在 @D 下方单独占一行');

console.log('test.9 世界书回归通过：@D 身份合并显示、正文加长、全屏跟随实际主题。');
