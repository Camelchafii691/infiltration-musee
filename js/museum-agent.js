function clampValue(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function segmentIntersectsRect(a, b, rect, padding=2) {
  // Intersection analytique segment/rectangle : aucune allocation ni trou entre échantillons.
  let near=0,far=1;
  for (const axis of ['x','y']) {
    const origin=a[axis],delta=b[axis]-origin;
    const min=rect[axis]-padding,max=rect[axis]+(axis==='x' ? rect.w : rect.h)+padding;
    if (Math.abs(delta)<1e-9) { if(origin<min || origin>max) return false; }
    else {
      let first=(min-origin)/delta,last=(max-origin)/delta;
      if(first>last) { const swap=first;first=last;last=swap; }
      near=Math.max(near,first);far=Math.min(far,last);
      if(near>far) return false;
    }
  }
  return true;
}

class MuseumAgent extends Vehicle {
  constructor(x, y, options = {}) {
    super(x, y);
    this.kind = options.kind || 'agent';
    this.color = options.color || '#e9e5d8';
    this.accent = options.accent || this.color;
    this.maxSpeed = options.maxSpeed || 3;
    this.maxForce = options.maxForce || 0.16;
    this.r = options.radius || 9;
    this.behaviorManager = new BehaviorManager(this);
    this.debugData = {};
    this.pathIndex = 0;
    this.wanderTheta = random(-PI, PI);
  }

  steerTo(target, speed = this.maxSpeed) {
    const desired = p5.Vector.sub(target, this.pos);
    if (desired.magSq() < 0.0001) return createVector(0, 0);
    desired.setMag(speed);
    return p5.Vector.sub(desired, this.vel).limit(this.maxForce);
  }

  arriveAt(target, slowRadius = 80, stopRadius = 6) {
    const desired = p5.Vector.sub(target, this.pos);
    const distance = desired.mag();
    if (distance <= stopRadius) return this.vel.copy().mult(-1).limit(this.maxForce);
    const speed = distance < slowRadius ? map(distance, stopRadius, slowRadius, 0, this.maxSpeed) : this.maxSpeed;
    return this.steerTo(target, speed);
  }

  pursueEntity(target, maxPrediction = 26) {
    const distance = this.pos.dist(target.pos);
    const ownSpeed = Math.max(0.4, this.vel.mag());
    const horizon = clampValue(distance / ownSpeed, 2, maxPrediction);
    const future = target.pos.copy().add(target.vel.copy().mult(horizon));
    this.debugData.prediction = future.copy();
    return this.steerTo(future);
  }

  evadeEntity(target, radius = Infinity) {
    if (this.pos.dist(target.pos) > radius) return createVector(0, 0);
    const horizon = clampValue(this.pos.dist(target.pos) / Math.max(1, this.maxSpeed), 2, 18);
    const future = target.pos.copy().add(target.vel.copy().mult(horizon));
    const desired = p5.Vector.sub(this.pos, future);
    if (desired.magSq() === 0) return createVector(0, 0);
    desired.setMag(this.maxSpeed);
    return p5.Vector.sub(desired, this.vel).limit(this.maxForce);
  }

  wanderSteering() {
    const center = this.vel.copy();
    if (center.magSq() < 0.001) center.set(1, 0);
    center.setMag(48).add(this.pos);
    this.wanderTheta += random(-0.18, 0.18);
    const target = createVector(cos(this.wanderTheta), sin(this.wanderTheta)).mult(28).add(center);
    this.debugData.wanderTarget = target.copy();
    return this.steerTo(target);
  }

  followPath(points, arriveDistance = 18) {
    if (!points || !points.length) return createVector(0, 0);
    this.pathIndex%=points.length;
    const target = points[this.pathIndex];
    if (this.pos.dist(target) < arriveDistance) this.pathIndex = (this.pathIndex + 1) % points.length;
    this.debugData.pathTarget = points[this.pathIndex].copy();
    return this.arriveAt(points[this.pathIndex], 55, 5);
  }

  separation(neighbors, radius = 38) {
    const desired = createVector(0, 0);
    let count = 0;
    for (const other of neighbors || []) {
      if (other === this) continue;
      const distance = this.pos.dist(other.pos);
      if (distance > 0 && distance < radius) {
        desired.add(p5.Vector.sub(this.pos, other.pos).normalize().div(distance));
        count++;
      }
    }
    if (!count || desired.magSq() === 0) return desired;
    desired.div(count).setMag(this.maxSpeed);
    return desired.sub(this.vel).limit(this.maxForce);
  }

  alignment(neighbors, radius = 70) {
    const desired = createVector(0, 0);
    let count = 0;
    for (const other of neighbors || []) {
      if (other === this) continue;
      const distance = this.pos.dist(other.pos);
      if (distance > 0 && distance < radius) { desired.add(other.vel); count++; }
    }
    if (!count || desired.magSq() === 0) return desired;
    desired.div(count).setMag(this.maxSpeed);
    return desired.sub(this.vel).limit(this.maxForce);
  }

  cohesion(neighbors, radius = 78) {
    const center = createVector(0, 0);
    let count = 0;
    for (const other of neighbors || []) {
      if (other === this) continue;
      const distance = this.pos.dist(other.pos);
      if (distance > 0 && distance < radius) { center.add(other.pos); count++; }
    }
    return count ? this.steerTo(center.div(count)) : center;
  }

  avoidObstacles(obstacles, lookAhead = 48) {
    const direction = this.vel.copy();
    if (direction.magSq() < 0.001) direction.set(1, 0);
    const dynamicLength = lookAhead * (0.45 + this.vel.mag() / Math.max(1, this.maxSpeed));
    const ahead = this.pos.copy().add(direction.copy().setMag(dynamicLength));
    const ahead2 = this.pos.copy().add(direction.copy().setMag(dynamicLength * 0.5));
    let threat = null;
    let closest = Infinity;
    let collisionPoint = null;
    for (const obstacle of obstacles || []) {
      if (!segmentIntersectsRect(this.pos,ahead,obstacle,this.r+5)) continue;
      const dx=this.pos.x-clampValue(this.pos.x,obstacle.x,obstacle.x+obstacle.w);
      const dy=this.pos.y-clampValue(this.pos.y,obstacle.y,obstacle.y+obstacle.h);
      const distance=dx*dx+dy*dy;
      if(distance<closest) {
        closest=distance; threat=obstacle;
      }
    }
    this.debugData.ahead = ahead;
    this.debugData.ahead2 = ahead2;
    this.debugData.obstacle = threat;
    if (!threat) return createVector(0, 0);

    if(this.avoidThreat!==threat) {
      this.avoidThreat=threat;
      const cross=direction.x*(threat.pos.y-this.pos.y)-direction.y*(threat.pos.x-this.pos.x);
      this.avoidSide=cross>=0 ? -1 : 1;
    }
    // Longer le côté choisi au lieu de reculer puis repartir sans cesse.
    let desired=createVector(-direction.y*this.avoidSide,direction.x*this.avoidSide);
    if (threat.containsPoint(this.pos,this.r+1)) {
      collisionPoint=threat.closestEdgePoint(this.pos,this.r+2);
      desired=p5.Vector.sub(collisionPoint,this.pos);
    }
    desired.setMag(this.maxSpeed);
    return desired.sub(this.vel).limit(this.maxForce);
  }

  keepInBounds(bounds, margin = 28) {
    const desired = this.vel.copy();
    let changed = false;
    if (this.pos.x < bounds.x + margin) { desired.x = this.maxSpeed; changed = true; }
    if (this.pos.x > bounds.x + bounds.w - margin) { desired.x = -this.maxSpeed; changed = true; }
    if (this.pos.y < bounds.y + margin) { desired.y = this.maxSpeed; changed = true; }
    if (this.pos.y > bounds.y + bounds.h - margin) { desired.y = -this.maxSpeed; changed = true; }
    if (!changed) return createVector(0, 0);
    desired.setMag(this.maxSpeed);
    return desired.sub(this.vel).limit(this.maxForce);
  }

  resolveCollisions(obstacles, bounds) {
    this.pos.x = clampValue(this.pos.x, bounds.x + this.r, bounds.x + bounds.w - this.r);
    this.pos.y = clampValue(this.pos.y, bounds.y + this.r, bounds.y + bounds.h - this.r);
    for (const obstacle of obstacles || []) {
      if (!obstacle.containsPoint(this.pos, this.r)) continue;
      const nearest = obstacle.closestEdgePoint(this.pos,this.r+0.5);
      const normal = p5.Vector.sub(nearest, this.pos);
      this.pos.set(nearest.x, nearest.y);
      if (normal.magSq()) {
        normal.normalize();
        if(this.vel.x*normal.x+this.vel.y*normal.y<0) {
          if(this.kind==='voleur') {
            // Glissement sans rebond, en conservant la vitesse tangentielle.
            if(Math.abs(normal.x)>.5) this.vel.x=0;
            else this.vel.y=0;
          } else this.vel.reflect(normal).mult(.35);
        }
      }
    }
  }

  applyManagedBehaviors(context) {
    this.applyForce(this.behaviorManager.getSteeringForce(context));
  }

  showDebug() {
    if (!window.game || !window.game.debug) return;
    push();
    strokeWeight(1);
    noFill();
    if (this.debugData.ahead) {
      stroke(186, 252, 82, 150);
      line(this.pos.x, this.pos.y, this.debugData.ahead.x, this.debugData.ahead.y);
      circle(this.debugData.ahead2.x, this.debugData.ahead2.y, 5);
    }
    for (const force of this.behaviorManager.lastForces.values()) {
      stroke(240, 185, 79, 170);
      line(this.pos.x, this.pos.y, this.pos.x + force.x * 160, this.pos.y + force.y * 160);
    }
    if (this.debugData.prediction) {
      stroke(255, 96, 74, 190);
      line(this.pos.x, this.pos.y, this.debugData.prediction.x, this.debugData.prediction.y);
      circle(this.debugData.prediction.x, this.debugData.prediction.y, 7);
    }
    pop();
  }
}

