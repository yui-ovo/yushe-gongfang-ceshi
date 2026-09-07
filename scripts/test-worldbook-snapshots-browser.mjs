import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PMM_PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PMM_PLAYWRIGHT_MODULE).href : 'playwright');
const files = Object.fromEntries(await Promise.all(['worldbook-snapshots.js', 'worldbook-snapshot-core.js', 'worldbook-stitch-test3.js'].map(async name => [name, await readFile(new URL(`../dist/${name}`, import.meta.url), 'utf8')])));
const html = `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{background:#151515;margin:0;color:#ddd;font:14px system-ui} #preset-manager-main-panel{margin:20px;--pm-panel-bg:#191919;--pm-card-bg:#242424;--pm-border:#373737;--pm-text-primary:#eee;--pm-hover-bg:#303030;--pm-accent:#429980}
.preset-panel{padding:20px;background:#191919}.pmm-switch-snapshot-dialog{background:#222;padding:12px;color:#eee}
</style><div id="preset-manager-main-panel"><div class="pm-panel-container"><div class="pm-main-wrapper"><div class="preset-panel"><div class="header-right"></div>预设工坊 · 界面测试</div></div></div></div><button id="camera">相机</button><script>
const cp=x=>JSON.parse(JSON.stringify(x)); const listeners=new Set();
const world=(prefix,n=16)=>({entries:Object.fromEntries(Array.from({length:n},(_,i)=>[i,{uid:i,comment:prefix+' · '+['角色设定','日常互动','剧情推进','场景细节'][i%4]+' '+i,content:'正文保留',disable:i%3===0}]))});
window.fixture={selected:undefined,globals:['日常辅助','手动保留'],data:{'角色世界':world('角色'), '日常辅助':world('辅助'), '手动保留':world('手动'), '剧情补充':world('剧情')},events:()=>{listeners.forEach(fn=>fn())},select:id=>{fixture.selected=id;fixture.events()}};
window.SillyTavern={getContext:()=>({characterId:fixture.selected,characters:[{name:'小雨',avatar:'rain.png'},{name:'小夏',avatar:'summer.png'}],eventTypes:{CHAT_CHANGED:'chat'},eventSource:{on:(t,fn)=>listeners.add(fn),off:(t,fn)=>listeners.delete(fn)},getWorldInfoNames:()=>Object.keys(fixture.data),loadWorldInfo:async n=>cp(fixture.data[n]),saveWorldInfo:async(n,d)=>{fixture.data[n]=cp(d)}})};
window.TavernHelper={getWorldbookNames:()=>Object.keys(fixture.data),getGlobalWorldbookNames:()=>[...fixture.globals],rebindGlobalWorldbooks:async ns=>{fixture.globals=[...ns]},getCharWorldbookNames:()=>({primary:'角色世界',additional:[]})};
window.__PMM_WORLDBOOK_STITCH_TEST3__={state:{top:{dirty:false},bottom:{dirty:false}},refreshSnapshotBook:()=>{}};
window.__PMM_SWITCH_SNAPSHOTS_TEST52__={close:()=>document.querySelector('#preset-fixture')?.remove(),isCapturing:()=>false,open:()=>{const root=document.createElement('div');root.id='preset-fixture';root.innerHTML='<section class="pmm-switch-snapshot-dialog"><header>预设快照</header><div class="pmm-switch-snapshot-row"><div class="pmm-switch-snapshot-bindings"><button class="pmm-switch-snapshot-lock">角色</button></div><div class="pmm-switch-snapshot-menu"></div></div></section>';document.body.append(root);__PMM_WORLDBOOK_SNAPSHOTS__.decoratePreset(root)}};
document.querySelector('#camera').onclick=()=>window.__PMM_WORLDBOOK_SNAPSHOTS__.open();
</script><script type="module" src="/worldbook-snapshots.js"></script></html>`;
const server = createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1);
  res.setHeader('Content-Type', files[name] ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
  res.end(files[name] || html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = new URL('../../outputs/worldbook-v1/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  for (const width of [360, 390, 1280]) {
    const page = await browser.newPage({ viewport:{width, height:width < 600 ? 844 : 900} });
    const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => !!window.__PMM_WORLDBOOK_SNAPSHOTS__);
    // Exercise the real worldbook toolbar and its camera action, not just the hub API.
    await page.addScriptTag({ type:'module', url:`http://127.0.0.1:${server.address().port}/worldbook-stitch-test3.js` });
    await page.evaluate(async () => {
      __PMM_WORLDBOOK_STITCH_TEST3__.state.topType='world';
      await __PMM_WORLDBOOK_STITCH_TEST3__.open();
    });
    const camera = page.locator('[data-pmm-wb-panel="top"] [data-wb-action="snapshots"]');
    await camera.waitFor();
    await camera.click();
    await page.locator('[data-wbs="choose"][data-book="角色世界"]').waitFor();
    assert.equal(await page.locator('[data-wbs="choose"][data-scope="global"]').count(), 2);
    await page.screenshot({ path:fileURLToPath(new URL(`sources-${width}.png`, output)) });
    await page.click('[data-wbs="choose"][data-book="角色世界"]');
    await page.click('[data-wbs="new"]');
    await page.locator('[data-name]').fill('日常 · 温柔模式');
    const before = await page.evaluate(() => fixture.data['角色世界'].entries[0].disable);
    await page.locator('[data-toggle="0"]').check();
    assert.equal(await page.evaluate(() => fixture.data['角色世界'].entries[0].disable), before, 'Draft changed the original book');
    await page.locator('[data-filter]').fill('剧情');
    assert.ok(await page.locator('.pmm-wbs-entry:visible').count() < 16);
    await page.locator('[data-filter]').fill('');
    await page.screenshot({ path:fileURLToPath(new URL(`draft-${width}.png`, output)) });
    await page.click('[data-wbs="save-draft"]');
    await page.getByText('日常 · 温柔模式', {exact:true}).waitFor();
    assert.equal(await page.evaluate(() => fixture.data['角色世界'].entries[0].disable), false);
    await page.evaluate(() => fixture.select(0));
    await page.waitForFunction(() => document.querySelector('.pmm-wbs-head p')?.textContent === '小雨');
    // Set A externally before binding; binding B must return to A at home.
    await page.evaluate(() => { fixture.data['角色世界'].entries[0].disable=true; });
    await page.click('[data-wbs="menu"]');
    await page.click('[data-wbs="bind"]');
    await page.waitForFunction(() => fixture.data['角色世界'].entries[0].disable===false);
    await page.evaluate(() => fixture.select(undefined));
    await page.waitForFunction(() => fixture.data['角色世界'].entries[0].disable===true);
    await page.click('[data-hub-tab="global"]');
    await page.click('[data-wbs="groups"]');
    await page.click('[data-wbs="new-group"]');
    await page.locator('[data-group-name]').fill('常用搭配');
    assert.equal(await page.locator('[data-group-book="角色世界"]').count(), 0);
    await page.locator('[data-group-book="剧情补充"]').check();
    await page.locator('[data-group-book="手动保留"]').check();
    await page.click('[data-wbs="save-group"]');
    await page.click('[data-wbs="toggle-group"]');
    await page.waitForFunction(() => fixture.globals.includes('剧情补充'));
    await page.screenshot({ path:fileURLToPath(new URL(`groups-${width}.png`, output)) });
    await page.click('[data-wbs="toggle-group"]');
    await page.waitForFunction(() => !fixture.globals.includes('剧情补充'));
    assert.ok(await page.evaluate(() => fixture.globals.includes('手动保留')));
    // Shrink visible space as with a keyboard; the footer and close button stay in the viewport.
    await page.click('[data-wbs="new-group"]');
    await page.locator('[data-group-name]').focus();
    await page.setViewportSize({width,height:360});
    await page.waitForFunction(() => document.querySelector('.pmm-wbs-overlay').getBoundingClientRect().height <= 360);
    const bounds = await page.locator('.pmm-wbs-dialog').boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y+bounds.height <= 361 && bounds.x >= 0 && bounds.x+bounds.width <= width);
    await page.locator('[data-group-name]').fill('中文输入');
    assert.equal(await page.locator('[data-group-name]').inputValue(), '中文输入');
    await page.click('[data-wbs="cancel-edit"]');
    await page.click('[data-hub-tab="preset"]');
    await page.locator('#preset-fixture .pmm-snapshot-tabs').waitFor();
    assert.equal(await page.locator('.pmm-switch-snapshot-menu .pmm-switch-snapshot-lock').count(), 1);
    await page.click('#preset-fixture [data-hub-tab="character"]');
    await page.locator('.pmm-wbs-dialog').waitFor();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Browser UI passed: ${width}px, drafts, binding/return, groups, tabs and reduced viewport.`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
