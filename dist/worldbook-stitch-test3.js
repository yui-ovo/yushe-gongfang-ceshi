/* 个人测试通道 test.3：把世界书缝合嵌入工坊原有双卡片布局。 */
(() => {
  'use strict';

  const SELF = window;
  const TOP = window.parent || window;
  const DOC = TOP.document;
  const API_KEY = '__PMM_WORLDBOOK_STITCH_TEST3__';
  const STYLE_ID = 'pmm-worldbook-stitch-test3-style';
  const PAGE_SIZE = 240;
  const HISTORY_LIMIT = 20;
  const MODE_CLASSES = ['pm-panel-container--merge-mode', 'pm-panel-container--branch-mode', 'pm-panel-container--favorite-mode'];
  const POSITION_OPTIONS = [
    [0, '角色定义之前'], [1, '角色定义之后'], [5, '示例消息之前'], [6, '示例消息之后'],
    [2, '作者注释顶部'], [3, '作者注释底部'], [4, '@D 插入聊天深度'], [7, 'Outlet'],
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

  function emptyWorldSide() {
    return {
      kind: 'world', name: '', data: null, entries: [], selected: new Set(), expanded: new Set(),
      limit: PAGE_SIZE, multi: false, query: '', searchOpen: false, scrollTop: 0, history: [],
    };
  }

  const state = {
    open: false,
    busy: false,
    status: '已同步',
    topType: 'preset',
    worldNames: [],
    top: emptyWorldSide(),
    bottom: emptyWorldSide(),
    host: null,
    container: null,
    mainWrapper: null,
    nativeTop: null,
    bottomCard: null,
    topCard: null,
  };

  let context = null;
  let operationTail = Promise.resolve();
  let hostObserver = null;
  let renderFrame = 0;
  let dragPayload = null;

  function notify(type, message) {
    const toast = TOP.toastr?.[type] || SELF.toastr?.[type];
    if (typeof toast === 'function') toast(message, '世界书缝合');
    else console[type === 'error' ? 'error' : 'info'](`[世界书缝合] ${message}`);
  }

  function clone(value) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function h(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function safeId(value) { return encodeURIComponent(String(value ?? '')); }
  function decodeId(value) {
    try { return decodeURIComponent(String(value ?? '')); } catch (_) { return String(value ?? ''); }
  }

  function getContext() {
    return SELF.SillyTavern?.getContext?.() || TOP.SillyTavern?.getContext?.() || null;
  }

  function getLoadedPresetNameSafe() {
    try { return String(SELF.getLoadedPresetName?.() || ''); } catch (_) { return ''; }
  }

  function entriesFromWorld(data) {
    const entries = data?.entries && typeof data.entries === 'object' ? Object.values(data.entries) : [];
    return entries.filter(entry => entry && typeof entry === 'object')
      .sort((a, b) => Number(a.uid) - Number(b.uid));
  }

  function entryKey(entry) { return String(entry.uid); }
  function entryTitle(entry) {
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
      name: entryTitle(entry),
      content: String(entry.content || ''),
      enabled: entry.disable !== true,
      role: 'system',
      position: { type: 'relative' },
    };
  }

  function presetToWorld(prompt, data) {
    const uid = freeWorldUid(data);
    return {
      uid, ...clone(WORLD_DEFAULTS),
      comment: String(prompt.name || prompt.id || `预设条目 ${uid}`),
      content: String(prompt.content || ''),
      disable: prompt.enabled === false,
    };
  }

  function worldToWorld(entry, data) {
    return { ...clone(entry), uid: freeWorldUid(data) };
  }

  function setStatus(text) {
    state.status = text;
    DOC.querySelectorAll('#preset-manager-main-panel .pmm-wb-status').forEach(node => {
      node.textContent = text;
    });
  }

  function enqueue(label, task) {
    operationTail = operationTail.then(async () => {
      state.busy = true;
      setStatus(`${label}…`);
      try {
        await task();
        setStatus('已同步');
      } catch (error) {
        console.error(`[世界书缝合] ${label}失败`, error);
        setStatus('同步失败');
        notify('error', `${label}失败：${error?.message || error}`);
      } finally {
        state.busy = false;
      }
    });
    return operationTail;
  }

  async function refreshWorldNames() {
    context = getContext();
    if (!context?.loadWorldInfo || !context?.saveWorldInfo) {
      throw new Error('当前酒馆没有提供世界书读写接口');
    }
    let names = await context.getWorldInfoNames?.();
    state.worldNames = [...(names || [])].map(String);
    if (!state.worldNames.length && context.updateWorldInfoList) {
      await context.updateWorldInfoList();
      names = await context.getWorldInfoNames?.();
      state.worldNames = [...(names || [])].map(String);
    }
    if (!state.bottom.name || !state.worldNames.includes(state.bottom.name)) {
      state.bottom.name = state.worldNames[0] || '';
    }
    if (!state.top.name || !state.worldNames.includes(state.top.name)) {
      state.top.name = state.worldNames.find(name => name !== state.bottom.name) || state.worldNames[0] || '';
    }
  }

  function resetSide(side, keepName = true) {
    const name = keepName ? side.name : '';
    Object.assign(side, emptyWorldSide(), { name });
  }

  async function loadWorldSide(side) {
    side.selected.clear();
    side.expanded.clear();
    side.limit = PAGE_SIZE;
    side.scrollTop = 0;
    if (!side.name) {
      side.data = null;
      side.entries = [];
      return;
    }
    side.data = await context.loadWorldInfo(side.name);
    side.entries = entriesFromWorld(side.data);
  }

  async function saveWorldSide(side) {
    if (!side.data?.entries) throw new Error('世界书数据尚未载入');
    await context.saveWorldInfo(side.name, clone(side.data), true);
    const other = side === state.top ? state.bottom : state.top;
    if (state.topType === 'world' && other.name === side.name) {
      other.data = clone(side.data);
      other.entries = entriesFromWorld(other.data);
    }
  }

  async function savePresetEntries(name, prompts) {
    if (!name) throw new Error('没有识别到上方预设');
    const next = clone(prompts);
    let saved = false;
    if (typeof SELF.setPreset === 'function') {
      await SELF.setPreset(name, { prompts: next });
      saved = true;
    }
    if (name === getLoadedPresetNameSafe() && typeof SELF.updatePresetWith === 'function') {
      await SELF.updatePresetWith('in_use', preset => {
        preset.prompts = next;
        return preset;
      });
      saved = true;
    }
    if (!saved) {
      throw new Error('当前酒馆没有提供预设保存接口');
    }
    syncVisiblePresetEntries(name, next);
  }

  function findEntry(side, key) {
    return side.entries.find(entry => entryKey(entry) === String(key));
  }

  function removeWorldEntries(side, keys) {
    for (const key of keys.map(String)) delete side.data.entries[key];
    side.entries = entriesFromWorld(side.data);
  }

  function appendWorldEntries(target, sourceKind, entries) {
    target.data.entries ||= {};
    for (const entry of entries) {
      const addition = sourceKind === 'world'
        ? worldToWorld(entry, target.data)
        : presetToWorld(entry, target.data);
      target.data.entries[addition.uid] = addition;
    }
    target.entries = entriesFromWorld(target.data);
  }

  function pushUndo(owner, label, options = {}) {
    if (!owner) return;
    const worlds = [];
    const worldNames = new Set();
    for (const side of options.worldSides || []) {
      if (!side?.name || !side.data?.entries || worldNames.has(side.name)) continue;
      worldNames.add(side.name);
      worlds.push({ name:side.name, data:clone(side.data) });
    }
    const presets = [];
    const presetNames = new Set();
    for (const snapshot of options.presetSnapshots || []) {
      if (!snapshot?.name || !Array.isArray(snapshot.prompts) || presetNames.has(snapshot.name)) continue;
      presetNames.add(snapshot.name);
      presets.push({ name:snapshot.name, prompts:clone(snapshot.prompts) });
    }
    if (!worlds.length && !presets.length) return;
    owner.history.push({ label, worlds, presets });
    if (owner.history.length > HISTORY_LIMIT) owner.history.splice(0, owner.history.length - HISTORY_LIMIT);
  }

  async function undoWorldOperation(side) {
    const snapshot = side?.history?.[side.history.length - 1];
    if (!snapshot) return notify('info', '目前没有可以撤销的世界书操作');
    await enqueue(`撤销${snapshot.label ? `：${snapshot.label}` : ''}`, async () => {
      for (const preset of snapshot.presets) await savePresetEntries(preset.name, preset.prompts);
      for (const world of snapshot.worlds) await context.saveWorldInfo(world.name, clone(world.data), true);
      for (const target of [state.top, state.bottom]) {
        const restored = snapshot.worlds.find(world => world.name === target.name);
        if (!restored) continue;
        target.data = clone(restored.data);
        target.entries = entriesFromWorld(target.data);
        target.selected.clear();
      }
      side.history.pop();
      renderPanels();
      notify('success', `已撤销：${snapshot.label || '上一步世界书操作'}`);
    });
  }

  function componentArray(value) {
    const raw = value?.value ?? value;
    return Array.isArray(raw) ? raw : null;
  }

  function componentSet(value) {
    const raw = value?.value ?? value;
    return raw instanceof Set || (raw && typeof raw.has === 'function' && typeof raw[Symbol.iterator] === 'function')
      ? new Set([...raw].map(String))
      : new Set();
  }

  function nativePresetSnapshot() {
    const panel = state.nativeTop;
    if (!panel) return { name: '', prompts: [], selected: new Set(), runtimePrompts: null };
    let prompts = null;
    let runtimePrompts = null;
    let selected = new Set();
    let component = panel.__vueParentComponent || null;
    for (let depth = 0; component && depth < 14; depth++, component = component.parent) {
      const foundPrompts = componentArray(component.props?.prompts)
        || componentArray(component.vnode?.props?.prompts)
        || componentArray(component.setupState?.prompts);
      if (!runtimePrompts && foundPrompts) runtimePrompts = foundPrompts;
      prompts ||= foundPrompts;
      const candidate = component.props?.selectedIds
        ?? component.vnode?.props?.selectedIds
        ?? component.setupState?.selectedIds;
      const found = componentSet(candidate);
      if (found.size) selected = found;
      if (prompts && selected.size) break;
    }
    prompts = clone(prompts || []);
    if (!selected.size) {
      panel.querySelectorAll('.prompt-item[data-prompt-id],.prompt-card[data-prompt-id]').forEach(item => {
        if (item.querySelector('.prompt-item__checkbox .fa-square-check,.prompt-card__checkbox .fa-square-check')) {
          selected.add(String(item.dataset.promptId || ''));
        }
      });
    }
    const select = panel.querySelector('.title-select');
    const name = String(select?.value || select?.selectedOptions?.[0]?.textContent || getLoadedPresetNameSafe() || '').trim();
    return { name, prompts, selected, runtimePrompts };
  }

  function syncVisiblePresetEntries(name, prompts) {
    const visible = nativePresetSnapshot();
    if (!name || visible.name !== name || !Array.isArray(visible.runtimePrompts)) return false;
    try {
      visible.runtimePrompts.splice(0, visible.runtimePrompts.length, ...clone(prompts));
      TOP.setTimeout(scheduleDecorate, 0);
      return true;
    } catch (error) {
      console.warn('[世界书缝合] 预设已保存，但当前卡片即时刷新失败', error);
      return false;
    }
  }

  function insertPresetEntries(prompts, additions, placement = null) {
    const next = clone(prompts);
    if (!placement?.targetId) {
      next.push(...additions);
      return next;
    }
    const targetIndex = next.findIndex(prompt => String(prompt.id) === String(placement.targetId));
    if (targetIndex < 0) {
      next.push(...additions);
      return next;
    }
    const insertionIndex = targetIndex + (placement.position === 'after' ? 1 : 0);
    next.splice(insertionIndex, 0, ...additions);
    return next;
  }

  async function transferFromNativeTop(move, forcedIds = null) {
    const source = nativePresetSnapshot();
    const ids = forcedIds?.length ? forcedIds.map(String) : [...source.selected];
    if (!ids.length) return notify('warning', '请先在上方预设勾选需要缝合的条目');
    const wanted = new Set(ids);
    const entries = source.prompts.filter(prompt => wanted.has(String(prompt.id))).map(clone);
    if (!entries.length) return notify('warning', '没有读取到已勾选的预设条目');
    await enqueue(move ? '移动到下方世界书' : '复制到下方世界书', async () => {
      pushUndo(state.bottom, move ? '从预设移动到世界书' : '从预设拖入世界书', {
        worldSides:[state.bottom],
        presetSnapshots:move ? [source] : [],
      });
      appendWorldEntries(state.bottom, 'preset', entries);
      await saveWorldSide(state.bottom);
      if (move) {
        await savePresetEntries(source.name, source.prompts.filter(prompt => !wanted.has(String(prompt.id))));
      }
      await loadWorldSide(state.bottom);
      renderPanels();
      notify('success', `已${move ? '移动' : '复制'} ${entries.length} 条`);
    });
  }

  async function transferToNativeTop(move, forcedKeys = null, placement = null) {
    const source = state.bottom;
    const keys = forcedKeys?.length ? forcedKeys.map(String) : [...source.selected];
    if (!keys.length) return notify('warning', '请先在下方世界书勾选需要缝合的条目');
    const entries = keys.map(key => findEntry(source, key)).filter(Boolean).map(clone);
    if (!entries.length) return;
    const target = nativePresetSnapshot();
    await enqueue(move ? '移动到上方预设' : '复制到上方预设', async () => {
      pushUndo(source, move ? '从世界书移动到预设' : '从世界书拖入预设', {
        worldSides:move ? [source] : [],
        presetSnapshots:[target],
      });
      const additions = entries.map(worldToPreset);
      await savePresetEntries(target.name, insertPresetEntries(target.prompts, additions, placement));
      if (move) {
        removeWorldEntries(source, keys);
        await saveWorldSide(source);
      }
      source.selected.clear();
      await loadWorldSide(source);
      renderPanels();
      notify('success', `已${move ? '移动' : '复制'} ${entries.length} 条`);
    });
  }

  async function transferWorldToWorld(fromName, move, forcedKeys = null) {
    const source = state[fromName];
    const target = state[fromName === 'top' ? 'bottom' : 'top'];
    const keys = forcedKeys?.length ? forcedKeys.map(String) : [...source.selected];
    if (!keys.length) return notify('warning', '请先勾选需要缝合的世界书条目');
    if (move && source.name === target.name) return notify('warning', '同一本世界书内不需要移动');
    const entries = keys.map(key => findEntry(source, key)).filter(Boolean).map(clone);
    if (!entries.length) return;
    await enqueue(move ? '移动世界书条目' : '复制世界书条目', async () => {
      pushUndo(source, move ? '在世界书之间移动条目' : '在世界书之间拖入条目', {
        worldSides:move ? [source, target] : [target],
      });
      appendWorldEntries(target, 'world', entries);
      await saveWorldSide(target);
      if (move) {
        removeWorldEntries(source, keys);
        await saveWorldSide(source);
      }
      source.selected.clear();
      await loadWorldSide(target);
      if (move) await loadWorldSide(source);
      renderPanels();
      notify('success', `已${move ? '移动' : '复制'} ${entries.length} 条`);
    });
  }

  async function transfer(fromName, move, forcedKeys = null, placement = null) {
    if (fromName === 'top' && state.topType === 'preset') {
      return transferFromNativeTop(move, forcedKeys);
    }
    if (fromName === 'bottom' && state.topType === 'preset') {
      return transferToNativeTop(move, forcedKeys, placement);
    }
    return transferWorldToWorld(fromName, move, forcedKeys);
  }

  function positionRoleOptions(entry) {
    const currentPosition = Number(entry.position);
    const currentRole = Number(entry.role) || 0;
    return POSITION_OPTIONS.flatMap(([position, label]) => {
      if (position !== 4) {
        return `<option value="${position}:0"${currentPosition === position ? ' selected' : ''}>${h(label)}</option>`;
      }
      return ROLE_OPTIONS.map(([role, roleLabel]) => {
        const roleIcon = ['⚙️', '👤', '🤖'][role] || '⚙️';
        const selected = currentPosition === 4 && currentRole === role ? ' selected' : '';
        return `<option value="4:${role}"${selected}>@D ${roleIcon} [${h(roleLabel)}]在深度</option>`;
      }).join('');
    }).join('');
  }

  function field(sideName, key, fieldName, value, options = {}) {
    const type = options.type || 'text';
    const extra = options.extra || '';
    if (type === 'textarea') {
      return `<textarea data-wb-side="${sideName}" data-wb-key="${safeId(key)}" data-wb-field="${fieldName}" ${extra}>${h(value)}</textarea>`;
    }
    return `<input type="${type}" value="${h(value)}" data-wb-side="${sideName}" data-wb-key="${safeId(key)}" data-wb-field="${fieldName}" ${extra}>`;
  }

  function renderDetails(sideName, entry, key) {
    const atDepth = Number(entry.position) === 4;
    const outlet = Number(entry.position) === 7;
    const green = entry.constant !== true;
    const content = String(entry.content || '');
    return `<div class="pmm-wb-details">
      <div class="pmm-wb-detail-row pmm-wb-title-row">
        <label><span><i class="fa-solid fa-tag"></i> 条目名称</span>${field(sideName, key, 'comment', entry.comment || '')}</label>
        <button class="pmm-wb-strategy ${green ? 'is-green' : 'is-blue'}" data-wb-action="strategy" data-wb-side="${sideName}" data-wb-key="${safeId(key)}" title="${green ? '关键词触发（绿灯）' : '常驻触发（蓝灯）'}"><span></span>${green ? '绿灯' : '蓝灯'}</button>
      </div>
      <div class="pmm-wb-meta-grid ${atDepth ? 'has-depth' : ''}">
        <label class="is-position"><span><i class="fa-solid fa-sliders"></i> 位置</span><select data-wb-side="${sideName}" data-wb-key="${safeId(key)}" data-wb-field="positionRole">${positionRoleOptions(entry)}</select></label>
        <label><span>顺序</span>${field(sideName, key, 'order', Number(entry.order ?? 100), { type: 'number', extra: 'step="1"' })}</label>
        ${atDepth ? `<label><span>深度</span>${field(sideName, key, 'depth', Number(entry.depth ?? 4), { type: 'number', extra: 'min="0" max="999" step="1"' })}</label>` : ''}
        ${outlet ? `<label class="is-outlet"><span>Outlet 名称</span>${field(sideName, key, 'outletName', entry.outletName || '')}</label>` : ''}
      </div>
      ${green ? `<label class="pmm-wb-wide-field"><span>关键词</span>${field(sideName, key, 'key', Array.isArray(entry.key) ? entry.key.join(', ') : '')}</label>` : ''}
      <div class="pmm-wb-wide-field pmm-wb-content-field">
        <div class="pmm-wb-field-head"><span><i class="fa-solid fa-align-left"></i> 内容正文</span><span class="pmm-wb-content-tools"><small>${content.length} 字符</small><button type="button" data-wb-action="content-expand" data-wb-side="${sideName}" data-wb-key="${safeId(key)}" title="放大编辑正文" aria-label="放大编辑正文"><i class="fa-solid fa-expand"></i></button></span></div>
        ${field(sideName, key, 'content', content, { type: 'textarea' })}
      </div>
    </div>`;
  }

  function openTextEditor({ host, title, original, sourceField, themeNodes, ariaLabel, onSave }) {
    if (!host || !sourceField) return;
    installStyle();
    host.querySelector('.pmm-wb-editor-overlay')?.remove();
    const text = String(original || '');
    const styles = [...(themeNodes || []), sourceField, host].filter(Boolean).map(node => TOP.getComputedStyle(node));
    const visibleColor = value => {
      const normalized = String(value || '').replace(/\s+/g, '').toLowerCase();
      return normalized && normalized !== 'transparent' && normalized !== 'rgba(0,0,0,0)';
    };
    const pickStyle = (property, fallback, requireVisible = false) => {
      for (const style of styles) {
        const value = style?.[property];
        if (value && (!requireVisible || visibleColor(value))) return value;
      }
      return fallback;
    };
    const overlay = DOC.createElement('div');
    overlay.className = 'pmm-wb-editor-overlay';
    overlay.style.setProperty('--pmm-wb-editor-bg', pickStyle('backgroundColor', '#fff', true));
    overlay.style.setProperty('--pmm-wb-editor-bg-image', pickStyle('backgroundImage', 'none'));
    overlay.style.setProperty('--pmm-wb-editor-field-bg', sourceField ? TOP.getComputedStyle(sourceField).backgroundColor : pickStyle('backgroundColor', 'rgba(127,127,127,.05)', true));
    overlay.style.setProperty('--pmm-wb-editor-text', pickStyle('color', '#222', true));
    overlay.style.setProperty('--pmm-wb-editor-border', sourceField ? TOP.getComputedStyle(sourceField).borderColor : pickStyle('borderColor', 'rgba(127,127,127,.22)', true));
    overlay.style.setProperty('--pmm-wb-editor-accent', styles.map(style => style.getPropertyValue('--pm-quote-color').trim()).find(Boolean) || pickStyle('color', '#3485f6', true));
    overlay.innerHTML = `<section class="pmm-wb-editor-dialog" role="dialog" aria-modal="true" aria-label="${h(ariaLabel || '放大编辑正文')}">
      <header><strong>${h(title)}</strong><span data-wb-editor-count>${text.length} 字符</span><button type="button" data-wb-editor-undo title="暂无可撤销输入" aria-label="撤销本次编辑" disabled><i class="fa-solid fa-rotate-left"></i></button><button type="button" data-wb-editor-cancel title="取消"><i class="fa-solid fa-xmark"></i></button><button type="button" data-wb-editor-save title="完成"><i class="fa-solid fa-check"></i></button></header>
      <textarea spellcheck="false">${h(text)}</textarea>
    </section>`;
    const textarea = overlay.querySelector('textarea');
    const counter = overlay.querySelector('[data-wb-editor-count]');
    const undoButton = overlay.querySelector('[data-wb-editor-undo]');
    const undoStack = [];
    let previousValue = text;
    let lastInputAt = 0;
    const updateUndoButton = () => {
      const available = undoStack.length > 0;
      undoButton.disabled = !available;
      undoButton.title = available ? '撤销本次编辑' : '暂无可撤销输入';
    };
    const closeEditor = () => overlay.remove();
    const saveEditor = () => {
      const next = String(textarea.value || '');
      overlay.remove();
      if (next !== text) onSave(next);
    };
    textarea.addEventListener('input', () => {
      const now = Date.now();
      if (!undoStack.length || now - lastInputAt > 450) undoStack.push(previousValue);
      previousValue = textarea.value;
      lastInputAt = now;
      counter.textContent = `${textarea.value.length} 字符`;
      updateUndoButton();
    });
    undoButton.addEventListener('click', () => {
      if (!undoStack.length) return;
      const start = textarea.selectionStart;
      textarea.value = undoStack.pop();
      previousValue = textarea.value;
      lastInputAt = 0;
      counter.textContent = `${textarea.value.length} 字符`;
      updateUndoButton();
      textarea.focus();
      const cursor = Math.min(Number.isFinite(start) ? start : textarea.value.length, textarea.value.length);
      textarea.setSelectionRange(cursor, cursor);
    });
    overlay.querySelector('[data-wb-editor-cancel]').addEventListener('click', closeEditor);
    overlay.querySelector('[data-wb-editor-save]').addEventListener('click', saveEditor);
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeEditor();
      }
    });
    host.append(overlay);
    TOP.setTimeout(() => textarea.focus(), 20);
  }

  function openContentEditor(sideName, key) {
    const side = state[sideName];
    const entry = side ? findEntry(side, key) : null;
    if (!entry || !state.host) return;
    const panel = state.host.querySelector(`[data-pmm-wb-panel="${sideName}"]`);
    const sourceField = panel?.querySelector(`[data-wb-key="${safeId(key)}"][data-wb-field="content"]`);
    const sourceEntry = sourceField?.closest('.pmm-wb-entry');
    openTextEditor({
      host: state.host,
      title: entryTitle(entry),
      original: entry.content,
      sourceField,
      themeNodes: [panel, sourceEntry],
      ariaLabel: '放大编辑世界书正文',
      onSave(next) {
        pushUndo(side, '编辑世界书正文', { worldSides:[side] });
        entry.content = next;
        side.data.entries[String(entry.uid)] = entry;
        void enqueue('保存世界书正文', async () => {
          await saveWorldSide(side);
          renderPanels();
        });
      },
    });
  }

  function openPresetContentEditor(button) {
    const editor = button.closest('.prompt-editor');
    const sourceField = editor?.querySelector('.prompt-editor__textarea');
    const host = button.closest('#preset-manager-main-panel') || DOC.getElementById('preset-manager-main-panel');
    if (!editor || !sourceField || !host) return;
    const item = editor.closest('.prompt-item');
    const panel = editor.closest('.preset-panel');
    const title = editor.querySelector('.prompt-editor__name-input')?.value
      || item?.querySelector('.prompt-card__name,.prompt-card__title')?.textContent?.trim()
      || '预设条目';
    openTextEditor({
      host,
      title,
      original: sourceField.value,
      sourceField,
      themeNodes: [panel, item, editor],
      ariaLabel: '放大编辑预设正文',
      onSave(next) {
        sourceField.value = next;
        sourceField.dispatchEvent(new TOP.Event('input', { bubbles: true }));
        sourceField.dispatchEvent(new TOP.Event('change', { bubbles: true }));
      },
    });
  }

  function onPresetExpandClick(event) {
    const button = event.target.closest?.('.prompt-editor__expand-btn');
    if (!button || !button.closest('#preset-manager-main-panel')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openPresetContentEditor(button);
  }

  function renderEntry(sideName, side, entry) {
    const key = entryKey(entry);
    const expanded = side.expanded.has(key);
    const selected = side.selected.has(key);
    const enabled = entry.disable !== true;
    return `<article class="pmm-wb-entry${expanded ? ' is-expanded' : ''}" data-wb-entry="${safeId(key)}" draggable="true" data-wb-drag-side="${sideName}" data-wb-drag-key="${safeId(key)}">
      <div class="pmm-wb-entry-head">
        ${side.multi ? `<button class="pmm-wb-check${selected ? ' is-selected' : ''}" data-wb-action="select" data-wb-side="${sideName}" data-wb-key="${safeId(key)}" aria-label="选择条目"><i class="fa-${selected ? 'solid' : 'regular'} fa-square${selected ? '-check' : ''}"></i></button>` : ''}
        <button class="pmm-wb-expand" data-wb-action="expand" data-wb-side="${sideName}" data-wb-key="${safeId(key)}" aria-label="展开条目"><i class="fa-solid fa-gear"></i></button>
        <span class="pmm-wb-dot ${entry.constant === true ? 'is-blue' : 'is-green'}" title="${entry.constant === true ? '蓝灯：常驻' : '绿灯：关键词触发'}"></span>
        <button class="pmm-wb-entry-title" data-wb-action="expand" data-wb-side="${sideName}" data-wb-key="${safeId(key)}">${h(entryTitle(entry))}</button>
        <button class="pmm-wb-toggle${enabled ? ' is-on' : ''}" data-wb-action="toggle" data-wb-side="${sideName}" data-wb-key="${safeId(key)}" title="${enabled ? '已启用' : '已停用'}"><span></span></button>
      </div>
      ${expanded ? renderDetails(sideName, entry, key) : ''}
    </article>`;
  }

  function toolbarButton(action, title, icon, extra = '') {
    return `<button type="button" class="pmm-wb-tool" data-wb-action="${action}" title="${title}" ${extra}><i class="fa-solid ${icon}"></i></button>`;
  }

  function typeSwitchMarkup() {
    return `<span class="pmm-wb-kind-switch pmm-wb-kind-switch--toolbar" data-pmm-wb-kind-switch>
      <button type="button" data-wb-action="top-kind" data-wb-kind="preset" class="${state.topType === 'preset' ? 'is-active' : ''}" title="上方显示预设"><i class="fa-solid fa-sliders"></i></button>
      <button type="button" data-wb-action="top-kind" data-wb-kind="world" class="${state.topType === 'world' ? 'is-active' : ''}" title="上方显示世界书"><i class="fa-solid fa-book-atlas"></i></button>
    </span>`;
  }

  function sourceOptions(side) {
    return state.worldNames.map(name => `<option value="${h(name)}"${name === side.name ? ' selected' : ''}>${h(name)}</option>`).join('');
  }

  function renderWorldCard(sideName, side) {
    const query = side.query.trim().toLocaleLowerCase();
    const filtered = query
      ? side.entries.filter(entry => entryTitle(entry).toLocaleLowerCase().includes(query) || String(entry.content || '').toLocaleLowerCase().includes(query))
      : side.entries;
    const visible = filtered.slice(0, side.limit);
    const remaining = filtered.length - visible.length;
    return `<section class="preset-panel pmm-wb-inline-panel" data-pmm-wb-panel="${sideName}">
      <div class="pmm-wb-main-content">
        <header class="pmm-wb-header">
          <div class="pmm-wb-header-left">
            <span class="pmm-wb-title-row">
              <select class="title-select pmm-wb-source-select" data-wb-action="select-source" data-wb-side="${sideName}" aria-label="选择世界书">${sourceOptions(side)}</select>
              <button class="pmm-preset-search-btn" data-wb-action="source-picker" data-wb-side="${sideName}" title="搜索世界书"><i class="fa-solid fa-magnifying-glass"></i></button>
            </span>
          </div>
          <div class="pmm-wb-header-right">
            <span class="pmm-wb-status">${h(state.status)}</span>
            ${sideName === 'top' ? typeSwitchMarkup() : ''}
            ${toolbarButton('multi', side.multi ? '退出多选' : '多选', 'fa-check-double', `data-wb-side="${sideName}"`)}
            ${toolbarButton('undo', side.history.length ? `撤销：${side.history[side.history.length - 1].label}` : '暂无可撤销操作', 'fa-rotate-left', `data-wb-side="${sideName}" ${side.history.length ? '' : 'disabled'}`)}
            ${toolbarButton('entry-search', '搜索条目', 'fa-magnifying-glass', `data-wb-side="${sideName}"`)}
            ${side.multi ? toolbarButton('batch-delete', '删除所选', 'fa-trash', `data-wb-side="${sideName}" ${side.selected.size ? '' : 'disabled'}`) : ''}
            ${toolbarButton('save', '保存', 'fa-floppy-disk', `data-wb-side="${sideName}"`)}
            ${toolbarButton(sideName === 'top' ? 'close-main' : 'exit', '关闭', 'fa-xmark')}
          </div>
        </header>
        ${side.searchOpen ? `<div class="pmm-wb-search-bar"><i class="fa-solid fa-magnifying-glass"></i><input type="search" value="${h(side.query)}" data-wb-action="search-input" data-wb-side="${sideName}" placeholder="搜索世界书条目" autocomplete="off"><span>${filtered.length}/${side.entries.length}</span></div>` : ''}
        <div class="pmm-wb-content">
          <div class="pmm-wb-list" data-wb-list="${sideName}">
            ${side.name ? visible.map(entry => renderEntry(sideName, side, entry)).join('') : '<div class="pmm-wb-empty">暂无可用世界书</div>'}
            ${remaining > 0 ? `<button class="pmm-wb-more" data-wb-action="more" data-wb-side="${sideName}">继续显示 ${Math.min(PAGE_SIZE, remaining)} 条（剩余 ${remaining}）</button>` : ''}
          </div>
        </div>
      </div>
    </section>`;
  }

  function createCard(sideName, side) {
    const holder = DOC.createElement('div');
    holder.innerHTML = renderWorldCard(sideName, side);
    return holder.firstElementChild;
  }

  function saveScrolls() {
    for (const name of ['top', 'bottom']) {
      const list = state.host?.querySelector?.(`[data-wb-list="${name}"]`);
      if (list) state[name].scrollTop = list.scrollTop;
    }
  }

  function restoreScrolls() {
    for (const name of ['top', 'bottom']) {
      const list = state.host?.querySelector?.(`[data-wb-list="${name}"]`);
      if (list) list.scrollTop = state[name].scrollTop || 0;
    }
  }

  function decorateNativeTop() {
    const panel = state.nativeTop;
    if (!panel) return;
    panel.classList.toggle('pmm-wb-native-hidden', state.topType !== 'preset');
    let switcher = panel.querySelector('[data-pmm-wb-kind-switch]');
    if (!switcher) {
      const headerRight = panel.querySelector('.header-right');
      if (headerRight) {
        const holder = DOC.createElement('span');
        holder.innerHTML = typeSwitchMarkup();
        switcher = holder.firstElementChild;
        headerRight.prepend(switcher);
      }
    } else {
      switcher.querySelectorAll('[data-wb-kind]').forEach(button => {
        button.classList.toggle('is-active', button.dataset.wbKind === state.topType);
      });
    }
    panel.querySelector('[data-pmm-wb-native-transfer]')?.remove();
  }

  function renderPanels() {
    if (!state.open || !state.host?.isConnected) return;
    saveScrolls();
    state.topCard?.remove();
    state.bottomCard?.remove();
    state.topCard = null;
    state.bottomCard = null;
    decorateNativeTop();
    if (state.topType === 'world') {
      state.topCard = createCard('top', state.top);
      state.mainWrapper.insertBefore(state.topCard, state.mainWrapper.querySelector('.side-panel-root'));
    }
    state.bottomCard = createCard('bottom', state.bottom);
    state.container.append(state.bottomCard);
    markWorldbookButton();
    restoreScrolls();
  }

  function scheduleDecorate() {
    if (renderFrame || !state.open) return;
    renderFrame = TOP.requestAnimationFrame(() => {
      renderFrame = 0;
      decorateNativeTop();
      markWorldbookButton();
    });
  }

  function markWorldbookButton() {
    state.host?.querySelectorAll?.('.panel-btn').forEach(button => {
      button.classList.toggle('panel-btn--active', button.matches('[data-pmm-worldbook-placeholder="1"]'));
    });
  }

  function parseFieldValue(target, fieldName) {
    if (fieldName === 'key') return String(target.value || '').split(',').map(value => value.trim()).filter(Boolean);
    if (['position', 'order', 'depth', 'role'].includes(fieldName)) return Number(target.value) || 0;
    return String(target.value ?? '');
  }

  async function updateField(target) {
    const sideName = target.dataset.wbSide;
    const side = state[sideName];
    const key = decodeId(target.dataset.wbKey);
    const fieldName = target.dataset.wbField;
    const entry = findEntry(side, key);
    if (!entry || !fieldName) return;
    pushUndo(side, '编辑世界书条目', { worldSides:[side] });
    if (fieldName === 'positionRole') {
      const [positionValue, roleValue] = String(target.value || '0:0').split(':');
      entry.position = Number(positionValue) || 0;
      if (entry.position === 4) entry.role = Number(roleValue) || 0;
    } else {
      entry[fieldName] = parseFieldValue(target, fieldName);
    }
    side.data.entries[String(entry.uid)] = entry;
    await enqueue('保存条目', async () => {
      await saveWorldSide(side);
      renderPanels();
    });
  }

  async function deleteSelected(sideName) {
    const side = state[sideName];
    const keys = [...side.selected];
    if (!keys.length) return;
    if (!TOP.confirm?.(`确定删除所选的 ${keys.length} 条世界书条目吗？`)) return;
    await enqueue('批量删除', async () => {
      pushUndo(side, '批量删除世界书条目', { worldSides:[side] });
      removeWorldEntries(side, keys);
      await saveWorldSide(side);
      side.selected.clear();
      await loadWorldSide(side);
      renderPanels();
      notify('success', `已删除 ${keys.length} 条`);
    });
  }

  function openSourcePicker(sideName) {
    const side = state[sideName];
    state.host.querySelector('.pmm-wb-source-picker')?.remove();
    const overlay = DOC.createElement('div');
    overlay.className = 'pmm-wb-source-picker';
    overlay.innerHTML = `<div class="pmm-wb-picker-dialog"><div class="pmm-wb-picker-head"><input type="search" placeholder="搜索世界书" autocomplete="off"><button type="button"><i class="fa-solid fa-xmark"></i></button></div><div class="pmm-wb-picker-list"></div></div>`;
    const input = overlay.querySelector('input');
    const list = overlay.querySelector('.pmm-wb-picker-list');
    const draw = () => {
      const query = input.value.trim().toLocaleLowerCase();
      const names = query ? state.worldNames.filter(name => name.toLocaleLowerCase().includes(query)) : state.worldNames;
      list.innerHTML = names.length
        ? names.map(name => `<button type="button" data-wb-picker-name="${h(name)}" class="${name === side.name ? 'is-current' : ''}">${h(name)}</button>`).join('')
        : '<div class="pmm-wb-empty">没有找到这本世界书</div>';
    };
    input.addEventListener('input', draw);
    overlay.querySelector('.pmm-wb-picker-head button').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', event => {
      if (event.target === overlay) return overlay.remove();
      const button = event.target.closest('[data-wb-picker-name]');
      if (!button) return;
      if (side.name !== button.dataset.wbPickerName) side.history.length = 0;
      side.name = button.dataset.wbPickerName;
      overlay.remove();
      void enqueue('载入世界书', async () => { await loadWorldSide(side); renderPanels(); });
    });
    state.host.append(overlay);
    draw();
    TOP.setTimeout(() => input.focus(), 30);
  }

  async function switchTopKind(kind) {
    if (!['preset', 'world'].includes(kind) || state.topType === kind) return;
    state.topType = kind;
    if (kind === 'world') {
      await enqueue('切换到世界书', async () => {
        await refreshWorldNames();
        await loadWorldSide(state.top);
        renderPanels();
      });
    } else {
      resetSide(state.top, true);
      renderPanels();
    }
  }

  async function handleAction(button) {
    const action = button.dataset.wbAction;
    const sideName = button.dataset.wbSide;
    const side = sideName ? state[sideName] : null;
    if (action === 'top-kind') return switchTopKind(button.dataset.wbKind);
    if (action === 'source-picker') return openSourcePicker(sideName);
    if (action === 'select-source') return;
    if (action === 'entry-search') {
      side.searchOpen = !side.searchOpen;
      if (!side.searchOpen) side.query = '';
      return renderPanels();
    }
    if (action === 'multi') {
      side.multi = !side.multi;
      if (!side.multi) side.selected.clear();
      return renderPanels();
    }
    if (action === 'undo') return undoWorldOperation(side);
    if (action === 'transfer-copy') return transfer(sideName, false);
    if (action === 'transfer-move') return transfer(sideName, true);
    if (action === 'batch-delete') return deleteSelected(sideName);
    if (action === 'save') return enqueue('保存世界书', async () => { await saveWorldSide(side); notify('success', '世界书已保存'); });
    if (action === 'exit') return close();
    if (action === 'close-main') {
      const nativeClose = state.nativeTop?.querySelector('.header-right .fa-xmark')?.closest('button');
      close();
      nativeClose?.click();
      return;
    }
    if (action === 'more') {
      side.limit += PAGE_SIZE;
      return renderPanels();
    }
    const key = decodeId(button.dataset.wbKey);
    const entry = side ? findEntry(side, key) : null;
    if (!entry) return;
    if (action === 'select') {
      side.selected.has(key) ? side.selected.delete(key) : side.selected.add(key);
      return renderPanels();
    }
    if (action === 'expand') {
      side.expanded.has(key) ? side.expanded.delete(key) : side.expanded.add(key);
      return renderPanels();
    }
    if (action === 'content-expand') return openContentEditor(sideName, key);
    if (action === 'toggle') {
      pushUndo(side, '切换世界书条目开关', { worldSides:[side] });
      entry.disable = entry.disable !== true;
      side.data.entries[String(entry.uid)] = entry;
      return enqueue('切换条目开关', async () => { await saveWorldSide(side); renderPanels(); });
    }
    if (action === 'strategy') {
      pushUndo(side, '切换世界书蓝绿灯', { worldSides:[side] });
      entry.constant = entry.constant !== true;
      if (entry.constant) entry.vectorized = false;
      side.data.entries[String(entry.uid)] = entry;
      return enqueue('切换蓝绿灯', async () => { await saveWorldSide(side); renderPanels(); });
    }
  }

  function nativePromptIdFromDrag(target) {
    const card = target?.closest?.('.prompt-item[data-prompt-id],.prompt-card[data-prompt-id]');
    return card?.dataset?.promptId ? String(card.dataset.promptId) : '';
  }

  function nativeDropPlacement(event) {
    const card = event.target?.closest?.('.prompt-item[data-prompt-id],.prompt-card[data-prompt-id]');
    if (!card?.dataset?.promptId) return null;
    const rect = card.getBoundingClientRect();
    return {
      targetId: String(card.dataset.promptId),
      position: Number(event.clientY) < rect.top + rect.height / 2 ? 'before' : 'after',
    };
  }

  function clearNativeDropIndicators() {
    state.nativeTop?.querySelectorAll('.prompt-item--drop-before,.prompt-item--drop-after,.prompt-card--drop-before,.prompt-card--drop-after,.prompt-panel__list--drop-target').forEach(node => {
      node.classList.remove('prompt-item--drop-before', 'prompt-item--drop-after', 'prompt-card--drop-before', 'prompt-card--drop-after', 'prompt-panel__list--drop-target');
    });
  }

  function onDragStart(event) {
    if (!state.open) return;
    const custom = event.target.closest?.('[data-wb-drag-side][data-wb-drag-key]');
    if (custom) {
      const sideName = custom.dataset.wbDragSide;
      const key = decodeId(custom.dataset.wbDragKey);
      const side = state[sideName];
      const keys = side.selected.has(key) ? [...side.selected] : [key];
      dragPayload = { from: sideName, keys };
      event.dataTransfer?.setData('text/plain', 'pmm-worldbook-entry');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove';
      return;
    }
    if (state.topType === 'preset') {
      const id = nativePromptIdFromDrag(event.target);
      if (id) {
        const snapshot = nativePresetSnapshot();
        dragPayload = { from: 'top', keys: snapshot.selected.has(id) ? [...snapshot.selected] : [id] };
      }
    }
  }

  function onDragOver(event) {
    if (!state.open || !dragPayload) return;
    const customList = event.target.closest?.('[data-wb-list]');
    const nativeList = state.topType === 'preset' && event.target.closest?.('.pm-main-wrapper > .preset-panel .prompt-panel__list');
    const targetSide = customList?.dataset.wbList || (nativeList ? 'top' : '');
    if (!targetSide || targetSide === dragPayload.from) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  function onDrop(event) {
    if (!state.open || !dragPayload) return;
    const customList = event.target.closest?.('[data-wb-list]');
    const nativeList = state.topType === 'preset' && event.target.closest?.('.pm-main-wrapper > .preset-panel .prompt-panel__list');
    const targetSide = customList?.dataset.wbList || (nativeList ? 'top' : '');
    if (!targetSide || targetSide === dragPayload.from) return;
    event.preventDefault();
    event.stopPropagation();
    const placement = nativeList ? nativeDropPlacement(event) : null;
    const payload = dragPayload;
    dragPayload = null;
    clearNativeDropIndicators();
    TOP.setTimeout(clearNativeDropIndicators, 0);
    void transfer(payload.from, false, payload.keys, placement);
  }

  function onDocumentClick(event) {
    if (!state.open) return;
    const modeButton = event.target.closest?.('.side-panel-root .panel-btn');
    if (modeButton && !modeButton.matches('[data-pmm-worldbook-placeholder="1"]')) {
      close();
      return;
    }
    const action = event.target.closest?.('[data-wb-action]');
    if (!action) {
      if (event.target.closest?.('.prompt-item__checkbox,.prompt-card__checkbox')) TOP.setTimeout(scheduleDecorate, 0);
      return;
    }
    if (action.tagName === 'SELECT' || action.matches('[data-wb-action="search-input"]')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    void handleAction(action);
  }

  function onDocumentChange(event) {
    if (!state.open) return;
    const target = event.target;
    if (target.matches?.('[data-wb-action="select-source"]')) {
      const side = state[target.dataset.wbSide];
      if (side.name !== target.value) side.history.length = 0;
      side.name = target.value;
      void enqueue('载入世界书', async () => { await loadWorldSide(side); renderPanels(); });
      return;
    }
    if (target.matches?.('[data-wb-field]')) void updateField(target);
  }

  function onDocumentInput(event) {
    if (!state.open || !event.target.matches?.('[data-wb-action="search-input"]')) return;
    const input = event.target;
    const side = state[input.dataset.wbSide];
    side.query = input.value;
    const card = input.closest('[data-pmm-wb-panel]');
    const list = card?.querySelector('[data-wb-list]');
    if (!list) return;
    const query = side.query.trim().toLocaleLowerCase();
    const filtered = query
      ? side.entries.filter(entry => entryTitle(entry).toLocaleLowerCase().includes(query) || String(entry.content || '').toLocaleLowerCase().includes(query))
      : side.entries;
    list.innerHTML = filtered.slice(0, side.limit).map(entry => renderEntry(input.dataset.wbSide, side, entry)).join('') || '<div class="pmm-wb-empty">没有找到条目</div>';
    card.querySelector('.pmm-wb-search-bar span').textContent = `${filtered.length}/${side.entries.length}`;
  }

  function installStyle() {
    if (DOC.getElementById(STYLE_ID)) return;
    const style = DOC.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#preset-manager-main-panel.pmm-worldbook-mode .pm-panel-container{position:relative!important}
#preset-manager-main-panel.pmm-worldbook-mode .pm-panel-container--merge-mode .title-action-btn[title^="导入"],
#preset-manager-main-panel.pmm-worldbook-mode .pm-panel-container--merge-mode .title-action-btn[title^="导出"],
#preset-manager-main-panel.pmm-worldbook-mode .pm-panel-container--merge-mode button[title="取消当前预设全部分组"]{display:none!important}
#preset-manager-main-panel.pmm-worldbook-mode .pm-main-wrapper>.preset-panel .theme-switch-card{display:none!important}
#preset-manager-main-panel .pmm-wb-native-hidden{display:none!important}
#preset-manager-main-panel .pmm-wb-inline-panel{min-width:0!important;min-height:0!important;width:100%!important;height:100%!important;display:flex!important;overflow:hidden!important;border:1px solid var(--pm-border,rgba(127,127,127,.17))!important;border-radius:12px!important;background:var(--pm-panel-bg,var(--pm-card-bg,rgba(255,255,255,.96)))!important;color:var(--pm-text-primary,inherit)!important;box-shadow:0 4px 18px rgba(0,0,0,.10)!important}
.pmm-wb-main-content{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.pmm-wb-header{height:46px;min-height:46px;display:flex;align-items:center;justify-content:space-between;gap:5px;padding:5px 7px;border-bottom:1px solid var(--pm-border,rgba(127,127,127,.12));background:var(--pm-toolbar-bg,transparent)}
.pmm-wb-header-left,.pmm-wb-header-right,.pmm-wb-title-row{display:flex;align-items:center;gap:3px;min-width:0}.pmm-wb-header-left{flex:1}.pmm-wb-header-right{flex:0 0 auto}
.pmm-wb-source-select{min-width:70px!important;max-width:190px!important;flex:1 1 110px!important}.pmm-wb-kind-switch{display:inline-flex;align-items:center;gap:1px;padding:2px;border-radius:7px;background:color-mix(in srgb,currentColor 6%,transparent)}
.pmm-wb-kind-switch button{width:25px;height:23px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--pm-text-secondary,currentColor);opacity:.62;display:inline-flex;align-items:center;justify-content:center}.pmm-wb-kind-switch button.is-active{background:var(--pm-quote-color,#3b82f6);color:#fff;opacity:1}.pmm-wb-kind-switch button:active{transform:scale(.94)}.pmm-wb-kind-switch i{font-size:10px}
.pmm-wb-tool{width:27px;height:27px;min-width:27px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--pm-text-secondary,currentColor);display:inline-flex;align-items:center;justify-content:center;opacity:.72}.pmm-wb-tool:active:not(:disabled){transform:scale(.94)}.pmm-wb-tool:disabled{opacity:.22}.pmm-wb-tool i{font-size:10px}.pmm-wb-status{font-size:9px;opacity:.5;white-space:nowrap}
.pmm-wb-search-bar{min-height:38px;display:flex;align-items:center;gap:7px;padding:5px 9px;border-bottom:1px solid var(--pm-border,rgba(127,127,127,.12))}.pmm-wb-search-bar input{flex:1;min-width:0;height:28px;padding:0 8px;border:1px solid var(--pm-border,rgba(127,127,127,.16));border-radius:7px;background:var(--pm-card-bg,rgba(127,127,127,.05));color:inherit}.pmm-wb-search-bar span{font-size:10px;opacity:.55}
.pmm-wb-content{flex:1;min-height:0;overflow:hidden}.pmm-wb-list{height:100%;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:7px;display:flex;flex-direction:column;gap:var(--pmm-user-item-gap,5px)}
.pmm-wb-entry{flex:none;border:1px solid var(--pm-border,rgba(127,127,127,.14));border-radius:10px;background:var(--pm-card-bg,rgba(255,255,255,.68));overflow:hidden}.pmm-wb-entry.is-expanded{border-color:color-mix(in srgb,var(--pm-quote-color,#3485f6) 58%,transparent)}.pmm-wb-entry-head{min-height:var(--pmm-user-item-height,43px);display:flex;align-items:center;gap:6px;padding:3px 8px}.pmm-wb-entry-head button{border:0;background:transparent;color:inherit}.pmm-wb-check,.pmm-wb-expand{width:27px;height:29px;padding:0;opacity:.68}.pmm-wb-check.is-selected{color:var(--pm-quote-color,#3485f6);opacity:1}.pmm-wb-entry-title{min-width:0;flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--pmm-user-item-font,12px)}
.pmm-wb-dot{width:7px;height:7px;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor}.pmm-wb-dot.is-blue{color:#3485f6;background:#3485f6}.pmm-wb-dot.is-green{color:#19bf72;background:#19bf72}.pmm-wb-toggle{width:25px!important;height:14px!important;min-width:25px!important;border-radius:8px!important;padding:1.5px!important;background:#9ba3ad!important;flex:none}.pmm-wb-toggle span{display:block;width:11px;height:11px;border-radius:50%;background:#fff;transition:transform .15s}.pmm-wb-toggle.is-on{background:var(--pm-quote-color,#2878ed)!important}.pmm-wb-toggle.is-on span{transform:translateX(11px)}
.pmm-wb-details{padding:7px 9px 9px;border-top:1px solid var(--pm-border,rgba(127,127,127,.10));display:flex;flex-direction:column;gap:6px;font-size:10px!important;line-height:1.35}.pmm-wb-details label,.pmm-wb-wide-field{display:flex;flex-direction:column;gap:2px;min-width:0}.pmm-wb-details label>span,.pmm-wb-field-head>span:first-child{font-size:8.5px!important;line-height:1.2;opacity:.62}.pmm-wb-details input,.pmm-wb-details select,.pmm-wb-details textarea{width:100%;min-height:26px!important;border:1px solid var(--pm-border,rgba(127,127,127,.17));border-radius:6px;background:var(--pm-card-bg,rgba(127,127,127,.05));color:inherit;padding:4px 6px!important;font-size:10.5px!important;line-height:1.35!important}.pmm-wb-details textarea{min-height:132px!important;resize:vertical}.pmm-wb-detail-row{display:flex;align-items:flex-end;gap:6px}.pmm-wb-detail-row label:first-child{flex:1}.pmm-wb-title-row .pmm-wb-strategy{align-self:flex-end;height:26px!important;min-width:50px!important;padding:0 6px!important;border:1px solid currentColor;border-radius:7px;background:transparent;font-size:9px!important;line-height:1!important}.pmm-wb-strategy span{display:inline-block;width:6px;height:6px;margin-right:3px;border-radius:50%;background:currentColor}.pmm-wb-strategy.is-blue{color:#3485f6}.pmm-wb-strategy.is-green{color:#19bf72}.pmm-wb-meta-grid{display:grid;grid-template-columns:minmax(130px,2fr) minmax(58px,.65fr);gap:6px}.pmm-wb-meta-grid.has-depth{grid-template-columns:minmax(120px,2fr) repeat(2,minmax(52px,.6fr))}.pmm-wb-meta-grid .is-outlet{grid-column:1/-1}.pmm-wb-field-head{min-height:19px;display:flex;align-items:center;justify-content:space-between;gap:6px}.pmm-wb-content-tools{display:flex;align-items:center;gap:5px}.pmm-wb-content-tools small{font-size:8.5px;opacity:.58}.pmm-wb-content-tools button{width:22px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:inherit;opacity:.7}.pmm-wb-content-tools button:active{transform:scale(.94)}.pmm-wb-more{flex:none;border:1px dashed var(--pm-border,rgba(127,127,127,.22));border-radius:8px;background:transparent;color:inherit;padding:8px;opacity:.65}.pmm-wb-empty{margin:auto;padding:24px;text-align:center;opacity:.52}
.pmm-wb-editor-overlay{position:absolute;inset:0;z-index:16000;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));background:rgba(0,0,0,.43);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);color:var(--pmm-wb-editor-text,#222)}.pmm-wb-editor-dialog{width:min(92%,660px);height:min(82%,680px);max-height:calc(100dvh - 28px);min-height:250px;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--pmm-wb-editor-border,rgba(127,127,127,.22));border-radius:13px;background-color:var(--pmm-wb-editor-bg,#fff);background-image:var(--pmm-wb-editor-bg-image,none);color:var(--pmm-wb-editor-text,#222);box-shadow:0 18px 52px rgba(0,0,0,.36)}.pmm-wb-editor-dialog header{min-height:42px;display:flex;align-items:center;gap:7px;padding:6px 8px;border-bottom:1px solid var(--pmm-wb-editor-border,rgba(127,127,127,.14))}.pmm-wb-editor-dialog header strong{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.pmm-wb-editor-dialog header span{font-size:9px;opacity:.58;white-space:nowrap}.pmm-wb-editor-dialog header button{width:28px;height:28px;padding:0;border:0;border-radius:7px;background:color-mix(in srgb,var(--pmm-wb-editor-text,#222) 8%,transparent);color:inherit}.pmm-wb-editor-dialog header button:disabled{opacity:.28}.pmm-wb-editor-dialog header button[data-wb-editor-save]{color:var(--pmm-wb-editor-accent,#3485f6)}.pmm-wb-editor-dialog textarea{flex:1;min-height:0;width:auto;margin:8px;padding:10px;border:1px solid var(--pmm-wb-editor-border,rgba(127,127,127,.18));border-radius:9px;background:var(--pmm-wb-editor-field-bg,rgba(127,127,127,.05));color:var(--pmm-wb-editor-text,#222);font-size:12px!important;line-height:1.55!important;resize:none}
.pmm-wb-source-picker{position:absolute;inset:0;z-index:14000;display:flex;align-items:flex-start;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 10px;background:rgba(0,0,0,.42);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}.pmm-wb-picker-dialog{width:min(94%,430px);max-height:min(78%,620px);margin-top:7vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--pm-border,rgba(127,127,127,.22));border-radius:13px;background:var(--pm-panel-bg,var(--pm-card-bg,#fff));color:var(--pm-text-primary,inherit);box-shadow:0 18px 50px rgba(0,0,0,.35)}.pmm-wb-picker-head{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:6px;padding:8px;border-bottom:1px solid var(--pm-border,rgba(127,127,127,.14))}.pmm-wb-picker-head input{height:34px;min-width:0;padding:0 9px;border:1px solid var(--pm-border,rgba(127,127,127,.2));border-radius:8px;background:var(--pm-card-bg,rgba(127,127,127,.05));color:inherit}.pmm-wb-picker-head button{border:0;border-radius:8px;background:rgba(127,127,127,.08);color:inherit}.pmm-wb-picker-list{min-height:0;overflow:auto;padding:6px}.pmm-wb-picker-list button{width:100%;min-height:38px;margin-bottom:3px;padding:7px 9px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left}.pmm-wb-picker-list button.is-current{border-color:var(--pm-quote-color,#3b82f6);background:color-mix(in srgb,var(--pm-quote-color,#3b82f6) 11%,transparent)}
@media(max-width:768px){.pmm-wb-header{height:42px;min-height:42px;padding:4px}.pmm-wb-source-select{max-width:145px!important}.pmm-wb-status{display:none}.pmm-wb-tool{width:24px;height:25px;min-width:24px}.pmm-wb-kind-switch button{width:22px}.pmm-wb-list{padding:5px}.pmm-wb-entry-head{min-height:var(--pmm-user-item-height,39px);padding:2px 6px}.pmm-wb-details{padding:6px 7px 8px;gap:5px}.pmm-wb-meta-grid,.pmm-wb-meta-grid.has-depth{grid-template-columns:minmax(0,1.7fr) minmax(52px,.58fr) minmax(52px,.58fr)}.pmm-wb-details textarea{min-height:118px!important}.pmm-wb-editor-dialog{width:94%;height:82%;max-height:calc(100dvh - 24px);border-radius:12px}.pmm-wb-editor-dialog textarea{margin:6px;padding:8px;font-size:11px!important}}
`;
    DOC.head.append(style);
  }

  function wait(milliseconds) { return new Promise(resolve => TOP.setTimeout(resolve, milliseconds)); }

  async function ensureNormalMode(container) {
    const activeMode = MODE_CLASSES.some(name => container.classList.contains(name));
    if (!activeMode) return true;
    const activeButton = container.querySelector('.side-panel-root .panel-btn.panel-btn--active:not([data-pmm-worldbook-placeholder="1"])');
    activeButton?.click();
    for (let attempt = 0; attempt < 20; attempt++) {
      await wait(35);
      if (!MODE_CLASSES.some(name => container.classList.contains(name))) return true;
    }
    return false;
  }

  async function open() {
    if (state.open) return close();
    const host = DOC.getElementById('preset-manager-main-panel');
    const container = host?.querySelector('.pm-panel-container');
    const mainWrapper = container?.querySelector(':scope > .pm-main-wrapper');
    const nativeTop = mainWrapper?.querySelector(':scope > .preset-panel');
    if (!host || !container || !mainWrapper || !nativeTop) {
      return notify('warning', '请先打开预设工坊主面板');
    }
    if (!await ensureNormalMode(container)) {
      return notify('warning', '请先退出当前的缝合／分支／收藏页面后再打开世界书');
    }
    installStyle();
    state.open = true;
    state.host = host;
    state.container = container;
    state.mainWrapper = mainWrapper;
    state.nativeTop = nativeTop;
    host.classList.add('pmm-worldbook-mode');
    container.classList.add('pm-panel-container--merge-mode', 'pmm-worldbook-layout');
    try {
      state.busy = true;
      setStatus('读取世界书…');
      await refreshWorldNames();
      await loadWorldSide(state.bottom);
      if (state.topType === 'world') await loadWorldSide(state.top);
      setStatus('已同步');
      renderPanels();
    } catch (error) {
      console.error('[世界书缝合] 打开失败', error);
      notify('error', `打开失败：${error?.message || error}`);
      close();
      return;
    } finally {
      state.busy = false;
    }
    hostObserver?.disconnect();
    hostObserver = new MutationObserver(() => {
      if (!state.host?.isConnected) return resetClosedState();
      scheduleDecorate();
    });
    hostObserver.observe(host, { childList: true, subtree: true });
  }

  function resetClosedState() {
    state.open = false;
    state.busy = false;
    state.status = '已同步';
    state.host = null;
    state.container = null;
    state.mainWrapper = null;
    state.nativeTop = null;
    state.bottomCard = null;
    state.topCard = null;
    resetSide(state.top, true);
    resetSide(state.bottom, true);
    context = null;
    dragPayload = null;
    hostObserver?.disconnect();
    hostObserver = null;
  }

  function close() {
    if (!state.open) return;
    if (renderFrame) TOP.cancelAnimationFrame(renderFrame);
    renderFrame = 0;
    state.topCard?.remove();
    state.bottomCard?.remove();
    state.host?.querySelector('.pmm-wb-editor-overlay')?.remove();
    state.nativeTop?.classList.remove('pmm-wb-native-hidden');
    state.nativeTop?.querySelector('[data-pmm-wb-kind-switch]')?.remove();
    state.nativeTop?.querySelector('[data-pmm-wb-native-transfer]')?.remove();
    state.container?.classList.remove('pm-panel-container--merge-mode', 'pmm-worldbook-layout');
    state.host?.classList.remove('pmm-worldbook-mode');
    state.host?.querySelector('[data-pmm-worldbook-placeholder="1"]')?.classList.remove('panel-btn--active');
    resetClosedState();
  }

  function cleanup() {
    close();
    DOC.querySelector('#preset-manager-main-panel .pmm-wb-editor-overlay')?.remove();
    DOC.getElementById(STYLE_ID)?.remove();
    DOC.removeEventListener('click', onPresetExpandClick, true);
    DOC.removeEventListener('click', onDocumentClick, true);
    DOC.removeEventListener('change', onDocumentChange, true);
    DOC.removeEventListener('input', onDocumentInput, true);
    DOC.removeEventListener('dragstart', onDragStart, true);
    DOC.removeEventListener('dragover', onDragOver, true);
    DOC.removeEventListener('drop', onDrop, true);
    DOC.removeEventListener('dragend', clearDrag, true);
    try { if (TOP[API_KEY]?.cleanup === cleanup) delete TOP[API_KEY]; } catch (_) {}
  }

  function clearDrag() {
    dragPayload = null;
    clearNativeDropIndicators();
  }

  try { TOP.__PMM_WORLDBOOK_STITCH_TEST2__?.cleanup?.(); } catch (_) {}
  try { TOP[API_KEY]?.cleanup?.(); } catch (_) {}
  DOC.addEventListener('click', onPresetExpandClick, true);
  DOC.addEventListener('click', onDocumentClick, true);
  DOC.addEventListener('change', onDocumentChange, true);
  DOC.addEventListener('input', onDocumentInput, true);
  DOC.addEventListener('dragstart', onDragStart, true);
  DOC.addEventListener('dragover', onDragOver, true);
  DOC.addEventListener('drop', onDrop, true);
  DOC.addEventListener('dragend', clearDrag, true);
  TOP[API_KEY] = { open, close, cleanup, state };
  console.info('[预设工坊测试版] test.3 世界书已接入原生双卡片布局。');
})();
