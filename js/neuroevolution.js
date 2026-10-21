/** Petit perceptron 6–8–2 dont le génome est directement évolué. */
class GuardBrain {
  static INPUTS = 6;
  static HIDDEN = 8;
  static OUTPUTS = 2;

  constructor(genes) {
    const count = GuardBrain.INPUTS * GuardBrain.HIDDEN + GuardBrain.HIDDEN +
      GuardBrain.HIDDEN * GuardBrain.OUTPUTS + GuardBrain.OUTPUTS;
    this.genes = genes ? genes.slice(0, count) : Array.from({ length: count }, () => random(-1, 1));
    while (this.genes.length < count) this.genes.push(random(-1, 1));
  }

  predict(inputs) {
    const normalized = inputs.slice(0, GuardBrain.INPUTS);
    while (normalized.length < GuardBrain.INPUTS) normalized.push(0);
    let cursor = 0;
    const hidden = [];
    for (let h = 0; h < GuardBrain.HIDDEN; h++) {
      let sum = 0;
      for (let i = 0; i < GuardBrain.INPUTS; i++) sum += normalized[i] * this.genes[cursor++];
      sum += this.genes[cursor++];
      hidden.push(Math.tanh(sum));
    }
    const output = [];
    for (let o = 0; o < GuardBrain.OUTPUTS; o++) {
      let sum = 0;
      for (let h = 0; h < GuardBrain.HIDDEN; h++) sum += hidden[h] * this.genes[cursor++];
      sum += this.genes[cursor++];
      output.push(Math.tanh(sum));
    }
    return output;
  }

  clone() { return new GuardBrain(this.genes); }

  crossover(other, rng = Math.random) {
    const cut = Math.floor(rng() * this.genes.length);
    return new GuardBrain(this.genes.map((gene, index) => index < cut ? gene : other.genes[index]));
  }

  mutate(rate = 0.08, amount = 0.28, rng = Math.random) {
    this.genes = this.genes.map((gene) => rng() < rate
      ? Math.max(-3, Math.min(3, gene + (rng() * 2 - 1) * amount))
      : gene);
    return this;
  }
}

class NeuroEvolutionManager {
  constructor(populationSize = 8) {
    this.populationSize = populationSize;
    this.generation = 1;
    this.bestFitness = 0;
    this.population = [];
    this.load();
    if (!this.population.length) {
      this.population = Array.from({ length: populationSize }, () => ({ brain: new GuardBrain(), fitness: 0 }));
    }
  }

  brainFor(index) {
    return this.population[index % this.population.length].brain.clone();
  }

  setFitness(index, fitness) {
    const genome = this.population[index % this.population.length];
    genome.fitness = Math.max(genome.fitness, Number.isFinite(fitness) ? fitness : 0);
    this.bestFitness = Math.max(this.bestFitness, genome.fitness);
  }

  evolve(rng = Math.random) {
    const ranked = [...this.population].sort((a, b) => b.fitness - a.fitness);
    const eliteCount = Math.max(2, Math.ceil(ranked.length * 0.35));
    const elites = ranked.slice(0, eliteCount);
    const next = elites.map((item) => ({ brain: item.brain.clone(), fitness: 0 }));

    while (next.length < this.populationSize) {
      const a = elites[Math.floor(rng() * elites.length)].brain;
      const b = elites[Math.floor(rng() * elites.length)].brain;
      next.push({ brain: a.crossover(b, rng).mutate(0.1, 0.34, rng), fitness: 0 });
    }
    this.population = next;
    this.generation += 1;
    this.save();
  }

  save() {
    try {
      localStorage.setItem('infiltration-neuro-v1', JSON.stringify({
        generation: this.generation,
        bestFitness: this.bestFitness,
        genes: this.population.map((item) => item.brain.genes)
      }));
    } catch (_) { /* localStorage peut être indisponible en fichier local privé. */ }
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem('infiltration-neuro-v1'));
      if (!data || !Array.isArray(data.genes)) return;
      this.generation = Math.max(1, data.generation || 1);
      this.bestFitness = Math.max(0, data.bestFitness || 0);
      this.population = data.genes.slice(0, this.populationSize)
        .map((genes) => ({ brain: new GuardBrain(genes), fitness: 0 }));
    } catch (_) { this.population = []; }
  }

  reset() {
    try { localStorage.removeItem('infiltration-neuro-v1'); } catch (_) { /* rien */ }
    this.generation = 1;
    this.bestFitness = 0;
    this.population = Array.from({ length: this.populationSize }, () => ({ brain: new GuardBrain(), fitness: 0 }));
  }
}

