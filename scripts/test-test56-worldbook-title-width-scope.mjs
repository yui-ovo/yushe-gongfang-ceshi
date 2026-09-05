import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.11.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

assert.ok(worldbook.includes('data-pmm-wb-panel="${sideName}"'), '世界书卡片缺少上下位置标记');
assert.ok(worldbook.includes('return sideName === \'top\''), '世界书标题结构没有区分上、下卡片');
assert.ok(worldbook.includes('pmm-wb-header-left${sideName === \'top\' ? \' header-left\' : \'\'}'), '上方世界书没有复用预设标题左区结构');
assert.ok(worldbook.includes('header-card title-card title-card--interactive pmm-wb-title-card'), '上方世界书没有复用预设标题卡片外框');
assert.ok(worldbook.includes(': row;'), '下方世界书没有保留原有无外框标题结构');

const presetCssStart = workshop.indexOf('/* 上下原生预设同步名称长度；下方世界书没有 pm-header，因此保持自身布局。 */');
const presetCssEnd = workshop.indexOf('/* 分支卡片使用独立的“分支名称框长度”', presetCssStart);
const presetCss = workshop.slice(presetCssStart, presetCssEnd);

assert.notEqual(presetCssStart, -1, '找不到上方名称框作用域样式');
assert.notEqual(presetCssEnd, -1, '找不到上方名称框作用域样式结尾');
assert.ok(workshop.includes('#preset-manager-main-panel.pmm-worldbook-mode .pm-panel-container > .pm-main-wrapper .pm-header'), '混合缝合没有限定上方原生预设的稳定宽度基准');
assert.ok(workshop.includes('#preset-manager-main-panel.pmm-worldbook-mode .pm-panel-container--merge-mode > .preset-panel .pm-header'), '混合缝合没有覆盖下方原生预设的稳定宽度基准');
assert.ok(workshop.includes('--pmm-native-preset-width:108px!important'), '混合缝合仍会把 flex 压缩后的宽度当作滑杆零点');
assert.ok(presetCss.includes('.pm-main-wrapper .pm-header .title-select'), '上方原生预设名称框没有继续响应滑杆');
assert.ok(presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .pm-header .title-select'), '缝合下方原生预设没有同步响应滑杆');
assert.ok(!presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .title-select'), '存在会误伤下方世界书的宽泛标题选择器');
assert.ok(!presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .title-row'), '存在会误伤下方世界书的宽泛标题行选择器');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-header-left'), '上方世界书没有复用固定标题视口');
assert.ok(presetCss.includes('var(--pmm-primary-title-viewport-width,150px)'), '上方世界书没有复用上方预设的外层宽度');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-title-card'), '上方世界书标题外框没有承接内部横向滚动');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-source-select'), '上方世界书名称框没有响应预设名称滑杆');
assert.ok(presetCss.includes('calc(90px + var(--pmm-user-preset-width-offset))'), '上方世界书没有从预设的 90px 手机默认宽度开始调节');
assert.ok(!presetCss.includes('--pmm-primary-native-preset-width'), '上方世界书仍会采用不稳定的运行时名称宽度基准');
assert.ok(!presetCss.includes('data-pmm-wb-panel="bottom"'), '下方世界书仍被预设名称滑杆覆盖');

console.log('test.56 世界书标题宽度作用域通过：混合缝合零点稳定，上下预设同步，上方世界书复用，下方世界书保持弹性。');
