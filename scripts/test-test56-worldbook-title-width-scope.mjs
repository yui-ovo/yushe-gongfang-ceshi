import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.13.js', import.meta.url), 'utf8');
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
assert.ok(workshop.includes('#preset-manager-main-panel.pmm-mobile-layout-enabled .pm-panel-container > .pm-main-wrapper .pm-header'), '上方原生预设没有使用统一手机标题视口');
assert.ok(workshop.includes('#preset-manager-main-panel.pmm-mobile-layout-enabled .pm-panel-container--merge-mode > .preset-panel .pm-header'), '缝合下方原生预设没有使用统一手机标题视口');
assert.ok(workshop.includes('--pmm-title-viewport-width:150px!important'), '预设与世界书混合模式的外层视口仍不一致');
assert.ok(workshop.includes("root.style.setProperty('--pmm-primary-title-viewport-width', '150px')"), '上方世界书仍可能读取首次挂载时尚未统一的预设视口');
assert.ok(presetCss.includes('flex:0 1 calc(var(--pmm-title-viewport-width,150px) + var(--pmm-user-preset-width-offset))'), '原生预设标题视口没有按滑杆理想宽度响应式伸缩');
assert.ok(presetCss.includes('min-width:92px!important'), '小屏预设标题没有保留名称与固定按钮的最低空间');
assert.ok(presetCss.includes('width:calc(100% + var(--pmm-title-overflow-actions-width))'), '导入导出没有留在标题横划区');
assert.ok(presetCss.includes('width:calc(100% - var(--pmm-title-overflow-actions-width))'), '首屏名称行没有与导入导出横划区分离');
assert.ok(presetCss.includes('.pm-main-wrapper .pm-header .title-select'), '上方原生预设名称框没有继续响应滑杆');
assert.ok(presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .pm-header .title-select'), '缝合下方原生预设没有同步响应滑杆');
assert.ok(presetCss.includes('flex:1 1 0!important'), '原生预设名称框没有承担弹性缩放');
assert.ok(presetCss.includes('width:auto!important'), '原生预设名称框仍被固定宽度锁住');
assert.ok(presetCss.includes('min-width:0!important'), '原生预设名称框在小屏时不能优先缩短');
assert.ok(workshop.includes('.pmm-preset-search-btn{width:24px!important;min-width:24px!important'), '预设搜索按钮没有固定宽度');
assert.ok(workshop.includes('.pm-header .title-row>.title-edit-btn{flex:0 0 17px!important'), '预设小铅笔没有固定为不可压缩');
assert.ok(!presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .title-select'), '存在会误伤下方世界书的宽泛标题选择器');
assert.ok(!presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .title-row'), '存在会误伤下方世界书的宽泛标题行选择器');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-header-left'), '上方世界书没有复用响应式标题视口');
assert.ok(presetCss.includes('var(--pmm-primary-title-viewport-width,150px)'), '上方世界书没有复用上方预设的外层宽度');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-title-card'), '上方世界书标题外框没有承接内部横向滚动');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-source-select'), '上方世界书名称框没有响应预设名称滑杆');
assert.ok(presetCss.includes('flex:0 1 calc(var(--pmm-primary-title-viewport-width,150px) + var(--pmm-user-preset-width-offset))'), '上方世界书没有与预设共用响应式理想宽度');
assert.ok(worldbook.includes('.pmm-wb-source-action{width:25px;height:25px;min-width:25px'), '世界书搜索或铅笔仍可能被小屏压缩');
assert.ok(!presetCss.includes('--pmm-primary-native-preset-width'), '上方世界书仍会采用不稳定的运行时名称宽度基准');
assert.ok(!presetCss.includes('data-pmm-wb-panel="bottom"'), '下方世界书仍被预设名称滑杆覆盖');
assert.ok(!worldbook.includes('.title-action-btn[title^="导入"]'), '世界书混合模式仍会彻底隐藏预设导入按钮');
assert.ok(!worldbook.includes('.title-action-btn[title^="导出"]'), '世界书混合模式仍会彻底隐藏预设导出按钮');
assert.ok(worldbook.includes('button[title="取消当前预设全部分组"]{display:none!important}'), '世界书模式误恢复了不适用的清空分组按钮');

console.log('test.56 世界书标题宽度作用域通过：名称优先缩放，搜索和铅笔固定，导入导出可横划。');
