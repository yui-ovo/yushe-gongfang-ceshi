import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.94.js', import.meta.url), 'utf8');
const start = source.indexOf('/* “预设名称框长度”同步控制主预设和缝合页下方的另一张预设卡片。');
const end = source.indexOf('/* 分支卡片使用独立的“分支名称框长度”', start);
assert.ok(start >= 0 && end > start, '无法定位预设双卡顶部名称区规则');

const presetHeaderCss = source.slice(start, end);
for (const marker of [
  '名称框在有余量时必须自然填满左侧',
  'flex:1 1 calc(var(--pmm-native-preset-width,108px) + var(--pmm-user-preset-width-offset) + 50px)!important;',
  'flex:1 1 calc(var(--pmm-native-preset-width,108px) + var(--pmm-user-preset-width-offset))!important;',
  'flex:1 1 auto!important;',
  'width:100%!important;',
  'min-width:0!important;',
  'overflow:hidden!important;',
]) {
  assert.ok(presetHeaderCss.includes(marker), `预设双卡顶部缺少弹性排版规则：${marker}`);
}

assert.ok(!presetHeaderCss.includes('flex:0 0 var(--pmm-title-viewport-width,150px)!important;'), '名称区仍会被首次测量宽度冻结');
assert.ok(!presetHeaderCss.includes('width:var(--pmm-title-viewport-width,150px)!important;'), '名称区仍会把旧宽度写成固定轨道');
assert.ok(!presetHeaderCss.includes('flex:0 0 max-content!important;'), '名称内容仍会按内容宽度收缩并留下透明空槽');

console.log('test.39 回归通过：手机预设／世界书双卡顶部会让名称区弹性填满余量，图标前不再留冻结空槽。');
