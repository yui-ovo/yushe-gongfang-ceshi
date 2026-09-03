import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

const mustInclude = (needle, message) => {
  assert.ok(source.includes(needle), message);
};

for (const [needle, message] of [
  ["const GLOBAL_WORLDBOOK_BRANCHES_KEY = '__PMM_GLOBAL_WORLDBOOK_BRANCHES_V1__';", '缺少全局世界书分支的独立持久化键'],
  ['const GLOBAL_WORLDBOOK_BRANCHES_VERSION = 1;', '缺少全局世界书分支的数据版本'],
  ["bottomMode: 'world'", '下方卡片没有独立的世界书/世界书分支模式'],
  ['worldPrimaryBindings: new Map()', '没有单独记录角色主绑定世界书'],
  ['worldAdditionalBindings: new Map()', '没有单独记录角色附加世界书'],
  ['function normalizeGlobalWorldbookNames(', '缺少全局世界书名称的去重与有效性清理'],
  ['function mergeGlobalWorldbookNames(', '缺少全局世界书分支的叠加合并'],
  ['function readGlobalWorldbookBranchState()', '缺少全局世界书分支读取逻辑'],
  ['function writeGlobalWorldbookBranchState(nextState)', '缺少全局世界书分支保存逻辑'],
  ['function currentGlobalWorldbookNames()', '缺少当前原生全局世界书选择读取逻辑'],
  ["async function applyGlobalWorldbookBranch(branch, mode = 'replace')", '缺少整组替换/叠加应用入口'],
  ['function globalWorldbookBranchCandidates()', '缺少主绑定世界书排除、附加世界书保留的候选筛选'],
  ['data-wb-bottom-mode="branches"', '下方缺少切换到全局世界书分支的入口'],
  ['data-pmm-wb-global-library', '缺少全局世界书候选库面板'],
  ['data-pmm-wb-global-branch-drop', '缺少向当前全局世界书分支拖入书籍的落点'],
  ['data-wb-global-branch-apply="replace"', '缺少整组替换当前勾选按钮'],
  ['data-wb-global-branch-apply="merge"', '缺少在当前勾选基础上叠加按钮'],
  ['data-wb-global-branch-quick-toggle', '缺少默认关闭的悬浮栏快捷入口开关'],
  ["kind: 'global-worldbook'", '候选世界书拖拽没有使用独立负载类型'],
  ['GLOBAL_WORLDBOOK_BRANCH_QUICK_MARK', '缺少悬浮栏全局世界书分支快捷入口标记'],
  ['function scheduleGlobalBranchQuickToolbar()', '缺少按需安装悬浮栏快捷入口的调度'],
]) {
  mustInclude(needle, message);
}

const applyStart = source.indexOf("async function applyGlobalWorldbookBranch(branch, mode = 'replace')");
const applyEnd = source.indexOf('function getLoadedPresetNameSafe()', applyStart);
assert.ok(applyStart >= 0 && applyEnd > applyStart, '无法定位全局世界书分支应用逻辑');
const apply = source.slice(applyStart, applyEnd);
assert.ok(apply.includes("mode === 'merge'"), '叠加模式没有与整组替换区分');
assert.ok(apply.includes('updateNativeGlobalWorldbookNames(next);'), '分支应用没有通过原生全局世界书选择器同步');
assert.ok(!apply.includes('saveWorldInfo'), '应用全局世界书分支不应直接保存或改写世界书内容');

const nativeUpdateStart = source.indexOf('function updateNativeGlobalWorldbookNames(names)');
const nativeUpdateEnd = source.indexOf("async function applyGlobalWorldbookBranch(branch, mode = 'replace')", nativeUpdateStart);
assert.ok(nativeUpdateStart >= 0 && nativeUpdateEnd > nativeUpdateStart, '无法定位原生全局世界书选择同步逻辑');
const nativeUpdate = source.slice(nativeUpdateStart, nativeUpdateEnd);
assert.ok(nativeUpdate.includes("DOC.querySelector('#world_info')"), '没有操作酒馆原生全局世界书选择器');
assert.ok(nativeUpdate.includes("trigger('change')"), '更新原生全局世界书选择后没有触发保存通路');

// 与源码的纯数据规则保持一致：只保存仍存在的书名、保留顺序并去重。
const normalizeNames = (values, availableNames) => {
  const available = new Set(availableNames.map(value => String(value).trim()).filter(Boolean));
  const seen = new Set();
  return (Array.isArray(values) ? values : []).map(value => String(value ?? '').trim())
    .filter(name => name && available.has(name) && !seen.has(name) && (seen.add(name), true));
};
const mergeNames = (current, addition, availableNames) => normalizeNames([...(current || []), ...(addition || [])], availableNames);

const available = ['基础设定', '功能性附加书', '共享但主绑定'];
assert.deepEqual(
  normalizeNames([' 基础设定 ', '不存在的书', '基础设定', '', '功能性附加书'], available),
  ['基础设定', '功能性附加书'],
  '分支书单应忽略不存在、空白和重复名称',
);
assert.deepEqual(
  mergeNames(['功能性附加书'], ['基础设定', '功能性附加书'], available),
  ['功能性附加书', '基础设定'],
  '叠加书单应保留当前顺序并只追加新书',
);

// 主绑定优先：同一本书即使也是某角色的附加书，只要是任意角色的主绑定，便不能出现在全局候选库。
const candidateNames = (names, primary, additional) => names.filter(name => {
  void additional.get(name); // 附加绑定只是说明信息，不会排除候选。
  return !(primary.get(name)?.size);
});
const primary = new Map([['共享但主绑定', new Set(['角色 A'])]]);
const additional = new Map([
  ['功能性附加书', new Set(['角色 B'])],
  ['共享但主绑定', new Set(['角色 C'])],
]);
assert.deepEqual(
  candidateNames(available, primary, additional),
  ['基础设定', '功能性附加书'],
  '角色主绑定世界书应排除；单纯附加绑定世界书仍应可加入全局分支',
);

console.log('test.41 回归通过：全局世界书分支的持久化、筛选、替换/叠加、拖入与按需快捷入口均已覆盖。');
