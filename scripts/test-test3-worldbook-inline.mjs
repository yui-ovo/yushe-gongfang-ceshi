import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

for (const marker of [
  '__PMM_WORLDBOOK_STITCH_TEST3__',
  'getWorldInfoNames',
  'loadWorldInfo',
  'saveWorldInfo',
  "topType: 'preset'",
  'pmm-worldbook-mode',
  'pm-panel-container--merge-mode',
  'pmm-wb-native-hidden',
  'data-pmm-wb-kind-switch',
  'data-pmm-wb-native-transfer',
  'worldToPreset',
  'presetToWorld',
  'worldToWorld',
  "[4, '@D 插入聊天深度']",
  "entry.constant === true ? 'is-blue' : 'is-green'",
  'entry.disable = entry.disable !== true',
  'batch-delete',
  'entry-search',
  'source-picker',
  'resetSide(state.top, true)',
  'resetSide(state.bottom, true)',
]) {
  if (!source.includes(marker)) throw new Error(`test.3 内嵌世界书缺少实现标记：${marker}`);
}

if (source.includes('position:fixed;inset:0;z-index:2147483000')) {
  throw new Error('test.3 仍残留旧版全屏独立窗口');
}

if (!source.includes("const atDepth = Number(entry.position) === 4") ||
    !source.includes("${atDepth ? `<label><span>深度</span>")) {
  throw new Error('深度字段没有按 @D 位置条件显示');
}

if (!entry.includes('worldbook-stitch-test3.js') || !workshop.includes('__PMM_WORLDBOOK_STITCH_TEST3__?.open?.()')) {
  throw new Error('世界书工具栏入口尚未接通 test.3 内嵌模式');
}

console.log('test.3 世界书原生双卡片静态回归检查通过。');
