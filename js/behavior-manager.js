/**
 * Compose des forces de steering sans déplacer directement l'entité.
 * Les comportements prioritaires (évitement, bords) consomment d'abord le budget,
 * puis les forces pondérées complètent la force finale.
 */
class BehaviorManager {
  constructor(owner) {
    this.owner = owner;
    this.behaviors = new Map();
    this.lastForces = new Map();
  }

  add(name, calculate, weight = 1, priority = 10) {
    this.behaviors.set(name, { name, calculate, weight, priority, active: true });
    return this;
  }

  remove(name) {
    this.behaviors.delete(name);
    this.lastForces.delete(name);
    return this;
  }

  activate(name, active = true) {
    const behavior = this.behaviors.get(name);
    if (behavior) behavior.active = active;
    return this;
  }

  deactivate(name) { return this.activate(name, false); }

  changeWeight(name, weight) {
    const behavior = this.behaviors.get(name);
    if (behavior) behavior.weight = Number.isFinite(weight) ? weight : behavior.weight;
    return this;
  }

  getBehavior(name) { return this.behaviors.get(name); }

  clear() {
    this.behaviors.clear();
    this.lastForces.clear();
  }

  getSteeringForce(context = {}) {
    const budget = Math.max(0, this.owner.maxForce);
    const total = createVector(0, 0);
    this.lastForces.clear();

    const ordered = [...this.behaviors.values()]
      .filter((behavior) => behavior.active)
      .sort((a, b) => a.priority - b.priority);

    for (const behavior of ordered) {
      const remaining = budget - total.mag();
      if (remaining <= 1e-9) break;
      const raw = behavior.calculate(context);
      if (!raw || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) continue;
      const weighted = raw.copy().mult(behavior.weight);
      this.lastForces.set(behavior.name, weighted.copy());
      if (weighted.mag() > remaining) weighted.setMag(remaining);
      total.add(weighted);
    }

    return total.limit(budget);
  }

  activeNames() {
    return [...this.behaviors.values()].filter((item) => item.active).map((item) => item.name);
  }
}

