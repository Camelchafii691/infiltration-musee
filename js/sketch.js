let game;
let touchControls;
let music;

const UI = {};
let restartRequest=null;

function setup() {
  // Repère de simulation stable : la mise en page ajuste seulement son affichage.
  // Une barre d'adresse mobile ou une rotation ne doit pas réinitialiser la mission.
  const portrait=window.innerHeight>window.innerWidth;
  const canvas = createCanvas(portrait ? 360 : 900, 560);
  canvas.parent('canvasHost');
  pixelDensity(1);
  noSmooth();
  frameRate(60);
  describe('Plan d’un musée de nuit. Le voleur infiltre les salles pendant que gardes, chiens et rivaux réagissent avec des comportements de steering.');

  cacheUI();
  game = new InfiltrationGame(width, height);
  window.game = game;
  music = new AmbientMusic();
  bindUI();
  touchControls = new TouchControls();
  updateUI();
  refreshHome();
  updateMusicButtons();
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) { music.stop(); if(game.started&&!game.ended) togglePause(true); }
    else if (music.enabled && game.started) void music.start();
  });
  window.addEventListener('pagehide',()=>music.stop());
}

function draw() {
  if (!game.started) return;
  background('#090b0a');
  game.drawMuseum();
  if (!game.paused && !game.ended && !document.hidden) game.step(readInput(),deltaTime);
  game.render();
  game.drawOverlay();
  if (frameCount % 6 === 0) updateUI();
}

function windowResized() {
  // CSS adapte le canvas au viewport sans changer les positions du monde.
}

function keyPressed(event) {
  if (!game) return;
  if (!game.started) return;
  // Le dialogue garde ses propres touches (Tab, Entrée, Échap).
  if (restartRequest) return;
  if (keyCode === 114) { game.debug = !game.debug; UI.debugToggle.checked = game.debug; return false; }
  if (key === 'p' || key === 'P' || keyCode===27) { togglePause(); return false; }
  if (game.ended || game.paused) return;
  if (key === 'r' || key === 'R') { if(!event?.repeat) requestRestart(); return false; }
  if (key === 'e' || key === 'E') game.trySteal();
  if (key === 'f' || key === 'F') game.throwDecoy();
}

function readInput() {
  return {
    x: clampValue((keyIsDown(68) || keyIsDown(39) ? 1 : 0) - (keyIsDown(65) || keyIsDown(81) || keyIsDown(37) ? 1 : 0) + (touchControls ? touchControls.x : 0), -1, 1),
    y: clampValue((keyIsDown(83) || keyIsDown(40) ? 1 : 0) - (keyIsDown(87) || keyIsDown(90) || keyIsDown(38) ? 1 : 0) + (touchControls ? touchControls.y : 0), -1, 1),
    sprint: keyIsDown(SHIFT) || Boolean(touchControls && touchControls.sprint),
    crouch: keyIsDown(67) || Boolean(touchControls && touchControls.crouch)
  };
}

function cacheUI() {
  for (const id of ['missionLabel','nightLabel','lootCounter','lootProgress','suspicionValue','suspicionBar','staminaValue','staminaBar','alarmState','guardCount','generationValue','fitnessValue','behaviorList','visionSlider','visionOut','speedSlider','speedOut','debugToggle','briefing','endScreen','endKicker','endTitle','endText','startButton','nextNightButton','resetLearning','coverValue','decoyValue','upgradeStatus','homeLevelNumber','homeLevelName','homeLevelDescription','levelList','currentLevelLabel','visibilityValue','menuButton','endMenuButton','compactLevel','compactLoot','compactStamina','compactCover','compactAlert','compactDecoys','detailsButton','closeDetailsButton','musicButton','musicGameButton']) UI[id] = document.getElementById(id);
}

function bindUI() {
  bindRestartConfirmation();
  for(const id of ['volumeSlider','volumeGameSlider']) document.getElementById(id).addEventListener('input',event=>{
    music.setVolume(Number(event.target.value)/100); updateVolumeControls();
  });
  document.getElementById('trainingButton').addEventListener('click',()=>{
    void music.start(); game.startTraining();
    UI.briefing.classList.add('hidden'); document.body.classList.remove('menu-open');
  });
  for(const id of ['pauseButton','resumeButton']) document.getElementById(id).addEventListener('click',()=>togglePause());
  document.getElementById('restartButton').addEventListener('click',requestRestart);
  document.getElementById('pauseMenuButton').addEventListener('click',showHome);
  window.addEventListener('blur',()=>{if(game.started&&!game.ended) togglePause(true);});
  for (const button of [UI.musicButton,UI.musicGameButton]) button.addEventListener('click',async()=>{
    const pending=music.setEnabled(!music.enabled);
    updateMusicButtons();
    await pending;
  });
  UI.detailsButton.addEventListener('click',()=>setDetails(!document.body.classList.contains('details-open')));
  UI.closeDetailsButton.addEventListener('click',()=>setDetails(false));
  UI.startButton.addEventListener('click', () => {
    void music.start();
    game.training=false; game.started = true; game.startNight(false);
    UI.briefing.classList.add('hidden'); document.body.classList.remove('menu-open');
    windowResized();
  });
  for (const button of [UI.menuButton,UI.endMenuButton]) button.addEventListener('click',showHome);
  UI.levelList.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-level]');
    if (button && game.campaign.select(Number(button.dataset.level))) { game.startNight(false); refreshHome(); }
  });
  document.querySelectorAll('[data-difficulty]').forEach(button=>button.addEventListener('click',()=>{
    if(game.campaign.setDifficulty(button.dataset.difficulty)) { game.startNight(false);refreshHome(); }
  }));
  UI.nextNightButton.addEventListener('click', () => {
    game.nextNight();
  });
  document.querySelectorAll('[data-upgrade]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!game.selectUpgrade(button.dataset.upgrade)) return;
      button.classList.add('selected');
      document.querySelectorAll('[data-upgrade]').forEach((item) => { item.disabled=true; });
      UI.upgradeStatus.textContent = 'Amélioration acquise. Elle sera active dès la prochaine nuit.';
      UI.nextNightButton.disabled=false;
    });
  });
  UI.debugToggle.addEventListener('input', () => { game.debug = UI.debugToggle.checked; });
  UI.visionSlider.addEventListener('input', () => {
    UI.visionOut.value = UI.visionSlider.value;
    game.guards.forEach((guard) => { guard.visionRadius = Number(UI.visionSlider.value); });
  });
  UI.speedSlider.addEventListener('input', () => {
    UI.speedOut.value = `${Number(UI.speedSlider.value).toFixed(1)}×`;
    game.timeScale = Number(UI.speedSlider.value);
  });
  UI.resetLearning.addEventListener('click', () => {
    game.evolution.reset(); game.startNight(false); updateUI();
  });
}

function bindRestartConfirmation() {
  const dialog=document.getElementById('restartConfirm');
  // Traiter Échap avant le raccourci global de pause de p5.js.
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    event.preventDefault(); event.stopPropagation();
    dialog.close('cancel');
  });
  dialog.addEventListener('close',()=>{
    const request=restartRequest;
    restartRequest=null;
    if(!request || !game.started || game.ended) return;
    if(dialog.returnValue==='restart') {
      game.startNight(false);
      if(document.hidden) togglePause(true);
    } else {
      togglePause(request.wasPaused || document.hidden);
    }
  });
}

function requestRestart() {
  if(!game || !game.started || game.ended || restartRequest) return;
  const dialog=document.getElementById('restartConfirm');
  restartRequest={wasPaused:game.paused};
  togglePause(true);
  dialog.returnValue='cancel';
  dialog.showModal();
  document.getElementById('cancelRestartButton').focus();
}

function updateMusicButtons() {
  for (const button of [UI.musicButton,UI.musicGameButton]) {
    button.textContent=music.enabled ? '♫ MUSIQUE : ACTIVÉE' : '♫ MUSIQUE : COUPÉE';
    button.setAttribute('aria-pressed',String(music.enabled));
  }
  updateVolumeControls();
}

function updateVolumeControls() {
  for(const prefix of ['volume','volumeGame']) {
    document.getElementById(prefix+'Slider').value=Math.round(music.volume*100);
    document.getElementById(prefix+'Out').textContent=Math.round(music.volume*100)+'%';
  }
}

function setDetails(open) {
  if (open) { game.pausedBeforeDetails=game.paused; game.paused=true; }
  else if (document.body.classList.contains('details-open')) game.paused=Boolean(game.pausedBeforeDetails);
  document.body.classList.toggle('details-open',open);
  UI.detailsButton.setAttribute('aria-expanded',String(open));
}

function togglePause(value) {
  if(!game.started || game.ended) return;
  if(document.body.classList.contains('details-open')) setDetails(false);
  game.paused=value===undefined ? !game.paused : Boolean(value);
  game.timeAccumulator=0;
  if(touchControls) touchControls.resetModes();
  document.getElementById('pauseScreen').classList.toggle('hidden',!game.paused);
  if(game.paused) document.getElementById('resumeButton').focus();
  updateUI();
}
window.toggleGamePause=togglePause;

function showHome() {
  setDetails(false);
  game.started=false; game.paused=false; game.training=false;
  document.getElementById('pauseScreen').classList.add('hidden');
  if (touchControls) touchControls.resetModes();
  UI.endScreen.classList.add('hidden'); UI.briefing.classList.remove('hidden');
  document.body.classList.add('menu-open'); refreshHome(); updateUI();
}

function refreshHome() {
  const campaign=game.campaign;
  UI.homeLevelNumber.textContent=`NIVEAU ${String(campaign.current+1).padStart(2,'0')} / ${String(HEIST_LEVELS.length).padStart(2,'0')}`;
  UI.homeLevelName.textContent=campaign.level.name;
  UI.homeLevelDescription.textContent=`${campaign.level.description} Objectif : ${campaign.level.loot.length} reliques à voler.`;
  const map=campaign.level;
  const record=campaign.records[`${campaign.difficulty}:${campaign.current}`];
  const stars=campaign.stars[`${campaign.difficulty}:${campaign.current}`] || 0;
  const total=HEIST_LEVELS.reduce((sum,_,i)=>sum+(campaign.stars[`${campaign.difficulty}:${i}`] || 0),0);
  const homeRating=document.getElementById('homeRating');
  homeRating.textContent=`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · ${total}/15 ★ · ${record ? 'Record '+record+' s · ' : ''}Cible ${campaign.parSeconds} s`;
  homeRating.title='Une étoile pour l’extraction, une sans détection, une pour le temps cible. Meilleurs résultats conservés par difficulté.';
  document.getElementById('homeMap').innerHTML=`<svg viewBox="0 0 240 180" role="img" aria-label="Plan : ${map.district}"><rect width="240" height="180" fill="${map.theme.floor[0]}"/>${map.shadow.map(([x,y,w,h])=>`<rect x="${x*240}" y="${y*180}" width="${w*240}" height="${h*180}" fill="#080d20"/>`).join('')}${map.obstacles.map(([x,y,w,h])=>`<rect x="${x*240}" y="${y*180}" width="${w*240}" height="${h*180}" fill="${map.theme.accent}" opacity=".5"/>`).join('')}${map.loot.map(([x,y])=>`<circle cx="${x*240}" cy="${y*180}" r="3" fill="#ffd084"/>`).join('')}<circle cx="17" cy="151" r="4" fill="#a6ffe0"/><path d="M228 85v14" stroke="#a6ffe0" stroke-width="5"/></svg><span>${map.district}</span><small>${record ? `RECORD · ${record}s` : '◆ RELIQUES · ● ENTRÉE · ▌SORTIE'}</small>`;
  document.querySelectorAll('[data-difficulty]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.difficulty===campaign.difficulty)));
  UI.levelList.innerHTML=HEIST_LEVELS.map((level,index)=>{
    const score=campaign.stars[`${campaign.difficulty}:${index}`] || 0;
    return `<button type="button" data-level="${index}" aria-label="Niveau ${index+1} : ${level.name}${index>campaign.unlocked ? ', verrouillé' : ', '+score+' étoiles sur 3'}" aria-pressed="${index===campaign.current}" ${index>campaign.unlocked ? 'disabled' : ''}><span>${String(index+1).padStart(2,'0')}</span><small>${index>campaign.unlocked ? 'VERROUILLÉ' : score ? '★'.repeat(score)+'☆'.repeat(3-score) : campaign.completed.includes(index) ? 'RÉUSSI ✓' : index===campaign.current ? 'ACTUEL' : 'OUVERT'}</small></button>`;
  }).join('');
}

function updateUI() {
  if (!game) return;
  const toast=document.getElementById('missionToast');
  const escape=game.finalEscapeFrames>0;
  toast.textContent=escape ? `SAPHIR VOLÉ · SORTIE → · ${Math.ceil(game.finalEscapeFrames/60)} s AVANT VERROUILLAGE` : game.notice || '';
  toast.classList.toggle('visible',(escape || game.noticeFrames>0) && !game.ended && !game.paused && !(game.detectionFrames>0));
  toast.classList.toggle('final-escape',escape);
  const detected=game.started && game.detectionFrames>0 && !game.ended && !game.paused;
  const detectionAlert=document.getElementById('detectionAlert');
  detectionAlert.hidden=!detected;
  detectionAlert.textContent=detected ? '! VOUS ÊTES REPÉRÉ !' : '';
  detectionAlert.classList.toggle('visible',detected);
  document.body.classList.toggle('player-detected',detected);
  document.body.classList.toggle('mission-ended',game.ended);
  UI.missionLabel.textContent = !game.started ? 'ACCUEIL' : game.ended ? 'RAPPORT' : game.paused ? 'PAUSE' : game.alarm ? 'ALARME' : 'INFILTRATION';
  UI.currentLevelLabel.textContent=game.training ? 'ENTRAÎNEMENT · SANS GARDES' : `NIVEAU ${game.campaign.current+1} · ${game.campaign.settings.label} · ${game.campaign.level.name}`;
  UI.visibilityValue.textContent=`${Math.round(game.player.visibilityFactor*100)}%`;
  UI.nightLabel.textContent = `NUIT ${String(game.evolution.generation).padStart(2, '0')}`;
  UI.lootCounter.textContent = `${game.player.loot} / ${game.artworks.length}`;
  UI.lootProgress.style.width = `${game.player.loot / game.artworks.length * 100}%`;
  UI.suspicionValue.textContent = `${Math.round(game.suspicion)}%`;
  UI.suspicionBar.style.width = `${game.suspicion}%`;
  const staminaPercent = game.player.stamina / game.player.staminaCapacity * 100;
  UI.staminaValue.textContent = `${Math.round(staminaPercent)}%`;
  UI.staminaBar.style.width = `${staminaPercent}%`;
  UI.coverValue.textContent = game.player.inShadow ? (game.player.crouching ? 'DISSIMULÉ' : 'OMBRE') : game.player.crouching ? 'ACCROUPI' : 'EXPOSÉ';
  UI.decoyValue.textContent = game.player.decoys;
  UI.compactLevel.textContent=game.training ? 'ENTRAÎNEMENT' : `NIV. ${game.campaign.current+1} · ${game.campaign.settings.label.toUpperCase()}`;
  UI.compactLoot.textContent=`◆ ${game.player.loot}/${game.artworks.length}`;
  UI.compactStamina.textContent=`ÉNERGIE ${Math.round(staminaPercent)}%`;
  UI.compactStamina.dataset.empty=String(game.player.sprintExhausted);
  if(game.player.sprintExhausted) UI.compactStamina.textContent=`RECHARGE ${Math.round(staminaPercent)}%`;
  document.getElementById('touchSprint').textContent=game.player.sprintExhausted ? 'RECHARGE' : 'SPRINT';
  UI.compactCover.textContent=`${UI.coverValue.textContent} ${Math.round(game.player.visibilityFactor*100)}%`;
  UI.compactAlert.textContent=game.alarm ? '⚠ ALARME' : `ALERTE ${Math.round(game.suspicion)}%`;
  if(escape) UI.compactAlert.textContent=`FUITE ${Math.ceil(game.finalEscapeFrames/60)} s`;
  UI.compactAlert.dataset.alert=String(game.alarm);
  UI.compactDecoys.textContent=`LEURRES ${game.player.decoys}`;
  const alarmLabel = game.alarm ? 'ALERTE ROUGE' : game.suspicion > 0 ? 'SUSPICION' : 'CALME';
  UI.alarmState.textContent = alarmLabel;
  UI.alarmState.dataset.state = game.alarm ? 'alert' : game.suspicion > 0 ? 'search' : 'calm';
  UI.guardCount.textContent = game.guards.length;
  UI.generationValue.textContent = String(game.evolution.generation).padStart(2, '0');
  UI.fitnessValue.textContent = Math.round(game.evolution.bestFitness);
  if(!document.body.classList.contains('details-open')) return;
  const names = new Set();
  [...game.guards, ...game.dogs, ...game.rivals].forEach((agent) => agent.behaviorManager.activeNames().forEach((name) => names.add(name)));
  const behaviorMarkup = ['path following','pursue','flee','evade zone avant','obstacle avoidance','wander','separation','alignment','cohesion','leader following','interception neuronale','enquête sonore']
    .map((name) => `<span class="behavior-chip ${names.has(name) ? 'active' : ''}">${name.toUpperCase()}</span>`).join('');
  if(UI.behaviorList.dataset.markup!==behaviorMarkup) { UI.behaviorList.innerHTML=behaviorMarkup; UI.behaviorList.dataset.markup=behaviorMarkup; }
}

class InfiltrationGame {
  constructor(w, h) {
    this.bounds = { x: 18, y: 18, w: w - 36, h: h - 36 };
    this.evolution = new NeuroEvolutionManager(10);
    this.upgrades = new HeistUpgrades();
    this.campaign = new HeistCampaign();
    this.training=false;
    this.reducedMotion=typeof window.matchMedia==='function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onLoot=()=>{ if (music) void music.playLoot(); };
    this.started = false; this.ended = false; this.paused = false; this.debug = false;
    this.timeScale = 1; this.timeAccumulator = 0; this.pathHistory = [];
    this.startNight(false);
  }

  resize(w, h) {
    this.bounds = { x: 18, y: 18, w: w - 36, h: h - 36 };
    this.startNight(false);
  }

  point(nx, ny) { return createVector(this.bounds.x + this.bounds.w * nx, this.bounds.y + this.bounds.h * ny); }

  startTraining() { this.training=true; this.startNight(false); this.started=true; }

  startNight(showBriefing = false) {
    if (UI.endScreen) UI.endScreen.classList.add('hidden');
    if(typeof document!=='undefined') {
      document.getElementById('pauseScreen')?.classList.add('hidden');
      document.querySelector('.optional-upgrades')?.removeAttribute('open');
    }
    this.upgradeChosen=false; this.decoys=[]; this.decoySerial=0; this.decoyCooldown=0; this.timeAccumulator=0;
    this.effects=[]; this.detectionFrames=0; this.wasDetected=false; this.emptyStaminaNotified=false; this.exitWarning=false;
    this.detectionEpisodes=0; this.finalEscapeFrames=0; this.finalEscape=false; this.runRating=null;
    this.ended = false; this.paused = false; this.alarm = false; this.alarmTimer = 0; this.alarmTarget = null;
    this.won=false;
    this.staticBackground=null;
    this.suspicion = 0; this.reinforcements = 0; this.elapsed = 0; this.pathHistory = [];
    this.obstacles = this.createObstacles();
    this.navigation=new MuseumNavigation(this.obstacles,this.bounds);
    const level=this.training ? TRAINING_LEVEL : this.campaign.mission;
    this.shadows = level.shadow
      .map(([x,y,w,h]) => new ShadowZone(this.bounds.x+this.bounds.w*x,this.bounds.y+this.bounds.h*y,this.bounds.w*w,this.bounds.h*h));
    this.artworks = level.loot.map(([x,y],index)=>new Artwork(...this.xy(x,y),['Masque mérinide','Saphir d’Atlas','Codex de Fès','Astrolabe d’or','Couronne de jade','Amulette de cuivre','Cristal de lune'][index]));
    if(this.isFinalMission) {
      this.artworks[1].title='Cristal de lune';
      const sapphire=this.artworks[this.artworks.length-1];
      sapphire.title='Saphir d’Atlas'; sapphire.isSapphire=true; sapphire.locked=true;
    }
    this.player = new Thief(...this.xy(.07,.84));
    this.upgrades.apply(this.player);
    this.notice=`NIVEAU ${this.campaign.current+1} · ${level.district} — ${this.artworks.length} reliques, puis la sortie →`;
    this.noticeFrames=240;
    if(this.isFinalMission) { this.notice='FINALE · Six reliques, puis le Saphir bleu. Préparez votre fuite avant son vol !'; this.noticeFrames=360; }
    if(this.training) { this.notice='1/3 · Approchez une relique dorée, puis E / VOLER. Ici, aucun ennemi !'; this.noticeFrames=900; }
    this.player.prepareInput({x:0,y:0},this.shadows,this.campaign.settings.shadow);
    if (touchControls) touchControls.resetModes();
    this.player.vel.set(1, 0);
    const patrols = level.patrols.map(path=>path.map(([x,y])=>this.point(x,y)));
    this.guards = patrols.map((path, index) => new Guard(path[0].x, path[0].y, path, this.evolution.brainFor(index), index));
    if(!this.training) {
    const chiefPath = level.patrols[1].map(([x,y]) => this.point(x,y));
    const chief = new SecurityChief(chiefPath[0].x, chiefPath[0].y, chiefPath, this.evolution.brainFor(4), 4);
    const leftFollower = new SecurityFollower(chief.pos.x - 25, chief.pos.y + 25, chief, -1, this.evolution.brainFor(5), 5);
    const rightFollower = new SecurityFollower(chief.pos.x - 25, chief.pos.y - 25, chief, 1, this.evolution.brainFor(6), 6);
    this.guards.push(chief, leftFollower, rightFollower);
    }
    this.dogs = Array.from({ length: level.dogs }, (_, index) => {
      const patrol=patrols[index%patrols.length];
      const lengths=patrol.map((p,i)=>p.dist(patrol[(i+1)%patrol.length]));
      let distance=lengths.reduce((sum,n)=>sum+n,0)*(.16+Math.floor(index/4)*.5);
      let segment=0; while(distance>lengths[segment] && segment<lengths.length-1) distance-=lengths[segment++];
      const start=patrol[segment],end=patrol[(segment+1)%patrol.length];
      const position=start.copy().add(p5.Vector.sub(end,start).mult(distance/Math.max(1,lengths[segment])));
      const dog=new Dog(position.x,position.y); dog.patrol=patrol; dog.pathIndex=(segment+1)%patrol.length;
      return dog;
    });
    this.rivals = this.training ? [] : [new RivalThief(...this.xy(.92,.18), '#5ecbf2'), new RivalThief(...this.xy(.92,.83), '#c88cff')];
    // Évite toute apparition dans un meuble, y compris pour les formations du chef.
    [...this.guards,...this.dogs,...this.rivals].forEach(agent=>agent.resolveCollisions(this.obstacles,this.bounds));
    this.guards.forEach((guard) => this.configureGuard(guard));
    this.dogs.forEach(dog=>{dog.maxSpeed=3.35*this.campaign.settings.speed;});
    if (UI.visionSlider) { UI.visionSlider.value=level.vision; UI.visionOut.value=level.vision; }
    if (showBriefing) UI.briefing.classList.remove('hidden');
    updateUI();
  }

  xy(x, y) { const point = this.point(x, y); return [point.x, point.y]; }
  get isFinalMission() { return !this.training && this.campaign.current===HEIST_LEVELS.length-1; }

  createObstacles() {
    const b = this.bounds;
    const make = (x,y,w,h,type) => new MuseumObstacle(b.x+b.w*x,b.y+b.h*y,b.w*w,b.h*h,type);
    return (this.training ? TRAINING_LEVEL : this.campaign.level).obstacles.map(([x,y,w,h,type='vitrine'])=>make(x,y,w,h,type));
  }

  context(input = {x:0,y:0,sprint:false}) {
    return {
      input, player: this.player, guards: this.guards, dogs: this.dogs, rivals: this.rivals,
      artworks: this.artworks, obstacles: this.obstacles, bounds: this.bounds, decoys:this.decoys,
      navigation:this.navigation,
      alarm: this.alarm, alarmTarget: this.alarmTarget,
      raiseAlarm: (guard) => this.raiseAlarm(guard)
    };
  }

  configureGuard(guard) {
    guard.visionRadius=this.campaign.mission.vision;
    guard.maxSpeed=this.campaign.mission.guardSpeed+(guard.kind==='chef' ? .15 : 0);
    guard.detectionMultiplier=this.campaign.settings.detection;
  }

  step(input,elapsedMs=1000/60) {
    const elapsed=Number.isFinite(elapsedMs) ? clampValue(elapsedMs,0,100) : 1000/60;
    this.timeAccumulator=Math.min(5,this.timeAccumulator+elapsed/(1000/60)*this.timeScale);
    while (this.timeAccumulator >= 1-1e-9) {
      this.stepOnce(input);
      this.timeAccumulator -= 1;
      if (this.ended) break;
    }
  }

  stepOnce(input) {
    this.elapsed++;
    if(this.noticeFrames>0) this.noticeFrames--;
    if(this.detectionFrames>0) this.detectionFrames--;
    this.effects=this.effects.filter(effect=>--effect.life>0);
    this.player.prepareInput(input,this.shadows,this.campaign.settings.shadow);
    if (this.decoyCooldown>0) this.decoyCooldown--;
    this.decoys.forEach((decoy) => decoy.step());
    this.decoys=this.decoys.filter((decoy) => decoy.remaining>0);
    const context = this.context(input);
    this.player.applyManagedBehaviors(context);
    this.player.update();
    this.player.resolveCollisions(this.obstacles,this.bounds);
    // Évaluer la visibilité à la position atteinte, pas au point de départ.
    this.player.refreshVisibility(input,this.shadows,this.campaign.settings.shadow);
    if(this.player.sprintExhausted && !this.emptyStaminaNotified) {
      this.notice='ÉNERGIE ÉPUISÉE · Marchez pour récupérer avant de sprinter.'; this.noticeFrames=180; this.emptyStaminaNotified=true;
    } else if(!this.player.sprintExhausted) this.emptyStaminaNotified=false;
    this.guards.forEach((guard) => guard.applyAI(context));
    this.dogs.forEach((dog) => dog.applyAI(context));
    this.rivals.forEach((rival) => rival.applyAI(context));
    const detected=this.guards.some(g=>g.state==='POURSUITE') || this.dogs.some(d=>d.state==='POURSUITE' && d.trackingPlayer);
    if(detected && !this.wasDetected) { this.detectionFrames=120; this.detectionEpisodes++; }
    this.wasDetected=detected;
    const agents = [...this.guards, ...this.dogs, ...this.rivals];
    agents.forEach((agent) => { agent.update(); agent.resolveCollisions(this.obstacles, this.bounds); });
    if (this.debug && this.elapsed % 15 === 0) this.pathHistory.push(this.player.pos.copy());
    if (this.pathHistory.length > 260) this.pathHistory.shift();
    this.updateAlarm();
    this.checkCapture();
    this.checkExtraction();
    if(this.finalEscape && !this.ended && --this.finalEscapeFrames<=0) {
      this.finish(false,'Le musée est verrouillé','Le temps de fuite est écoulé. Préparez votre chemin vers la sortie avant de voler le Saphir d’Atlas.');
    }
  }

  raiseAlarm(guard) {
    this.suspicion = clampValue(this.suspicion + 1.1*this.player.visibilityFactor, 0, 100);
    this.alarmTarget = this.player.pos.copy();
    if (this.suspicion >= 32) { this.alarm = true; this.alarmTimer = Math.max(this.alarmTimer, this.campaign.settings.alarmFrames); }
    if (guard) guard.alertFrames++;
  }

  updateAlarm() {
    const visible = this.guards.some((guard) => guard.state === 'POURSUITE');
    this.suspicion = clampValue(this.suspicion + (visible ? 0.12 : -0.12), 0, 100);
    if(this.finalEscape) { this.alarm=true; this.alarmTimer=Math.max(this.alarmTimer,180); }
    if (this.alarm && !visible && !this.finalEscape) this.alarmTimer--;
    if (this.alarmTimer <= 0 && this.suspicion < 12) { this.alarm = false; this.alarmTarget = null; }
    if (this.alarm && this.alarmTimer > 100 && this.reinforcements < this.campaign.settings.reinforcements && this.elapsed % 210 === 0) this.callReinforcement();
  }

  callReinforcement() {
    const index = this.guards.length;
    const entry = this.point(.96, .5 + this.reinforcements * .09);
    const path = [entry, this.point(.74,.5), this.alarmTarget || this.point(.5,.5)];
    const guard = new Guard(entry.x, entry.y, path, this.evolution.brainFor(index), index);
    guard.state = 'RENFORT'; guard.lastSeen = (this.alarmTarget || this.player.pos).copy();
    this.configureGuard(guard);
    if(UI.visionSlider) guard.visionRadius=Number(UI.visionSlider.value);
    this.guards.push(guard); this.reinforcements++;
  }

  trySteal() {
    if (!this.started || this.ended || this.paused) return;
    const target = this.artworks.find((artwork) => !artwork.collected && artwork.pos.dist(this.player.pos) < 38 && !this.obstacles.some(o=>segmentIntersectsRect(this.player.pos,artwork.pos,o,0)));
    if (!target) return;
    if(target.locked) {
      this.notice='SAPHIR PROTÉGÉ · Récupérez d’abord les six autres reliques.'; this.noticeFrames=180; return;
    }
    target.collected = true; this.player.loot++;
    this.effects.push({pos:target.pos.copy(),life:45});
    if(!this.training) this.suspicion = clampValue(this.suspicion + 8, 0, 100);
    this.onLoot();
    this.notice=this.player.loot===this.artworks.length ? 'TOUTES LES RELIQUES ! Rejoignez la sortie lumineuse →' : `RELIQUE RÉCUPÉRÉE · ${this.player.loot}/${this.artworks.length}`;
    this.noticeFrames=180;
    if(this.isFinalMission) {
      const sapphire=this.artworks.find(item=>item.isSapphire);
      if(this.player.loot===this.artworks.length-1) {
        sapphire.locked=false;
        this.notice='SAPHIR LIBÉRÉ ! Préparez votre fuite : son vol déclenchera l’alarme.'; this.noticeFrames=300;
      }
      if(target.isSapphire) this.beginFinalEscape(target.pos);
    }
    if(this.training) {
      this.notice=this.player.loot===this.artworks.length ? '3/3 · Butin complet ! Rejoignez maintenant la sortie lumineuse →' : '2/3 · Essayez l’ombre, le sprint et un leurre (F), puis récupérez la seconde relique.';
      this.noticeFrames=900;
    }
  }

  beginFinalEscape(position) {
    if(!this.isFinalMission || this.finalEscape) return;
    this.finalEscape=true;
    this.finalEscapeFrames=({easy:140,normal:110,hard:90}[this.campaign.difficulty])*60;
    this.alarm=true; this.suspicion=100; this.alarmTimer=this.finalEscapeFrames;
    // La sécurité connaît le lieu du vol, pas la position future du joueur caché.
    this.alarmTarget=position.copy();
    this.guards.forEach(guard=>{
      guard.state='RENFORT'; guard.lastSeen=position.copy();
      guard.speak('Saphir volé !',180,true);
    });
    if(this.reinforcements<this.campaign.settings.reinforcements) this.callReinforcement();
    this.notice='SAPHIR VOLÉ ! Alarme permanente. Rejoignez la sortie avant le verrouillage !'; this.noticeFrames=300;
    updateUI();
  }

  throwDecoy() {
    if (!this.started || this.ended || this.paused || this.player.decoys<=0 || this.decoyCooldown>0) return false;
    const heading=this.player.vel.copy();
    if (heading.mag()<.15) heading.set(1,0);
    heading.normalize();
    let landing=this.player.pos.copy();
    // Arrêter le lancer avant une vitrine, sans traverser les obstacles.
    for (let distance=8;distance<=110;distance+=4) {
      const candidate=this.player.pos.copy().add(heading.copy().mult(distance));
      const b=this.bounds;
      if (candidate.x<b.x+10 || candidate.x>b.x+b.w-10 || candidate.y<b.y+10 || candidate.y>b.y+b.h-10 || this.obstacles.some((o)=>o.containsPoint(candidate,6))) break;
      landing=candidate;
    }
    this.decoys.push(new SoundDecoy(this.player.pos.x,this.player.pos.y,landing,++this.decoySerial));
    this.player.decoys--; this.decoyCooldown=30; updateUI();
    return true;
  }

  checkCapture() {
    if (this.player.invulnerableFrames > 0) this.player.invulnerableFrames--;
    const captor = [...this.guards, ...this.dogs].find((agent) => agent.pos.dist(this.player.pos) < agent.r + this.player.r + 3 && !this.obstacles.some(o=>segmentIntersectsRect(agent.pos,this.player.pos,o,0)));
    if (captor && this.player.invulnerableFrames <= 0) this.finish(false, 'Vous avez été intercepté', 'Réessayez par un autre passage. Les ombres et les leurres vous aideront à déjouer la sécurité.');
  }

  checkExtraction() {
    const exit = this.point(.95,.51);
    const distance=this.player.pos.dist(exit);
    if(distance<28 && this.player.loot<this.artworks.length && !this.exitWarning) {
      const missing=this.artworks.length-this.player.loot;
      this.notice=`SORTIE VERROUILLÉE · Il manque ${missing} relique${missing>1 ? 's' : ''}.`; this.noticeFrames=180; this.exitWarning=true;
    } else if(distance>40) this.exitWarning=false;
    if (this.player.loot === this.artworks.length && this.player.pos.dist(exit) < 28) {
      this.finish(true, this.isFinalMission ? 'Le Saphir est à vous !' : 'Extraction réussie', this.isFinalMission ? `Les 7 reliques sont sécurisées, dont le Saphir d’Atlas. Vous vous êtes échappé avant le verrouillage. Campagne accomplie !` : `Les ${this.artworks.length} reliques sont sécurisées en ${Math.round(this.elapsed / 60)} secondes. La sécurité évolue avant votre prochaine tentative.`);
    }
  }

  recordOutcome(success) {
    if(this.training) return;
    if(success) {
      const seconds=Math.max(1,Math.ceil(this.elapsed/60));
      this.runRating=this.campaign.rating(seconds,this.detectionEpisodes);
      this.campaign.complete(seconds,this.runRating.stars);
    }
    this.guards.forEach((guard) => {
      const distanceScore = Math.max(0, 180 - guard.pos.dist(this.player.pos));
      const fitness = guard.detections * 140 + guard.alertFrames * .12 + distanceScore + (success ? 0 : 220);
      this.evolution.setFitness(guard.genomeIndex, fitness);
    });
  }

  finish(success, title, text) {
    if (this.ended) return;
    this.ended = true;
    this.won=success;
    this.recordOutcome(success);
    UI.endKicker.textContent = success ? 'MISSION ACCOMPLIE' : 'MISSION COMPROMISE';
    UI.endTitle.textContent = title; UI.endText.textContent = text;
    if(this.training) { UI.endKicker.textContent='ENTRAÎNEMENT TERMINÉ'; UI.endTitle.textContent='Vous êtes prêt !'; UI.endText.textContent='Vous avez récupéré les deux reliques et trouvé la sortie. La campagne vous attend.'; }
    if(typeof document!=='undefined') {
      const stats=document.getElementById('endStats');
      const rating=document.getElementById('endRating');
      if(rating) {
        rating.hidden=this.training || !success;
        rating.replaceChildren();
        if(!rating.hidden) {
          const score=this.runRating;
          const stars=document.createElement('strong');
          stars.textContent='★'.repeat(score.stars)+'☆'.repeat(3-score.stars);
          stars.setAttribute('aria-label',score.stars+' étoiles sur 3');
          const criteria=document.createElement('small');
          criteria.textContent=`✓ Extraction · ${score.stealth ? '✓' : '—'} Sans détection · ${score.swift ? '✓' : '—'} Temps ≤ ${score.par} s`;
          rating.append(stars,criteria);
        }
      }
      if(stats) stats.textContent=`${this.training ? 'ENTRAÎNEMENT' : 'NIVEAU '+(this.campaign.current+1)+' · '+this.campaign.settings.label.toUpperCase()} · ${Math.floor(this.elapsed/3600)}:${String(Math.floor(this.elapsed/60)%60).padStart(2,'0')} · ◆ ${this.player.loot}/${this.artworks.length}`;
      document.querySelector('.optional-upgrades')?.removeAttribute('open');
      document.querySelector('.optional-upgrades')?.classList.toggle('training-hidden',this.training);
    }
    UI.nextNightButton.textContent=success ? (this.campaign.current===HEIST_LEVELS.length-1 ? 'CAMPAGNE TERMINÉE · REJOUER' : `NIVEAU ${this.campaign.current+2} ▶`) : 'RÉESSAYER CE NIVEAU';
    if(this.training) UI.nextNightButton.textContent='JOUER LA CAMPAGNE ▶';
    UI.upgradeStatus.textContent='Facultatif : choisissez un bonus ou continuez directement.';
    document.querySelectorAll('[data-upgrade]').forEach((button) => {
      button.classList.remove('selected');
      button.disabled=!this.upgrades.available().includes(button.dataset.upgrade);
      const label={stamina:'Endurance',stealth:'Discrétion',decoys:'Leurres'}[button.dataset.upgrade];
      button.setAttribute('aria-label',`${label}, niveau ${this.upgrades.levels[button.dataset.upgrade]}/3`);
    });
    UI.nextNightButton.disabled=false;
    UI.endScreen.classList.remove('hidden'); updateUI();
    UI.nextNightButton.focus?.();
  }

  nextNight() {
    if (!this.ended) return false;
    if(this.training) { this.training=false; this.startNight(false); this.started=true; return true; }
    this.campaign.advance(this.won);
    this.evolution.evolve(); this.startNight(false); this.started = true;
    return true;
  }

  selectUpgrade(key) {
    if (this.training || !this.ended || this.upgradeChosen || !this.upgrades.choose(key)) return false;
    this.upgradeChosen=true;
    return true;
  }

  drawMuseum() {
    if(!this.staticBackground) {
      PixelRenderer.museum(this.bounds,this.training ? TRAINING_LEVEL : this.campaign.level);
      this.shadows.forEach(zone=>zone.show());
      this.obstacles.forEach(item=>PixelRenderer.obstacle(item));
      this.staticBackground=get();
    } else image(this.staticBackground,0,0);
    PixelRenderer.dust(this.bounds);
  }

  render() {
    PixelRenderer.visionHints(this);
    PixelRenderer.extraction(this);
    this.artworks.forEach((item) => PixelRenderer.artwork(item));
    this.decoys.forEach((item) => item.show());
    // Trier par profondeur pour que les personnages se recouvrent naturellement.
    [...this.rivals, ...this.dogs, ...this.guards, this.player]
      .sort((a, b) => a.pos.y - b.pos.y)
      .forEach((item) => PixelRenderer.agent(item));
    PixelRenderer.lootEffects(this.effects,this.reducedMotion);
    PixelRenderer.guardExpressions(this);
  }

  drawOverlay() {
    push();
    noStroke(); fill(0, 0, 0, 28); rect(0,0,width,height);
    if (this.alarm) { fill(255, 30, 18, 15 + sin(frameCount*.12)*10); rect(0,0,width,height); }
    if (this.paused && this.started && !this.ended) {
      fill(9,11,10,210); rect(0,0,width,height); fill('#e9e5d8'); textAlign(CENTER,CENTER); textSize(28); textStyle(BOLD); text('PAUSE',width/2,height/2);
    }
    if (this.debug) {
      noFill(); stroke('#bafc52'); strokeWeight(1);
      beginShape(); this.pathHistory.forEach((p) => vertex(p.x,p.y)); endShape();
    }
    pop();
  }
}

