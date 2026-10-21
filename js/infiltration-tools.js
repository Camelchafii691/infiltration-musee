/** Progression d'une série de nuits : une amélioration gratuite après chaque mission. */
class HeistUpgrades {
  constructor() { this.levels = { stamina: 0, stealth: 0, decoys: 0 }; }
  available() { return Object.keys(this.levels).filter((key) => this.levels[key] < 3); }
  choose(key) {
    if (!Object.hasOwn(this.levels, key) || this.levels[key] >= 3) return false;
    this.levels[key]++;
    return true;
  }
  apply(player) {
    player.staminaCapacity = 100 + this.levels.stamina * 30;
    player.stamina = player.staminaCapacity;
    player.stealthFactor = 1 - this.levels.stealth * 0.1;
    player.decoys = 2 + this.levels.decoys;
  }
}

/** Entité immobile de la scène : elle réduit la visibilité, sans bloquer le passage. */
class ShadowZone extends Vehicle {
  constructor(x, y, w, h) { super(x + w / 2, y + h / 2); this.x=x; this.y=y; this.w=w; this.h=h; }
  contains(point) { return point.x >= this.x && point.x <= this.x+this.w && point.y >= this.y && point.y <= this.y+this.h; }
  show() {
    push(); noStroke(); fill(8,5,25,165); rect(this.x,this.y,this.w,this.h);
    fill('#86749d'); textFont('monospace'); textSize(8); textAlign(LEFT); text('OMBRE',this.x+5,this.y+12); pop();
  }
}

/** Le leurre vole par steering vers son point d'impact, puis émet pendant 3 s. */
class SoundDecoy extends MuseumAgent {
  constructor(x,y,target,id) {
    super(x,y,{kind:'leurre',maxSpeed:6,maxForce:.8,radius:3});
    this.target=target.copy(); this.id=id; this.age=0; this.landed=false; this.remaining=180;
    this.hearingRadius=220;
  }
  step() {
    if (!this.landed) {
      this.applyForce(this.arriveAt(this.target,25,4));
      super.update();
      this.age++;
      if (this.pos.dist(this.target)<6 || this.age>=45) { this.landed=true; this.vel.set(0,0); }
    } else this.remaining--;
  }
  show() {
    push(); noStroke(); fill('#ffd084'); rect(this.pos.x-3,this.pos.y-3,6,6);
    if (this.landed) {
      noFill(); stroke(255,208,132,110); strokeWeight(1);
      const pulse=(180-this.remaining)%45;
      circle(this.pos.x,this.pos.y,12+pulse*2);
    }
    pop();
  }
}
