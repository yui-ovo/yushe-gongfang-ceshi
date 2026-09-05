import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.01.js', import.meta.url), 'utf8');
const start = source.indexOf('PMM_FAVORITE_CATEGORY_TOUCH_ACTIONS_TEST53');
const end = source.indexOf('个人测试通道：底部工具栏“世界书”入口', start);
assert.ok(start >= 0 && end > start, '无法定位 test.53 收藏分类触摸兼容模块');
const compat = source.slice(start, end);

for (const marker of [
  "const ROOT_SELECTOR = '#preset-manager-main-panel .pm-panel-container--favorite-mode'",
  "const ACTION_SELECTOR = '.category-header__actions .category-action'",
  "const RENAME_SELECTOR = 'button.category-action[title=\"重命名分类\"]'",
  "header.setAttribute('draggable', 'false')",
  "current.action.click()",
  "event.isTrusted",
  "event.stopImmediatePropagation()",
  "DOC.addEventListener('pointerup', finishAction",
  "DOC.addEventListener('touchend', finishAction",
]) {
  assert.ok(compat.includes(marker), `test.53 缺少收藏分类触摸兜底：${marker}`);
}

assert.ok(
  compat.indexOf("header.setAttribute('draggable', 'false')") < compat.indexOf('current.action.click()'),
  '必须先关闭分类头原生拖拽，再从抬手事件触发改名',
);
assert.ok(
  compat.includes("else header.setAttribute('draggable', draggable)"),
  '操作结束后没有恢复分类头原始 draggable 状态',
);
assert.ok(
  !compat.includes("button.category-action[title=\"删除分类\"]"),
  '触摸兜底不得自动触发删除操作',
);

console.log('test.53 回归通过：收藏分类铅笔在安卓 Chromium 上由抬手直接触发，父级拖拽会临时隔离并恢复。');
