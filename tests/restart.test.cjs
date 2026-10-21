const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function fixture(paused=false) {
  const listeners={};
  const dialog={open:false,opens:0,returnValue:'',addEventListener:(name,callback)=>listeners[name]=callback,
    showModal(){this.open=true;this.opens++;},close(value){if(value!==undefined)this.returnValue=value;this.open=false;listeners.close();},
    keyDown(event){listeners.keydown(event);}};
  const cancel={focusCount:0,focus(){this.focusCount++;}};
  const game={started:true,ended:false,paused,elapsed:500,loot:2,timeAccumulator:4,starts:0,
    campaign:{current:2,unlocked:4,records:{'normal:2':90}},
    startNight(){this.starts++;this.elapsed=0;this.loot=0;this.paused=false;}};
  const document={hidden:false,getElementById:id=>id==='restartConfirm' ? dialog : cancel};
  const ctx=vm.createContext({window:{},document,testGame:game,key:'r',keyCode:82});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/sketch.js'),'utf8')+`
    game=testGame;
    togglePause=(value)=>{game.paused=Boolean(value);game.timeAccumulator=0;};
    bindRestartConfirmation();
    this.press=(repeat=false)=>keyPressed({repeat});
    this.request=requestRestart;
  `,ctx);
  return {ctx,dialog,cancel,game,document};
}

test('R : confirmation et pause sans remise à zéro, annulation conserve la tentative',()=>{
  const f=fixture();f.ctx.press();
  assert.equal(f.dialog.open,true);assert.equal(f.game.paused,true);assert.equal(f.game.starts,0);
  assert.equal(f.game.elapsed,500);assert.equal(f.game.loot,2);assert.equal(f.cancel.focusCount,1);
  f.dialog.close('cancel');
  assert.equal(f.game.paused,false);assert.equal(f.game.starts,0);assert.equal(f.game.elapsed,500);assert.equal(f.game.loot,2);
  assert.equal(f.game.timeAccumulator,0);
  f.ctx.press();let prevented=false,stopped=false;
  f.dialog.keyDown({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(prevented,true);assert.equal(stopped,true);assert.equal(f.game.paused,false);assert.equal(f.game.starts,0);
});
test('R : seul Recommencer réinitialise, sans changer les niveaux ni records',()=>{
  const f=fixture();const campaign=f.game.campaign;
  f.ctx.press();f.dialog.close('restart');
  assert.equal(f.game.starts,1);assert.equal(f.game.elapsed,0);assert.equal(f.game.loot,0);assert.equal(f.game.paused,false);
  assert.equal(f.game.campaign,campaign);assert.equal(campaign.current,2);assert.equal(campaign.unlocked,4);assert.equal(campaign.records['normal:2'],90);
  // Échap après une nouvelle ouverture ne réutilise jamais la confirmation précédente.
  f.ctx.press();f.dialog.close();assert.equal(f.game.starts,1);
});
test('confirmation : demande depuis pause, annulation reste en pause et onglet masqué ne reprend pas',()=>{
  const f=fixture(true);f.ctx.request();f.dialog.close('cancel');assert.equal(f.game.paused,true);
  f.game.paused=false;f.ctx.request();f.document.hidden=true;f.dialog.close('cancel');assert.equal(f.game.paused,true);
  f.ctx.request();f.dialog.close('restart');assert.equal(f.game.paused,true);
});
test('R : maintien et touches de jeu ne multiplient pas les demandes ni ne ferment le dialogue',()=>{
  const f=fixture();f.ctx.press(true);assert.equal(f.dialog.opens,0);
  f.ctx.press();f.ctx.press();f.ctx.request();assert.equal(f.dialog.opens,1);
  f.ctx.key='p';f.ctx.keyCode=27;f.ctx.press();assert.equal(f.dialog.open,true);assert.equal(f.game.paused,true);
  f.dialog.close();f.ctx.key='R';f.ctx.keyCode=82;f.ctx.press(true);assert.equal(f.dialog.opens,1);
  f.ctx.press();assert.equal(f.dialog.opens,2);
});
test('R : aucune confirmation à l’accueil ou en fin de partie, raccourci inactif en pause',()=>{
  const f=fixture();f.game.started=false;f.ctx.press();f.ctx.request();assert.equal(f.dialog.opens,0);
  f.game.started=true;f.game.ended=true;f.ctx.press();f.ctx.request();assert.equal(f.dialog.opens,0);
  f.game.ended=false;f.game.paused=true;f.ctx.press();assert.equal(f.dialog.opens,0);
});
