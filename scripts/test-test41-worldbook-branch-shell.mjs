import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

const section = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位区段：${startMarker}`);
  return source.slice(start, end);
};

for (const marker of [
  "bottomMode: 'world'",
  'function isWorldbookBranchMode()',
  'function bottomModeSwitchMarkup()',
  'data-wb-bottom-mode="world"',
  'data-wb-bottom-mode="branches"',
  'fa-globe',
  'fa-code-branch',
  'function renderWorldbookBranchSkeletonCard()',
  'data-pmm-wb-branch-shell',
  '世界书分支功能准备中',
  'function switchBottomMode(mode)',
]) {
  assert.ok(source.includes(marker), `test.41 缺少世界书分支空骨架：${marker}`);
}

const switchMode = section('function switchBottomMode(mode)', 'async function handleAction(button)');
assert.ok(switchMode.includes("state.bottomMode = mode;"), '切换入口没有更新下方显示模式');
assert.ok(switchMode.includes('renderPanels();'), '切换入口没有同步刷新卡片');
assert.ok(!/\bawait\b/.test(switchMode), '空骨架入口不应等待宿主加载');
for (const forbidden of [
  'refreshWorldNames', 'loadWorldSide', 'saveWorldInfo', 'rebindGlobalWorldbooks',
  'getGlobalWorldbookNames', 'localStorage', 'enqueue', 'setStatus',
]) {
  assert.ok(!switchMode.includes(forbidden), `空骨架入口不应触发：${forbidden}`);
}

const renderPanels = section('function renderPanels()', 'function scheduleDecorate()');
assert.ok(renderPanels.includes("if (state.topType === 'world')"), '分支入口不应改变原有上方世界书卡逻辑');
assert.ok(renderPanels.includes('isWorldbookBranchMode()'), '下方没有按分支模式选择空骨架');
assert.ok(renderPanels.includes('createWorldbookBranchSkeletonCard()'), '分支模式没有渲染空骨架');
assert.ok(renderPanels.includes("createCard('bottom', state.bottom)"), '切回世界书时没有恢复原下方卡');

const normalCard = section('function renderWorldCard(sideName, side)', 'function renderWorldbookBranchSkeletonCard()');
for (const marker of ['source-picker', 'entry-search', "toolbarButton('multi'", "toolbarButton('undo'", "toolbarButton('save'", 'bottomModeSwitchMarkup()']) {
  assert.ok(normalCard.includes(marker), `普通世界书卡不应丢失：${marker}`);
}

const staleGlobalBranchTokens = [
  '__PMM_GLOBAL_WORLDBOOK_BRANCHES_V1__', 'GLOBAL_WORLDBOOK_BRANCHES_',
  'readGlobalWorldbookBranchState', 'writeGlobalWorldbookBranchState',
  'ensureGlobalWorldbookBranchState', 'updateNativeGlobalWorldbookNames',
  'applyGlobalWorldbookBranch', 'currentGlobalWorldbookNames',
  'globalWorldbookBranchCandidates', 'worldPrimaryBindings', 'worldAdditionalBindings',
  'globalBranchPanel', 'globalBranchQuick', 'data-pmm-wb-global-',
  'data-wb-library-drag-name', "kind: 'global-worldbook'",
  'rebindGlobalWorldbooks', 'getGlobalWorldbookNames', "'#world_info'",
];
for (const forbidden of staleGlobalBranchTokens) {
  assert.ok(!source.includes(forbidden), `已撤回的全局分支逻辑仍残留：${forbidden}`);
}
for (const forbidden of ['globalWorldbookBranchesKey', 'globalWorldbookQuickEntryEnabled']) {
  assert.ok(!entry.includes(forbidden), `启动器不应再自动加载全局分支：${forbidden}`);
}

console.log('test.41 回归通过：世界书分支当前只保留无副作用的入口与空骨架。');
