import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../dist/workshop-v3.02.js',import.meta.url),'utf8');
const start=source.indexOf('/* PMM_DESKTOP_HEADER_WRAP_TEST101');
const css=source.slice(start,source.indexOf('    `;',start));

for(const marker of [
  '@media screen and (min-width: 769px)',
  ':not(.pmm-mobile-layout-enabled)',
  'width: fit-content !important',
  'flex-wrap: wrap !important',
  'min-height: 80px !important',
  'flex: 0 0 auto !important',
]) assert.ok(css.includes(marker),marker);

for(const removed of [
  'PMM_DESKTOP_HEADER_SCROLL_TEST100',
  'scrollbar-width:',
  '::-webkit-scrollbar',
  'overflow-x: auto !important',
]) assert.ok(!css.includes(removed),`Desktop wrap CSS must not include ${removed}`);

console.log('test.95 passed: desktop headers wrap controls and do not install horizontal scrollbars.');
