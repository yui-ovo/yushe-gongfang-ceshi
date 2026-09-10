import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.02.js', import.meta.url), 'utf8');

// 1. Static Source Code Assertions
for (const marker of [
  "const API_KEY = '__PMM_DESKTOP_FOUR_CORNER_RESIZE__'",
  "const STORAGE_KEY = 'pmm.desktop-panel-size.v1'",
  "const CORNERS = ['nw', 'ne', 'sw', 'se']",
  "cursor: nwse-resize",
  "cursor: nesw-resize",
  "any-pointer: fine",
  "any-hover: hover",
  "Math.min(980,",
  "Math.min(560,",
  "Math.min(420,",
  "targetW = Math.round(startW + 2 * signX * dx)",
  "targetH = Math.round(startH + 2 * signY * dy)",
  "onHandleDblClick",
  "restoreDefaultSize",
  "saveSavedSize",
  "clearSavedSize",
  "pmm-desktop-custom-sized",
  "pmm-desktop-resize-handle",
  "container-type: inline-size",
  "@container (max-width: 600px)",
  "flex-wrap: wrap !important",
  "width: 100% !important",
  "justify-content: flex-start !important",
  "margin-left: 0 !important",
  "overflow-x: auto !important",
  "flex-wrap: nowrap !important",
  ".pm-panel-container--branch-mode .pm-header > .header-right",
  ".pm-panel-container--merge-mode .pm-header > .header-right",
  ".pm-panel-container--favorite-mode .pm-header > .header-right",
]) {
  assert.ok(source.includes(marker), `workshop-v3.02.js 必须包含四角缩放及容器查询逻辑标记：${marker}`);
}

// 2. Functional Test Suite in Simulated DOM / JS Environment
class MockStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
}

class MockElement {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    const set = new Set();
    this.classList = {
      add: cls => set.add(cls),
      remove: cls => set.delete(cls),
      contains: cls => set.has(cls)
    };
    Object.defineProperty(this, 'className', {
      get: () => Array.from(set).join(' '),
      set: val => {
        set.clear();
        for (const cls of String(val || '').trim().split(/\s+/)) {
          if (cls) set.add(cls);
        }
      }
    });
    this.style = {
      _props: new Map(),
      setProperty(k, v) { this._props.set(k, v); },
      getPropertyValue(k) { return this._props.get(k) || ''; },
      removeProperty(k) { this._props.delete(k); }
    };
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this._rect = { left: 100, top: 100, width: 620, height: 700 };
  }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    child.parentElement = null;
  }
  remove() {
    this.parentElement?.removeChild?.(this);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this.listeners.get(type);
    if (arr) {
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }
  }
  dispatchEvent(ev) {
    ev.currentTarget = this;
    ev.target = ev.target || this;
    const arr = this.listeners.get(ev.type) || [];
    for (const fn of arr) fn(ev);
  }
  querySelector(sel) {
    for (const c of this.children) {
      if (c.matches?.(sel)) return c;
      const f = c.querySelector?.(sel);
      if (f) return f;
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    for (const c of this.children) {
      if (c.matches?.(sel)) res.push(c);
      res.push(...(c.querySelectorAll?.(sel) || []));
    }
    return res;
  }
  matches(sel) {
    if (sel.includes('[data-pmm-corner=')) {
      const m = sel.match(/\[data-pmm-corner="([^"]+)"\]/);
      return this.classList.contains('pmm-desktop-resize-handle') && this.dataset.pmmCorner === m?.[1];
    }
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return this.classList.contains(cls);
    }
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    return false;
  }
  closest(sel) {
    let cur = this;
    while (cur) {
      if (cur.matches?.(sel)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  getBoundingClientRect() { return { ...this._rect }; }
  setPointerCapture() {}
  releasePointerCapture() {}
}

class MockDocument {
  constructor(win) {
    this.defaultView = win;
    this.head = new MockElement('head', this);
    this.body = new MockElement('body', this);
    this.documentElement = this.body;
    this.listeners = new Map();
  }
  createElement(tag) { return new MockElement(tag, this); }
  getElementById(id) {
    return this.head.querySelector(`#${id}`) || this.body.querySelector(`#${id}`);
  }
  querySelector(sel) { return this.body.querySelector(sel); }
  querySelectorAll(sel) { return this.body.querySelectorAll(sel); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this.listeners.get(type);
    if (arr) {
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }
  }
  dispatchEvent(ev) {
    ev.currentTarget = this;
    ev.target = ev.target || this;
    const arr = this.listeners.get(ev.type) || [];
    for (const fn of [...arr]) fn(ev);
  }
}

class MockWindow {
  constructor(opts = {}) {
    this.innerWidth = opts.innerWidth ?? 1440;
    this.innerHeight = opts.innerHeight ?? 900;
    this.pointerFine = opts.pointerFine ?? true;
    this.anyPointerFine = opts.anyPointerFine ?? this.pointerFine;
    this.hoverSupport = opts.hoverSupport ?? true;
    this.anyHoverSupport = opts.anyHoverSupport ?? this.hoverSupport;
    this.localStorage = new MockStorage();
    this.document = new MockDocument(this);
    this.MutationObserver = class {
      constructor(cb) { this.cb = cb; }
      observe() {}
      disconnect() {}
    };
  }
  matchMedia(query) {
    const self = this;
    if (query.includes('any-pointer: fine')) return { matches: self.anyPointerFine };
    if (query.includes('pointer: fine')) return { matches: self.pointerFine };
    if (query.includes('any-hover: hover')) return { matches: self.anyHoverSupport };
    if (query.includes('hover: hover')) return { matches: self.hoverSupport };
    if (query.includes('max-width: 768px')) return { matches: self.innerWidth <= 768 };
    return { matches: false };
  }
}

// 3. Test Cases Execution
const mockWin = new MockWindow();
globalThis.window = mockWin;
globalThis.document = mockWin.document;
globalThis.top = mockWin;

// Extract module function and run it in test environment
const moduleStart = source.indexOf("const API_KEY = '__PMM_DESKTOP_FOUR_CORNER_RESIZE__';");
const moduleEnd = source.indexOf("console.info('[预设工坊] test.94 已加载", moduleStart);
assert.ok(moduleStart > 0 && moduleEnd > moduleStart, '无法提取 test.94 模块代码');

const moduleCode = source.slice(moduleStart, moduleEnd) + "\nreturn TOP[API_KEY];";
const initModule = new Function('window', 'document', moduleCode);
const api = initModule(mockWin, mockWin.document);

assert.ok(api, '模块初始化后成功暴露 TOP API');

// Test 3.1: Desktop Environment Validation (5 Specific Scenarios)
// 1. 1600x700 + fine pointer -> desktop -> 应启用
const win1600x700 = new MockWindow({ innerWidth: 1600, innerHeight: 700, pointerFine: true, hoverSupport: true });
assert.equal(api.isDesktop(win1600x700.document), true, '1600x700 + fine pointer 应识别为桌面端');

// 2. 1366x650 + fine pointer -> desktop -> 应启用
const win1366x650 = new MockWindow({ innerWidth: 1366, innerHeight: 650, pointerFine: true, hoverSupport: true });
assert.equal(api.isDesktop(win1366x650.document), true, '1366x650 + fine pointer 应识别为桌面端');

// 3. 390x844 touch -> mobile -> 不启用
const win390x844 = new MockWindow({ innerWidth: 390, innerHeight: 844, pointerFine: false, anyPointerFine: false, hoverSupport: false, anyHoverSupport: false });
assert.equal(api.isDesktop(win390x844.document), false, '390x844 touch 应识别为移动端，不启用');

// 4. 768x1024 touch -> tablet -> 不启用
const win768x1024 = new MockWindow({ innerWidth: 768, innerHeight: 1024, pointerFine: false, anyPointerFine: false, hoverSupport: false, anyHoverSupport: false });
assert.equal(api.isDesktop(win768x1024.document), false, '768x1024 touch 应识别为平板，不启用');

// 5. 1280x800 touch + mouse(any-pointer:fine) -> desktop -> 应启用
const win1280x800TouchMouse = new MockWindow({
  innerWidth: 1280,
  innerHeight: 800,
  pointerFine: false,
  anyPointerFine: true,
  hoverSupport: false,
  anyHoverSupport: true
});
assert.equal(api.isDesktop(win1280x800TouchMouse.document), true, '1280x800 touch + mouse(any-pointer:fine) 应识别为桌面端并启用');

// 纯触控平板 (1024x768 无 fine pointer / 无 hover) -> 不启用
const touchTabletWin = new MockWindow({ innerWidth: 1024, innerHeight: 768, pointerFine: false, anyPointerFine: false, hoverSupport: false, anyHoverSupport: false });
assert.equal(api.isDesktop(touchTabletWin.document), false, '纯触屏平板（无 fine pointer / 无 hover）不应创建桌面缩放热区');

// Test 3.2: Handles creation on .pm-panel-container
const rootPanel = mockWin.document.createElement('div');
rootPanel.id = 'preset-manager-main-panel';
mockWin.document.body.appendChild(rootPanel);

const container = mockWin.document.createElement('div');
container.classList.add('pm-panel-container');
rootPanel.appendChild(container);

api.ensureHandles(container);

const handles = container.querySelectorAll('.pmm-desktop-resize-handle');
assert.equal(handles.length, 4, '必须为桌面端面板创建 4 个角缩放 handle');
const cornersFound = handles.map(h => h.dataset.pmmCorner).sort();
assert.deepEqual(cornersFound, ['ne', 'nw', 'se', 'sw'], '4 个 handle 分别对应 nw, ne, sw, se');

// Test 3.3: Centered Dragging on All 4 Corners
function simulateDrag(cornerHandle, dx, dy) {
  let defaultPrevented = false;
  let stopped = false;
  const preventDefault = () => { defaultPrevented = true; };
  const stopPropagation = () => { stopped = true; };

  // pointerdown
  cornerHandle.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    preventDefault,
    stopPropagation
  });

  // pointermove
  mockWin.document.dispatchEvent({
    type: 'pointermove',
    pointerId: 1,
    clientX: 100 + dx,
    clientY: 100 + dy,
    preventDefault,
    stopPropagation
  });

  // pointerup
  mockWin.document.dispatchEvent({
    type: 'pointerup',
    pointerId: 1,
    clientX: 100 + dx,
    clientY: 100 + dy,
    preventDefault,
    stopPropagation
  });
}

// Initial container: 620 x 700
container._rect = { left: 100, top: 100, width: 620, height: 700 };

// Drag SE corner: dx = +50, dy = +30 -> centered expansion -> +100px width, +60px height
const seHandle = container.querySelector('[data-pmm-corner="se"]');
simulateDrag(seHandle, 50, 30);
assert.equal(container.style.getPropertyValue('--pmm-custom-panel-width'), '720px', 'SE 拖拽应整体居中扩展宽度');
assert.equal(container.style.getPropertyValue('--pmm-custom-panel-height'), '760px', 'SE 拖拽应整体居中扩展高度');
assert.ok(container.classList.contains('pmm-desktop-custom-sized'), '容器应标记已自定义尺寸样式类');

// Verify localStorage persistence
const saved = api.loadSavedSize();
assert.deepEqual(saved, { width: 720, height: 760 }, '缩放尺寸必须持久化到 localStorage');

// Drag NW corner: dx = -50, dy = -30 -> pulling top-left outward should also expand by +100, +60
container._rect = { left: 50, top: 70, width: 720, height: 760 };
const nwHandle = container.querySelector('[data-pmm-corner="nw"]');
simulateDrag(nwHandle, -50, -30);
assert.equal(container.style.getPropertyValue('--pmm-custom-panel-width'), '820px', 'NW 拖拽向外拉伸应居中增加宽度');
assert.equal(container.style.getPropertyValue('--pmm-custom-panel-height'), '820px', 'NW 拖拽向外拉伸应居中增加高度');

// Test 3.4: Dynamic Min Bounds Clamping in Single Mode
simulateDrag(seHandle, -500, -500);
const singleWidth = parseFloat(container.style.getPropertyValue('--pmm-custom-panel-width'));
const singleHeight = parseFloat(container.style.getPropertyValue('--pmm-custom-panel-height'));
assert.equal(singleWidth, 560, '单栏模式最小宽度受动态限制为 560px');
assert.equal(singleHeight, 420, '最小高度受动态限制为 420px');

// Test 3.5: Dynamic Min Bounds Clamping in Dual Mode (Merge / Branch / Favorite)
container.classList.add('pm-panel-container--branch-mode');
assert.equal(api.isDualMode(container), true, '应识别分支模式为双栏布局');

container._rect = { left: 100, top: 100, width: 1200, height: 700 };
simulateDrag(seHandle, -500, -500);
const dualWidth = parseFloat(container.style.getPropertyValue('--pmm-custom-panel-width'));
assert.equal(dualWidth, 980, '双栏模式最小宽度受动态保护为 980px，防止两栏严重挤压');

// Test 3.6: Double-click Restore Default Size
// Clicking once should not reset
seHandle.dispatchEvent({ type: 'click', preventDefault: () => {}, stopPropagation: () => {} });
assert.ok(container.classList.contains('pmm-desktop-custom-sized'), '单击缩放角不执行恢复默认');

// Double click any handle restores default size and clears storage
let defaultPrevented = false;
seHandle.dispatchEvent({
  type: 'dblclick',
  preventDefault: () => { defaultPrevented = true; },
  stopPropagation: () => {}
});

assert.equal(container.classList.contains('pmm-desktop-custom-sized'), false, '双击恢复后应移除自定义尺寸样式类');
assert.equal(container.style.getPropertyValue('--pmm-custom-panel-width'), '', '双击恢复后应清除宽度自定义变量');
assert.equal(container.style.getPropertyValue('--pmm-custom-panel-height'), '', '双击恢复后应清除高度自定义变量');
assert.equal(api.loadSavedSize(), null, '双击恢复后应同步清除 localStorage 存储记录');

// Test 3.7: Mobile cleans up handles if present
container.classList.remove('pm-panel-container--branch-mode');
api.ensureHandles(container); // recreate handles
assert.equal(container.querySelectorAll('.pmm-desktop-resize-handle').length, 4);

// Change mockWin to mobile and ensure handles removed
mockWin.innerWidth = 500;
api.ensureHandles(container);
assert.equal(container.querySelectorAll('.pmm-desktop-resize-handle').length, 0, '移动端环境下自动清理四角缩放 handle');

// Test 3.8: Desktop Header Container Query Responsiveness (Narrow width adaptation)
mockWin.innerWidth = 1920;
api.ensureHandles(container);
const styleEl = mockWin.document.getElementById('pmm-desktop-corner-resize-style');
assert.ok(styleEl, '桌面端环境应自动安装尺寸与容器查询样式');
const css = styleEl.textContent;
assert.ok(css.includes('container-type: inline-size'), '必须在面板容器上定义 inline-size 容器查询类型');
assert.ok(css.includes('@container (max-width: 600px)'), '必须使用 @container 响应面板容器自身宽度');
assert.ok(css.includes('flex-wrap: wrap !important'), '窄宽度时 header 换行排列');
assert.ok(css.includes('width: 100% !important'), '窄宽度时 header-right 占满整行');
assert.ok(css.includes('margin-left: 0 !important'), '窄宽度时 header-right 清除右对齐与左边距');
assert.ok(css.includes('justify-content: flex-start !important'), '窄宽度时 header-right 按钮从左向右排列');
assert.ok(css.includes('overflow-x: auto !important'), '窄宽度时工具按钮支持横向滚动作为兜底');
assert.ok(css.includes('flex-shrink: 0 !important'), '工具按钮不能被压扁');
assert.ok(css.includes(':not(.pmm-mobile-layout-enabled)'), '容器查询样式限定桌面端，排除手机端');
assert.ok(css.includes('.pm-panel-container--branch-mode'), '覆盖分支模式');
assert.ok(css.includes('.pm-panel-container--merge-mode'), '覆盖缝合模式');
assert.ok(css.includes('.pm-panel-container--favorite-mode'), '覆盖收藏模式');

console.log('test.94 回归通过：桌面端面板四角拖动居中缩放、双栏防挤压边界、双击重置、触屏隔离以及窄宽度工具栏容器查询自适应全部正常。');

