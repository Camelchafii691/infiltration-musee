class MuseumObstacle extends Vehicle {
  constructor(x, y, w, h, type = 'vitrine') {
    super(x + w / 2, y + h / 2);
    this.x = x; this.y = y; this.w = w; this.h = h; this.type = type;
    this.r = Math.max(w, h) / 2;
  }

  containsPoint(point, padding = 0) {
    return point.x > this.x - padding && point.x < this.x + this.w + padding &&
      point.y > this.y - padding && point.y < this.y + this.h + padding;
  }

  closestPoint(point) {
    return createVector(clampValue(point.x, this.x, this.x + this.w), clampValue(point.y, this.y, this.y + this.h));
  }

  closestEdgePoint(point,padding=0) {
    const choices = [
      createVector(this.x - 1-padding, point.y),
      createVector(this.x + this.w + 1+padding, point.y),
      createVector(point.x, this.y - 1-padding),
      createVector(point.x, this.y + this.h + 1+padding)
    ];
    choices.sort((a, b) => a.dist(point) - b.dist(point));
    return choices[0];
  }

  show() {
    push();
    if (this.type === 'statue') {
      noStroke(); fill('#20251f'); circle(this.pos.x, this.pos.y, Math.min(this.w, this.h));
      stroke('#434a43'); strokeWeight(2); noFill(); circle(this.pos.x, this.pos.y, Math.min(this.w, this.h) - 9);
      line(this.pos.x - 8, this.pos.y, this.pos.x + 8, this.pos.y);
    } else {
      fill(20, 27, 23, 235); stroke('#3f4b42'); strokeWeight(1); rect(this.x, this.y, this.w, this.h, 3);
      stroke(186, 252, 82, 35); line(this.x + 5, this.y + 5, this.x + this.w - 5, this.y + this.h - 5);
      line(this.x + this.w - 5, this.y + 5, this.x + 5, this.y + this.h - 5);
    }
    pop();
  }
}

class Artwork extends Vehicle {
  constructor(x, y, title) {
    super(x, y); this.title = title; this.collected = false; this.r = 12;
  }
  show() {
    if (this.collected) return;
    push(); translate(this.pos.x, this.pos.y); rotate(PI / 4);
    noFill(); stroke('#f0b94f'); strokeWeight(2); rect(-8, -8, 16, 16);
    fill('#f0b94f'); noStroke(); rect(-3, -3, 6, 6); pop();
    if (window.game && window.game.player.pos.dist(this.pos) < 38) {
      push(); fill('#f0b94f'); noStroke(); textAlign(CENTER); textSize(9); textFont('monospace');
      text('E · VOLER', this.pos.x, this.pos.y - 20); pop();
    }
  }
}

class Thief extends MuseumAgent {
  constructor(x, y) {
    super(x, y, { kind: 'voleur', color: '#bafc52', maxSpeed: 3.25, maxForce: 0.34, radius: 8 });
    this.staminaCapacity = 100; this.stamina = 100; this.loot = 0; this.invulnerableFrames = 0;
    this.walkSpeed = 3.25; this.stealthFactor = 1; this.visibilityFactor = 1;
    this.crouching = false; this.inShadow = false; this.decoys = 2;
    this.sprintExhausted=false;
    // Le joueur choisit sa direction ; les collisions limitent le mouvement.
    // L’évitement autonome reste actif pour les PNJ, pas contre les commandes du joueur.
    this.behaviorManager.add('contrôle', (ctx) => this.controlSteering(ctx.input), 1, 5);
  }
  controlSteering(input) {
    const desired = createVector(input.x, input.y);
    if (desired.magSq() === 0) return this.vel.copy().mult(-1).limit(this.maxForce);
    desired.setMag(this.maxSpeed * Math.min(1, Math.hypot(input.x, input.y)));
    return desired.sub(this.vel).limit(this.maxForce);
  }
  prepareInput(input, shadows, shadowFactor=.35) {
    this.refreshVisibility(input,shadows,shadowFactor);
    const moving = Math.hypot(input.x,input.y) > 0.05;
    if(this.sprintExhausted && this.stamina>=this.staminaCapacity*.25) this.sprintExhausted=false;
    const sprinting = moving && input.sprint && !this.crouching && !this.sprintExhausted && this.stamina > 1;
    this.maxSpeed = this.walkSpeed * (this.crouching ? 0.48 : sprinting ? 1.58 : 1);
    this.stamina = clampValue(this.stamina + (sprinting ? -.72 : .24), 0, this.staminaCapacity);
    if(sprinting && this.stamina<=1) this.sprintExhausted=true;
  }
  refreshVisibility(input,shadows,shadowFactor=.35) {
    this.inShadow = shadows.some((zone) => zone.contains(this.pos));
    this.crouching = this.inShadow || Boolean(input.crouch);
    // L’accroupissement est automatique dans l’ombre : ne pas compter deux fois
    // cette même cachette, sinon la portée tombe presque au contact du joueur.
    this.visibilityFactor = this.stealthFactor * (this.inShadow ? shadowFactor : this.crouching ? .55 : 1);
  }
  show() {
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
    noStroke(); fill(this.color); triangle(11, 0, -7, -6, -7, 6); fill('#0b0d0c'); circle(1, 0, 3); pop();
    this.showDebug();
  }
}

class Guard extends MuseumAgent {
  constructor(x, y, patrol, brain, genomeIndex = 0) {
    super(x, y, { kind: 'garde', color: '#e9e5d8', maxSpeed: 2.15, maxForce: 0.16, radius: 9 });
    this.patrol = patrol; this.brain = brain; this.genomeIndex = genomeIndex;
    this.state = 'PATROUILLE'; this.visionRadius = 170; this.visionAngle = PI * 0.54;
    this.lastSeen = null; this.searchTimer = 0; this.alertFrames = 0; this.detections = 0;
    this.heardDecoys = new Set(); this.investigation = null; this.investigateTimer = 0;
    this.detectionProgress=0;
    this.facing=0;
    this.detectionMultiplier=1; this.sightGrace=0;
    this.expressionState=this.state; this.speech=''; this.speechFrames=0; this.speechCooldown=0;
  }

  speak(message,frames=120,force=false) {
    if(this.speechCooldown>0 && !force) return;
    this.speech=message; this.speechFrames=frames; this.speechCooldown=240;
  }

  updateExpression() {
    if(this.speechFrames>0) this.speechFrames--;
    if(this.speechCooldown>0) this.speechCooldown--;
    if(this.state!==this.expressionState) {
      const lines={OBSERVATION:'Qui va là ?',POURSUITE:'Halte !',RECHERCHE:'Où est-il ?',ENQUETE:'Un bruit…',RENFORT:'Je couvre la zone',DISTRAIT:'Quelle nuit…',PATROUILLE:'Rien à signaler'};
      // Une identification confirmée remplace immédiatement le doute initial.
      const confirmed=this.state==='POURSUITE' && this.speech==='Qui va là ?';
      if(lines[this.state]) this.speak(lines[this.state],120,confirmed);
      this.expressionState=this.state;
    }
  }

  proximityRadius(target) {
    // À découvert, un passage juste à côté est perceptible même de dos.
    return (target.visibilityFactor ?? 1)>=.7 ? 65 : 30;
  }

  canSee(target, obstacles) {
    const toTarget = p5.Vector.sub(target.pos, this.pos);
    const distance = toTarget.mag();
    const visibility = Number.isFinite(target.visibilityFactor) ? target.visibilityFactor : 1;
    const proximity=this.proximityRadius(target);
    if (distance > Math.max(proximity,this.visionRadius * visibility)) return false;
    // À l'arrêt, garder la dernière orientation au lieu de regarder à droite.
    // L'observation garde les yeux sur le joueur aperçu, même en contournant une vitrine.
    if (this.state==='OBSERVATION' && this.observedPosition) this.facing=Math.atan2(this.observedPosition.y-this.pos.y,this.observedPosition.x-this.pos.x);
    else if(this.state==='POURSUITE' && this.lastSeen) this.facing=Math.atan2(this.lastSeen.y-this.pos.y,this.lastSeen.x-this.pos.x);
    else if (this.vel.magSq()>0.05) this.facing=this.vel.heading();
    const facing = this.facing;
    const difference = Math.abs(atan2(sin(toTarget.heading() - facing), cos(toTarget.heading() - facing)));
    // À portée immédiate, un garde perçoit aussi un intrus derrière lui.
    if (distance>proximity && difference > this.visionAngle / 2 && this.sightGrace<=0) return false;
    return !(obstacles || []).some((obstacle) => segmentIntersectsRect(this.pos, target.pos, obstacle));
  }

  neuralSteering(context) {
    if (!this.brain || !this.lastSeen) return createVector(0, 0);
    const inputs = [
      this.pos.x / context.bounds.w * 2 - 1,
      this.pos.y / context.bounds.h * 2 - 1,
      this.lastSeen.x / context.bounds.w * 2 - 1,
      this.lastSeen.y / context.bounds.h * 2 - 1,
      this.vel.x / this.maxSpeed,
      this.vel.y / this.maxSpeed
    ];
    const output = this.brain.predict(inputs);
    const desired = createVector(output[0], output[1]);
    if (desired.magSq() < 0.01) return desired;
    desired.setMag(this.maxSpeed);
    this.debugData.neural = desired.copy();
    return desired.sub(this.vel).limit(this.maxForce);
  }

  chooseState(context) {
    if (this.sightGrace>0) this.sightGrace--;
    const visible=this.canSee(context.player,context.obstacles);
    const visibility=context.player.visibilityFactor ?? 1;
    const closeThreat=this.pos.dist(context.player.pos)<=this.proximityRadius(context.player);
    const detectionRate=(closeThreat ? .35 : .14*visibility)*this.detectionMultiplier;
    this.detectionProgress=clampValue(this.detectionProgress+(visible ? detectionRate : -.025),0,1);
    if (visible && this.detectionProgress<.999 && this.state!=='POURSUITE') {
      this.state='OBSERVATION';
      this.observedPosition=context.player.pos.copy();
      // Suivi bref de l’intrus aperçu ; portée et obstacles restent vérifiés.
      this.sightGrace=Math.max(this.sightGrace,8);
      return;
    }
    if (visible) {
      this.sightGrace=18;
      if (this.state !== 'POURSUITE') this.detections++;
      this.state = 'POURSUITE'; this.lastSeen = context.player.pos.copy(); this.searchTimer = 420; this.alertFrames++;
      context.raiseAlarm(this);
    } else if (context.alarm && context.alarmTarget) {
      this.state = 'RENFORT'; this.lastSeen = context.alarmTarget.copy();
    } else if (this.hearDecoy(context.decoys || [])) {
      this.state = 'ENQUETE';
    } else if (this.investigateTimer > 0 && this.investigation) {
      this.state = 'ENQUETE'; this.investigateTimer--;
      if (this.investigateTimer === 0) { this.investigation = null; this.lastSeen = null; this.searchTimer = 0; this.state = 'PATROUILLE'; }
    } else if (this.searchTimer > 0 && this.lastSeen) {
      this.state = 'RECHERCHE'; this.searchTimer--;
    } else if (random() < 0.0015) {
      this.state = 'DISTRAIT'; this.searchTimer = 150;
    } else if (this.state === 'DISTRAIT' && this.searchTimer-- <= 0) {
      this.state = 'PATROUILLE';
    } else if (!['DISTRAIT', 'PATROUILLE'].includes(this.state)) {
      this.state = 'PATROUILLE';
    }
  }

  hearDecoy(decoys) {
    const audible = decoys.filter((item) => item.landed && item.remaining>0 && !this.heardDecoys.has(item.id) && this.pos.dist(item.pos)<=item.hearingRadius)
      .sort((a,b) => this.pos.dist(a.pos)-this.pos.dist(b.pos))[0];
    if (!audible) return false;
    this.heardDecoys.add(audible.id);
    this.investigation = audible.pos.copy(); this.investigateTimer = 300;
    return true;
  }

  applyAI(context) {
    this.chooseState(context);
    this.updateExpression();
    this.behaviorManager.clear();
    this.behaviorManager
      .add('obstacle avoidance', () => this.avoidObstacles(context.obstacles, 52), 2.4, 1)
      .add('separation', () => this.separation(context.guards, 34), 0.35, 3)
      .add('boundaries', () => this.keepInBounds(context.bounds, 25), 1.4, 2);
    if (this.state === 'POURSUITE') {
      this.behaviorManager.add('pursue', () => this.pursueEntity(context.player, 18), 1.5, 6);
    } else if (this.state === 'OBSERVATION') {
      this.behaviorManager.add('observation',()=>this.arriveAt(context.player.pos,60,25),.7,6);
    } else if (this.state === 'ENQUETE' && this.investigation) {
      this.behaviorManager.add('enquête sonore', () => this.arriveAt(this.investigation,65,8), 1, 6);
    } else if (['RENFORT', 'RECHERCHE'].includes(this.state) && this.lastSeen) {
      this.behaviorManager.add('arrive', () => this.arriveAt(this.lastSeen, 70, 7), 0.8, 6);
      this.behaviorManager.add('interception neuronale', () => this.neuralSteering(context), 0.15, 8);
    } else if (this.state === 'DISTRAIT') {
      this.behaviorManager.add('wander', () => this.wanderSteering(), 1, 7);
    } else {
      this.behaviorManager.add('path following', () => this.followPath(this.patrol), 1, 7);
      this.behaviorManager.add('mémoire neuronale', () => this.neuralSteering(context), 0.18, 9);
    }
    this.applyManagedBehaviors(context);
  }

  show() {
    if (window.game && window.game.debug) {
      push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
      noStroke(); fill(this.state === 'POURSUITE' ? color(255,96,74,45) : color(240,185,79,24));
      arc(0, 0, this.visionRadius * 2, this.visionRadius * 2, -this.visionAngle / 2, this.visionAngle / 2, PIE); pop();
    }
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
    stroke(this.state === 'POURSUITE' ? '#ff604a' : '#e9e5d8'); strokeWeight(2); fill('#171b18');
    triangle(10, 0, -7, -6, -7, 6); pop();
    if (this.state === 'POURSUITE') { push(); noStroke(); fill('#ff604a'); circle(this.pos.x, this.pos.y - 14, 4); pop(); }
    this.showDebug();
  }
}

class SecurityChief extends Guard {
  constructor(x, y, patrol, brain, genomeIndex) {
    super(x, y, patrol, brain, genomeIndex); this.kind = 'chef'; this.maxSpeed = 2.4; this.maxForce = 0.2;
  }
  show() {
    super.show(); push(); noFill(); stroke('#f0b94f'); strokeWeight(2); circle(this.pos.x, this.pos.y, 23); pop();
  }
}

class SecurityFollower extends Guard {
  constructor(x, y, leader, slot, brain, genomeIndex) {
    super(x, y, [], brain, genomeIndex); this.leader = leader; this.slot = slot; this.kind = 'équipe';
  }
  applyAI(context) {
    this.chooseState(context); this.updateExpression(); this.behaviorManager.clear();
    this.behaviorManager
      .add('obstacle avoidance', () => this.avoidObstacles(context.obstacles, 48), 2.5, 1)
      .add('separation', () => this.separation(context.guards, 32), 0.45, 3)
      .add('boundaries', () => this.keepInBounds(context.bounds, 24), 1.4, 2);
    if (this.state === 'POURSUITE') {
      this.behaviorManager.add('pursue', () => this.pursueEntity(context.player, 16), 1.45, 6);
    } else if (this.state === 'OBSERVATION') {
      this.behaviorManager.add('observation',()=>this.arriveAt(context.player.pos,60,25),.7,6);
    } else if (this.state === 'ENQUETE' && this.investigation) {
      this.behaviorManager.add('enquête sonore', () => this.arriveAt(this.investigation,65,8), 1, 6);
    } else if (['RECHERCHE','RENFORT'].includes(this.state) && this.lastSeen) {
      this.behaviorManager.add('arrive',()=>this.arriveAt(this.lastSeen,70,7),.8,6);
      this.behaviorManager.add('interception neuronale',()=>this.neuralSteering(context),.15,8);
    } else {
      const direction = this.leader.vel.copy();
      if (direction.magSq() < 0.01) direction.set(1, 0);
      const behind = this.leader.pos.copy().sub(direction.setMag(34 + Math.abs(this.slot) * 9));
      behind.add(createVector(-direction.y, direction.x).setMag(this.slot * 17));
      const ahead = this.leader.pos.copy().add(this.leader.vel.copy().setMag(36));
      this.behaviorManager
        .add('leader following', () => this.arriveAt(behind, 65, 8), 1, 7)
        .add('evade zone avant', () => this.evadeEntity({ pos: ahead, vel: this.leader.vel }, 42), 1.35, 4);
    }
    this.applyManagedBehaviors(context);
  }
}

class Dog extends MuseumAgent {
  static nextId=0;
  constructor(x, y) {
    super(x, y, { kind: 'chien', color: '#f0b94f', maxSpeed: 3.35, maxForce: 0.22, radius: 6 });
    this.trackedPosition=null; this.trackFrames=0; this.state='MEUTE';
    this.dogId=Dog.nextId++; this.patrol=[]; this.route=[]; this.routeTimer=0;
  }
  packSeparation(dogs) {
    const force=this.separation(dogs,25);
    for(const other of dogs) if(other!==this && this.pos.dist(other.pos)<.01) {
      const angle=Math.min(this.dogId,other.dogId)*2.399;
      const sign=this.dogId<other.dogId ? -1 : 1;
      force.add(createVector(Math.cos(angle)*sign,Math.sin(angle)*sign).mult(this.maxForce));
    }
    return force.limit(this.maxForce);
  }
  routePoint(goal,navigation) {
    if(!navigation || navigation.clear(this.pos,goal)) {this.route=[];return goal;}
    if(this.routeTimer--<=0 || !this.routeGoal || this.routeGoal.dist(goal)>24 || this.routeNavigation!==navigation || !this.route.length || !navigation.clear(this.pos,this.route[0])) {
      this.route=navigation.route(this.pos,goal); this.routeGoal=goal.copy();
      this.routeNavigation=navigation; this.routeTimer=20;
    }
    while(this.route.length>1 && this.pos.dist(this.route[0])<9 && navigation.clear(this.pos,this.route[1])) this.route.shift();
    return this.route[0] || this.pos;
  }
  applyAI(context) {
    const detectable=target=>this.pos.dist(target.pos)<=Math.max(45,75*(target.visibilityFactor ?? 1)) && !context.obstacles.some(o=>segmentIntersectsRect(this.pos,target.pos,o));
    // Un rival plus proche ne doit pas détourner le chien d’un joueur repéré.
    const nearby=detectable(context.player) ? context.player : [...context.rivals].sort((a,b)=>this.pos.dist(a.pos)-this.pos.dist(b.pos)).find(detectable);
    if(nearby) {
      this.trackedPosition=nearby.pos.copy(); this.trackFrames=90; this.state='POURSUITE';
      this.trackingPlayer=nearby===context.player;
      if(nearby===context.player && context.raiseAlarm) context.raiseAlarm();
    } else if(this.trackFrames>0) { this.trackFrames--; this.state='RECHERCHE'; }
    else { this.trackedPosition=null; this.trackingPlayer=false; this.state='MEUTE'; }
    let goal=nearby ? nearby.pos : this.trackedPosition;
    if(!goal && this.patrol.length) {
      if(this.pos.dist(this.patrol[this.pathIndex])<18) this.pathIndex=(this.pathIndex+1)%this.patrol.length;
      goal=this.patrol[this.pathIndex];
    }
    const waypoint=goal ? this.routePoint(goal,context.navigation) : null;
    const chase=()=>nearby && waypoint===goal ? this.pursueEntity(nearby,8) : waypoint ? this.arriveAt(waypoint,waypoint===goal ? 32 : 18,waypoint===goal ? 4 : 1) : createVector();
    this.behaviorManager.clear();
    this.behaviorManager
      .add('obstacle avoidance', () => this.avoidObstacles(context.obstacles, 16).limit(this.maxForce*.3), 1, 1)
      .add('boundaries', () => this.keepInBounds(context.bounds, 12).limit(this.maxForce*.25), 1, 2)
      .add('separation', () => this.packSeparation(context.dogs), .2, 3)
      .add('pursue', () => nearby || this.trackedPosition ? chase().limit(this.maxForce*.75) : createVector(), 1, 4)
      .add('path following', () => !nearby && !this.trackedPosition ? chase().limit(this.maxForce*.75) : createVector(), 1, 4)
      .add('alignment', () => this.alignment(context.dogs, 58), .12, 7)
      .add('cohesion', () => this.cohesion(context.dogs, 70), .10, 8)
      .add('wander', () => this.wanderSteering(), goal ? .08 : .7, 9);
    this.applyManagedBehaviors(context);
  }
  show() {
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading()); noStroke(); fill(this.color);
    ellipse(0, 0, 13, 8); triangle(6, -4, 11, -7, 9, -1); triangle(-5, -3, -10, -6, -8, 0); pop(); this.showDebug();
  }
}

class RivalThief extends MuseumAgent {
  constructor(x, y, tint) {
    super(x, y, { kind: 'rival', color: tint, maxSpeed: 2.8, maxForce: 0.2, radius: 7 });
  }
  applyAI(context) {
    const guard = [...context.guards, ...context.dogs].sort((a, b) => this.pos.dist(a.pos) - this.pos.dist(b.pos))[0];
    const loot = context.artworks.filter((item) => !item.collected).sort((a, b) => this.pos.dist(a.pos) - this.pos.dist(b.pos))[0];
    this.behaviorManager.clear();
    this.behaviorManager
      .add('obstacle avoidance', () => this.avoidObstacles(context.obstacles, 40), 2.2, 1)
      .add('flee', () => guard ? this.evadeEntity(guard, 125) : createVector(), 1.4, 4)
      .add('separation', () => this.separation(context.rivals, 28), 1, 5)
      .add('seek', () => loot ? this.arriveAt(loot.pos, 65, 12) : this.wanderSteering(), 0.8, 8)
      .add('boundaries', () => this.keepInBounds(context.bounds, 22), 1.3, 2);
    this.applyManagedBehaviors(context);
  }
  show() {
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading()); noStroke(); fill(this.color);
    triangle(9, 0, -6, -5, -6, 5); pop(); this.showDebug();
  }
}

