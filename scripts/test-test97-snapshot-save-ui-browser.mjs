import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PMM_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PMM_PLAYWRIGHT_MODULE).href : 'playwright');
const source = await readFile(new URL('../dist/workshop-v3.02.js', import.meta.url), 'utf8');
const moduleSource = "import { requestSnapshotName } from './snapshot-name-dialog.js';\n" + source.slice(source.indexOf('/* ===== PMM_SWITCH_SNAPSHOTS_TEST52'), source.indexOf('/* ===== PMM_THEMED_COMPARE_DRAG_LINE_V289'));
const helper = await readFile(new URL('../dist/snapshot-name-dialog.js', import.meta.url), 'utf8');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;font:14px system-ui;--SmartThemeBodyColor:#ddd;--SmartThemeBlurTintColor:#191919;--SmartThemeBorderColor:#444;--SmartThemeQuoteColor:#afa4a8;background:#121212;color:#ddd}
body.light{--SmartThemeBodyColor:#443d3d;--SmartThemeBlurTintColor:#f7f5f4;--SmartThemeBorderColor:#ccc;--SmartThemeQuoteColor:#817272;background:#eee}
button[role=switch]{background:#75636d!important;box-shadow:0 0 0 5px #75636d!important;padding:8px!important;min-height:40px!important}button[role=switch]::after{content:'✓';background:red}
</style><script>
const presetName='【日月西】Gemini & Claude v0.4 @电波系';
const prompts=Array.from({length:120},(_,i)=>({id:'p'+i,name:'条目 '+i,enabled:i%3!==0,content:'正文保持'}));
window.fixture={prompts};window.getPreset=()=>({prompts:structuredClone(prompts)});
window.SillyTavern={getContext:()=>({getPresetManager:()=>({getSelectedPresetName:()=>presetName}),characters:[],eventSource:{on(){},off(){}}})};
window.__PMM_BAIBAI_COMPAT__={snapshotBranchState:()=>({sections:Array.from({length:12},(_,i)=>({id:'baibai_g'+i,displayName:['🔒预设头部','🌎世界引擎','🐚人物活化','🎵文风指导'][i%4],itemIds:prompts.slice(i*10,i*10+10).map(p=>p.id)}))}),readGroupEnabledStates:()=>Array.from({length:12},(_,i)=>({id:'g'+i,name:'分组'+i,enabled:true}))};
</script><script type="module" src="/preset.js"></script>`;
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(path==='/preset.js'?moduleSource:path==='/snapshot-name-dialog.js'?helper:html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../../outputs/snapshot-ui-test30/',import.meta.url);await mkdir(output,{recursive:true});
try {
  for(const width of [360,390,1280]) for(const tone of ['dark','light']) {
    const page=await browser.newPage({viewport:{width,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForFunction(()=>window.__PMM_SWITCH_SNAPSHOTS_TEST52__);
    await page.evaluate(tone=>{document.body.className=tone;__PMM_SWITCH_SNAPSHOTS_TEST52__.open({source:'native-preset'})},tone);
    await page.locator('[data-pmm-snapshot-action="save-default-and-enter"]').click();
    await page.locator('.pmm-switch-editor-dialog').waitFor();
    assert.equal(await page.locator('#pmm-switch-editor-name').count(),0);
    assert.equal(await page.locator('.pmm-switch-editor-prompt').count(),0);
    const state=await page.locator('.pmm-switch-editor-switch').first().evaluate(el=>{const s=getComputedStyle(el),t=getComputedStyle(el,'::before');return {background:s.backgroundColor,shadow:s.boxShadow,after:getComputedStyle(el,'::after').content,width:t.width,height:t.height}});
    assert.deepEqual(state,{background:'rgba(0, 0, 0, 0)',shadow:'none',after:'none',width:'30px',height:'18px'});
    await page.locator('[data-pmm-editor-action="toggle-group-power"]').first().click();
    await page.locator('[data-pmm-editor-action="toggle-group"]').first().click();
    await page.locator('[data-pmm-editor-action="toggle-prompt"]').first().click();
    const draftBefore=await page.locator('.pmm-switch-editor-list').innerHTML();
    const storeBefore=await page.evaluate(()=>localStorage.getItem('pmm.switch-snapshots.v1'));
    await page.screenshot({path:fileURLToPath(new URL('editor-'+width+'-'+tone+'.png',output))});
    await page.locator('[data-pmm-editor-action="save"]').click();
    await page.locator('input#name').fill('   ');
    await page.locator('button[type="submit"]').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('pmm.switch-snapshots.v1')),storeBefore);
    await page.getByRole('button',{name:'返回编辑',exact:true}).click();
    assert.equal(await page.locator('.pmm-switch-editor-list').innerHTML(),draftBefore);
    await page.locator('[data-pmm-editor-action="save"]').click();
    await page.locator('input#name').press('Escape');
    assert.equal(await page.locator('.pmm-switch-editor-list').innerHTML(),draftBefore);
    assert.equal(await page.evaluate(()=>localStorage.getItem('pmm.switch-snapshots.v1')),storeBefore);
    await page.locator('[data-pmm-editor-action="save"]').click();
    await page.locator('input#name').fill('新的开关方案');
    await page.setViewportSize({width,height:480});
    const box=await page.locator('form').boundingBox();assert.ok(box.y>=0 && box.y+box.height<=480);
    await page.screenshot({path:fileURLToPath(new URL('name-'+width+'-'+tone+'.png',output))});
    await page.locator('button[type="submit"]').click();
    await page.locator('.pmm-switch-snapshot-dialog').waitFor();
    const saved=await page.evaluate(()=>__PMM_SWITCH_SNAPSHOTS_TEST52__.list().find(s=>s.name==='新的开关方案'));
    assert.ok(saved);assert.equal(saved.groupStates[0].enabled,false);assert.equal(saved.states[0].enabled,true);
    assert.equal(await page.evaluate(()=>fixture.prompts[0].enabled),false,'Saving must not apply the draft');
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(100);
    const manager=await page.locator('.pmm-switch-snapshot-dialog').boundingBox();
    if(width<769) assert.ok(Math.abs(manager.y+manager.height-836)<2,'Manager remains at the mobile safe bottom');
    else assert.ok(Math.abs(manager.y+manager.height/2-422)<2,'Desktop stays centered');
    await page.screenshot({path:fileURLToPath(new URL('manager-'+width+'-'+tone+'.png',output))});
    assert.deepEqual(errors,[]);
    console.log('Preset snapshot UI passed:',width,tone);
    await page.close();
  }
} finally {await browser.close();server.close();}
