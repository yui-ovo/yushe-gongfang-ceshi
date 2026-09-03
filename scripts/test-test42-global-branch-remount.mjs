import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

for (const marker of [
  'function nativeTopPanelFrom(mainWrapper)',
  'function ensureWorldbookPanelAnchors()',
  'function globalWorldbookBranchPanelsMounted()',
  'function isCurrentGlobalWorldbookBranchSession(session)',
  'function globalWorldbookBranchRecoveryDelay()',
  'function reloadGlobalWorldbookBranchPanels(session',
  'function scheduleGlobalWorldbookBranchPanelRecovery(delay = globalWorldbookBranchRecoveryDelay()',
  'await refreshWorldNames();',
  'await loadWorldSide(state.bottom);',
  "status = '重新载入全局世界书分支…'",
  'globalBranchPanelRecoveryAttempts',
  'globalBranchPanelRecoveryTimerSession',
  'globalBranchPanelRecoveryBusySession',
  'globalBranchPanelSession',
  'globalBranchPanelReload',
  'globalBranchPanelRecoveryReported',
  'if (isGlobalWorldbookBranchMode() && !globalWorldbookBranchPanelsMounted())',
]) {
  assert.ok(source.includes(marker), `test.42 缺少全局世界书分支重挂实现：${marker}`);
}

const anchorStart = source.indexOf('function ensureWorldbookPanelAnchors()');
const anchorEnd = source.indexOf('function globalWorldbookBranchPanelsMounted()', anchorStart);
const anchors = source.slice(anchorStart, anchorEnd);
assert.ok(anchors.includes('state.host?.contains(state.container)'), '重挂前没有确认容器仍属于当前宿主');
assert.ok(anchors.includes('nativeTopPanelFrom(mainWrapper)'), '重挂时没有重新取得原生上卡');
assert.ok(anchors.includes("host?.querySelector?.('.pm-panel-container')"), '重挂时没有重新确认当前可见的宿主容器');

const reloadStart = source.indexOf('function reloadGlobalWorldbookBranchPanels(session');
const reloadEnd = source.indexOf('function scheduleGlobalWorldbookBranchPanelRecovery', reloadStart);
const reload = source.slice(reloadStart, reloadEnd);
assert.ok(reload.indexOf('await refreshWorldNames();') < reload.indexOf('await loadWorldSide(state.bottom);'), '重载顺序应先刷新名称再读取下卡内容');
assert.ok(reload.lastIndexOf('renderPanels();') > reload.indexOf('await loadWorldSide(state.bottom);'), '读取完成后没有重新挂载分支双卡');
assert.ok(reload.includes('globalBranchPanelReload?.session === session'), '切换与恢复没有复用同一个加载任务');
assert.ok(reload.includes('isCurrentGlobalWorldbookBranchSession(session)'), '异步重载没有在 await 后校验当前会话');

const switchStart = source.indexOf('async function switchBottomMode(mode)');
const switchEnd = source.indexOf('async function handleAction(button)', switchStart);
const switchMode = source.slice(switchStart, switchEnd);
assert.ok(switchMode.indexOf('renderPanels();') < switchMode.indexOf('await reloadGlobalWorldbookBranchPanels'), '切到分支时没有先显示卡片骨架');
assert.ok(switchMode.includes('scheduleGlobalWorldbookBranchPanelRecovery'), '切换读取未完成时没有进入延迟恢复');
assert.ok(!switchMode.includes("state.bottomMode = 'world';"), '暂未就绪时不应擅自退出全局世界书分支');
assert.ok(switchMode.includes("const retryCurrentBranch = mode === 'branches'"), '同一分支卡片缺失时不能主动重新加载');

const recoveryStart = source.indexOf('function scheduleGlobalWorldbookBranchPanelRecovery');
const recoveryEnd = source.indexOf('function decorateNativeTop()', recoveryStart);
const recovery = source.slice(recoveryStart, recoveryEnd);
assert.ok(recovery.includes('console.warn'), '宿主尚未就绪时不应立刻以致命错误中止');
assert.ok(recovery.includes('globalWorldbookBranchRecoveryDelay(), session'), '重试没有使用退避等待');
assert.ok(recovery.includes('!globalWorldbookBranchPanelsMounted()'), '恢复完成后没有再次确认卡片仍挂载');
assert.ok(recovery.includes('globalBranchPanelRecoveryBusySession === session'), '旧会话不应释放新会话的恢复锁');
assert.ok(!recovery.includes('const activeSession = globalBranchPanelSession'), '旧会话不应替新会话安排恢复');

const resetStart = source.indexOf('function resetClosedState()');
const resetEnd = source.indexOf('function close()', resetStart);
const reset = source.slice(resetStart, resetEnd);
assert.ok(reset.includes('globalBranchPanelSession += 1;'), '关闭后没有使旧异步会话失效');
assert.ok(reset.includes('globalBranchPanelRecoveryTimerSession = null;'), '关闭后没有清理恢复计时器所属会话');
assert.ok(reset.includes('globalBranchPanelRecoveryBusySession = null;'), '关闭后没有清理恢复锁所属会话');

console.log('test.42 回归通过：宿主替换双卡容器后，全局世界书分支会重新取锚、退避重读并安全挂载。');
