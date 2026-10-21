const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Vec {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vec(this.x, this.y); }
  add(a, b) { if (a instanceof Vec) { this.x += a.x; this.y += a.y; } else { this.x += a || 0; this.y += b || 0; } return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { if (n) { this.x /= n; this.y /= n; } return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() { const m = this.mag(); return m ? this.div(m) : this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { if (this.mag() > n) this.setMag(n); return this; }
  dist(v) { return Vec.dist(this, v); }
  set(x, y) { if (x instanceof Vec) { this.x = x.x; this.y = x.y; } else { this.x = x; this.y = y; } return this; }
  heading() { return Math.atan2(this.y, this.x); }
  reflect(normal) { const dot = this.x * normal.x + this.y * normal.y; this.x -= 2 * dot * normal.x; this.y -= 2 * dot * normal.y; return this; }
  static sub(a, b) { return new Vec(a.x - b.x, a.y - b.y); }
  static add(a, b) { return new Vec(a.x + b.x, a.y + b.y); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
}

global.createVector = (x = 0, y = 0) => new Vec(x, y);
global.p5 = { Vector: Vec };
global.PI = Math.PI;
global.cos = Math.cos;
global.sin = Math.sin;
global.atan2 = Math.atan2;
global.map = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
global.random = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
global.width = 1000;
global.height = 700;
global.window = { game: null };

function load(file, exported) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
  vm.runInThisContext(`${source}\n${exported.map((name) => `globalThis.${name}=${name};`).join('\n')}`, { filename: file });
}

load('vehicle.js', ['Vehicle']);
load('behavior-manager.js', ['BehaviorManager']);
load('neuroevolution.js', ['GuardBrain', 'NeuroEvolutionManager']);
load('museum-agent.js', ['MuseumAgent']);
load('navigation.js', ['MuseumNavigation']);
load('entities.js', ['MuseumObstacle', 'Guard', 'Dog', 'RivalThief']);
load('infiltration-tools.js', ['HeistUpgrades','ShadowZone','SoundDecoy']);
load('campaign.js',['HeistCampaign']);
load('sketch.js', ['InfiltrationGame']);

test('BehaviorManager respecte maxForce et la priorité', () => {
  const agent = new MuseumAgent(0, 0, { maxForce: 0.2 });
  agent.behaviorManager
    .add('prioritaire', () => createVector(1, 0), 1, 1)
    .add('secondaire', () => createVector(0, 1), 1, 2);
  const result = agent.behaviorManager.getSteeringForce({});
  assert.ok(Math.abs(result.mag() - 0.2) < 1e-9);
  assert.ok(result.x > 0.199);
  assert.ok(Math.abs(result.y) < 1e-9);
});

test('pursue prédit sans modifier position ni vitesse de la cible', () => {
  const agent = new MuseumAgent(0, 0, { maxSpeed: 4, maxForce: 0.3 });
  agent.vel.set(1, 0);
  const target = { pos: createVector(100, 20), vel: createVector(2, -1) };
  const posBefore = target.pos.copy();
  const velBefore = target.vel.copy();
  const force = agent.pursueEntity(target, 10);
  assert.ok(force.mag() <= agent.maxForce + 1e-9);
  assert.ok(force.x > 0);
  assert.deepEqual(target.pos, posBefore);
  assert.deepEqual(target.vel, velBefore);
});

test('evade produit une vitesse désirée opposée, pas une force seek inversée', () => {
  const agent = new MuseumAgent(30, 0, { maxSpeed: 4, maxForce: 0.4 });
  agent.vel.set(-2, 0);
  const threat = { pos: createVector(0, 0), vel: createVector(0, 0) };
  const force = agent.evadeEntity(threat, 50);
  assert.ok(force.x > 0);
  assert.ok(force.mag() <= 0.4 + 1e-9);
});

test('avoidObstacles détecte avec ahead et renvoie une force finie', () => {
  const agent = new MuseumAgent(10, 50, { maxSpeed: 4, maxForce: 0.25, radius: 8 });
  agent.vel.set(3, 0);
  const obstacle = new MuseumObstacle(45, 35, 30, 30);
  const force = agent.avoidObstacles([obstacle], 50);
  assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y));
  assert.ok(force.mag() > 0);
  assert.ok(force.mag() <= agent.maxForce + 1e-9);
});

test('séparation exclut soi-même et repousse le voisin', () => {
  const a = new MuseumAgent(20, 20, { maxForce: 0.3 });
  const b = new MuseumAgent(30, 20, { maxForce: 0.3 });
  const force = a.separation([a, b], 40);
  assert.ok(force.x < 0);
  assert.ok(Number.isFinite(force.x));
});

test('GuardBrain prédit deux sorties finies et préserve ses entrées', () => {
  const brain = new GuardBrain(Array(GuardBrain.INPUTS * GuardBrain.HIDDEN + GuardBrain.HIDDEN + GuardBrain.HIDDEN * GuardBrain.OUTPUTS + GuardBrain.OUTPUTS).fill(0.1));
  const inputs = [0.2, -0.1, 0.7, -0.8, 0, 0];
  const copy = [...inputs];
  const output = brain.predict(inputs);
  assert.equal(output.length, 2);
  assert.ok(output.every(Number.isFinite));
  assert.deepEqual(inputs, copy);
});

test('croisement et mutation déterministes produisent un génome valide', () => {
  const count = GuardBrain.INPUTS * GuardBrain.HIDDEN + GuardBrain.HIDDEN + GuardBrain.HIDDEN * GuardBrain.OUTPUTS + GuardBrain.OUTPUTS;
  const a = new GuardBrain(Array(count).fill(-1));
  const b = new GuardBrain(Array(count).fill(1));
  const child = a.crossover(b, () => 0.5).mutate(1, 0.2, () => 0.75);
  assert.equal(child.genes.length, count);
  assert.ok(child.genes.every((gene) => Number.isFinite(gene) && gene >= -3 && gene <= 3));
  assert.ok(child.genes.some((gene) => gene < 0) && child.genes.some((gene) => gene > 0));
});

test('vision du garde est bloquée par une vitrine', () => {
  const guard = new Guard(20, 50, [createVector(20,50)], new GuardBrain(), 0);
  guard.vel.set(1, 0); guard.visionRadius = 200;
  const target = { pos: createVector(150, 50) };
  const obstacle = new MuseumObstacle(70, 30, 20, 40);
  assert.equal(guard.canSee(target, []), true);
  assert.equal(guard.canSee(target, [obstacle]), false);
});

test('ombre + accroupissement réduisent la visibilité mais pas la détection à très courte distance', () => {
  const player=new Thief(100,50);
  const zone=new ShadowZone(90,30,50,50);
  const guard=new Guard(20,50,[],new GuardBrain());
  guard.vel.set(1,0); guard.visionRadius=170;
  player.prepareInput({x:0,y:0},[]);
  assert.equal(guard.canSee(player,[]),true);
  player.prepareInput({x:1,y:0,crouch:true,sprint:true},[zone]);
  assert.equal(player.visibilityFactor,.35);
  assert.ok(player.maxSpeed<player.walkSpeed);
  assert.equal(guard.canSee(player,[]),false);
  player.pos.set(40,50);
  assert.equal(guard.canSee(player,[]),true);
});

test('endurance : bonus de capacité, sprint effectif et récupération à l’arrêt', () => {
  const player=new Thief(0,0);
  const upgrades=new HeistUpgrades(); upgrades.choose('stamina'); upgrades.apply(player);
  assert.equal(player.staminaCapacity,130);
  player.prepareInput({x:1,y:0,sprint:true},[]);
  assert.ok(player.maxSpeed>player.walkSpeed);
  assert.ok(player.stamina<130);
  player.stamina=20;
  player.prepareInput({x:0,y:0},[]);
  assert.ok(player.stamina>20);
});

test('leurre : vol par locomotion héritée, impact, durée de vie et vecteur cible préservé', () => {
  const target=createVector(90,0);
  const decoy=new SoundDecoy(0,0,target,1);
  for(let i=0;i<50;i++) decoy.step();
  assert.equal(decoy.landed,true);
  assert.ok(decoy.pos.x>20);
  assert.equal(target.x,90);
  assert.ok(decoy.vel.mag()===0);
  for(let i=0;i<180;i++) decoy.step();
  assert.ok(decoy.remaining<=0);
});

test('garde : entend une fois, enquête puis reprend la patrouille ; la vision reste prioritaire', () => {
  const guard=new Guard(50,50,[],new GuardBrain()); guard.vel.set(1,0);
  const decoy=new SoundDecoy(80,50,createVector(80,50),1); decoy.landed=true;
  const ctx={player:{pos:createVector(-1000,0)},obstacles:[],decoys:[decoy],alarm:false,raiseAlarm:()=>{}};
  guard.chooseState(ctx);
  assert.equal(guard.state,'ENQUETE');
  assert.equal(guard.hearDecoy([decoy]),false);
  for(let i=0;i<300;i++) guard.chooseState({...ctx,decoys:[]});
  assert.equal(guard.state,'PATROUILLE');
  guard.detectionProgress=1;
  guard.chooseState({...ctx,player:{pos:createVector(90,50)}});
  assert.equal(guard.state,'POURSUITE');
});

test('bonus : un choix par fin de nuit, niveaux bornés et effets appliqués au nouveau voleur', () => {
  const scene=Object.create(InfiltrationGame.prototype);
  scene.upgrades=new HeistUpgrades(); scene.ended=false; scene.upgradeChosen=false;
  assert.equal(scene.selectUpgrade('decoys'),false);
  scene.ended=true;
  assert.equal(scene.selectUpgrade('decoys'),true);
  assert.equal(scene.selectUpgrade('stamina'),false);
  assert.equal(scene.upgrades.choose('unknown'),false);
  scene.upgrades.choose('decoys'); scene.upgrades.choose('decoys');
  assert.equal(scene.upgrades.choose('decoys'),false);
  const player=new Thief(0,0); scene.upgrades.apply(player);
  assert.equal(player.decoys,5);
});

test('continuer : amélioration facultative après une victoire ou une capture, sans bonus implicite', () => {
  for (const won of [false,true]) {
    const scene=Object.create(InfiltrationGame.prototype);
    scene.upgrades=new HeistUpgrades(); scene.upgradeChosen=false; scene.ended=false; scene.won=won;
    let advances=0, generations=0, starts=0;
    scene.campaign={advance(result) { assert.equal(result,won); advances++; }};
    scene.evolution={evolve() { generations++; }};
    scene.startNight=() => { starts++; scene.ended=false; };
    assert.equal(scene.nextNight(),false);
    scene.ended=true;
    assert.equal(scene.nextNight(),true);
    assert.equal(advances,1); assert.equal(generations,1); assert.equal(starts,1);
    assert.deepEqual(scene.upgrades.levels,{stamina:0,stealth:0,decoys:0});
    assert.equal(scene.nextNight(),false);
  }
});

test('lancer : inventaire, cooldown, pause et point d’impact avant un obstacle', () => {
  const scene=new InfiltrationGame(720,600); scene.started=true;
  scene.player.pos.set(100,100); scene.player.vel.set(1,0);
  scene.obstacles=[new MuseumObstacle(150,70,20,60)];
  assert.equal(scene.throwDecoy(),true);
  assert.equal(scene.player.decoys,1);
  assert.ok(scene.decoys[0].target.x<150);
  assert.equal(scene.throwDecoy(),false);
  scene.decoyCooldown=0; scene.paused=true;
  assert.equal(scene.throwDecoy(),false);
});

test('collecte : effet déclenché une fois par relique, jamais à distance ou en pause',()=>{
  const scene=new InfiltrationGame(720,600); scene.started=true;
  let sounds=0; scene.onLoot=()=>sounds++;
  scene.player.pos.set(50,550); scene.trySteal(); assert.equal(sounds,0);
  scene.player.pos.set(scene.artworks[0].pos);
  scene.paused=true; scene.trySteal(); assert.equal(sounds,0);
  scene.paused=false; scene.trySteal(); scene.trySteal();
  assert.equal(sounds,1); assert.equal(scene.player.loot,1);
  assert.equal(scene.artworks[0].collected,true);
});

test('campagne : échec au même niveau, succès débloque puis avance, dernier niveau borné',()=>{
  const store={getItem:()=>null,setItem:()=>{}};
  const campaign=new HeistCampaign(store);
  assert.equal(campaign.select(1),false);
  campaign.advance(false); assert.equal(campaign.current,0);
  campaign.complete(); assert.equal(campaign.unlocked,1);
  campaign.advance(true); assert.equal(campaign.current,1);
  for(let i=0;i<8;i++) { campaign.complete(); campaign.advance(true); }
  assert.equal(campaign.current,4); assert.equal(campaign.unlocked,4);
  assert.equal(campaign.completed.length,5);
});

test('campagne : sauvegarde et restauration des niveaux, données invalides tolérées',()=>{
  let saved=null;
  const store={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
  const campaign=new HeistCampaign(store); campaign.complete(); campaign.advance(true);
  const loaded=new HeistCampaign(store);
  assert.equal(loaded.current,1); assert.equal(loaded.unlocked,1);
  saved='{"current":999,"unlocked":999,"completed":[0,0,-1,99]}';
  const bounded=new HeistCampaign(store);
  assert.equal(bounded.current,4); assert.deepEqual(bounded.completed,[0]);
  saved='broken'; assert.equal(new HeistCampaign(store).current,0);
});

test('cinq cartes : trésors et départ hors obstacles, difficulté et cartes distinctes',()=>{
  const scene=new InfiltrationGame(720,600);
  const footprints=[];
  for(let index=0;index<5;index++) {
    scene.campaign.unlocked=4; scene.campaign.select(index); scene.startNight(false);
    assert.equal(scene.dogs.length,HEIST_LEVELS[index].dogs);
    assert.equal(scene.guards[0].visionRadius,HEIST_LEVELS[index].vision);
    assert.ok(!scene.obstacles.some(o=>o.containsPoint(scene.player.pos,scene.player.r)));
    scene.artworks.forEach(art=>assert.ok(!scene.obstacles.some(o=>o.containsPoint(art.pos,8)),`trésor bloqué niveau ${index+1}`));
    footprints.push(JSON.stringify(scene.artworks.map(a=>[a.pos.x,a.pos.y])));
  }
  assert.equal(new Set(footprints).size,5);
});

test('cartes finales : un chemin praticable relie entrée, chaque relique et sortie, sur mobile et ordinateur',()=>{
  const layouts=new Set(),themes=new Set();
  for(const [w,h] of [[360,560],[900,560]]) for(let index=0;index<5;index++) {
    const scene=new InfiltrationGame(w,h); scene.campaign.unlocked=4; scene.campaign.select(index); scene.startNight(false);
    layouts.add(JSON.stringify(scene.campaign.level.obstacles)); themes.add(JSON.stringify(scene.campaign.level.theme));
    const b=scene.bounds,step=5,r=scene.player.r;
    const cols=Math.floor(b.w/step),rows=Math.floor(b.h/step),visited=new Set(),queue=[];
    const point=(x,y)=>createVector(b.x+x*step,b.y+y*step);
    const clear=(x,y)=>x>=0&&y>=0&&x<=cols&&y<=rows&&x*step>=r&&y*step>=r&&x*step<=b.w-r&&y*step<=b.h-r&&!scene.obstacles.some(o=>o.containsPoint(point(x,y),r));
    const sx=Math.round((scene.player.pos.x-b.x)/step),sy=Math.round((scene.player.pos.y-b.y)/step);
    assert.ok(clear(sx,sy)); queue.push([sx,sy]); visited.add(sy*(cols+1)+sx);
    for(let head=0;head<queue.length;head++) {
      const [x,y]=queue[head];
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx,ny=y+dy,key=ny*(cols+1)+nx;
        if(!visited.has(key)&&clear(nx,ny)) {visited.add(key);queue.push([nx,ny]);}
      }
    }
    for(const target of [...scene.artworks.map(a=>a.pos),scene.point(.95,.51)]) {
      assert.ok(queue.some(([x,y])=>point(x,y).dist(target)<18),`lieu inaccessible carte ${index+1}, largeur ${w}`);
    }
    for(const guard of scene.guards) for(const [i,p] of (guard.patrol || []).entries()) {
      assert.ok(!scene.obstacles.some(o=>o.containsPoint(p,9)),`patrouille bloquée carte ${index+1}`);
      const next=guard.patrol[(i+1)%guard.patrol.length];
      assert.ok(!scene.obstacles.some(o=>segmentIntersectsRect(p,next,o,9)),`trajet de patrouille coupé carte ${index+1}, segment ${i}`);
    }
  }
  assert.equal(layouts.size,5); assert.equal(themes.size,5);
});

test('records : meilleur temps sauvegardé par carte et difficulté, anciennes sauvegardes compatibles',()=>{
  let saved=null; const store={getItem:()=>saved,setItem:(_,v)=>{saved=v;}};
  const campaign=new HeistCampaign(store);
  campaign.complete(90); campaign.complete(100); assert.equal(campaign.records['normal:0'],90);
  campaign.complete(70); campaign.setDifficulty('hard'); campaign.complete(130);
  const restored=new HeistCampaign(store);
  assert.equal(restored.records['normal:0'],70); assert.equal(restored.records['hard:0'],130);
  saved='{"unlocked":2,"current":1}'; const old=new HeistCampaign(store);
  assert.equal(old.current,1); assert.deepEqual(old.records,{});
});

test('murs : ni vol ni capture à travers une cloison',()=>{
  const scene=new InfiltrationGame(900,560); scene.started=true;
  scene.player.pos.set(100,100); scene.player.invulnerableFrames=0;
  scene.obstacles=[new MuseumObstacle(108,80,4,40,'wall')];
  scene.artworks=[new Artwork(120,100,'Saphir')];
  scene.trySteal(); assert.equal(scene.player.loot,0);
  scene.guards=[new Guard(120,100,[],new GuardBrain())]; scene.dogs=[];
  scene.finish=()=>assert.fail('capture à travers un mur'); scene.checkCapture();
  scene.obstacles=[]; scene.trySteal(); assert.equal(scene.player.loot,1);
});

test('ombre : accroupissement automatique à l’entrée, même en sprint, et retour debout à la sortie',()=>{
  const player=new Thief(100,100), zones=[new ShadowZone(80,80,80,80)];
  const input={x:1,y:0,sprint:true,crouch:false};
  player.prepareInput(input,zones);
  assert.equal(player.inShadow,true); assert.equal(player.crouching,true);
  assert.equal(player.maxSpeed,player.walkSpeed*.48);
  assert.equal(input.crouch,false);
  player.pos.set(250,250); player.prepareInput({...input,sprint:false},zones);
  assert.equal(player.crouching,false); assert.equal(player.maxSpeed,player.walkSpeed);
  player.prepareInput({...input,crouch:true},zones); assert.equal(player.crouching,true);
});

test('vol manuel : s’approcher ne ramasse pas la relique automatiquement',()=>{
  const scene=new InfiltrationGame(900,560); scene.started=true;
  scene.player.pos.set(100,100); scene.player.vel.set(0,0);
  scene.artworks=[new Artwork(120,100,'Saphir')];
  scene.guards=[]; scene.dogs=[]; scene.rivals=[]; scene.obstacles=[]; scene.shadows=[];
  scene.step({x:0,y:0,sprint:false,crouch:false});
  assert.equal(scene.player.loot,0);
  scene.trySteal(); assert.equal(scene.player.loot,1);
});

test('ombre : un garde identifie plus lentement et perd sa vision à moyenne distance',()=>{
  const player=new Thief(60,50);
  const guard=new Guard(20,50,[],new GuardBrain()); guard.vel.set(1,0);
  const ctx={player,obstacles:[],decoys:[],alarm:false,raiseAlarm:()=>{}};
  player.prepareInput({x:0,y:0},[]);
  for(let i=0;i<8;i++) guard.chooseState(ctx);
  assert.equal(guard.state,'POURSUITE');
  guard.state='PATROUILLE'; guard.detectionProgress=0; guard.lastSeen=null;
  // L’accroupissement automatique ne cumule plus un second bonus : portée ~60 px.
  player.pos.set(70,50);
  player.prepareInput({x:0,y:0},[new ShadowZone(40,20,120,80)]);
  for(let i=0;i<8;i++) guard.chooseState(ctx);
  assert.equal(guard.state,'OBSERVATION');
  player.pos.x=110; assert.equal(guard.canSee(player,[]),false);
});

test('détection rétablie : l’ombre ralentit sans rendre invisible, sur cinq niveaux et trois difficultés',()=>{
  for(const difficulty of ['easy','normal','hard']) for(let level=0;level<5;level++) {
    const scene=new InfiltrationGame(900,560);
    scene.campaign.current=level; scene.campaign.setDifficulty(difficulty); scene.startNight();
    const guard=scene.guards[0]; guard.pos.set(100,100); guard.vel.set(1,0);
    const range=guard.visionRadius*scene.campaign.settings.shadow;
    const distance=Math.max(31,range*.8);
    scene.player.pos.set(100+distance,100);
    scene.player.prepareInput({x:0,y:0},[new ShadowZone(90,50,400,100)],scene.campaign.settings.shadow);
    assert.equal(scene.player.crouching,true);
    assert.equal(scene.player.visibilityFactor,scene.campaign.settings.shadow);
    const context={player:scene.player,obstacles:[],decoys:[],alarm:false,raiseAlarm:()=>{}};
    assert.equal(guard.canSee(scene.player,[]),true,`${difficulty}, niveau ${level+1}`);
    let steps=0;
    while(guard.state!=='POURSUITE' && steps++<100) guard.chooseState(context);
    assert.equal(guard.state,'POURSUITE',`${difficulty}, niveau ${level+1}`);
    assert.ok(steps>Math.ceil(1/(.14*scene.campaign.settings.detection)));
    const wall=new MuseumObstacle(100+distance/2,70,4,60);
    assert.equal(guard.canSee(scene.player,[wall]),false);
  }
});

test('visibilité : ombre non cumulée, furtivité manuelle à découvert et bonus de discrétion conservés',()=>{
  const player=new Thief(100,100),zones=[new ShadowZone(80,80,80,80)];
  player.prepareInput({x:0,y:0},zones); assert.equal(player.visibilityFactor,.35);
  player.prepareInput({x:0,y:0,crouch:true},zones); assert.equal(player.visibilityFactor,.35);
  player.pos.set(250,250); player.prepareInput({x:0,y:0,crouch:true},zones);
  assert.equal(player.visibilityFactor,.55);
  player.prepareInput({x:0,y:0},zones); assert.equal(player.visibilityFactor,1);
  player.stealthFactor=.8; player.pos.set(100,100); player.prepareInput({x:0,y:0},zones);
  assert.equal(player.visibilityFactor,.8*.35);
});

test('sortie d’ombre : visibilité et observation rétablies dans le même pas, cinq niveaux et trois difficultés',()=>{
  for(const difficulty of ['easy','normal','hard']) for(let level=0;level<5;level++) {
    const scene=new InfiltrationGame(900,560); scene.campaign.current=level;
    scene.campaign.setDifficulty(difficulty); scene.startNight();
    scene.obstacles=[]; scene.shadows=[new ShadowZone(80,50,120,100)]; scene.dogs=[]; scene.rivals=[];
    const guard=scene.guards[0]; scene.guards=[guard]; guard.pos.set(300,100); guard.vel.set(-1,0);
    scene.player.pos.set(199.5,100); scene.player.vel.set(1.56,0);
    const input={x:1,y:0,sprint:false,crouch:false};
    scene.player.prepareInput(input,scene.shadows,scene.campaign.settings.shadow);
    assert.equal(scene.player.inShadow,true);
    scene.stepOnce(input);
    assert.ok(scene.player.pos.x>200); assert.equal(scene.player.inShadow,false);
    assert.equal(scene.player.crouching,false); assert.equal(scene.player.visibilityFactor,1);
    assert.equal(guard.state,'OBSERVATION',`${difficulty}, niveau ${level+1}`);
    for(let i=0;i<15 && guard.state!=='POURSUITE';i++) scene.stepOnce({x:0,y:0,crouch:false});
    assert.equal(guard.state,'POURSUITE',`${difficulty}, niveau ${level+1}`);
  }
});

test('observation : suivi lors d’un changement d’angle, jamais à travers un mur',()=>{
  const guard=new Guard(100,100,[],new GuardBrain()); guard.vel.set(1,0);
  const player=new Thief(180,100); player.prepareInput({x:0,y:0},[]);
  const ctx={player,obstacles:[],decoys:[],alarm:false,raiseAlarm:()=>{}};
  guard.chooseState(ctx); assert.equal(guard.state,'OBSERVATION');
  player.pos.set(100,180);
  for(let i=0;i<8;i++) guard.chooseState(ctx);
  assert.equal(guard.state,'POURSUITE');
  assert.equal(guard.canSee(player,[new MuseumObstacle(80,130,40,5)]),false);
  player.pos.set(100,500); assert.equal(guard.canSee(player,[]),false);
});

test('proximité : garde détecte le joueur à découvert de face, de côté et de dos, toutes difficultés',()=>{
  for(const difficulty of ['easy','normal','hard']) for(const [dx,dy] of [[50,0],[-50,0],[0,50]]) {
    const scene=new InfiltrationGame(900,560); scene.campaign.setDifficulty(difficulty); scene.startNight();
    const guard=scene.guards[0]; guard.pos.set(200,200); guard.vel.set(1,0);
    scene.player.pos.set(200+dx,200+dy); scene.player.prepareInput({x:0,y:0},[]);
    const ctx={player:scene.player,obstacles:[],decoys:[],alarm:false,raiseAlarm:()=>{}};
    for(let i=0;i<5;i++) guard.chooseState(ctx);
    assert.equal(guard.state,'POURSUITE',difficulty);
    const wall=new MuseumObstacle(200+dx/2-3,200+dy/2-3,6,6);
    assert.equal(guard.canSee(scene.player,[wall]),false);
  }
});

test('chien : proximité dans l’ombre, priorité joueur, mémoire limitée sans suivre sa position cachée',()=>{
  const dog=new Dog(200,200),player=new Thief(240,200),rival=new RivalThief(210,200,'#abcdef');
  player.prepareInput({x:0,y:0},[new ShadowZone(220,180,80,80)]);
  let alarms=0;
  const ctx={player,rivals:[rival],dogs:[dog],obstacles:[],bounds:{x:0,y:0,w:900,h:560},raiseAlarm:()=>{alarms++;}};
  dog.applyAI(ctx); assert.equal(dog.state,'POURSUITE'); assert.equal(alarms,1);
  assert.equal(dog.trackedPosition.x,240);
  player.pos.set(700,200); ctx.rivals=[];
  dog.applyAI(ctx); assert.equal(dog.state,'RECHERCHE'); assert.equal(dog.trackedPosition.x,240);
  for(let i=0;i<91;i++) dog.applyAI(ctx);
  assert.equal(dog.state,'MEUTE'); assert.equal(dog.trackedPosition,null);
  player.pos.set(240,200); ctx.obstacles=[new MuseumObstacle(218,170,4,60)];
  dog.applyAI(ctx); assert.equal(dog.state,'MEUTE');
});

test('navigation : détour calculé autour d’un mur, segments libres et cône arrêté par la vitrine',()=>{
  const obstacles=[new MuseumObstacle(140,80,20,140)],bounds={x:0,y:0,w:400,h:300};
  const navigation=new MuseumNavigation(obstacles,bounds);
  const start=createVector(80,150),goal=createVector(220,150),route=navigation.route(start,goal);
  assert.ok(route.length>=3); let previous=start;
  for(const point of route) { assert.ok(navigation.clear(previous,point)); previous=point; }
  assert.equal(previous.dist(goal),0);
  assert.equal(MuseumNavigation.rayDistance(start,0,200,obstacles),60);
  assert.equal(MuseumNavigation.rayDistance(start,Math.PI,50,obstacles),50);
});

test('chien : contourne le mur jusqu’à son objectif au lieu de tourner sur place',()=>{
  const obstacles=[new MuseumObstacle(140,80,20,140)],bounds={x:0,y:0,w:400,h:300};
  const dog=new Dog(80,150),goal=createVector(220,150); dog.vel.set(0,0); dog.patrol=[goal];
  const context={player:new Thief(1000,1000),rivals:[],dogs:[dog],obstacles,bounds,navigation:new MuseumNavigation(obstacles,bounds)};
  let closest=Infinity;
  for(let i=0;i<600;i++) {
    dog.applyAI(context); dog.update(); dog.resolveCollisions(obstacles,bounds);
    closest=Math.min(closest,dog.pos.dist(goal));
    assert.ok(Number.isFinite(dog.pos.x) && Number.isFinite(dog.pos.y));
    assert.ok(!obstacles.some(o=>o.containsPoint(dog.pos,dog.r)));
  }
  assert.ok(closest<18,`distance minimale ${closest}`);
});

test('meute : départs espacés sur les cinq cartes et séparation même à position identique',()=>{
  for(const w of [360,900]) for(let index=0;index<5;index++) {
    const scene=new InfiltrationGame(w,560); scene.campaign.current=index; scene.campaign.setDifficulty('hard'); scene.startNight();
    for(const dog of scene.dogs) for(const other of scene.dogs) if(dog!==other) assert.ok(dog.pos.dist(other.pos)>dog.r+other.r,`départ superposé niveau ${index+1}`);
  }
  const a=new Dog(100,100),b=new Dog(100,100);
  const fa=a.packSeparation([a,b]),fb=b.packSeparation([a,b]);
  assert.ok(fa.mag()>0); assert.ok(fa.x*fb.x+fa.y*fb.y<0);
});

test('meute : patrouilles progressent pendant trente secondes sur cinq cartes, portrait et paysage',()=>{
  const original=global.random; let seed=12345;
  global.random=(a=1,b)=>{seed=(seed*1664525+1013904223)>>>0;const v=seed/4294967296;return b===undefined ? v*a : a+v*(b-a);};
  try {
    for(const w of [360,900]) for(let level=0;level<5;level++) {
      const scene=new InfiltrationGame(w,560); scene.campaign.current=level; scene.campaign.setDifficulty('hard'); scene.startNight();
      scene.player.pos.set(-10000,-10000); scene.rivals=[];
      const visited=scene.dogs.map(()=>0),last=scene.dogs.map(d=>d.pathIndex),ctx=scene.context();
      for(let frame=0;frame<1800;frame++) {
        scene.dogs.forEach(d=>d.applyAI(ctx));
        scene.dogs.forEach((d,i)=>{d.update();d.resolveCollisions(scene.obstacles,scene.bounds);if(d.pathIndex!==last[i]){visited[i]++;last[i]=d.pathIndex;}});
      }
      assert.ok(visited.every(n=>n>=4),`meute bloquée niveau ${level+1}, largeur ${w}: ${visited}`);
    }
  } finally {global.random=original;}
});

test('entraînement : aucun ennemi, objectifs accessibles, aucune progression ni évolution attribuée',()=>{
  const scene=new InfiltrationGame(360,560); let writes=0;
  scene.campaign=new HeistCampaign({getItem:()=>null,setItem:()=>{writes++;}});
  scene.evolution.evolve=()=>assert.fail('évolution en entraînement');
  scene.evolution.setFitness=()=>assert.fail('fitness en entraînement');
  scene.startTraining();
  assert.equal(scene.training,true); assert.equal(scene.guards.length+scene.dogs.length+scene.rivals.length,0);
  assert.equal(scene.artworks.length,2);
  scene.artworks.forEach(art=>assert.ok(scene.navigation.route(scene.player.pos,art.pos).length>0));
  scene.recordOutcome(true); assert.equal(writes,0); assert.equal(scene.campaign.unlocked,0);
  scene.ended=true; assert.equal(scene.selectUpgrade('stamina'),false);
  scene.nextNight(); assert.equal(scene.training,false); assert.equal(scene.campaign.current,0); assert.equal(writes,0);
});

test('retours joueur : animation de vol, sortie incomplète et endurance en recharge sans oscillation',()=>{
  const scene=new InfiltrationGame(900,560); scene.started=true;
  scene.player.pos.set(scene.point(.95,.51)); scene.checkExtraction();
  assert.match(scene.notice,/SORTIE VERROUILLÉE/);
  scene.player.pos.set(scene.artworks[0].pos); scene.trySteal();
  assert.equal(scene.effects.length,1); assert.equal(scene.effects[0].life,45);
  scene.trySteal(); assert.equal(scene.effects.length,1);
  const player=new Thief(100,100); player.stamina=1.5;
  const input={x:1,y:0,sprint:true}; player.prepareInput(input,[]);
  assert.equal(player.sprintExhausted,true);
  for(let i=0;i<10;i++) {player.prepareInput(input,[]);assert.equal(player.maxSpeed,player.walkSpeed);}
  player.stamina=25; player.prepareInput(input,[]); assert.equal(player.sprintExhausted,false);
});

test('la mémoire neuronale ignore la position cachée et les chiens ne poursuivent pas à distance',()=>{
  const guard=new Guard(20,20,[],new GuardBrain());
  const player=new Thief(300,300);
  assert.equal(guard.neuralSteering({player,bounds:{w:720,h:600}}).mag(),0);
  const dog=new Dog(100,100);
  dog.applyAI({player,rivals:[],dogs:[dog],obstacles:[],bounds:{x:0,y:0,w:720,h:600}});
  assert.equal(dog.behaviorManager.lastForces.get('pursue').mag(),0);
});

test('détection : orientation conservée à l’arrêt et proximité derrière le garde, avec occlusion',()=>{
  const guard=new Guard(100,100,[],new GuardBrain());
  guard.vel.set(-1,0);
  const target={pos:createVector(40,100)};
  assert.equal(guard.canSee(target,[]),true);
  guard.vel.set(0,0);
  assert.equal(guard.canSee(target,[]),true);
  target.pos.set(125,100); target.visibilityFactor=.19;
  const ctx={player:target,obstacles:[],decoys:[],alarm:false,raiseAlarm:()=>{}};
  for(let i=0;i<3;i++) guard.chooseState(ctx);
  assert.equal(guard.state,'POURSUITE');
  assert.equal(guard.canSee(target,[new MuseumObstacle(109,80,6,40)]),false);
});

test('intersection exacte : vitrine fine, segment parallèle, coin et segment nul',()=>{
  const obstacle=new MuseumObstacle(5,5,1,20);
  assert.equal(segmentIntersectsRect(createVector(0,10),createVector(100,10),obstacle,0),true);
  assert.equal(segmentIntersectsRect(createVector(0,0),createVector(100,0),obstacle,0),false);
  assert.equal(segmentIntersectsRect(createVector(5,0),createVector(5,5),obstacle,0),true);
  assert.equal(segmentIntersectsRect(createVector(5.5,10),createVector(5.5,10),obstacle,0),true);
  assert.equal(segmentIntersectsRect(createVector(2,10),createVector(2,10),obstacle,0),false);
});

test('collision : le rayon entier sort de la vitrine et une vitesse sortante reste sortante',()=>{
  const agent=new MuseumAgent(95,100,{radius:9,maxForce:.2});
  const obstacle=new MuseumObstacle(100,80,40,40);
  agent.vel.set(-1,0);
  agent.resolveCollisions([obstacle],{x:0,y:0,w:300,h:200});
  assert.ok(!obstacle.containsPoint(agent.pos,agent.r));
  assert.ok(agent.vel.x<0);
  const stable=agent.pos.copy();
  for(let i=0;i<10;i++) agent.resolveCollisions([obstacle],{x:0,y:0,w:300,h:200});
  assert.equal(agent.pos.dist(stable),0);
});

test('joueur près d’un mur : pas de détour imposé, pas de rebond, sortie immédiate en sens inverse',()=>{
  const player=new Thief(80,100),obstacles=[new MuseumObstacle(100,60,10,180)];
  const bounds={x:0,y:0,w:400,h:400}; player.vel.set(0,0);
  const move=(x,y)=>{
    const input={x,y,sprint:false,crouch:false}; player.prepareInput(input,[]);
    player.applyManagedBehaviors({input,obstacles,bounds}); player.update(); player.resolveCollisions(obstacles,bounds);
  };
  for(let i=0;i<90;i++) move(1,0);
  assert.ok(player.pos.x<=100-player.r); assert.equal(player.pos.y,100);
  assert.ok(player.vel.x>=0 && player.vel.x<=player.maxForce+1e-9);
  const wallX=player.pos.x;
  for(let i=0;i<8;i++) move(-1,0);
  assert.ok(player.pos.x<wallX-8);
  player.pos.set(94,100); player.vel.set(2,2); player.resolveCollisions(obstacles,bounds);
  assert.equal(player.vel.x,0); assert.equal(player.vel.y,2);
});

test('joueur : relâcher les commandes arrête le glissement en dix pas maximum',()=>{
  const player=new Thief(200,200); player.vel.set(player.walkSpeed,0);
  for(let i=0;i<10;i++) {
    player.applyManagedBehaviors({input:{x:0,y:0},obstacles:[],bounds:{x:0,y:0,w:900,h:560}});
    player.update();
  }
  assert.ok(player.vel.mag()<1e-9);
});

test('difficulté : effets sur les cinq niveaux et sauvegarde du choix',()=>{
  let saved=null;
  const campaign=new HeistCampaign({getItem:()=>saved,setItem:(_,v)=>{saved=v;}});
  for(let level=0;level<5;level++) {
    campaign.unlocked=4; campaign.select(level);
    const values=['easy','normal','hard'].map(key=>{campaign.setDifficulty(key);return campaign.mission;});
    assert.ok(values[0].vision<values[1].vision && values[1].vision<values[2].vision);
    assert.ok(values[0].guardSpeed<values[1].guardSpeed && values[1].guardSpeed<values[2].guardSpeed);
    assert.ok(values[0].dogs<values[1].dogs && values[1].dogs<values[2].dogs);
  }
  assert.equal(new HeistCampaign({getItem:()=>saved}).difficulty,'hard');
  assert.equal(campaign.setDifficulty('invalid'),false);
});

test('détection : les trois difficultés et les cinq niveaux poursuivent sans traverser une vitrine',()=>{
  const steps=[];
  for(const key of ['easy','normal','hard']) {
    for(let level=0;level<5;level++) {
      const scene=new InfiltrationGame(900,560);
      scene.campaign.unlocked=4;scene.campaign.select(level);scene.campaign.setDifficulty(key);scene.startNight();
      const guard=scene.guards[0]; guard.pos.set(100,100);guard.vel.set(1,0);
      scene.player.pos.set(180,100);scene.player.prepareInput({x:0,y:0},[],scene.campaign.settings.shadow);
      const ctx={...scene.context(),obstacles:[],alarm:false,raiseAlarm:()=>{}};
      let count=0;
      while(guard.state!=='POURSUITE' && count<60) {guard.chooseState(ctx);count++;}
      assert.equal(guard.state,'POURSUITE',`${key}, niveau ${level+1}`);
      assert.equal(guard.canSee(scene.player,[new MuseumObstacle(130,80,5,40)]),false);
      if(level===0)steps.push(count);
    }
  }
  assert.ok(steps[0]>steps[1] && steps[1]>steps[2]);
});

test('cadence : une seconde à 30 ou 60 images donne le même déplacement, rattrapage borné',()=>{
  function simulate(frames) {
    const scene=new InfiltrationGame(900,560);
    scene.obstacles=[];scene.shadows=[];scene.guards=[];scene.dogs=[];scene.rivals=[];
    scene.player.pos.set(100,100);scene.player.vel.set(0,0);
    for(let i=0;i<frames;i++) scene.step({x:1,y:0},1000/frames);
    return scene;
  }
  const slow=simulate(30),fast=simulate(60);
  assert.equal(slow.elapsed,60);assert.equal(fast.elapsed,60);
  assert.ok(slow.player.pos.dist(fast.player.pos)<1e-6);
  const before=slow.elapsed; slow.step({x:0,y:0},10000);
  assert.ok(slow.elapsed-before<=5);
});

test('poursuite : tourner brièvement ne rend pas le joueur invisible ; un obstacle bloque toujours',()=>{
  const guard=new Guard(100,100,[],new GuardBrain()); guard.vel.set(1,0);
  const player={pos:createVector(180,100),visibilityFactor:1};
  const ctx={player,obstacles:[],decoys:[],alarm:false,raiseAlarm:()=>{}};
  for(let i=0;i<8;i++)guard.chooseState(ctx);
  player.pos.set(50,100);guard.chooseState(ctx);
  assert.equal(guard.state,'POURSUITE');
  assert.equal(guard.canSee(player,[new MuseumObstacle(70,80,5,40)]),false);
});

test('butin progressif : 3 à 7 reliques nommées, accessibles sur mobile et ordinateur, dans les trois difficultés',()=>{
  for(const width of [360,900])for(const difficulty of ['easy','normal','hard']) {
    const scene=new InfiltrationGame(width,560);scene.campaign.unlocked=4;
    scene.campaign.setDifficulty(difficulty);
    for(let index=0;index<5;index++) {
      scene.campaign.select(index);scene.startNight();
      assert.equal(scene.artworks.length,index+3);
      assert.equal(new Set(scene.artworks.map(item=>item.title)).size,index+3);
      for(const item of scene.artworks) {
        assert.ok(item.title);
        assert.ok(!scene.obstacles.some(obstacle=>obstacle.containsPoint(item.pos,scene.player.r+1)),`relique bloquée niveau ${index+1}, largeur ${width}`);
      }
    }
  }
});

test('extraction : impossible avec seulement trois reliques au niveau 5, puis succès après les sept',()=>{
  const scene=new InfiltrationGame(360,560);scene.campaign.unlocked=4;scene.campaign.select(4);scene.startNight();scene.started=true;
  let sounds=0;let victories=0;
  scene.onLoot=()=>sounds++;
  scene.finish=(success,title,message)=>{assert.equal(success,true);assert.match(message,/7 reliques/);victories++;};
  for(let i=0;i<7;i++) {
    scene.player.pos.set(scene.artworks[i].pos);scene.trySteal();
    scene.player.pos.set(scene.point(.95,.51));scene.checkExtraction();
    assert.equal(victories,i===6 ? 1 : 0);
  }
  assert.equal(sounds,7);assert.equal(scene.player.loot,7);
});

test('étoiles : critères, meilleur résultat par niveau/difficulté et anciennes sauvegardes',()=>{
  let saved=null;
  const store={getItem:()=>saved,setItem:(_,value)=>saved=value};
  const campaign=new HeistCampaign(store);
  assert.equal(campaign.rating(180,0).stars,3);
  assert.equal(campaign.rating(181,0).stars,2);
  assert.equal(campaign.rating(180,1).stars,2);
  assert.equal(campaign.rating(181,1).stars,1);
  assert.equal(campaign.rating(NaN,NaN).stars,1);
  campaign.complete(100,3); campaign.complete(90,1);
  assert.equal(campaign.stars['normal:0'],3); assert.equal(campaign.records['normal:0'],90);
  campaign.setDifficulty('hard'); campaign.complete(120,2);
  const restored=new HeistCampaign(store);
  assert.equal(restored.stars['hard:0'],2); assert.equal(restored.stars['normal:0'],3);
  saved=JSON.stringify({records:{'normal:0':80},stars:{'normal:0':4,'hard:1':-1,'easy:2':2},unlocked:2});
  const cleaned=new HeistCampaign(store);
  assert.equal(cleaned.records['normal:0'],80); assert.deepEqual(cleaned.stars,{'easy:2':2});
  saved=JSON.stringify({completed:[0],unlocked:1});
  assert.deepEqual(new HeistCampaign(store).stars,{});
});

test('expressions : états de garde, durée et cooldown sans modifier la perception',()=>{
  const guard=new Guard(100,100,[],new GuardBrain());
  guard.state='OBSERVATION'; guard.updateExpression(); assert.equal(guard.speech,'Qui va là ?');
  guard.state='POURSUITE'; guard.updateExpression(); assert.equal(guard.speech,'Halte !');
  guard.state='ENQUETE'; guard.updateExpression(); assert.equal(guard.speech,'Halte !');
  for(let i=0;i<240;i++) guard.updateExpression();
  assert.equal(guard.speechFrames,0);
  guard.state='RECHERCHE'; guard.updateExpression(); assert.equal(guard.speech,'Où est-il ?');
  guard.speak('Saphir volé !',180,true); assert.equal(guard.speech,'Saphir volé !');
  assert.equal(guard.state,'RECHERCHE'); assert.equal(guard.speechFrames,180);
});

test('finale : saphir protégé puis alarme permanente, dernier lieu connu et renforts bornés',()=>{
  for(const difficulty of ['easy','normal','hard']) {
    const scene=new InfiltrationGame(360,560); scene.campaign.current=4; scene.campaign.setDifficulty(difficulty); scene.startNight(); scene.started=true;
    const sapphire=scene.artworks.at(-1);
    assert.equal(sapphire.isSapphire,true); assert.equal(sapphire.title,'Saphir d’Atlas');
    scene.player.pos.set(sapphire.pos); scene.trySteal();
    assert.equal(scene.player.loot,0); assert.equal(scene.finalEscape,false);
    for(const item of scene.artworks.slice(0,-1)) {scene.player.pos.set(item.pos);scene.trySteal();}
    assert.equal(sapphire.locked,false); assert.equal(scene.finalEscape,false);
    scene.player.pos.set(sapphire.pos); scene.trySteal();
    assert.equal(scene.player.loot,7); assert.equal(scene.finalEscape,true);
    assert.equal(scene.finalEscapeFrames,({easy:140,normal:110,hard:90}[difficulty])*60);
    const known=scene.alarmTarget.copy(); scene.player.pos.set(scene.point(.1,.9));
    for(let i=0;i<1000;i++) scene.updateAlarm();
    assert.equal(scene.alarm,true); assert.equal(scene.alarmTarget.dist(known),0);
    assert.ok(scene.reinforcements<=scene.campaign.settings.reinforcements);
    const time=scene.finalEscapeFrames; scene.beginFinalEscape(sapphire.pos); assert.equal(scene.finalEscapeFrames,time);
    scene.startNight(); assert.equal(scene.finalEscape,false); assert.equal(scene.finalEscapeFrames,0); assert.equal(scene.artworks.at(-1).locked,true);
  }
});

test('finale : expiration sans victoire, extraction prioritaire au dernier pas et entraînement exclu',()=>{
  function finalScene(){
    const scene=new InfiltrationGame(900,560); scene.campaign.current=4; scene.startNight();
    scene.guards=[];scene.dogs=[];scene.rivals=[]; scene.finalEscape=true;scene.finalEscapeFrames=1;
    scene.finish=(won,title)=>{scene.ended=true;scene.won=won;scene.title=title;};
    return scene;
  }
  const timeout=finalScene(); timeout.stepOnce({x:0,y:0});
  assert.equal(timeout.won,false); assert.match(timeout.title,/verrouillé/);
  const escaped=finalScene(); escaped.player.loot=7; escaped.player.pos.set(escaped.point(.95,.51)); escaped.player.vel.set(0,0);
  escaped.stepOnce({x:0,y:0}); assert.equal(escaped.won,true); assert.match(escaped.title,/Saphir/);
  escaped.startTraining(); assert.equal(escaped.isFinalMission,false); assert.equal(escaped.finalEscape,false);
});

test('score de discrétion : épisodes réels, pas l’alarme scénarisée, et victoire enregistrée',()=>{
  const scene=new InfiltrationGame(900,560); scene.guards=[];scene.dogs=[];scene.rivals=[];
  scene.alarm=true; scene.stepOnce({x:0,y:0}); assert.equal(scene.detectionEpisodes,0);
  const guard=new Guard(700,450,[],new GuardBrain()); guard.applyAI=()=>{}; guard.state='POURSUITE'; scene.guards=[guard];
  scene.stepOnce({x:0,y:0}); scene.stepOnce({x:0,y:0}); assert.equal(scene.detectionEpisodes,1);
  guard.state='RECHERCHE';scene.stepOnce({x:0,y:0});guard.state='POURSUITE';scene.stepOnce({x:0,y:0});assert.equal(scene.detectionEpisodes,2);
  scene.campaign=new HeistCampaign({getItem:()=>null,setItem:()=>{}});scene.elapsed=60*100;
  scene.recordOutcome(true); assert.equal(scene.runRating.stars,2);assert.equal(scene.campaign.stars['normal:0'],2);
  scene.startNight(); assert.equal(scene.detectionEpisodes,0);
});

test('réseau neuronal : changer uniquement les poids modifie la force réelle du garde en renfort',()=>{
  function steering(sign) {
    const brain=new GuardBrain(Array(74).fill(0));
    brain.genes[64]=sign*3;
    const guard=new Guard(100,100,[],brain);
    guard.applyAI({player:{pos:createVector(-1000,-1000)},bounds:{x:0,y:0,w:900,h:560},obstacles:[],guards:[guard],decoys:[],alarm:true,alarmTarget:createVector(200,100),raiseAlarm:()=>{}});
    assert.equal(guard.state,'RENFORT');
    assert.ok(guard.behaviorManager.lastForces.has('interception neuronale'));
    return guard.acc.x;
  }
  assert.ok(steering(1)>steering(-1));
});

test('neuro-évolution : sélection des meilleurs génomes, génération suivante et sauvegarde des poids',()=>{
  const previous=global.localStorage;
  let record=null;
  global.localStorage={getItem:()=>record,setItem:(_,value)=>{record=value;}};
  try {
    const evolution=new NeuroEvolutionManager(4);
    evolution.population=Array.from({length:4},(_,index)=>({brain:new GuardBrain(Array(74).fill(index)),fitness:0}));
    [10,20,300,200].forEach((fitness,index)=>evolution.setFitness(index,fitness));
    evolution.evolve(()=>.75);
    assert.equal(evolution.generation,2);
    assert.equal(evolution.population.length,4);
    assert.equal(evolution.population[0].brain.genes[0],2);
    assert.equal(evolution.population[1].brain.genes[0],3);
    assert.ok(evolution.population.every(item=>item.fitness===0));
    const restored=new NeuroEvolutionManager(4);
    assert.equal(restored.generation,2);
    assert.equal(restored.bestFitness,300);
    assert.deepEqual(restored.population[0].brain.genes,evolution.population[0].brain.genes);
    assert.notEqual(restored.population[0].brain.genes,evolution.population[0].brain.genes);
  } finally {
    if(previous===undefined) delete global.localStorage;
    else global.localStorage=previous;
  }
});
