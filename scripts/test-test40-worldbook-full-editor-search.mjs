import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-stitch-test3.js', import.meta.url), 'utf8');
const editorStart = source.indexOf('function openTextEditor(');
const editorEnd = source.indexOf('function openContentEditor(', editorStart);
if (editorStart < 0 || editorEnd < 0) throw new Error('找不到世界书放大编辑器');
const editor = source.slice(editorStart, editorEnd);

const mustInclude = (needle, message) => {
  if (!editor.includes(needle)) throw new Error(message);
};

mustInclude('searchable = false', '放大编辑器缺少按需搜索开关');
mustInclude('data-wb-editor-search-toggle', '世界书放大编辑器缺少搜索入口');
mustInclude('data-wb-editor-search-input', '世界书放大编辑器缺少搜索输入框');
mustInclude('<span class="pmm-wb-editor-search-count" data-wb-editor-search-count>0/0</span>', '世界书放大编辑器没有把匹配数放到搜索框右侧');
mustInclude('data-wb-editor-search-previous', '世界书放大编辑器缺少上一个结果按钮');
mustInclude('data-wb-editor-search-next', '世界书放大编辑器缺少下一个结果按钮');
mustInclude('data-wb-editor-replace-current', '世界书放大编辑器缺少替换当前命中按钮');
mustInclude('data-wb-editor-replace-all', '世界书放大编辑器缺少替换全部命中按钮');
mustInclude('pmm-wb-editor-search-preview', '世界书放大编辑器缺少高亮预览层');
mustInclude("highlightedWorldSearchText(textarea.value, result.query, result.match, 'content')", '正文搜索没有复用世界书高亮逻辑');
mustInclude('replaceOneWorldSearchText(textarea.value, match, replacement)', '单条替换没有限定在当前正文');
mustInclude('replaceWorldSearchText(textarea.value, query, replacement)', '全部替换没有限定在当前正文');
mustInclude('undoStack.push(textarea.value)', '搜索替换没有进入本次编辑撤销栈');

if (!source.includes("ariaLabel: '放大编辑世界书正文',\n      searchable: true,")) {
  throw new Error('世界书正文没有启用全屏搜索替换');
}
if (!source.includes('.pmm-wb-editor-body.is-search-active>textarea')) {
  throw new Error('全屏正文搜索没有启用高亮镜像层');
}
if (!source.includes('.pmm-wb-editor-search-primary{flex-wrap:nowrap!important}')) {
  throw new Error('全屏正文搜索栏没有强制保持单行');
}

console.log('test.40 世界书全屏单条搜索、跳转、高亮和替换检查通过');
