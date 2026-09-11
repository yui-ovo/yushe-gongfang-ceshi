import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/workshop-v3.02.js',import.meta.url),'utf8');
const start=source.indexOf('/* PMM_DESKTOP_HEADER_SCROLL_TEST100');
const css=source.slice(start,source.indexOf('    `;',start));
for(const marker of ['@media (hover: hover) and (pointer: fine)',':not(.pmm-mobile-layout-enabled)','overflow-x: auto !important','flex-wrap: nowrap !important','flex-shrink: 0 !important','scrollbar-width: auto !important'])assert.ok(css.includes(marker),marker);
assert.ok(!source.includes('@container (max-width: 600px)'));
console.log('test.95 passed: desktop-only independent scrollports without wrapping.');
