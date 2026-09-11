import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';

const {chromium}=await import(process.env.PMM_PLAYWRIGHT_MODULE?pathToFileURL(process.env.PMM_PLAYWRIGHT_MODULE).href:'playwright');
const source=await readFile(new URL('../dist/workshop-v3.02.js',import.meta.url),'utf8');
const start=source.indexOf('/* PMM_DESKTOP_HEADER_WRAP_TEST101');
const css=source.slice(start,source.indexOf('    `;',start));
const cards=count=>Array.from({length:count},(_,index)=>`<button class="header-card">${index}</button>`).join('');
const html=(columns=1)=>`<meta name="viewport" content="width=device-width,initial-scale=1"><style>
  *{box-sizing:border-box} body{margin:10px;background:#d8d8d8;font:14px system-ui}
  .columns{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:20px;max-width:1300px}
  .pm-panel-container{min-width:0}.preset-panel{width:560px;max-width:100%;min-width:0;background:#fafafa;border-radius:12px;overflow:hidden}
  .pm-header{display:flex;align-items:center;justify-content:space-between;gap:12px;height:80px;padding:10px;overflow:hidden}
  .header-left{min-width:0}.title-card{border:1px solid #aaa;border-radius:8px;display:flex;padding:7px;overflow:hidden}
  .title-content{display:flex;flex-direction:column;gap:6px;min-width:0}.title-row{white-space:nowrap}.title-actions{display:flex;gap:4px}
  .header-right{display:flex;align-items:center;gap:8px;min-width:0}.header-card{width:42px;height:32px;padding:0;flex:none;border:1px solid #aaa;border-radius:6px;background:#eee}
  .list{height:230px;overflow-y:auto;padding:12px}.item{height:55px;margin:6px;background:#eee;border-radius:8px}
  .pm-main-wrapper{position:relative;display:flex;align-items:stretch;width:100%}.side-panel-root{position:absolute;right:0;top:50%;transform:translateY(-50%) translateX(100%)}.side-toggle{width:20px;height:60px}
</style><div id="preset-manager-main-panel"><div class="pm-panel-container columns">${Array.from({length:columns},()=>`<div class="pm-main-wrapper"><section class="preset-panel"><header class="pm-header"><div class="header-left"><div class="title-card"><div class="title-content"><div class="title-row">【日月西】预设选择　✎</div><div class="title-actions">导入　导出　保存</div></div></div></div><div class="header-right">${cards(10)}</div></header><div class="list">${'<div class="item">正文</div>'.repeat(15)}</div></section><aside class="side-panel-root"><button class="side-toggle">›</button></aside></div>`).join('')}</div></div>`;

const browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../../outputs/desktop-header-wrap-test37/',import.meta.url);
await mkdir(output,{recursive:true});
try {
  for(const columns of [1,2]) {
    const page=await browser.newPage({viewport:{width:columns===1?900:1200,height:700}});
    await page.setContent(html(columns));
    await page.addStyleTag({content:css});
    for(const width of columns===1?[900,780]:[1200,900]) {
      await page.setViewportSize({width,height:700});
      for(const panel of await page.locator('.preset-panel').all()) {
        const result=await panel.evaluate(panel=>{
          const header=panel.querySelector('.pm-header');
          const right=panel.querySelector('.header-right');
          const list=panel.querySelector('.list');
          list.scrollTop=80;
          const bounds=header.getBoundingClientRect();
          const buttons=[...right.children].map(button=>button.getBoundingClientRect());
          return {
            headerScroll:header.scrollWidth-header.clientWidth,
            wrap:getComputedStyle(right).flexWrap,
            rows:new Set(buttons.map(button=>Math.round(button.top))).size,
            visible:buttons.every(button=>button.left>=bounds.left-1&&button.right<=bounds.right+1),
            listTop:list.scrollTop,
          };
        });
        assert.equal(result.headerScroll,0,'Header must not overflow horizontally');
        assert.equal(result.wrap,'wrap');
        assert.ok(result.rows>=2,'Narrow desktop toolbar must use two rows');
        assert.ok(result.visible,'Every header button remains visible');
        assert.equal(result.listTop,80,'Header wrapping must not affect list scrolling');
      }
    }
    await page.screenshot({path:fileURLToPath(new URL(`${columns}-panel.png`,output))});
    await page.close();
  }

  const anchor=await browser.newPage({viewport:{width:1500,height:900}});
  await anchor.setContent(html(1));
  await anchor.locator('.pm-panel-container').evaluate(element=>{
    element.classList.add('pmm-desktop-custom-sized');
    element.style.width='1200px';
    element.querySelector('.preset-panel').style.width='750px';
  });
  await anchor.addStyleTag({content:css});
  const geometry=await anchor.evaluate(()=>{
    const panel=document.querySelector('.preset-panel').getBoundingClientRect();
    const toolbar=document.querySelector('.side-panel-root').getBoundingClientRect();
    return {panelRight:panel.right,toolbarLeft:toolbar.left};
  });
  assert.ok(Math.abs(geometry.panelRight-geometry.toolbarLeft)<1,'Single-panel toolbar must remain attached after restored sizing');
  await anchor.close();

  for(const touch of [true,false]) {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:touch,hasTouch:touch});
    const page=await context.newPage();
    await page.setContent(html(1));
    if(!touch) await page.locator('#preset-manager-main-panel').evaluate(element=>element.classList.add('pmm-mobile-layout-enabled'));
    const snapshot=()=>page.locator('.pm-header,.header-left,.header-right').evaluateAll(nodes=>nodes.map(node=>{
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      return [rect.width,rect.height,style.flexWrap,style.overflowX];
    }));
    const before=await snapshot();
    await page.addStyleTag({content:css});
    assert.deepEqual(await snapshot(),before,'Mobile layout stays unchanged');
    await context.close();
  }
  console.log('Desktop header wrap passed: visible controls, two rows, first-open sidebar anchor, list isolation, and mobile unchanged.');
} finally {
  await browser.close();
}
