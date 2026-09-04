import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

for (const forbidden of [
  "bottomMode: 'world'",
  'function isWorldbookBranchMode()',
  'function bottomModeSwitchMarkup()',
  'data-wb-bottom-mode=',
  'function renderWorldbookBranchSkeletonCard()',
  'data-pmm-wb-branch-shell',
  '世界书分支功能准备中',
  'function switchBottomMode(mode)',
  'pmm-wb-branch-mode-switch',
]) {
  assert.ok(!source.includes(forbidden), `世界书分支界面尚未完全撤回：${forbidden}`);
}

assert.ok(source.includes("state.bottomCard = createCard('bottom', state.bottom);"), '下方应恢复为普通世界书卡');

for (const forbidden of [
  '__PMM_GLOBAL_WORLDBOOK_BRANCHES_V1__', 'GLOBAL_WORLDBOOK_BRANCHES_',
  'readGlobalWorldbookBranchState', 'writeGlobalWorldbookBranchState',
  'ensureGlobalWorldbookBranchState', 'updateNativeGlobalWorldbookNames',
  'applyGlobalWorldbookBranch', 'currentGlobalWorldbookNames',
  'globalWorldbookBranchCandidates', 'worldPrimaryBindings', 'worldAdditionalBindings',
  'globalBranchPanel', 'globalBranchQuick', 'data-pmm-wb-global-',
  'data-wb-library-drag-name', "kind: 'global-worldbook'",
  'rebindGlobalWorldbooks', 'getGlobalWorldbookNames', "'#world_info'",
]) {
  assert.ok(!source.includes(forbidden), `已撤回的旧全局分支逻辑不应复活：${forbidden}`);
}

for (const forbidden of ['globalWorldbookBranchesKey', 'globalWorldbookQuickEntryEnabled']) {
  assert.ok(!entry.includes(forbidden), `启动器不应自动加载旧全局分支：${forbidden}`);
}

console.log('test.41 回归通过：世界书分支及其旧加载逻辑均已完全撤回。');
