const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('sprites : cache réutilisé entre positions et états, variantes distinctes et taille bornée',()=>{
  let allocations=0;
  const context=vm.createContext({createGraphics(w,h){
    allocations++; assert.equal(w,40); assert.equal(h,48);
    return Object.fromEntries(['pixelDensity','noSmooth','clear','translate','noStroke','fill','rect','ellipse','scale'].map(name=>[name,()=>{}]));
  }});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/pixel-renderer.js'),'utf8')+'\nthis.Renderer=PixelRenderer;',context);
  const renderer=context.Renderer;
  const agent={kind:'garde',color:'#abcdef',vel:{x:1},pos:{x:10,y:20},state:'PATROUILLE'};
  const sprite=renderer.sprite(agent,0);
  agent.pos.x=200; agent.state='POURSUITE';
  assert.equal(renderer.sprite(agent,0),sprite);
  assert.notEqual(renderer.sprite(agent,2),sprite);
  agent.vel.x=-1; assert.notEqual(renderer.sprite(agent,0),sprite);
  for(let i=0;i<1000;i++) renderer.sprite(agent,0);
  assert.equal(allocations,3); assert.equal(renderer.spriteCache.size,3);
});
