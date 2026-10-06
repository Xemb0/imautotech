import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../js/products.js',import.meta.url),'utf8');
const entries = [
  ['arc-launcher','Arc Launcher','arclauncher.imautotech.in'],
  ['wx-gamepad','WX Gamepad','wxgamepad.imautotech.in'],
  ['watchparty','WatchParty','watchparty.online'],
  ['playparty','PlayParty','playparty.space'],
  ['onetapmusic','OneTapMusic','onetapmusic.imautotech.in'],
  ['nestlink','NestLink','nestlink.imautotech.in'],
  ['labourchawk','LabourChauk','labourchauk.imautotech.in'],
  ['printlabel','PrintLabel','printlabel.imautotech.in'],
  ['rentle','Rentle','rentle.imautotech.in'],
  ['ringreminder','RingReminder','ringreminder.imautotech.in'],
  ['bloodlabs','Bloodlabs','bloodlabs.imautotech.in'],
];
const data = entries.map(([slug,title])=>({slug,title,is_visible:true}));
async function render(products=data,error=null,organization) {
  const container={innerHTML:''};
  const query={select(){return this},eq(){return this},async order(){return {data:products,error}}};
  const context={window:{},document:{getElementById:()=>container},_supabase:{from:()=>query}};
  runInNewContext(source,context);
  await context.window.loadProducts(undefined,organization);
  return container.innerHTML;
}

test('all fourteen cards open their own website exactly once',async()=>{
  const html=await render();
  for(const domain of [...entries.map(e=>e[2]),'dosolutions.online','arrows.imautotech.in','kidgrow.imautotech.in']) {
    assert.equal(html.split(`href="https://${domain}"`).length-1,1,domain);
  }
  assert.equal((html.match(/<a href=/g)||[]).length,14);
});
test('hidden entries stay hidden and title matching avoids duplicate fallback cards',async()=>{
  const html=await render([...data,{slug:'kid-grow',title:'KidGrow',is_visible:false}]);
  assert.ok(!html.includes('href="https://kidgrow.imautotech.in"'));
  const visible=await render([...data,{slug:'kid-grow',title:'KidGrow',is_visible:true}]);
  assert.equal(visible.split('href="https://kidgrow.imautotech.in"').length-1,1);
});
test('unknown products retain their existing internal page and errors are shown',async()=>{
  assert.ok((await render([...data,{slug:'new-app',title:'New App',is_visible:true}])).includes('href="our_products/product.html?slug=new-app"'));
  assert.ok((await render(null,{message:'offline'})).includes('Unable to load products'));
  assert.ok(!(await render([],null,'another-company')).includes('<a href='));
});
