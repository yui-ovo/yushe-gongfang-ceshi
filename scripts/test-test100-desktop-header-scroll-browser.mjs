import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PMM_PLAYWRIGHT_MODULE?pathToFileURL(process.env.PMM_PLAYWRIGHT_MODULE).href:'playwright');
const source=await readFile(new URL('../dist/workshop-v3.02.js',import.meta.url),'utf8');
const start=source.indexOf('/* PMM_DESKTOP_HEADER_SCROLL_TEST100');
const css=source.slice(start,source.indexOf('    `;',start));
const buttons=n=>Array.from({length:n},(_,i)=>`<button>${i}</button>`).join('');
const html=(mode='',wide=false)=>`<meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:10px;background:#ddd;font:14px system-ui}.columns{display:grid;grid-template-columns:${wide?'1fr':'repeat(2,minmax(0,1fr))'};gap:20px}.preset-panel{min-width:0;background:#fafafa;border-radius:12px;overflow:hidden}.pm-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px;overflow:hidden}.header-left{min-width:0}.header-card{border:1px solid #aaa;border-radius:8px;display:flex;align-items:center;gap:8px;padding:6px;overflow:hidden}.title-content{display:flex;flex-direction:column;gap:6px}.title-row,.title-actions,.header-right{display:flex;align-items:center;gap:8px}.header-right{min-width:0}.title-row{white-space:nowrap}button{flex:none;width:32px;height:32px;border:1px solid #aaa;border-radius:6px;background:#eee}.list{height:240px;overflow-y:auto;padding:12px}.item{height:60px;margin:6px;background:#eee;border-radius:8px}
</style><div id="preset-manager-main-panel"><div class="pm-panel-container ${mode} columns">${Array.from({length:wide?1:2},()=>`<section class="preset-panel"><header class="pm-header"><div class="header-left"><div class="header-card title-card"><div class="card-icon">☷</div><div class="title-content"><div class="title-row">预设选择　⌕　✎</div><div class="title-actions">${buttons(wide?3:10)}</div></div></div></div><div class="header-right">${buttons(12)}</div></header><div class="list">${'<div class="item">正文</div>'.repeat(15)}</div></section>`).join('')}</div></div>`;
const browser=await chromium.launch({channel:'msedge',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
const output=new URL('../../outputs/desktop-scroll-test36/',import.meta.url);await mkdir(output,{recursive:true});
try{
for(const mode of ['','pm-panel-container--merge-mode','pm-panel-container--branch-mode','pm-panel-container--favorite-mode']){
 const page=await browser.newPage({viewport:{width:1400,height:700}});await page.setContent(html(mode));await page.addStyleTag({content: `#preset-manager-main-panel.pmm-layout-custom-branch-width .pm-panel-container--branch-mode > .preset-panel .pm-header .header-left .title-card {scrollbar-width:none!important;pointer-events:none} #preset-manager-main-panel.pmm-layout-custom-branch-width .pm-panel-container--branch-mode > .preset-panel .pm-header .header-left .title-card::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}`});
 await page.locator('#preset-manager-main-panel').evaluate(el=>el.classList.add('pmm-layout-custom-branch-width'));
 await page.addStyleTag({content:css});
 for(const width of [1400,1000,800,640]){
  await page.setViewportSize({width,height:700});
  for(const panel of await page.locator('.preset-panel').all()){
   const bars=await panel.locator('.pm-header,.title-card').evaluateAll(nodes=>nodes.map(el=>({display:getComputedStyle(el,'::-webkit-scrollbar').display,height:getComputedStyle(el,'::-webkit-scrollbar').height,width:getComputedStyle(el).scrollbarWidth,pointer:getComputedStyle(el).pointerEvents,trackSpace:el.offsetHeight-el.clientHeight})));
   for(const bar of bars){assert.equal(bar.display,'block');assert.equal(bar.height,'7px');assert.equal(bar.width,'auto');assert.notEqual(bar.pointer,'none');assert.ok(bar.trackSpace>=7,'Overflow has a visible scrollbar track');}
   const result=await panel.evaluate(panel=>{
    const outer=panel.querySelector('.pm-header'),inner=panel.querySelector('.title-card'),list=panel.querySelector('.list');
    outer.scrollLeft=0;inner.scrollLeft=0;list.scrollTop=80;
    inner.scrollLeft=inner.scrollWidth;const innerScroll=inner.scrollLeft,outerBefore=outer.scrollLeft;
    const inside=inner.querySelector('.title-actions button:last-child').getBoundingClientRect().right<=inner.getBoundingClientRect().right+1;
    outer.scrollLeft=outer.scrollWidth;const last=outer.querySelector('.header-right button:last-child').getBoundingClientRect(),bounds=outer.getBoundingClientRect();
    const buttons=[...outer.querySelectorAll('.header-right button')].map(b=>b.getBoundingClientRect());
    return {inside,innerScroll,outerBefore,innerAfter:inner.scrollLeft,outerScroll:outer.scrollLeft,lastVisible:last.right<=bounds.right+1&&last.left>=bounds.left,listTop:list.scrollTop,widths:buttons.map(b=>b.width),ys:buttons.map(b=>b.y)};
   });
   assert.ok(result.inside&&result.innerScroll>0);assert.equal(result.outerBefore,0);assert.equal(result.innerAfter,result.innerScroll);assert.ok(result.lastVisible&&result.outerScroll>0);assert.equal(result.listTop,80);assert.ok(result.widths.every(w=>w===32));assert.ok(result.ys.every(y=>y===result.ys[0]));
  }
 }
 await page.setViewportSize({width:1000,height:700});
 await page.locator('.pm-header,.title-card').evaluateAll(nodes=>nodes.forEach(el=>el.scrollLeft=0));
 // Drag real native tracks, rather than only assigning scrollLeft.
 const innerBar=page.locator('.title-card').first();const r=await innerBar.boundingBox();
 await page.mouse.move(r.x+20,r.y+r.height-5);await page.mouse.down();await page.mouse.move(r.x+r.width-8,r.y+r.height-5,{steps:12});await page.mouse.up();
 assert.ok(await innerBar.evaluate(el=>el.scrollLeft>0),'Inner scrollbar accepts mouse dragging');
 assert.equal(await page.locator('.pm-header').first().evaluate(el=>el.scrollLeft),0);
 await page.screenshot({path:fileURLToPath(new URL((mode||'normal')+'.png',output))});await page.close();
}
const page=await browser.newPage({viewport:{width:1400,height:700}});await page.setContent(html('',true));await page.addStyleTag({content:css});assert.ok(await page.locator('.pm-header').evaluate(el=>el.scrollWidth===el.clientWidth));assert.ok(await page.locator('.title-card').evaluate(el=>el.scrollWidth===el.clientWidth));await page.close();
// Reproduce the actual fixed-width Vue panel inside a restored wider wrapper.
const styleStart=source.lastIndexOf('style.textContent =',start);
const fullResizeCSS=source.slice(source.indexOf('`',styleStart)+1,source.indexOf('    `;',start));
const anchorPage=await browser.newPage({viewport:{width:1500,height:900}});
for(const width of [1200,900,650]){
 await anchorPage.setContent(`<style>*{box-sizing:border-box}.pm-panel-container{position:relative;display:flex;align-items:stretch}.pm-main-wrapper{position:relative;display:flex;align-items:stretch}.preset-panel{width:750px;max-width:750px;height:600px;flex-shrink:0;overflow:hidden}.side-panel-root{position:absolute;right:0;top:50%;transform:translateY(-50%) translateX(100%)}.side-toggle{width:20px;height:60px}</style><div id="preset-manager-main-panel"><div class="pm-panel-container pmm-desktop-custom-sized" style="--pmm-custom-panel-width:${width}px;--pmm-custom-panel-height:600px"><div class="pm-main-wrapper"><section class="preset-panel"></section><aside class="side-panel-root"><button class="side-toggle">›</button></aside></div></div></div>`);
 await anchorPage.addStyleTag({content:fullResizeCSS});
 const geometry=await anchorPage.evaluate(()=>({panel:document.querySelector('.preset-panel').getBoundingClientRect().right,arrow:document.querySelector('.side-toggle').getBoundingClientRect().left}));
 assert.ok(Math.abs(geometry.panel-geometry.arrow)<1,'Sidebar toggle must touch the visible single panel');
}
await anchorPage.close();
for(const touch of [true,false]){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:touch,hasTouch:touch});const page=await context.newPage();await page.setContent(html());
 if(!touch)await page.locator('#preset-manager-main-panel').evaluate(el=>el.classList.add('pmm-mobile-layout-enabled'));
 const snapshot=()=>page.locator('.pm-header,.title-card,.header-right,.list').evaluateAll(nodes=>nodes.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height,s.overflowX,s.flexWrap,el.scrollWidth]}));
 const before=await snapshot();await page.addStyleTag({content:css});assert.deepEqual(await snapshot(),before,'Mobile layout stays identical');await context.close();
}
console.log('Desktop scroll passed: four modes, 1400→640px, independent scrollports, last icons, no shrinking/wrapping, wide fit and mobile unchanged.');
}finally{await browser.close()}
