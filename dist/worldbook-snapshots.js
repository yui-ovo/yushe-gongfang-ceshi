import { createWorldbookSnapshots, switches, copy } from './worldbook-snapshot-core.js?v=2.98.0-test.1';

const SELF = window, TOP = window.parent || window, DOC = TOP.document;
const KEY = '__PMM_WORLDBOOK_SNAPSHOTS__';
const STORAGE = 'pmm.test.worldbook-snapshots.v1';
const PRESET = '__PMM_SWITCH_SNAPSHOTS_TEST52__';
const STITCH = '__PMM_WORLDBOOK_STITCH_TEST3__';
TOP[KEY]?.cleanup?.();
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ctx = () => TOP.SillyTavern?.getContext?.() || {};
function helper(name) {
  for (const source of [SELF, SELF.TavernHelper, TOP.TavernHelper]) {
    if (typeof source?.[name] === 'function') return source[name].bind(source);
  }
  throw new Error(`当前酒馆助手缺少 ${name} 接口，请更新酒馆助手`);
}
function characters() {
  return Object.entries(ctx().characters || {}).filter(([, c]) => c?.name).map(([id, c]) => ({
    key: String(c.avatar || c.id || id), name: c.name, rawId: id,
  }));
}
function character() {
  const context = ctx();
  if (context.groupId || context.group_id) return null;
  const id = context.characterId ?? context.this_chid;
  if (id === undefined || id === null || id === '' || Number(id) < 0) return null;
  return characters().find(c => c.rawId === String(id)) || null;
}
async function catalog() {
  const names = await helper('getWorldbookNames')();
  const globals = await helper('getGlobalWorldbookNames')();
  const linked = new Map(names.map(name => [name, []]));
  const normalize = name => String(name || '').normalize('NFC').trim().toLocaleLowerCase();
  const lookup = new Map(names.map(name => [normalize(name), name]));
  // The helper reads primary AND additional bindings. Fail closed on partial reads.
  const getBindings = helper('getCharWorldbookNames');
  for (const c of characters()) {
    const bindings = await getBindings(c.name);
    for (const raw of [bindings?.primary, ...(bindings?.additional || [])]) {
      const name = linked.has(raw) ? raw : lookup.get(normalize(raw));
      if (name && !linked.get(name).some(row => row.key === c.key)) linked.get(name).push(c);
    }
  }
  return names.map(name => ({ name, characters: linked.get(name), global: globals.includes(name) }));
}
const engine = createWorldbookSnapshots({
  readStore: () => { const raw = TOP.localStorage.getItem(STORAGE); return raw ? JSON.parse(raw) : null; },
  writeStore: store => TOP.localStorage.setItem(STORAGE, JSON.stringify(store)),
  id: () => TOP.crypto.randomUUID(), character, catalog,
  globals: () => helper('getGlobalWorldbookNames')(),
  setGlobals: names => helper('rebindGlobalWorldbooks')(names),
  load: name => ctx().loadWorldInfo(name),
  exists: async name => (await helper('getWorldbookNames')()).includes(name),
  notice: message => TOP.toastr?.warning?.(message),
  save: (name, data) => ctx().saveWorldInfo(name, data, true),
  hasUnsaved: names => ['top', 'bottom'].some(side => {
    const value = TOP[STITCH]?.state?.[side]; return value?.dirty && names.includes(value.name);
  }),
  changed: (name, data) => TOP[STITCH]?.refreshSnapshotBook?.(name, data),
});

let overlay = null, viewportCleanup = null, themeCleanup = null, busy = false, disposed = false;
let page = 'character', section = 'snapshots', book = '', books = [], items = [], draft = null;
let picker = false, sourceQuery = '', editGroup = null, renameId = '', menuId = '', message = '', lastFocus = null;
let eventSource = null, eventType = '', eventTimer = 0;
const style = DOC.createElement('style');
style.id = 'pmm-worldbook-snapshot-style';
style.textContent = `
.pmm-snapshot-tabs { display:flex; gap:4px; padding:8px 16px; border-bottom:1px solid var(--pm-border,#343434); flex-shrink:0; }
.pmm-snapshot-tabs button { flex:1; min-width:0; border:0!important; border-radius:9px!important; padding:10px 3px!important; background:transparent!important; color:inherit; font:inherit; font-size:13px!important; cursor:pointer; }
.pmm-snapshot-tabs button[aria-selected="true"] { background:var(--pm-hover-bg,#303030)!important; font-weight:650; }
.pmm-snapshot-tabs button:disabled { opacity:.4; }
.pmm-snapshot-hub-preset .pmm-switch-snapshot-bindings { display:none!important; }
.pmm-snapshot-hub-preset .pmm-switch-snapshot-row { border-radius:12px!important; }
.pmm-snapshot-hub-preset .pmm-switch-snapshot-menu .pmm-switch-snapshot-lock { width:100%!important; justify-content:flex-start!important; }
.pmm-wbs-overlay { box-sizing:border-box; position:fixed; inset:0; z-index:2147483000; background:rgba(0,0,0,.4); backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px); display:flex; align-items:center; justify-content:center; padding:16px; color:var(--pm-text-primary,#e7e5e4); font-family:var(--pm-font-family,system-ui,sans-serif); }
.pmm-wbs-dialog { box-sizing:border-box; display:flex; flex-direction:column; width:680px; max-width:100%; max-height:100%; min-height:0; background:var(--pm-panel-bg,#191919); border:1px solid var(--pm-border,#3c3c3c); border-radius:20px; box-shadow:0 20px 70px #0005; overflow:hidden; font-size:14px; }
.pmm-wbs-dialog * { box-sizing:border-box; }
.pmm-wbs-head { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 12px; gap:12px; flex-shrink:0; }
.pmm-wbs-head h2 { font-size:19px; margin:0; color:inherit; }
.pmm-wbs-head p { margin:5px 0 0; font-size:12px; opacity:.65; }
.pmm-wbs-dialog button { color:inherit; background:transparent; border:1px solid var(--pm-border,#414141); border-radius:9px; padding:9px 12px; cursor:pointer; font:inherit; line-height:1.3; min-height:36px; }
.pmm-wbs-dialog button:hover { background:var(--pm-hover-bg,#303030); }
.pmm-wbs-dialog button:disabled { opacity:.4; cursor:default; }
.pmm-wbs-icon { border:0!important; font-size:20px!important; }
.pmm-wbs-body { padding:16px 20px; overflow:auto; min-height:0; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
.pmm-wbs-body h3 { font-size:14px; margin:16px 0 10px; }
.pmm-wbs-dialog small { opacity:.65; font-size:12px; display:block; margin-top:5px; overflow-wrap:anywhere; }
.pmm-wbs-source { display:block; text-align:left; width:100%; margin:7px 0; padding:12px!important; }
.pmm-wbs-empty { padding:24px 5px; text-align:center; opacity:.6; line-height:1.8; }
.pmm-wbs-tools { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; align-items:center; }
.pmm-wbs-tools .grow { flex:1; text-align:left; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pmm-wbs-row { border:1px solid var(--pm-border,#363636); border-radius:12px; padding:13px; margin:9px 0; }
.pmm-wbs-row-main { display:flex; gap:10px; align-items:center; }
.pmm-wbs-copy { flex:1; min-width:0; overflow-wrap:anywhere; }
.pmm-wbs-copy strong { font-size:14px; font-weight:550; }
.pmm-wbs-menu { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; border-top:1px solid var(--pm-border,#363636); padding-top:10px; }
.pmm-wbs-dialog input[type="text"],.pmm-wbs-dialog input[type="search"] { width:100%; background:var(--pm-card-bg,#242424); color:inherit; border:1px solid var(--pm-border,#444); border-radius:10px; padding:11px 12px; font:inherit; font-size:16px!important; min-width:0; margin:7px 0 12px; }
.pmm-wbs-entry { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:13px 4px; border-bottom:1px solid var(--pm-border,#363636); cursor:pointer; }
.pmm-wbs-entry span { overflow-wrap:anywhere; min-width:0; }
.pmm-wbs-entry input { appearance:none; -webkit-appearance:none; width:32px!important; height:19px!important; min-width:32px; border:0; border-radius:20px; background:#7777; position:relative; margin:0; cursor:pointer; }
.pmm-wbs-entry input:before { content:''; position:absolute; top:3px; left:3px; width:13px; height:13px; background:#eee; border-radius:50%; }
.pmm-wbs-entry input:checked { background:var(--pm-accent,#399e82); }
.pmm-wbs-entry input:checked:before { left:16px; }
.pmm-wbs-entry input:focus-visible { outline:2px solid var(--pm-accent,#399e82); outline-offset:3px; }
.pmm-wbs-foot { display:flex; gap:10px; align-items:center; justify-content:flex-end; padding:12px 20px; border-top:1px solid var(--pm-border,#363636); flex-shrink:0; }
.pmm-wbs-foot small { flex:1; margin:0; }
.pmm-wbs-primary { background:var(--pm-hover-bg,#303030)!important; font-weight:600!important; }
.pmm-wbs-message { padding:8px 20px; color:inherit; font-size:13px; background:var(--pm-hover-bg,#303030); flex-shrink:0; }
.pmm-wbs-dialog [hidden] { display:none!important; }
@media(max-width:600px) { .pmm-wbs-overlay { align-items:flex-end; padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom)); } .pmm-wbs-dialog { width:100%; border-radius:18px; } .pmm-wbs-body { padding:12px; } .pmm-wbs-head { padding:15px 14px 10px; } .pmm-wbs-foot { padding:12px; } }

/* Compact, theme-derived soft surfaces shared by the three snapshot categories. */
.pmm-wbs-overlay,.pmm-snapshot-hub-preset {
  --wbs-base:#202124; --wbs-ink:var(--pm-text-primary,#eee);
  --wbs-surface:color-mix(in srgb,var(--pm-panel-bg,var(--wbs-base)) 92%,var(--wbs-base));
  --wbs-raised:color-mix(in srgb,var(--pm-card-bg,var(--wbs-base)) 88%,var(--wbs-ink) 4%);
  --wbs-line:color-mix(in srgb,var(--wbs-ink) 10%,transparent);
  --wbs-shadow:rgba(0,0,0,.23); --wbs-shine:rgba(255,255,255,.045);
}
[data-wbs-tone="light"] { --wbs-base:#f5f5f5; --wbs-shadow:rgba(35,39,48,.085); --wbs-shine:rgba(255,255,255,.85); }
.pmm-wbs-overlay { background:rgba(0,0,0,.27); }
.pmm-wbs-dialog,.pmm-snapshot-hub-preset .pmm-switch-snapshot-dialog {
  background:linear-gradient(145deg,var(--wbs-shine),transparent 46%),var(--wbs-surface);
  color:var(--wbs-ink); border:1px solid var(--wbs-line); border-radius:28px;
  box-shadow:0 18px 50px var(--wbs-shadow),inset 0 1px 0 var(--wbs-shine);
  font-family:var(--pm-font-family,system-ui,sans-serif); text-shadow:none;
}
.pmm-wbs-dialog { width:600px; }
.pmm-wbs-dialog,.pmm-snapshot-hub-preset .pmm-switch-snapshot-dialog {
  height:min(460px,calc(var(--wbs-visible-height,var(--pmm-switch-snapshot-visible-height,100dvh)) - 32px))!important;
  max-height:100%!important; color:var(--wbs-ink)!important;
}
.pmm-snapshot-hub-preset .pmm-switch-snapshot-list { flex:1!important; min-height:0!important; max-height:none!important; }
.pmm-snapshot-hub-preset .pmm-switch-snapshot-head,.pmm-snapshot-hub-preset .pmm-switch-snapshot-default,.pmm-snapshot-hub-preset .pmm-switch-snapshot-create,.pmm-snapshot-hub-preset .pmm-switch-snapshot-footer { flex-shrink:0!important; }
.pmm-wbs-source-section[hidden],.pmm-wbs-source[hidden] { display:none!important; }
.pmm-wbs-source-search { position:sticky; top:-10px; z-index:1; background:var(--wbs-surface); padding-top:4px; }
.pmm-wbs-dialog.is-editing { height:min(680px,calc(var(--wbs-visible-height,100dvh) - 32px))!important; }
.pmm-wbs-head { padding:22px 22px 12px; }
.pmm-wbs-heading { display:flex; align-items:center; gap:12px; min-width:0; }
.pmm-wbs-heading>div { min-width:0; }
.pmm-wbs-heading p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pmm-wbs-head h2 { font-size:19px; font-weight:650; letter-spacing:.015em; }
.pmm-wbs-symbol { display:inline-flex; align-items:center; justify-content:center; flex:none; width:40px; height:40px; border-radius:14px; background:var(--wbs-raised); box-shadow:3px 4px 10px var(--wbs-shadow),inset 0 1px 0 var(--wbs-shine); }
.pmm-wbs-svg { width:20px; height:20px; display:block; flex:none; }
.pmm-wbs-dialog button { border-color:var(--wbs-line); border-radius:999px; }
.pmm-wbs-icon { width:34px; height:34px; min-height:34px!important; padding:8px!important; display:grid; place-items:center; background:var(--wbs-raised)!important; box-shadow:2px 3px 9px var(--wbs-shadow); }
.pmm-snapshot-tabs { border:1px solid var(--wbs-line); border-radius:17px; padding:4px; margin:0 20px 8px; gap:3px; background:color-mix(in srgb,var(--wbs-ink) 3%,transparent); }
.pmm-snapshot-tabs button { display:flex; align-items:center; justify-content:center; gap:6px; border-radius:13px!important; font-size:12px!important; line-height:1.25; padding:10px 3px!important; color:var(--wbs-ink); opacity:.68; }
.pmm-snapshot-tabs .pmm-wbs-svg { width:15px; height:15px; }
.pmm-snapshot-tabs button[aria-selected="true"] { background:var(--wbs-raised)!important; opacity:1; box-shadow:2px 3px 7px var(--wbs-shadow),inset 0 1px 0 var(--wbs-shine); }
.pmm-wbs-body { flex:1; padding:12px 20px 16px; scrollbar-width:thin; }
.pmm-wbs-body h3 { font-weight:550; font-size:12px; margin:14px 3px 9px; opacity:.68; }
.pmm-wbs-source { display:flex; align-items:center; gap:10px; border-radius:17px!important; padding:13px!important; background:var(--wbs-raised)!important; border:1px solid var(--wbs-line)!important; }
.pmm-wbs-source-copy { min-width:0; flex:1; line-height:1.5; }
.pmm-wbs-source-copy>span { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.pmm-wbs-source-copy small { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.pmm-wbs-source>.pmm-wbs-svg { opacity:.5; width:16px; }
.pmm-wbs-tools { flex-wrap:nowrap; gap:8px; margin:3px 0 12px; }
.pmm-wbs-tools button { padding:10px 13px; font-size:12px; }
.pmm-wbs-tools .grow { display:flex; align-items:center; justify-content:space-between; gap:8px; background:var(--wbs-raised); border-radius:13px; }
.pmm-wbs-tools .grow>span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pmm-wbs-primary { background:var(--wbs-ink)!important; color:var(--wbs-base)!important; border-color:transparent!important; box-shadow:0 4px 12px var(--wbs-shadow); }
.pmm-wbs-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; min-height:140px; padding:18px 5px; opacity:1; }
.pmm-wbs-empty .pmm-wbs-symbol { width:48px; height:48px; border-radius:50%; margin-bottom:4px; }
.pmm-wbs-empty strong { font-weight:500; font-size:13px; }
.pmm-wbs-empty small { max-width:240px; line-height:1.7; margin:0; font-size:11px; }
.pmm-wbs-row,.pmm-snapshot-hub-preset .pmm-switch-snapshot-row { border:1px solid var(--wbs-line)!important; background:var(--wbs-raised)!important; border-radius:18px!important; box-shadow:0 3px 9px var(--wbs-shadow),inset 0 1px 0 var(--wbs-shine); }
.pmm-wbs-row-main { gap:9px; }
.pmm-wbs-row .pmm-wbs-symbol { width:32px; height:36px; border-radius:11px; box-shadow:none; }
.pmm-wbs-row .pmm-wbs-copy small { font-size:11px; }
.pmm-wbs-row [data-wbs="menu"] { border:none; padding:6px; font-size:20px; }
.pmm-wbs-menu { border-color:var(--wbs-line); }
.pmm-wbs-entry { padding:13px 8px; border-color:var(--wbs-line); font-size:13px; }
.pmm-wbs-dialog input[type="text"],.pmm-wbs-dialog input[type="search"] { border-color:var(--wbs-line); background:var(--wbs-raised); border-radius:14px; }
.pmm-wbs-foot { border-color:var(--wbs-line); padding:12px 20px; background:color-mix(in srgb,var(--wbs-surface) 85%,transparent); }
.pmm-wbs-foot small { font-size:10px; line-height:1.6; }
.pmm-wbs-subnav { padding:3px; border-radius:999px; background:color-mix(in srgb,var(--wbs-ink) 4%,transparent); }
.pmm-wbs-subnav button { flex:1; border:none; padding:7px 9px; }
.pmm-wbs-picker-head { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.pmm-wbs-picker-head strong { font-size:13px; font-weight:550; }
.pmm-snapshot-hub-preset .pmm-switch-snapshot-head { border-bottom:0!important; }
.pmm-snapshot-hub-preset .pmm-switch-snapshot-actions>button,.pmm-snapshot-hub-preset .pmm-switch-snapshot-default-actions>button,.pmm-snapshot-hub-preset .pmm-switch-snapshot-create>button { border-radius:999px!important; }
@media(max-width:600px) { .pmm-wbs-head { padding:18px 16px 12px; } .pmm-wbs-body { padding:10px 14px 14px; } .pmm-snapshot-tabs { margin:0 14px 8px; } .pmm-wbs-foot { padding:10px 15px; } .pmm-wbs-dialog { border-radius:26px; } }
`;
DOC.head.append(style);
const tabLabels = { preset: '预设', character: '角色世界书', global: '全局世界书' };
function icon(name) {
  const paths = {
    camera: '<path d="M8 5l1-2h6l1 2h4v14H4V5z"/><circle cx="12" cy="12" r="4"/>',
    preset: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    character: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-3a7 7 0 0114 0v3"/>',
    global: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18z"/>',
    book: '<path d="M4 4h7l1 2 1-2h7v16h-7l-1 1-1-1H4zM12 6v15"/>',
    arrow: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  return `<svg class="pmm-wbs-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.camera}</svg>`;
}
function tabs(active, locked = false) {
  return `<nav class="pmm-snapshot-tabs" aria-label="快照分类">${Object.entries(tabLabels).map(([key, label]) => `<button type="button" data-hub-tab="${key}" aria-selected="${key === active}"${locked ? ' disabled' : ''}>${icon(key)}<span>${label}</span></button>`).join('')}</nav>`;
}
function decoratePreset(root) {
  const dialog = root?.querySelector('.pmm-switch-snapshot-dialog');
  if (!dialog || dialog.querySelector('.pmm-snapshot-tabs')) return;
  root.classList.add('pmm-snapshot-hub-preset');
  theme(root);
  const locked = !!TOP[PRESET]?.isCapturing?.();
  dialog.querySelector('header')?.insertAdjacentHTML('afterend', tabs('preset', locked));
  dialog.querySelector('.pmm-snapshot-tabs')?.addEventListener('click', event => {
    const tab = event.target.closest('[data-hub-tab]')?.dataset.hubTab;
    if (!tab || tab === 'preset' || locked) return;
    TOP[PRESET]?.close?.();
    void open(tab);
  });
  // Reuse the original binding controls in the existing More menu.
  for (const row of dialog.querySelectorAll('.pmm-switch-snapshot-row')) {
    const menu = row.querySelector('.pmm-switch-snapshot-menu');
    if (menu) for (const control of row.querySelectorAll('.pmm-switch-snapshot-lock')) menu.append(control);
  }
}
function theme(target = overlay) {
  if (!target) return;
  const main = DOC.querySelector('#preset-manager-main-panel .pmm-wb-inline-panel') || DOC.querySelector('#preset-manager-main-panel .preset-panel');
  const floating = DOC.querySelector('#preset-manager-floating-panel .floating-panel-root') || DOC.querySelector('#preset-manager-floating-panel .panel-wrapper')
    || SELF.document.querySelector('.floating-panel-root');
  const source = main || floating || DOC.body;
  const view = source.ownerDocument.defaultView;
  const css = view.getComputedStyle(source);
  const useFloating = !main && !!floating;
  let mode = ''; try { mode = TOP.localStorage.getItem('preset-manager-theme-mode') || ''; } catch (_) {}
  const defaults = mode === 'dark'
    ? { ink:'#e6e8ed', surface:'#20232b', card:'#282d36', border:'#424752' }
    : { ink:'#35363b', surface:'#fafafa', card:'#f3f4f6', border:'#dadce1' };
  // Resolve in the source tree: --fp-* and magic-theme references do not exist on a body-mounted modal.
  const probe = source.ownerDocument.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  source.append(probe);
  const resolve = (expression, fallback) => {
    probe.style.setProperty('color', fallback, 'important');
    probe.style.setProperty('color', expression, 'important');
    return view.getComputedStyle(probe).color;
  };
  const fields = [
    ['--pm-text-primary','--fp-text-color','--SmartThemeBodyColor',defaults.ink],
    ['--pm-panel-bg','--fp-glass-bg','--SmartThemeBlurTintColor',defaults.surface],
    ['--pm-card-bg','--fp-card-bg','--SmartThemeBlurTintColor',defaults.card],
    ['--pm-border','--fp-border-color','--SmartThemeBorderColor',defaults.border],
    ['--pm-accent','--fp-accent-color','--SmartThemeQuoteColor',defaults.ink],
    ['--pm-hover-bg','--fp-glass-hover-bg','--SmartThemeBlurTintColor',defaults.card],
  ];
  for (const [key, fp, smart, fallback] of fields) {
    const primary = useFloating ? fp : key;
    const expression = `var(${primary},var(${smart},${fallback}))`;
    target.style.setProperty(key, resolve(expression, fallback));
  }
  // Explicit day/night mode also works before either workshop surface is mounted.
  if (!main && !floating && ['light','dark'].includes(mode)) {
    target.style.setProperty('--pm-text-primary',defaults.ink);
    target.style.setProperty('--pm-panel-bg',defaults.surface);
    target.style.setProperty('--pm-card-bg',defaults.card);
  }
  const font = css.getPropertyValue('--pm-font-family') || css.fontFamily;
  target.style.setProperty('--pm-font-family',font);
  const rgb = target.style.getPropertyValue('--pm-text-primary').match(/[\d.]+/g)?.slice(0,3).map(Number);
  probe.remove();
  const dark = rgb?.length === 3 ? .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2] > 145 : mode === 'dark';
  target.dataset.wbsTone = dark ? 'dark' : 'light';
}
function watchTheme() {
  themeCleanup?.();
  let frame = 0;
  const update = () => { if (!frame) frame = TOP.requestAnimationFrame(() => { frame = 0; theme(); }); };
  const observer = new TOP.MutationObserver(update);
  const sources = [DOC.documentElement, DOC.body, DOC.getElementById('preset-manager-main-panel'), DOC.querySelector('#preset-manager-main-panel .pm-panel-container'), DOC.querySelector('#preset-manager-main-panel .preset-panel'), DOC.querySelector('#preset-manager-floating-panel .floating-panel-root')];
  sources.filter(Boolean).forEach(node => observer.observe(node, { attributes:true, attributeFilter:['class','style','data-theme'] }));
  TOP.addEventListener('storage', update);
  themeCleanup = () => { observer.disconnect(); TOP.removeEventListener('storage', update); if (frame) TOP.cancelAnimationFrame(frame); };
}
function bindViewport() {
  const vv = TOP.visualViewport;
  const ios = /iPhone|iPad|iPod/.test(TOP.navigator.userAgent) || (/Mac/.test(TOP.navigator.platform) && TOP.navigator.maxTouchPoints > 1);
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!overlay) return;
    const keyboard = ios && overlay.contains(DOC.activeElement) && /INPUT|TEXTAREA/.test(DOC.activeElement.tagName) && vv;
    Object.assign(overlay.style, {
      position: keyboard ? 'fixed' : 'absolute', inset: 'auto',
      left: `${keyboard ? vv.offsetLeft : (vv?.pageLeft ?? TOP.scrollX)}px`,
      top: `${keyboard ? vv.offsetTop : (vv?.pageTop ?? TOP.scrollY)}px`,
      width: `${vv?.width || TOP.innerWidth}px`, height: `${vv?.height || TOP.innerHeight}px`,
    });
    overlay.style.setProperty('--wbs-visible-height', `${vv?.height || TOP.innerHeight}px`);
  };
  const schedule = () => { if (!frame) frame = TOP.requestAnimationFrame(update); };
  const targets = [[TOP, 'resize'], [TOP, 'scroll'], [TOP, 'orientationchange'], [vv, 'resize'], [vv, 'scroll'], [overlay, 'focusin'], [overlay, 'focusout']];
  targets.forEach(([target, name]) => target?.addEventListener(name, schedule, { passive: true }));
  update();
  viewportCleanup = () => { targets.forEach(([target, name]) => target?.removeEventListener(name, schedule)); if (frame) TOP.cancelAnimationFrame(frame); };
}
function say(text) {
  message = text;
  const node = overlay?.querySelector('[data-message]');
  if (node) { node.textContent = text; node.hidden = !text; }
}
function report(error) { console.warn('[世界书快照]', error); say(error.message || String(error)); }
async function run(action) {
  if (busy) return;
  busy = true;
  const controls = [...(overlay?.querySelectorAll('button,input') || [])].map(node => [node, node.disabled]);
  controls.forEach(([node]) => { node.disabled = true; });
  overlay?.setAttribute('aria-busy', 'true');
  try { await action(); }
  catch (error) { report(error); try { render(); } catch (_) {} }
  finally { busy = false; controls.forEach(([node, disabled]) => { if (node.isConnected) node.disabled = disabled; }); overlay?.removeAttribute('aria-busy'); }
}
async function refresh() { books = await catalog(); }
function button(action, label, extra = '') { return `<button type="button" data-wbs="${action}" ${extra}>${label}</button>`; }
function sourceMarkup() {
  const sectionMarkup = (scope, label, rows) => `<section class="pmm-wbs-source-section" data-source-section><h3>${label}</h3>${rows.length ? rows.map(row =>
    `<button type="button" class="pmm-wbs-source" data-wbs="choose" data-book="${h(row.name)}" data-scope="${scope}" data-source-search="${h(normalizeSearch([row.name, ...row.characters.map(c => c.name)].join(' ')))}"><span class="pmm-wbs-symbol">${icon('book')}</span><span class="pmm-wbs-source-copy"><span>${h(row.name)}</span><small>${scope === 'character' ? h(row.characters.map(c => c.name).join('、')) : '已挂载到全局'}</small></span>${icon('arrow')}</button>`).join('') : '<p class="pmm-wbs-empty">暂无符合条件的世界书</p>'}</section>`;
  return `<div class="pmm-wbs-picker-head">${button('back-sources', icon('back'), 'class="pmm-wbs-icon" aria-label="返回快照"')}<strong>选择世界书</strong></div><div class="pmm-wbs-source-search"><input type="search" data-source-query value="${h(sourceQuery)}" placeholder="搜索角色姓名或世界书名" aria-label="搜索角色姓名或世界书名" autocomplete="off"></div>` + sectionMarkup('character', '角色绑定世界书', books.filter(row => row.characters.length))
    + sectionMarkup('global', '全局世界书 · 未绑定角色', books.filter(row => !row.characters.length && row.global))
    + '<p class="pmm-wbs-empty" data-source-empty hidden role="status">没有匹配的角色或世界书</p>';
}
function normalizeSearch(value) { return String(value || '').normalize('NFKC').toLocaleLowerCase().trim(); }
function filterSources() {
  if (!overlay || !picker) return;
  const query = normalizeSearch(sourceQuery);
  let count = 0;
  for (const section of overlay.querySelectorAll('[data-source-section]')) {
    let visible = 0;
    for (const row of section.querySelectorAll('[data-source-search]')) {
      row.hidden = !row.dataset.sourceSearch.includes(query);
      if (!row.hidden) visible++;
    }
    section.hidden = !!query && !visible;
    count += visible;
  }
  const empty = overlay.querySelector('[data-source-empty]');
  if (empty) empty.hidden = !query || count > 0;
}
function snapshotMarkup() {
  const store = engine.read(), c = character();
  const list = store.snapshots.filter(item => item.scope === page && (!book || item.book === book));
  return `<div class="pmm-wbs-tools">${button('sources', `<span>${h(book || '选择世界书')}</span>${icon('arrow')}`, 'class="grow"')}${button('new', '＋ 新快照', `class="pmm-wbs-primary" ${book ? '' : 'disabled'}`)}</div>
    ${list.length ? list.map(item => {
      const active = items.length && item.book === book && Object.entries(item.states).every(([uid, disabled]) => {
        const entry = items.find(entry => String(entry.uid) === uid); return entry && !!entry.disable === disabled;
      });
      const bound = item.characters.includes(c?.key);
      const canBind = item.scope === 'character' && books.find(row => row.name === item.book)?.characters.some(row => row.key === c?.key);
      const attrs = `data-id="${h(item.id)}"`;
      return `<article class="pmm-wbs-row"><div class="pmm-wbs-row-main"><div class="pmm-wbs-copy"><strong>${h(item.name)}</strong><small>${h(item.book)} · ${Object.keys(item.states).length} 条${active ? ' · 当前开关一致' : ''}</small>${item.characters.length ? `<small>自动应用：${h(characters().filter(c => item.characters.includes(c.key)).map(c => c.name).join('、') || '绑定角色已不存在')}</small>` : ''}</div>${button('apply', '应用', attrs)}${button('menu', '⋯', `${attrs} aria-label="更多操作" aria-expanded="${menuId === item.id}"`)}</div>${menuId === item.id ? `<div class="pmm-wbs-menu">${button('rename', '改名', attrs)}${item.scope === 'character' ? button('bind', bound ? '取消当前角色绑定' : '绑定当前角色并应用', `${attrs} ${canBind ? '' : 'disabled'} title="请进入绑定这本书的角色聊天"`) : ''}${button('delete', '删除', attrs)}</div>` : ''}</article>`;
    }).join('') : `<div class="pmm-wbs-empty"><span class="pmm-wbs-symbol">${icon('camera')}</span><strong>还没有快照</strong><small>选择世界书，保存第一套开关方案</small></div>`}`;
}
function groupMarkup() {
  return `${button('new-group', '＋ 新建分组', 'class="pmm-wbs-source"')}${engine.read().groups.map(group => {
    const missing = group.enabled && group.books.some(name => !books.find(row => row.name === name)?.global);
    return `<article class="pmm-wbs-row"><div class="pmm-wbs-row-main"><div class="pmm-wbs-copy"><strong>${h(group.name)}</strong><small>${h(group.books.join('、'))}</small>${missing ? '<small>全局挂载已在外部更改，可关闭后重新开启</small>' : ''}</div>${button('toggle-group', group.enabled ? '已开启' : '开启', `data-id="${h(group.id)}" role="switch" aria-checked="${group.enabled}"`)}</div><div class="pmm-wbs-menu">${button('edit-group', '编辑', `data-id="${h(group.id)}" ${group.enabled ? 'disabled' : ''}`)}${button('delete-group', '删除', `data-id="${h(group.id)}" ${group.enabled ? 'disabled' : ''}`)}</div></article>`;
  }).join('')}`;
}
function draftMarkup() {
  const rows = Object.values(draft.data.entries).sort((a,b) => Number(a.displayIndex ?? a.uid) - Number(b.displayIndex ?? b.uid));
  return `<label>快照名称<input type="text" data-name value="${h(draft.name)}" maxlength="100" autocomplete="off"></label>
    <input type="search" data-filter placeholder="搜索条目名称" aria-label="搜索条目名称">
    <div data-entries>${rows.map(entry => `<label class="pmm-wbs-entry" data-entry-title="${h(String(entry.comment || entry.key?.[0] || entry.uid).toLocaleLowerCase())}"><span>${h(entry.comment || entry.key?.[0] || `条目 ${entry.uid}`)}</span><input type="checkbox" data-toggle="${h(entry.uid)}" aria-label="${h(entry.comment || `条目 ${entry.uid}`)}" ${entry.disable ? '' : 'checked'}></label>`).join('')}</div>`;
}
function groupEditorMarkup() {
  const rows = books.filter(row => !row.characters.length);
  return `<label>分组名称<input type="text" data-group-name value="${h(editGroup.name)}" maxlength="100"></label><small>可选择尚未挂全局的世界书，开启分组时一起挂载。</small>${rows.map(row => `<label class="pmm-wbs-entry"><span>${h(row.name)}${row.global ? '<small>已挂全局</small>' : ''}</span><input type="checkbox" data-group-book="${h(row.name)}" ${editGroup.books.includes(row.name) ? 'checked' : ''}></label>`).join('')}`;
}
function render() {
  if (!overlay) return;
  const editing = draft || editGroup || renameId;
  const rename = renameId && engine.read().snapshots.find(item => item.id === renameId);
  const content = draft ? draftMarkup() : editGroup ? groupEditorMarkup() : rename
    ? `<label>快照名称<input type="text" data-rename value="${h(rename.name)}" maxlength="100"></label>`
    : picker ? sourceMarkup() : section === 'groups' ? groupMarkup() : snapshotMarkup();
  overlay.innerHTML = `<section class="pmm-wbs-dialog${editing ? ' is-editing' : ''}" role="dialog" aria-modal="true" aria-label="世界书快照">
    <header class="pmm-wbs-head"><div class="pmm-wbs-heading"><span class="pmm-wbs-symbol">${icon('camera')}</span><div><h2>${draft ? '调整开关' : editGroup ? '世界书分组' : '快照'}</h2><p>${h(draft ? book : character()?.name || '酒馆主页')}</p></div></div>${button('close', icon('close'), 'class="pmm-wbs-icon" aria-label="关闭"')}</header>
    ${tabs(page, !!editing)}<div class="pmm-wbs-message" data-message role="status" ${message ? '' : 'hidden'}>${h(message)}</div>
    <div class="pmm-wbs-body">${page === 'global' && !editing && !picker ? `<div class="pmm-wbs-tools pmm-wbs-subnav">${button('groups', '世界书分组', section === 'groups' ? 'class="pmm-wbs-primary"' : '')}${button('snapshots', '条目快照', section === 'snapshots' ? 'class="pmm-wbs-primary"' : '')}</div>` : ''}${content}</div>
    <footer class="pmm-wbs-foot"><small>${draft ? '仅记录开关；保存后应用，取消不修改世界书。' : section === 'groups' ? '关闭分组会保留手动挂载及其他开启分组需要的书。' : '手动应用 · 可选角色绑定 · 返回主页恢复进入前状态'}</small>${editing ? button('cancel-edit', '取消') + button(draft ? 'save-draft' : editGroup ? 'save-group' : 'save-rename', '保存', 'class="pmm-wbs-primary"') : ''}</footer>
    </section>`;
  filterSources();
}
async function loadItems() {
  items = [];
  if (book) {
    const data = await ctx().loadWorldInfo(book);
    items = Object.values(data?.entries || {});
  }
}
async function open(scope = 'character', selected = '') {
  if (disposed) return;
  if (TOP[PRESET]?.isCapturing?.()) { TOP.toastr?.info?.('请先保存或取消预设快照'); return; }
  if (overlay) return;
  TOP[PRESET]?.close?.();
  page = scope; section = scope === 'global' && !selected ? 'groups' : 'snapshots'; book = selected; message = ''; picker = false; sourceQuery = '';
  lastFocus = DOC.activeElement;
  overlay = DOC.createElement('div'); overlay.className = 'pmm-wbs-overlay';
  overlay.addEventListener('click', onClick);
  overlay.addEventListener('input', onInput);
  overlay.addEventListener('change', onChange);
  overlay.addEventListener('keydown', onKey);
  DOC.body.append(overlay); theme(); watchTheme(); bindViewport(); render();
  overlay.querySelector('[data-wbs="close"]')?.focus({ preventScroll: true });
  await run(async () => {
    await refresh();
    const row = books.find(row => row.name === book);
    if (row) page = row.characters.length ? 'character' : 'global';
    if (!row || (!row.characters.length && !row.global)) book = '';
    await loadItems(); render();
  });
}
async function cancelEdit() {
  draft = null; editGroup = null; renameId = ''; engine.setCapturing(false);
  await engine.transition();
  await refresh(); await loadItems(); render();
}
async function close(force = false) {
  if (!force && busy) return;
  if (!force && (draft || editGroup || renameId) && !TOP.confirm('放弃尚未保存的编辑并关闭？')) return;
  draft = null; editGroup = null; renameId = ''; menuId = '';
  engine.setCapturing(false);
  viewportCleanup?.(); viewportCleanup = null;
  themeCleanup?.(); themeCleanup = null;
  overlay?.remove(); overlay = null;
  lastFocus?.isConnected && lastFocus.focus?.({ preventScroll: true });
  if (!force) try { await engine.transition(); } catch (error) { TOP.toastr?.warning?.(error.message); }
}
function onInput(event) {
  if (event.target.matches('[data-source-query]')) { sourceQuery = event.target.value; filterSources(); }
  if (draft && event.target.matches('[data-name]')) draft.name = event.target.value;
  if (editGroup && event.target.matches('[data-group-name]')) editGroup.name = event.target.value;
  if (event.target.matches('[data-filter]')) {
    const query = event.target.value.toLocaleLowerCase();
    for (const row of overlay.querySelectorAll('[data-entry-title]')) row.hidden = !row.dataset.entryTitle.includes(query);
  }
}
function onChange(event) {
  if (draft && event.target.matches('[data-toggle]')) {
    const entry = Object.values(draft.data.entries).find(entry => String(entry.uid) === event.target.dataset.toggle);
    if (entry) entry.disable = !event.target.checked;
  }
  if (editGroup && event.target.matches('[data-group-book]')) {
    const name = event.target.dataset.groupBook;
    editGroup.books = editGroup.books.filter(book => book !== name);
    if (event.target.checked) editGroup.books.push(name);
  }
}
function onKey(event) {
  if (event.key === 'Escape') { event.stopPropagation(); void close(); }
  if (event.key !== 'Tab') return;
  const nodes = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node => node.getClientRects().length);
  const first = nodes[0], last = nodes.at(-1);
  if (event.shiftKey && DOC.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && DOC.activeElement === last) { event.preventDefault(); first?.focus(); }
}
function onClick(event) {
  const target = event.target.closest('button');
  if (!target || target.disabled || busy) return;
  const action = target.dataset.wbs, id = target.dataset.id;
  if (action === 'close') { void close(); return; }
  void run(async () => {
    if (target.dataset.hubTab) {
      if (draft || editGroup || renameId) return;
      page = target.dataset.hubTab; book = ''; menuId = ''; section = page === 'global' ? 'groups' : 'snapshots'; picker = false; items = [];
      if (page === 'preset') { await close(true); TOP[PRESET]?.open?.(); return; }
      await refresh();
    } else if (action === 'choose') {
      book = target.dataset.book; page = target.dataset.scope; section = 'snapshots'; picker = false; await loadItems();
    } else if (action === 'sources') { await refresh(); picker = true; sourceQuery = ''; }
    else if (action === 'back-sources') picker = false;
    else if (action === 'snapshots' || action === 'groups') { section = action; picker = false; await refresh(); }
    else if (action === 'new') {
      if (TOP[PRESET]?.isCapturing?.()) throw new Error('请先完成预设快照');
      const contextKey = character()?.key || '';
      engine.setCapturing(true);
      try {
        const data = await engine.capture(book, page);
        if ((character()?.key || '') !== contextKey) throw new Error('角色已切换，请重新创建');
        draft = { data, name: `${book} 开关`, contextKey };
      } catch (error) { engine.setCapturing(false); await engine.transition(); throw error; }
    } else if (action === 'save-draft') {
      await engine.create({ book, scope: page, name: draft.name, states: switches(draft.data), contextKey: draft.contextKey });
      draft = null; engine.setCapturing(false); await engine.transition(); await loadItems(); say('快照已保存并应用');
    } else if (action === 'cancel-edit') { await cancelEdit(); return; }
    else if (action === 'apply') { await engine.apply(id); await loadItems(); say('已应用快照'); }
    else if (action === 'menu') menuId = menuId === id ? '' : id;
    else if (action === 'rename') renameId = id;
    else if (action === 'save-rename') { await engine.rename(renameId, overlay.querySelector('[data-rename]').value); renameId = ''; }
    else if (action === 'delete') { if (TOP.confirm('删除这份快照？绑定也会取消。')) { await engine.remove(id); await loadItems(); } }
    else if (action === 'bind') {
      syncListener();
      if (!eventSource) throw new Error('当前酒馆缺少角色切换事件，暂时只能手动应用快照');
      const enabled = await engine.bind(id);
      say(enabled ? '已绑定当前角色并应用；返回主页恢复进入前状态' : '已取消绑定并恢复进入前状态');
      await loadItems();
    }
    else if (action === 'new-group' || action === 'edit-group') {
      await refresh(); editGroup = action === 'new-group' ? { name: '', books: [] } : copy(engine.read().groups.find(group => group.id === id));
    } else if (action === 'save-group') { await engine.saveGroup(editGroup); editGroup = null; }
    else if (action === 'toggle-group') { await engine.toggleGroup(id); await refresh(); }
    else if (action === 'delete-group' && TOP.confirm('删除这个分组？')) await engine.removeGroup(id);
    render();
  });
}
function onChatChanged() {
  TOP.clearTimeout(eventTimer);
  eventTimer = TOP.setTimeout(async () => {
    eventTimer = 0;
    if (disposed) return;
    if (draft) { say('角色已切换，当前草稿已保留。请取消草稿后继续。'); return; }
    try {
      await engine.transition();
      if (overlay && !busy && !editGroup && !renameId) { await refresh(); await loadItems(); render(); }
    } catch (error) { report(error); TOP.toastr?.warning?.(`世界书快照：${error.message}`); }
  }, 180);
}
function syncListener() {
  // No polling: only subscribe to context changes. Also observe during a draft to prevent stale saves.
  if (eventSource) return;
  const context = ctx();
  eventSource = context.eventSource;
  eventType = context.eventTypes?.CHAT_CHANGED || context.event_types?.CHAT_CHANGED;
  if (eventSource && eventType) eventSource.on(eventType, onChatChanged);
  else eventSource = null;
}
function cleanup() {
  disposed = true; TOP.clearTimeout(eventTimer);
  if (eventSource && eventType) {
    if (eventSource.off) eventSource.off(eventType, onChatChanged);
    else eventSource.removeListener?.(eventType, onChatChanged);
  }
  void close(true); style.remove();
  if (TOP[KEY]?.engine === engine) delete TOP[KEY];
}
TOP[KEY] = { open, decoratePreset, engine, cleanup };
syncListener();
// The persisted return journal also handles a browser refresh while inside a character.
onChatChanged();
SELF.addEventListener('pagehide', cleanup, { once: true });
