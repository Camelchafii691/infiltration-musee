/** Composition originale synthétisée : nappes, basse douce et motif de cloche. */
class AmbientMusic {
  constructor(options = {}) {
    this.contextFactory=options.contextFactory || (()=>{
      const AudioContextClass=window.AudioContext || window.webkitAudioContext;
      return AudioContextClass ? new AudioContextClass() : null;
    });
    this.setTimer=options.setTimer || ((fn)=>setInterval(fn,80));
    this.clearTimer=options.clearTimer || ((id)=>clearInterval(id));
    this.storage=options.storage;
    if (!this.storage) { try { this.storage=localStorage; } catch (_) { /* mode privé */ } }
    this.enabled=true;
    try { this.enabled=this.storage.getItem('infiltration-music-v1')!=='off'; } catch (_) { /* défaut actif */ }
    this.volume=1;
    try {
      const saved=this.storage.getItem('infiltration-volume-v1');
      if(saved!==null && Number.isFinite(Number(saved))) this.volume=Math.max(0,Math.min(1,Number(saved)));
    } catch (_) { /* volume par défaut */ }
    this.context=null; this.master=null; this.timer=null;
    this.voices=new Set(); this.revision=0; this.startPromise=null;
  }

  async setEnabled(enabled) {
    this.enabled=Boolean(enabled);
    try { this.storage.setItem('infiltration-music-v1',this.enabled ? 'on' : 'off'); } catch (_) { /* stockage facultatif */ }
    if (!this.enabled) { this.stop(); return false; }
    return this.start();
  }

  setVolume(value) {
    if(!Number.isFinite(value)) return false;
    this.volume=Math.max(0,Math.min(1,value));
    try { this.storage.setItem('infiltration-volume-v1',String(this.volume)); } catch (_) { /* préférence facultative */ }
    if(this.master && this.context) {
      const now=this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(.36*this.volume,now+.05);
    }
    return true;
  }

  async start() {
    if (!this.enabled) return false;
    if (this.timer!==null) return true;
    if (this.startPromise) return this.startPromise;
    const revision=++this.revision;
    const pending=this.open(revision);
    this.startPromise=pending;
    try { return await pending; }
    finally { if (this.startPromise===pending) this.startPromise=null; }
  }

  async open(revision) {
    try {
      const context=this.contextFactory();
      if (!context) return false;
      this.context=context;
      const master=context.createGain();
      master.gain.setValueAtTime(.36*this.volume,context.currentTime);
      master.connect(context.destination); this.master=master;
      if (context.state!=='running') await context.resume();
      if (!this.enabled || revision!==this.revision) return false;
      this.step=0; this.nextTime=context.currentTime+.04;
      this.schedule();
      this.timer=this.setTimer(()=>this.schedule());
      return true;
    } catch (_) {
      if (revision===this.revision) this.stop();
      return false;
    }
  }

  schedule() {
    const context=this.context;
    if (!context || context.state!=='running' || !this.enabled) return;
    if (this.nextTime<context.currentTime) this.nextTime=context.currentTime+.02;
    // 64 croches à 94 BPM environ : une boucle calme d'une vingtaine de secondes.
    const roots=[48,44,51,46];
    const melody=[12,null,19,null,15,null,10,null,12,null,7,null,15,null,19,null];
    while (this.nextTime<context.currentTime+.18) {
      const root=roots[Math.floor(this.step/16)%4];
      if (this.step%16===0) {
        for (const interval of [0,7,12]) this.note(root+interval,this.nextTime,4.8,.14,'sine',.6);
      }
      if (this.step%8===0) this.note(root-12,this.nextTime,1.8,.18,'sine',.12);
      const pitch=melody[this.step%16];
      if (pitch!==null) this.note(root+pitch+12,this.nextTime,.85,.10,'triangle',.025);
      this.step=(this.step+1)%64;
      this.nextTime+=.32;
    }
  }

  note(midi,time,duration,volume,type,attack) {
    const context=this.context;
    const oscillator=context.createOscillator();
    const envelope=context.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),time);
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(volume,time+attack);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    oscillator.connect(envelope); envelope.connect(this.master);
    const voice={oscillator,envelope}; this.voices.add(voice);
    oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();this.voices.delete(voice);};
    oscillator.start(time); oscillator.stop(time+duration+.02);
  }

  async playLoot() {
    if (!this.enabled || !await this.start() || !this.enabled || !this.context) return false;
    // Petit carillon ascendant, distinct du motif d'ambiance.
    const now=this.context.currentTime+.01;
    [79,84,88].forEach((pitch,index)=>this.note(pitch,now+index*.085,.28+index*.08,.32,'sine',.008));
    return true;
  }

  stop() {
    this.revision++;
    this.startPromise=null;
    if (this.timer!==null) this.clearTimer(this.timer);
    this.timer=null;
    const context=this.context;
    if (this.master && context) {
      this.master.gain.cancelScheduledValues(context.currentTime);
      this.master.gain.setValueAtTime(0,context.currentTime);
      this.master.disconnect();
    }
    for (const {oscillator,envelope} of this.voices) {
      oscillator.onended=null;
      try { oscillator.stop(); } catch (_) { /* source déjà terminée */ }
      oscillator.disconnect(); envelope.disconnect();
    }
    this.voices.clear(); this.context=null; this.master=null;
    if (context && context.state!=='closed') void context.close().catch(()=>{});
  }
}
