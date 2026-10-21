const test=require('node:test');
const assert=require('node:assert/strict');
const {createGameServer}=require('../scripts/serve.cjs');

async function start(t) {
  const server=createGameServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  return 'http://127.0.0.1:'+server.address().port;
}

test('serveur : accueil, CSS et chaque script local sont servis sans installation',async t=>{
  const url=await start(t);
  const response=await fetch(url+'/'); assert.equal(response.status,200);
  const html=await response.text(); assert.ok(html.includes('Comment jouer ?'));
  const resources=[...html.matchAll(/(?:src|href)="([^\"]+)"/g)].map(match=>match[1]);
  for(const resource of resources) {
    const asset=await fetch(url+'/'+resource); assert.equal(asset.status,200,resource);
    assert.ok((await asset.text()).length>0);
    assert.equal(asset.headers.get('cache-control'),'no-store');
  }
});

test('serveur : HEAD, fichiers privés et méthodes non autorisées',async t=>{
  const url=await start(t);
  const head=await fetch(url+'/index.html',{method:'HEAD'}); assert.equal(head.status,200); assert.equal(await head.text(),'');
  for(const route of ['/.git/config','/.env','/package.json','/tests/steering.test.cjs','/js/missing.js']) {
    assert.equal((await fetch(url+route)).status,404,route);
  }
  const post=await fetch(url+'/',{method:'POST'}); assert.equal(post.status,405);
});
