import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.09.js', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `无法定位快照片段：${startMarker}`);
  return source.slice(start, end);
}

for (const marker of [
  'PMM_SWITCH_SNAPSHOTS_TEST52',
  "const STORAGE_KEY = 'pmm.switch-snapshots.v1'",
  "const TRIGGER_CLASS = 'pmm-switch-snapshot-trigger'",
  'function saveNewSnapshot(inputName, afterSave = null, promptsOverride = null)',
  'async function applySnapshot(id)',
  'function overwriteSnapshot(id)',
  'function bindSnapshotToCurrentCharacter(id)',
  'function deleteSnapshot(id)',
  'function openOverlay()',
  'function openComposer()',
  'function handleDocumentClick(event)',
]) {
  assert.ok(source.includes(marker), `test.46 缺少完整开关快照实现：${marker}`);
}

const stateBuilder = section('function makeStates(prompts)', 'function defaultSnapshotName()');
assert.ok(stateBuilder.includes('id: text(prompt.id)'), '快照必须优先保存条目 UID，不能只用名称匹配');
assert.ok(stateBuilder.includes('name: text(prompt.name || prompt.id)'), '快照需要保留名称作为旧预设兼容兜底');
assert.ok(stateBuilder.includes('enabled: prompt.enabled === true'), '快照没有保存完整开关状态');

const apply = section('async function applySnapshot(id)', 'function renameSnapshot(id)');
assert.ok(apply.includes("text(snapshot.presetName) !== presetName"), '快照不应跨预设误应用');
assert.ok(apply.includes('mergeSnapshotStates(prompts, snapshot.states)'), '应用快照时没有统一走 UID 与名称兜底匹配');
assert.ok(apply.includes('writeSwitchesToDraft(nextPrompts'), '应用快照后没有刷新工坊当前卡片');
assert.ok(apply.includes('saveAppliedDraft(presetName, nextPrompts, draftUpdated)'), '应用快照没有同步真实预设与运行状态');

const matching = section('function mergeSnapshotStates(prompts, states)', 'async function settleDraft()');
assert.ok(matching.includes('const statesById = new Map'), '应用快照时没有按 UID 匹配');
assert.ok(matching.includes('uniqueStatesByName'), '重导入后 UID 变化时没有名称兼容兜底');
assert.ok(matching.includes('promptNameCounts.get(name) === 1'), '同名条目不能在名称兜底时被错误覆盖');

const snapshotCreation = section('function saveNewSnapshot(inputName, afterSave = null, promptsOverride = null)', 'function findSnapshot(id)');
assert.ok(snapshotCreation.includes('states: makeStates(prompts)'), '新快照没有冻结当前全部条目状态');
assert.ok(snapshotCreation.includes('character: character ? { ...character } : null'), '新快照没有记录当前角色绑定');
assert.ok(snapshotCreation.includes('writeStore(store)'), '新快照没有持久化');

const overwrite = section('function overwriteSnapshot(id)', 'function bindSnapshotToCurrentCharacter(id)');
assert.ok(overwrite.includes('snapshot.states = makeStates(prompts)'), '覆盖操作没有更新整份冻结状态');

const branchGuard = source.match(/function isBranchMode\(\)[\s\S]*?function currentCharacter\(\)/)?.[0] || '';
assert.ok(branchGuard.includes('pm-panel-container--branch-mode'), '快照没有识别分支模式');
assert.ok(snapshotCreation.includes('isBranchMode()'), '分支模式下仍能错误保存快照');
assert.ok(apply.includes('isBranchMode()'), '分支模式下仍能错误应用快照');

const trigger = section('function mountTrigger()', 'function installStyle()');
assert.ok(trigger.includes("const nextTitle = captureActive ? '保存快照' : '开关快照'"), '顶部入口没有在快照模式中明确切换为保存');
assert.ok(trigger.includes("host.querySelector('[title=\"导入\"]')"), '快照入口没有定位导入按钮');
assert.ok(trigger.includes('host.insertBefore(button, importButton)'), '快照入口没有放在导入／导出的左边');
assert.ok(trigger.includes("button.dataset.pmmSnapshotTrigger = 'true'"), '快照入口没有稳定的顶层事件标记');
assert.ok(!trigger.includes("button.addEventListener('click', openOverlay)"), '入口不应依赖 Vue 重绘后会丢失的单按钮监听');

const homeOnly = section('function normalPresetContainer()', 'function nativeSaveButton()');
assert.ok(homeOnly.includes("DOC.getElementById('pmm-preset-regex-transfer-overlay')"), '打开正则管理器后仍可能显示快照入口');
assert.ok(homeOnly.includes("root.classList.contains('pmm-worldbook-mode')"), '进入世界书后仍可能显示快照入口');
assert.ok(homeOnly.includes(".side-panel-root .panel-btn.panel-btn--active"), '进入缝合、分支、收藏或正则后仍可能显示快照入口');
assert.ok(!homeOnly.includes("DOC?.querySelector?.('#preset-manager-main-panel .title-actions')"), '主页面定位失败后不应回退到其他模式的标题栏');

const delegatedClick = section('function handleDocumentClick(event)', 'function installStyle()');
assert.ok(delegatedClick.includes("closest?.('[data-pmm-snapshot-trigger]')"), '没有由顶层委托监听快照入口');
assert.ok(delegatedClick.includes('openOverlay();'), '顶层点击没有打开快照面板');

const overlay = section('function closeOverlay()', 'function normalTitleActions()');
assert.ok(overlay.includes("action === 'new') enterCaptureMode()"), '点击新建后没有返回预设进入快照模式');
assert.ok(overlay.includes('data-pmm-snapshot-name'), '快照名称没有使用工坊内输入框');
assert.ok(overlay.includes('data-pmm-snapshot-action="create"'), '命名界面没有保存快照按钮');
assert.ok(!overlay.includes('TOP.prompt'), '命名不应依赖浏览器原生 prompt');
assert.ok(overlay.includes('data-pmm-snapshot-action="menu"'), '快照行缺少紧凑的更多操作入口');
assert.ok(overlay.includes('pmm-switch-snapshot-menu'), '更多操作没有展开为快照菜单');

assert.ok(source.includes('@media (max-width:768px)'), '快照面板缺少手机端底部弹层布局');
assert.ok(source.includes('快照只保存开关；正文、分组、顺序和条目本身不会变化。'), '快照面板没有说明其不会改变正文或排序');

console.log('test.47 回归通过：快照入口只在主预设首页稳定挂载，放在导入左侧，名称使用工坊内输入框。');
