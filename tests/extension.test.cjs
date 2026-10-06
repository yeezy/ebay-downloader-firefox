const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const ids = ['ai8AAeSwq2Jqidih','LyEAAeSw7BNqidih','eksAAeSwOa9qidih','JYEAAeSwzkRqidih','Kh4AAeSw72hqidih','S6gAAeSwLrNqidih','ZX8AAeSwmmZqidih'];
const url = (id, size) => `https://i.ebayimg.com/images/g/${id}/s-l${size}.webp`;
const image = attrs => ({getAttribute: key => attrs[key] || null});

test('seven listing photos, lazy attributes, deduplication and largest sizes', () => {
  const images = ids.flatMap((id, i) => [image({[i === 6 ? 'data-src' : 'src']: url(id,140)}), image({'src': 'data:image/gif;base64,AAAA', 'data-zoom-src': url(id,1600), 'data-src': url(id,500)})]);
  images.push(image({src:'https://evil.example/images/g/abc/s-l1600.jpg'}));
  images.push(image({src:'https://i.ebayimg.com/logo.png'}));
  const root = {matches: () => false, querySelectorAll: () => images};
  const result = vm.runInNewContext(source('collect.js'), {URL, location:{href:'https://www.ebay.com/itm/257696546918'}, document:{querySelectorAll(selector) {assert.ok(selector.includes('#PicturePanel')); return [root,root];}}});
  assert.equal(result.length,7);
  assert.deepEqual(Array.from(result, p => p.url), ids.map(id => url(id,1600)));
});

async function runBatch({failed = false, listing = true} = {}) {
  let click;
  const downloads = [];
  const badges = [];
  const listeners = new Set();
  const browser = {
    browserAction:{onClicked:{addListener(fn){click = fn;}},setBadgeText:async x => badges.push(x.text),setBadgeBackgroundColor:async()=>{},setTitle:async()=>{}},
    tabs:{executeScript:async()=>[ids.map(id=>({url:url(id,1600),extension:'webp'}))]},
    downloads:{download:async opts=>{downloads.push(opts);return downloads.length;},onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},search:async({id})=>[{id,state:failed && id===3 ? 'interrupted':'complete'}]}
  };
  vm.runInNewContext(source('background.js'), {browser, URL, Date:{now:()=>1791295000123},setTimeout,clearTimeout,console:{warn(){}}});
  await click({id:1,url:listing ? 'https://www.ebay.com/itm/257696546918':'https://example.com/itm/257696546918'});
  return {downloads,badges,listeners};
}
test('click downloads seven uniquely named photos and counts completed downloads', async()=>{
  const {downloads,badges,listeners} = await runBatch();
  assert.equal(downloads.length,7);
  assert.equal(new Set(downloads.map(d=>d.filename)).size,7);
  assert.ok(downloads.every(d=>/^\d{13}\.webp$/.test(d.filename) && d.saveAs===false));
  assert.equal(badges.at(-1),'7');
  assert.equal(listeners.size,0);
});
test('interrupted photo does not prevent remaining downloads or report success',async()=>{
  const {downloads,badges} = await runBatch({failed:true});
  assert.equal(downloads.length,7);
  assert.ok(badges.includes('6/7'));
  assert.equal(badges.at(-1),'!');
});
test('non-eBay page cannot trigger downloads',async()=>{
  const {downloads,badges} = await runBatch({listing:false});
  assert.equal(downloads.length,0);
  assert.equal(badges.at(-1),'!');
});
