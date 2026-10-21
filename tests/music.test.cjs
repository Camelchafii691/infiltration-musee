const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const scope=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/ambient-music.js'),'utf8')+'\nthis.AmbientMusic=AmbientMusic;',scope);
const Music=scope.AmbientMusic;

function fixture(saved='on') {
  let setting=saved; let timers=0;
  class Parameter {
    setValueAtTime(value) { this.value=value; }
    linearRampToValueAtTime(value) { this.value=value; }
    exponentialRampToValueAtTime(value) { this.value=value; }
    cancelScheduledValues() {}
  }
  class Node {
    constructor() {this.gain=new Parameter();this.frequency=new Parameter();this.connected=false;this.stopped=false;}
    connect() {this.connected=true;}
    disconnect() {this.connected=false;}
    start() {this.started=true;}
    stop() {this.stopped=true;}
  }
  const context={currentTime:0,state:'running',destination:{},createGain:()=>new Node(),createOscillator:()=>new Node(),resume:async()=>{},close:async()=>{context.state='closed';}};
  const options={contextFactory:()=>context,storage:{getItem:()=>setting,setItem:(_,value)=>{setting=value;}},setTimer:()=>++timers,clearTimer:()=>{timers--;}};
  return {context,options,setting:()=>setting,timers:()=>timers};
}

test('musique : aucune source avant interaction ; démarrage unique et mélodie planifiée',async()=>{
  const f=fixture(); const music=new Music(f.options);
  assert.equal(music.context,null); assert.equal(f.timers(),0);
  assert.equal(await music.start(),true);
  assert.ok(music.voices.size>=4); assert.equal(f.timers(),1);
  await music.start(); assert.equal(f.timers(),1);
  music.stop();
});

test('couper : gain nul, sources déconnectées, timer supprimé et contexte fermé',async()=>{
  const f=fixture(); const music=new Music(f.options); await music.start();
  const master=music.master; const voices=[...music.voices];
  await music.setEnabled(false);
  assert.equal(master.gain.value,0); assert.equal(master.connected,false);
  assert.ok(voices.every(({oscillator,envelope})=>oscillator.stopped&&!oscillator.connected&&!envelope.connected));
  assert.equal(f.timers(),0); assert.equal(music.voices.size,0); assert.equal(f.context.state,'closed');
  assert.equal(f.setting(),'off');
  assert.equal(await new Music(f.options).start(),false);
});

test('désactiver pendant resume ne relance pas la musique après résolution',async()=>{
  const f=fixture(); let finishResume;
  f.context.state='suspended'; f.context.resume=()=>new Promise(resolve=>{finishResume=resolve;});
  const music=new Music(f.options); const pending=music.start();
  await music.setEnabled(false); finishResume(); await pending;
  assert.equal(f.timers(),0); assert.equal(music.context,null); assert.equal(music.voices.size,0);
});

test('arrêt de fond préserve la préférence et navigateur sans audio ne plante pas',async()=>{
  const f=fixture(); const music=new Music(f.options); await music.start(); music.stop();
  assert.equal(music.enabled,true); assert.equal(f.setting(),'on');
  const unsupported=new Music({...f.options,contextFactory:()=>null});
  assert.equal(await unsupported.start(),false);
});

test('vol : trois notes ascendantes et aucun effet lorsque le son est coupé',async()=>{
  const f=fixture(); const music=new Music(f.options); await music.start();
  const before=music.voices.size;
  assert.equal(await music.playLoot(),true);
  assert.equal(music.voices.size,before+3);
  const tones=[...music.voices].slice(-3).map(v=>v.oscillator.frequency.value);
  assert.ok(tones[0]<tones[1] && tones[1]<tones[2]);
  await music.setEnabled(false);
  assert.equal(await music.playLoot(),false);
  assert.equal(music.voices.size,0);
});

test('volume : borné, appliqué en direct et conservé sans changer le bouton son',async()=>{
  const saved=new Map(); const f=fixture();
  const options={...f.options,storage:{getItem:key=>saved.get(key) ?? null,setItem:(key,value)=>saved.set(key,value)}};
  const music=new Music(options); assert.equal(music.volume,1);
  music.setVolume(.25); assert.equal(music.context,null); await music.start();
  assert.equal(music.master.gain.value,.09);
  music.setVolume(0); assert.equal(music.master.gain.value,0); assert.equal(music.enabled,true);
  music.setVolume(2); assert.equal(music.volume,1);
  music.setVolume(-1); assert.equal(music.volume,0);
  assert.equal(music.setVolume(NaN),false);
  music.setVolume(.5); music.stop();
  const restored=new Music(options); assert.equal(restored.volume,.5); assert.equal(restored.enabled,true);
  await restored.setEnabled(false); assert.equal(saved.get('infiltration-volume-v1'),'0.5');
});
