import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');

const mustInclude = (needle, message) => {
  if (!source.includes(needle)) throw new Error(message);
};

mustInclude('<div class="pmm-wb-header-left">', '世界书标题栏缺少左侧名称区域');
mustInclude('<span class="pmm-wb-title-row">', '世界书标题栏缺少名称行');
mustInclude('<div class="pmm-wb-header-right">', '世界书标题栏缺少右侧工具栏区域');
mustInclude('.pmm-wb-header-left{flex:1 1 auto}', '世界书标题栏左侧没有弹性占用可用空间');
mustInclude('.pmm-wb-header-left>.pmm-wb-title-row{width:100%;flex:1 1 auto}', '世界书名称行没有填满左侧区域');
mustInclude('.pmm-wb-source-select{width:auto!important;min-width:0!important;max-width:none!important;flex:1 1 auto!important}', '世界书名称选择框没有使用弹性宽度');

if (source.includes('.pmm-wb-source-select{max-width:132px!important}')) {
  throw new Error('手机世界书名称选择框仍被固定为 132px');
}

console.log('test.39 世界书双卡标题栏弹性布局检查通过');
