/* 个人测试通道 test.2：预设／世界书双向缝合。 */
(() => {
  'use strict';

  const SELF = window;
  const TOP = window.parent || window;
  const DOC = TOP.document;
  const API_KEY = '__PMM_WORLDBOOK_STITCH_TEST2__';
  const ROOT_ID = 'pmm-worldbook-stitch-test2';
  const STYLE_ID = 'pmm-worldbook-stitch-test2-style';
  const PAGE_SIZE = 240;
  const POSITION_OPTIONS = [
    [0, '角色定义之前'],
    [1, '角色定义之后'],
    [5, '示例消息之前'],
    [6, '示例消息之后'],
    [2, '作者注释顶部'],
    [3, '作者注释底部'],
    [4, '@D 插入聊天深度'],
    [7, 'Outlet'],
  ];
  const ROLE_OPTIONS = [[0, '系统'], [1, '用户'], [2, '助手']];
  const WORLD_DEFAULTS = {
    key: [], keysecondary: [], comment: '', content: '', constant: true,
    vectorized: false, selective: true, selectiveLogic: 0, addMemo: false,
    order: 100, position: 0, disable: false, ignoreBudget: false,
    excludeRecursion: false, preventRecursion: false, matchPersonaDescription: false,
    matchCharacterDescription: false, matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false, matchScenario: false, matchCreatorNotes: false,
    delayUntilRecursion: 0, probability: 100, useProbability: true, depth: 4,
    outletName: '', group: '', groupOverride: false, groupWeight: 100,
    scanDepth: null, caseSensitive: null, matchWholeWords: null,
    useGroupScoring: null, automationId: '', role: 0, sticky: null,
    cooldown: null, delay: null, triggers: [],
  };

  const state = {
    open: false,
    busy: false,
    topType: 'preset',
    topName: '',
    bottomName: '',
    presetNames: [],
    worldNames: [],
    top: { kind: 'preset', name: '', data: null, entries: [], selected: new Set(), expanded: new Set(), limit: PAGE_SIZE },
    bottom: { kind: 'world', name: '', data: null, entries: [], selected: new Set(), expanded: new Set(), limit: PAGE_SIZE },
  };

  let context = null;
  let operationTail = Promise.resolve();

  function notify(type, message) {
    const toast = TOP.toastr?.[type] || SELF.toastr?.[type];
    if (typeof toast === 'function') toast(message, '世界书缝合');
    else console[type === 'error' ? 'error' : 'info'](`[世界书缝合] ${message}`);
  }

  function clone(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function h(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function safeId(value) {
    return encodeURIComponent(String(value ?? ''));
  }

  function decodeId(value) {
    try { return decodeURIComponent(String(value ?? '')); } catch (_) { return String(value ?? ''); }
  }

  function getContext() {
    return SELF.SillyTavern?.getContext?.() || TOP.SillyTavern?.getContext?.() || null;
  }

  function getPresetNamesSafe() {
    try { return [...(SELF.getPresetNames?.() || [])].map(String); } catch (_) { return []; }
  }

  function getLoadedPresetNameSafe() {
    try { return String(SELF.getLoadedPresetName?.() || ''); } catch (_) { return ''; }
  }

  function getPresetSafe(name) {
    try { return clone(SELF.getPreset?.(name) || {}); } catch (_) { return {}; }
  }

  function entriesFromWorld(data) {
    const entries = data?.entries && typeof data.entries === 'object' ? Object.values(data.entries) : [];
    return entries.filter(entry => entry && typeof entry === 'object')
      .sort((a, b) => Number(a.uid) - Number(b.uid));
  }

  function entriesFromPreset(name) {
    const prompts = getPresetSafe(name)?.prompts;
    return Array.isArray(prompts)
      ? prompts.filter(prompt => prompt && typeof prompt === 'object' && typeof prompt.id === 'string')
      : [];
  }

  function entryKey(side, entry) {
    return side.kind === 'world' ? String(entry.uid) : String(entry.id);
  }

  function entryTitle(side, entry) {
    if (side.kind === 'preset') return String(entry.name || entry.id || '未命名条目');
    return String(entry.comment || entry.key?.[0] || `世界书条目 ${entry.uid}`);
  }

  function freeWorldUid(data) {
    const used = new Set(Object.keys(data?.entries || {}).map(Number).filter(Number.isInteger));
    let uid = 0;
    while (used.has(uid)) uid += 1;
    return uid;
  }

  function newPromptId() {
    return `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function worldToPreset(entry) {
    return {
      id: newPromptId(),
      name: entryTitle({ kind: 'world' }, entry),
      content: String(entry.content || ''),
      enabled: entry.disable !== true,
      role: Number(entry.position) === 4 ? ['system', 'user', 'assistant'][Number(entry.role)] || 'system' : 'system',
    };
  }

  function presetToWorld(prompt, data) {
    const uid = freeWorldUid(data);
    return {
      uid,
      ...clone(WORLD_DEFAULTS),
      comment: String(prompt.name || prompt.id || `预设条目 ${uid}`),
      content: String(prompt.content || ''),
      disable: prompt.enabled === false,
    };
  }

  function worldToWorld(entry, data) {
    const uid = freeWorldUid(data);
    return { ...clone(entry), uid };
  }

  function setStatus(text, tone = '') {
    DOC.querySelectorAll(`#${ROOT_ID} .pmm-wb-status`).forEach(element => {
      element.textContent = text;
      element.dataset.tone = tone;
    });
  }

  function enqueue(label, task) {
    operationTail = operationTail.then(async () => {
      state.busy = true;
      setStatus(`${label}…`);
      try {
        await task();
        setStatus('已同步', 'ok');
      } catch (error) {
        console.error(`[世界书缝合] ${label}失败`, error);
        setStatus('同步失败', 'error');
        notify('error', `${label}失败：${error?.message || error}`);
      } finally {
        state.busy = false;
      }
    });
    return operationTail;
  }

  async function refreshNames() {
    context = getContext();
    if (!context?.loadWorldInfo || !context?.saveWorldInfo) {
      throw new Error('当前酒馆没有提供世界书读写接口');
    }
    state.presetNames = getPresetNamesSafe();
    state.worldNames = [...(context.getWorldInfoNames?.() || [])].map(String);
    if (!state.worldNames.length && context.updateWorldInfoList) {
      await context.updateWorldInfoList();
      state.worldNames = [...(context.getWorldInfoNames?.() || [])].map(String);
    }
    if (!state.topName || !(state.topType === 'preset' ? state.presetNames : state.worldNames).includes(state.topName)) {
      state.topName = state.topType === 'preset'
        ? (getLoadedPresetNameSafe() || state.presetNames[0] || '')
        : (state.worldNames[0] || '');
    }
    if (!state.bottomName || !state.worldNames.includes(state.bottomName)) {
      state.bottomName = state.worldNames.find(name => name !== state.topName) || state.worldNames[0] || '';
    }
  }

  async function loadSide(which) {
    const side = state[which];
    side.kind = which === 'bottom' ? 'world' : state.topType;
    side.name = which === 'bottom' ? state.bottomName : state.topName;
    side.selected.clear();
    side.expanded.clear();
    side.limit = PAGE_SIZE;
    if (!side.name) {
      side.data = null;
      side.entries = [];
      return;
    }
    if (side.kind === 'preset') {
      side.data = getPresetSafe(side.name);
      side.entries = entriesFromPreset(side.name);
      return;
    }
    side.data = await context.loadWorldInfo(side.name);
    side.entries = entriesFromWorld(side.data);
  }

  async function loadBoth() {
    await Promise.all([loadSide('top'), loadSide('bottom')]);
  }

  async function savePresetSide(side) {
    const prompts = clone(side.entries);
    if (side.name === getLoadedPresetNameSafe() && typeof SELF.updatePresetWith === 'function') {
      await SELF.updatePresetWith('in_use', preset => {
        preset.prompts = prompts;
        return preset;
      });
    } else if (typeof SELF.setPreset === 'function') {
      await SELF.setPreset(side.name, { prompts });
    } else {
      throw new Error('当前酒馆没有提供预设保存接口');
    }
    side.data = getPresetSafe(side.name);
  }

  async function saveWorldSide(side) {
    if (!side.data?.entries) throw new Error('世界书数据尚未载入');
    await context.saveWorldInfo(side.name, clone(side.data), true);
    const other = side === state.top ? state.bottom : state.top;
    if (other.kind === 'world' && other.name === side.name) {
      other.data = clone(side.data);
      other.entries = entriesFromWorld(other.data);
    }
  }

  async function saveSide(side) {
    return side.kind === 'world' ? saveWorldSide(side) : savePresetSide(side);
  }

  function findEntry(side, key) {
    return side.entries.find(entry => entryKey(side, entry) === String(key));
  }

  function removeEntries(side, keys) {
    const wanted = new Set(keys.map(String));
    if (side.kind === 'world') {
      for (const key of wanted) delete side.data.entries[key];
      side.entries = entriesFromWorld(side.data);
    } else {
      side.entries = side.entries.filter(entry => !wanted.has(String(entry.id)));
    }
  }

  function appendToSide(target, source, sourceEntries) {
    if (target.kind === 'preset') {
      const additions = source.kind === 'world'
        ? sourceEntries.map(worldToPreset)
        : sourceEntries.map(entry => ({ ...clone(entry), id: newPromptId() }));
      target.entries.push(...additions);
      return additions.length;
    }
    target.data.entries ||= {};
    for (const entry of sourceEntries) {
      const addition = source.kind === 'world'
        ? worldToWorld(entry, target.data)
        : presetToWorld(entry, target.data);
      target.data.entries[addition.uid] = addition;
    }
    target.entries = entriesFromWorld(target.data);
    return sourceEntries.length;
  }

  async function transfer(fromWhich, move) {
    const source = state[fromWhich];
    const target = state[fromWhich === 'top' ? 'bottom' : 'top'];
    const keys = [...source.selected];
    if (!keys.length) return notify('warning', '请先勾选需要缝合的条目');
    if (move && source.kind === 'world' && target.kind === 'world' && source.name === target.name) {
      return notify('warning', '同一本世界书内不需要移动');
    }
    const selectedEntries = keys.map(key => findEntry(source, key)).filter(Boolean).map(clone);
    if (!selectedEntries.length) return;

    await enqueue(move ? '移动条目' : '复制条目', async () => {
      appendToSide(target, source, selectedEntries);
      await saveSide(target);
      if (move) {
        removeEntries(source, keys);
        await saveSide(source);
      }
      source.selected.clear();
      await loadSide(fromWhich === 'top' ? 'bottom' : 'top');
      if (move) await loadSide(fromWhich);
      render();
      notify('success', `已${move ? '移动' : '复制'} ${selectedEntries.length} 条`);
    });
  }

  function positionOptions(selected) {
    return POSITION_OPTIONS.map(([value, label]) =>
      `<option value="${value}"${Number(selected) === value ? ' selected' : ''}>${h(label)}</option>`).join('');
  }

  function roleOptions(selected) {
    return ROLE_OPTIONS.map(([value, label]) =>
      `<option value="${value}"${Number(selected) === value ? ' selected' : ''}>${h(label)}</option>`).join('');
  }

  function field(sideName, key, fieldName, value, options = {}) {
    const type = options.type || 'text';
    const className = options.className || '';
    const extra = options.extra || '';
    if (type === 'textarea') {
      return `<textarea class="${className}" data-side="${sideName}" data-key="${safeId(key)}" data-field="${fieldName}" ${extra}>${h(value)}</textarea>`;
    }
    return `<input class="${className}" type="${type}" value="${h(value)}" data-side="${sideName}" data-key="${safeId(key)}" data-field="${fieldName}" ${extra}>`;
  }

  function renderWorldDetails(sideName, side, entry, key) {
    const atDepth = Number(entry.position) === 4;
    const outlet = Number(entry.position) === 7;
    const green = entry.constant !== true;
    return `<div class="pmm-wb-details">
      <div class="pmm-wb-detail-row pmm-wb-title-row">
        <label><span>条目名称</span>${field(sideName, key, 'comment', entry.comment || '')}</label>
        <button class="pmm-wb-strategy ${green ? 'is-green' : 'is-blue'}" data-action="strategy" data-side="${sideName}" data-key="${safeId(key)}" title="${green ? '关键词触发（绿灯）' : '常驻触发（蓝灯）'}">
          <span></span>${green ? '绿灯' : '蓝灯'}
        </button>
      </div>
      <div class="pmm-wb-meta-grid ${atDepth ? 'has-depth' : ''}">
        <label class="is-position"><span>位置</span><select data-side="${sideName}" data-key="${safeId(key)}" data-field="position">${positionOptions(entry.position)}</select></label>
        <label><span>顺序</span>${field(sideName, key, 'order', Number(entry.order ?? 100), { type: 'number', extra: 'step="1"' })}</label>
        ${atDepth ? `<label><span>深度</span>${field(sideName, key, 'depth', Number(entry.depth ?? 4), { type: 'number', extra: 'min="0" max="999" step="1"' })}</label>
        <label><span>角色</span><select data-side="${sideName}" data-key="${safeId(key)}" data-field="role">${roleOptions(entry.role)}</select></label>` : ''}
        ${outlet ? `<label class="is-outlet"><span>Outlet 名称</span>${field(sideName, key, 'outletName', entry.outletName || '')}</label>` : ''}
      </div>
      ${green ? `<label class="pmm-wb-wide-field"><span>关键词</span>${field(sideName, key, 'key', Array.isArray(entry.key) ? entry.key.join(', ') : '')}</label>` : ''}
      <label class="pmm-wb-wide-field"><span>内容正文</span>${field(sideName, key, 'content', entry.content || '', { type: 'textarea' })}</label>
    </div>`;
  }

  function renderPresetDetails(sideName, entry, key) {
    return `<div class="pmm-wb-details">
      <div class="pmm-wb-detail-row">
        <label><span>条目名称</span>${field(sideName, key, 'name', entry.name || '')}</label>
        <label class="pmm-wb-role"><span>角色</span><select data-side="${sideName}" data-key="${safeId(key)}" data-field="role">
          ${['system', 'user', 'assistant'].map(role => `<option value="${role}"${entry.role === role ? ' selected' : ''}>${{ system: '系统', user: '用户', assistant: '助手' }[role]}</option>`).join('')}
        </select></label>
      </div>
      <label class="pmm-wb-wide-field"><span>内容正文</span>${field(sideName, key, 'content', entry.content || '', { type: 'textarea' })}</label>
    </div>`;
  }

  function renderEntry(sideName, side, entry) {
    const key = entryKey(side, entry);
    const expanded = side.expanded.has(key);
    const selected = side.selected.has(key);
    const enabled = side.kind === 'world' ? entry.disable !== true : entry.enabled !== false;
    const strategy = side.kind === 'world'
      ? `<span class="pmm-wb-dot ${entry.constant === true ? 'is-blue' : 'is-green'}" title="${entry.constant === true ? '蓝灯：常驻' : '绿灯：关键词触发'}"></span>`
      : '';
    return `<article class="pmm-wb-entry${expanded ? ' is-expanded' : ''}" data-entry-key="${safeId(key)}">
      <div class="pmm-wb-entry-head">
        <button class="pmm-wb-check${selected ? ' is-selected' : ''}" data-action="select" data-side="${sideName}" data-key="${safeId(key)}" aria-label="选择条目"><i class="fa-solid ${selected ? 'fa-square-check' : 'fa-square'}"></i></button>
        <button class="pmm-wb-expand" data-action="expand" data-side="${sideName}" data-key="${safeId(key)}" aria-label="展开条目"><i class="fa-solid fa-gear"></i></button>
        ${strategy}<button class="pmm-wb-entry-title" data-action="expand" data-side="${sideName}" data-key="${safeId(key)}">${h(entryTitle(side, entry))}</button>
        <button class="pmm-wb-toggle${enabled ? ' is-on' : ''}" data-action="toggle" data-side="${sideName}" data-key="${safeId(key)}" title="${enabled ? '已启用' : '已停用'}"><span></span></button>
      </div>
      ${expanded ? (side.kind === 'world' ? renderWorldDetails(sideName, side, entry, key) : renderPresetDetails(sideName, entry, key)) : ''}
    </article>`;
  }

  function renderPanel(sideName, side) {
    const visible = side.entries.slice(0, side.limit);
    const remaining = side.entries.length - visible.length;
    const typeLabel = side.kind === 'world' ? '世界书' : '预设';
    const options = (side.kind === 'world' ? state.worldNames : state.presetNames).map(name =>
      `<option value="${h(name)}"${name === side.name ? ' selected' : ''}>${h(name)}</option>`).join('');
    const typeSwitch = sideName === 'top' ? `<div class="pmm-wb-kind-switch">
      <button data-action="top-kind" data-kind="preset" class="${state.topType === 'preset' ? 'is-active' : ''}">预设</button>
      <button data-action="top-kind" data-kind="world" class="${state.topType === 'world' ? 'is-active' : ''}">世界书</button>
    </div>` : `<span class="pmm-wb-fixed-kind"><i class="fa-solid fa-book-atlas"></i> 世界书</span>`;
    return `<section class="pmm-wb-panel" data-panel="${sideName}">
      <header class="pmm-wb-panel-head">
        ${typeSwitch}
        <select class="pmm-wb-book-select" data-action="select-source" data-side="${sideName}" aria-label="选择${typeLabel}">${options}</select>
        <span class="pmm-wb-count">${side.entries.length} 条</span>
      </header>
      <div class="pmm-wb-list">
        ${side.name ? visible.map(entry => renderEntry(sideName, side, entry)).join('') : `<div class="pmm-wb-empty">暂无可用${typeLabel}</div>`}
        ${remaining > 0 ? `<button class="pmm-wb-more" data-action="more" data-side="${sideName}">继续显示 ${Math.min(PAGE_SIZE, remaining)} 条（剩余 ${remaining}）</button>` : ''}
      </div>
    </section>`;
  }

  function rootMarkup() {
    return `<div class="pmm-wb-dialog" role="dialog" aria-modal="true" aria-label="世界书缝合">
      <header class="pmm-wb-main-head">
        <div><i class="fa-solid fa-book-atlas"></i><strong>世界书缝合</strong><small>预设／世界书双向转换</small></div>
        <span class="pmm-wb-status">已同步</span>
        <button data-action="close" class="pmm-wb-close" aria-label="关闭"><i class="fa-solid fa-xmark"></i></button>
      </header>
      ${renderPanel('top', state.top)}
      <nav class="pmm-wb-transfer-bar" aria-label="条目缝合操作">
        <button data-action="transfer" data-from="top" data-move="0"><i class="fa-solid fa-copy"></i><span>上→下 复制</span></button>
        <button data-action="transfer" data-from="top" data-move="1"><i class="fa-solid fa-arrow-down"></i><span>上→下 移动</span></button>
        <button data-action="transfer" data-from="bottom" data-move="0"><i class="fa-solid fa-copy"></i><span>下→上 复制</span></button>
        <button data-action="transfer" data-from="bottom" data-move="1"><i class="fa-solid fa-arrow-up"></i><span>下→上 移动</span></button>
      </nav>
      ${renderPanel('bottom', state.bottom)}
    </div>`;
  }

  function render() {
    const root = DOC.getElementById(ROOT_ID);
    if (!root) return;
    const scrolls = {};
    root.querySelectorAll('.pmm-wb-list').forEach(list => { scrolls[list.closest('[data-panel]')?.dataset.panel] = list.scrollTop; });
    root.innerHTML = rootMarkup();
    root.querySelectorAll('.pmm-wb-list').forEach(list => { list.scrollTop = scrolls[list.closest('[data-panel]')?.dataset.panel] || 0; });
  }

  function parseFieldValue(target, fieldName) {
    if (fieldName === 'key') return String(target.value || '').split(',').map(value => value.trim()).filter(Boolean);
    if (['position', 'order', 'depth', 'role'].includes(fieldName)) return Number(target.value) || 0;
    return String(target.value ?? '');
  }

  async function updateField(target) {
    const sideName = target.dataset.side;
    const side = state[sideName];
    const key = decodeId(target.dataset.key);
    const fieldName = target.dataset.field;
    const entry = findEntry(side, key);
    if (!entry || !fieldName) return;
    entry[fieldName] = side.kind === 'preset' && fieldName === 'role'
      ? String(target.value || 'system')
      : parseFieldValue(target, fieldName);
    if (side.kind === 'world') side.data.entries[String(entry.uid)] = entry;
    await enqueue('保存条目', async () => {
      await saveSide(side);
      render();
    });
  }

  async function handleAction(button) {
    const action = button.dataset.action;
    if (action === 'close') return close();
    if (action === 'top-kind') {
      const kind = button.dataset.kind;
      if (!['preset', 'world'].includes(kind) || kind === state.topType) return;
      state.topType = kind;
      state.topName = kind === 'preset' ? (getLoadedPresetNameSafe() || state.presetNames[0] || '') : (state.worldNames[0] || '');
      await enqueue('切换来源', async () => { await loadSide('top'); render(); });
      return;
    }
    if (action === 'select-source') return;
    const sideName = button.dataset.side;
    const side = state[sideName];
    if (action === 'more') {
      side.limit += PAGE_SIZE;
      render();
      return;
    }
    if (action === 'transfer') {
      await transfer(button.dataset.from, button.dataset.move === '1');
      return;
    }
    const key = decodeId(button.dataset.key);
    const entry = findEntry(side, key);
    if (!entry) return;
    if (action === 'select') {
      side.selected.has(key) ? side.selected.delete(key) : side.selected.add(key);
      render();
      return;
    }
    if (action === 'expand') {
      side.expanded.has(key) ? side.expanded.delete(key) : side.expanded.add(key);
      render();
      return;
    }
    if (action === 'toggle') {
      if (side.kind === 'world') {
        entry.disable = entry.disable !== true;
        side.data.entries[String(entry.uid)] = entry;
      } else entry.enabled = entry.enabled === false;
      await enqueue('切换条目开关', async () => { await saveSide(side); render(); });
      return;
    }
    if (action === 'strategy' && side.kind === 'world') {
      entry.constant = entry.constant !== true;
      if (entry.constant) entry.vectorized = false;
      side.data.entries[String(entry.uid)] = entry;
      await enqueue('切换蓝绿灯', async () => { await saveSide(side); render(); });
    }
  }

  function installEvents(root) {
    root.addEventListener('click', event => {
      const button = event.target.closest?.('[data-action]');
      if (!button || button.tagName === 'SELECT') return;
      event.preventDefault();
      void handleAction(button);
    });
    root.addEventListener('change', event => {
      const target = event.target;
      if (target.matches?.('[data-action="select-source"]')) {
        const sideName = target.dataset.side;
        if (sideName === 'top') state.topName = target.value;
        else state.bottomName = target.value;
        void enqueue('载入列表', async () => { await loadSide(sideName); render(); });
        return;
      }
      if (target.matches?.('[data-field]')) void updateField(target);
    });
    root.addEventListener('pointerdown', event => event.stopPropagation());
  }

  function installStyle() {
    if (DOC.getElementById(STYLE_ID)) return;
    const style = DOC.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID}{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(0,0,0,.45);color:var(--SmartThemeBodyColor,#252b36);font-family:var(--mainFontFamily,system-ui,sans-serif)}
#${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID} button,#${ROOT_ID} input,#${ROOT_ID} select,#${ROOT_ID} textarea{font:inherit;color:inherit}
.pmm-wb-dialog{width:min(96vw,1050px);height:min(94dvh,1100px);display:grid;grid-template-rows:auto minmax(0,1fr) auto minmax(0,1fr);gap:7px;padding:10px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:16px;background:var(--SmartThemeBlurTintColor,rgba(245,247,250,.97));box-shadow:0 18px 60px rgba(0,0,0,.4);overflow:hidden}
.pmm-wb-main-head,.pmm-wb-panel-head,.pmm-wb-entry-head,.pmm-wb-detail-row{display:flex;align-items:center}.pmm-wb-main-head{min-height:38px;gap:10px;padding:0 5px}.pmm-wb-main-head>div{display:flex;align-items:center;gap:8px;min-width:0}.pmm-wb-main-head strong{white-space:nowrap}.pmm-wb-main-head small{opacity:.58;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmm-wb-status{margin-left:auto;font-size:12px;opacity:.65}.pmm-wb-status[data-tone=ok]{color:#13a76b}.pmm-wb-status[data-tone=error]{color:#ef4f5f}.pmm-wb-close{width:34px;height:34px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:10px;background:transparent}
.pmm-wb-panel{min-height:0;display:flex;flex-direction:column;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:13px;overflow:hidden;background:color-mix(in srgb,var(--SmartThemeBlurTintColor,#fff) 92%,transparent)}
.pmm-wb-panel-head{gap:8px;padding:8px;border-bottom:1px solid color-mix(in srgb,currentColor 13%,transparent)}.pmm-wb-kind-switch{display:flex;padding:2px;border-radius:9px;background:color-mix(in srgb,currentColor 8%,transparent)}.pmm-wb-kind-switch button{border:0;border-radius:7px;background:transparent;padding:5px 9px}.pmm-wb-kind-switch button.is-active{background:#526071;color:#fff}.pmm-wb-fixed-kind{white-space:nowrap;padding:5px 8px}.pmm-wb-book-select{min-width:0;flex:1;height:34px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:9px;background:color-mix(in srgb,var(--SmartThemeBlurTintColor,#fff) 90%,transparent);padding:0 8px}.pmm-wb-count{font-size:12px;opacity:.65;white-space:nowrap}
.pmm-wb-list{min-height:0;overflow:auto;overscroll-behavior:contain;padding:7px;display:flex;flex-direction:column;gap:6px}.pmm-wb-entry{flex:none;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:11px;background:color-mix(in srgb,var(--SmartThemeBlurTintColor,#fff) 96%,transparent);overflow:hidden}.pmm-wb-entry.is-expanded{border-color:color-mix(in srgb,#3485f6 55%,transparent)}.pmm-wb-entry-head{height:43px;padding:4px 8px;gap:7px}.pmm-wb-entry-head button{border:0;background:transparent}.pmm-wb-check,.pmm-wb-expand{width:28px;height:30px;padding:0;opacity:.7}.pmm-wb-check.is-selected{color:#3485f6;opacity:1}.pmm-wb-entry-title{min-width:0;flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmm-wb-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 7px currentColor}.pmm-wb-dot.is-blue{color:#3485f6;background:#3485f6}.pmm-wb-dot.is-green{color:#19bf72;background:#19bf72}.pmm-wb-toggle{width:35px;height:20px!important;border-radius:12px!important;padding:2px!important;background:#9ba3ad!important;flex:none}.pmm-wb-toggle span{display:block;width:16px;height:16px;border-radius:50%;background:white;transition:transform .15s}.pmm-wb-toggle.is-on{background:#2878ed!important}.pmm-wb-toggle.is-on span{transform:translateX(15px)}
.pmm-wb-details{padding:8px 12px 12px;border-top:1px solid color-mix(in srgb,currentColor 10%,transparent);display:flex;flex-direction:column;gap:9px}.pmm-wb-details label{display:flex;flex-direction:column;gap:4px;min-width:0}.pmm-wb-details label>span{font-size:12px;opacity:.67}.pmm-wb-details input,.pmm-wb-details select,.pmm-wb-details textarea{width:100%;border:1px solid color-mix(in srgb,currentColor 17%,transparent);border-radius:8px;background:color-mix(in srgb,var(--SmartThemeBlurTintColor,#fff) 86%,transparent);padding:7px 9px}.pmm-wb-details textarea{min-height:110px;resize:vertical;line-height:1.45}.pmm-wb-detail-row{gap:8px}.pmm-wb-detail-row label:first-child{flex:1}.pmm-wb-role{width:105px}.pmm-wb-title-row .pmm-wb-strategy{align-self:flex-end;height:35px;min-width:72px;border:1px solid currentColor;border-radius:9px;background:transparent}.pmm-wb-strategy span{display:inline-block;width:10px;height:10px;margin-right:5px;border-radius:50%;background:currentColor;box-shadow:0 0 7px currentColor}.pmm-wb-strategy.is-blue{color:#3485f6}.pmm-wb-strategy.is-green{color:#19bf72}.pmm-wb-meta-grid{display:grid;grid-template-columns:minmax(150px,2fr) minmax(72px,.7fr);gap:8px}.pmm-wb-meta-grid.has-depth{grid-template-columns:minmax(140px,2fr) minmax(65px,.6fr) minmax(65px,.6fr) minmax(78px,.75fr)}.pmm-wb-meta-grid .is-outlet{grid-column:1/-1}.pmm-wb-more{flex:none;border:1px dashed color-mix(in srgb,currentColor 20%,transparent);border-radius:9px;background:transparent;padding:9px;opacity:.7}.pmm-wb-empty{margin:auto;opacity:.55}
.pmm-wb-transfer-bar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.pmm-wb-transfer-bar button{min-width:0;border:1px solid color-mix(in srgb,currentColor 17%,transparent);border-radius:10px;background:color-mix(in srgb,var(--SmartThemeBlurTintColor,#fff) 94%,transparent);padding:7px 5px;display:flex;align-items:center;justify-content:center;gap:5px}.pmm-wb-transfer-bar button:active{transform:scale(.98)}.pmm-wb-transfer-bar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:600px){#${ROOT_ID}{padding:max(4px,env(safe-area-inset-top)) 4px max(4px,env(safe-area-inset-bottom))}.pmm-wb-dialog{width:100%;height:100%;border-radius:13px;padding:6px;gap:5px}.pmm-wb-main-head small{display:none}.pmm-wb-panel-head{padding:6px;gap:5px}.pmm-wb-kind-switch button{padding:5px 7px}.pmm-wb-entry-head{height:40px}.pmm-wb-transfer-bar button{flex-direction:column;font-size:11px;padding:5px 2px}.pmm-wb-details{padding:7px 9px 10px}.pmm-wb-meta-grid,.pmm-wb-meta-grid.has-depth{grid-template-columns:minmax(0,1.7fr) minmax(58px,.65fr) minmax(58px,.65fr)}.pmm-wb-meta-grid.has-depth label:nth-child(4){grid-column:1/-1}.pmm-wb-detail-row{align-items:stretch}.pmm-wb-title-row .pmm-wb-strategy{height:auto}.pmm-wb-details textarea{min-height:90px}}
`;
    DOC.head.append(style);
  }

  async function open() {
    if (state.open && DOC.getElementById(ROOT_ID)) return;
    state.open = true;
    installStyle();
    const root = DOC.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `<div class="pmm-wb-dialog"><div class="pmm-wb-empty">正在读取酒馆世界书列表…</div></div>`;
    DOC.body.append(root);
    installEvents(root);
    try {
      await refreshNames();
      await loadBoth();
      render();
    } catch (error) {
      console.error('[世界书缝合] 打开失败', error);
      root.innerHTML = `<div class="pmm-wb-dialog"><div class="pmm-wb-empty">读取失败：${h(error?.message || error)}<br><button data-action="close">关闭</button></div></div>`;
    }
  }

  function close() {
    DOC.getElementById(ROOT_ID)?.remove();
    state.open = false;
  }

  function cleanup() {
    close();
    DOC.getElementById(STYLE_ID)?.remove();
    try { if (TOP[API_KEY]?.cleanup === cleanup) delete TOP[API_KEY]; } catch (_) {}
  }

  try { TOP[API_KEY]?.cleanup?.(); } catch (_) {}
  TOP[API_KEY] = { open, close, cleanup, state };
  console.info('[预设工坊测试版] test.2 世界书双向缝合已就绪。');
})();
