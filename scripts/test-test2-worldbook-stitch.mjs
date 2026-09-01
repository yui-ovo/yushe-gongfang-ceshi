import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../dist/worldbook-stitch-test2.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');

for (const marker of [
  '__PMM_WORLDBOOK_STITCH_TEST2__',
  'getWorldInfoNames',
  'loadWorldInfo',
  'saveWorldInfo',
  "topType: 'preset'",
  "bottom: { kind: 'world'",
  'worldToPreset',
  'presetToWorld',
  'worldToWorld',
  "[4, '@D 插入聊天深度']",
  "entry.constant === true ? 'is-blue' : 'is-green'",
  "entry.disable = entry.disable !== true",
  'await saveSide(target)',
]) {
  if (!source.includes(marker)) throw new Error(`test.2 世界书缝合缺少实现标记：${marker}`);
}

if (!source.includes("const atDepth = Number(entry.position) === 4") ||
    !source.includes("${atDepth ? `<label><span>深度</span>")) {
  throw new Error('深度字段没有按 @D 位置条件显示');
}

if (!entry.includes('worldbook-stitch-test2.js') || !workshop.includes('__PMM_WORLDBOOK_STITCH_TEST2__?.open?.()')) {
  throw new Error('世界书占位入口尚未接通 test.2 页面');
}

console.log('test.2 世界书双向缝合静态回归检查通过。');
