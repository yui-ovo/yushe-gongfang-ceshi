import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

assert.ok(worldbook.includes('data-pmm-wb-panel="${sideName}"'), '世界书卡片缺少上下位置标记');
assert.ok(worldbook.includes('return sideName === \'top\''), '世界书标题结构没有区分上、下卡片');
assert.ok(worldbook.includes('pmm-wb-header-left${sideName === \'top\' ? \' header-left\' : \'\'}'), '上方世界书没有复用预设标题左区结构');
assert.ok(worldbook.includes('header-card title-card title-card--interactive pmm-wb-title-card'), '上方世界书没有复用预设标题卡片外框');
assert.ok(worldbook.includes(': row;'), '下方世界书没有保留原有无外框标题结构');

const presetCssStart = workshop.indexOf('/* “预设名称框长度”只控制上方原生预设；下方卡片不跟随。 */');
const presetCssEnd = workshop.indexOf('/* 分支卡片使用独立的“分支名称框长度”', presetCssStart);
const presetCss = workshop.slice(presetCssStart, presetCssEnd);

assert.notEqual(presetCssStart, -1, '找不到上方名称框作用域样式');
assert.notEqual(presetCssEnd, -1, '找不到上方名称框作用域样式结尾');
assert.ok(presetCss.includes('.pm-main-wrapper .pm-header .title-select'), '上方原生预设名称框没有继续响应滑杆');
assert.ok(!presetCss.includes('.pm-panel-container--merge-mode > .preset-panel'), '预设名称滑杆仍会命中下方卡片');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-header-left'), '上方世界书没有复用固定标题视口');
assert.ok(presetCss.includes('var(--pmm-primary-title-viewport-width,150px)'), '上方世界书没有复用上方预设的外层宽度');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-title-card'), '上方世界书标题外框没有承接内部横向滚动');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-source-select'), '上方世界书名称框没有响应预设名称滑杆');
assert.ok(presetCss.includes('var(--pmm-primary-native-preset-width,90px) + var(--pmm-user-preset-width-offset)'), '上方世界书没有沿用预设名称长度变量');
assert.ok(!presetCss.includes('data-pmm-wb-panel="bottom"'), '下方世界书仍被预设名称滑杆覆盖');

console.log('test.56 世界书标题宽度作用域通过：仅上方复用预设视口，下方卡片保持弹性宽度。');
