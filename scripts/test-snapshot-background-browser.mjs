import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PMM_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PMM_PLAYWRIGHT_MODULE).href : 'playwright');
const source = await readFile(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');
const css = source.split('style.textContent = `')[1].split('`;')[0];
const browser = await chromium.launch({ channel:'msedge', headless:true });
try {
  for (const tone of ['light','dark']) for (const mode of ['android','unsupported','supported']) {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    // Force the unsupported branch to exercise its cascade in a browser that supports blur.
    const styles = mode === 'unsupported' ? css.replace('@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)))', '@media all') : css;
    const tint = tone === 'light' ? 'rgba(240,230,235,.3)' : 'rgba(20,25,35,.3)';
    await page.setContent('<style>body{margin:0;background:white}.pmm-switch-snapshot-dialog{background:'+tint+'!important;width:360px}.pmm-switch-snapshot-head{height:60px}.test-body{height:200px}.pmm-switch-snapshot-row{height:60px}'+styles+'</style><div class="pmm-snapshot-hub-preset '+(mode==='android'?'pmm-snapshot-opaque':'')+'" data-wbs-tone="'+tone+'" style="--pm-panel-bg:'+tint+';--pm-card-bg:'+tint+';--pm-text-primary:'+(tone==='light'?'#222':'#eee')+'"><section class="pmm-switch-snapshot-dialog"><header class="pmm-switch-snapshot-head"></header><div class="test-body"></div><article class="pmm-switch-snapshot-row"></article><footer style="height:60px"></footer></section></div>');
    const dialog = page.locator('.pmm-switch-snapshot-dialog');
    const before = await dialog.boundingBox();
    const bg = await dialog.evaluate(n=>getComputedStyle(n).backgroundColor);
    if(mode==='supported') {
      assert.equal(bg,tint.replaceAll(',', ', ').replace('.3','0.3'), 'Supported non-Android keeps its translucent theme background');
    } else {
      assert.equal(bg,tone==='light'?'rgb(245, 245, 245)':'rgb(32, 33, 36)');
      for(const selector of ['header','.test-body','article','footer']) {
        const r=await page.locator(selector).boundingBox();
        const clip={x:r.x+30,y:r.y+20,width:20,height:20};
        await page.evaluate(()=>document.body.style.background='white');
        const white=await page.screenshot({clip});
        await page.evaluate(()=>document.body.style.background='black');
        const black=await page.screenshot({clip});
        assert.deepEqual(white,black, mode+' '+tone+' '+selector+' must completely shield background even without blur');
      }
    }
    assert.deepEqual(await dialog.boundingBox(),before,'Background changes must not affect geometry');
    await page.close();
  }
  console.log('Snapshot backgrounds passed: Android and unsupported light/dark shield all regions; supported browser retains translucent surface.');
} finally { await browser.close(); }
