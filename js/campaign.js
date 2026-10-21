/** Chaque mission décrit des positions normalisées : même carte logique sur téléphone et ordinateur. */
const TRAINING_LEVEL={name:'Salle d’entraînement',district:'ENTRAÎNEMENT · SANS DANGER',theme:{floor:['#20333b','#243b40'],carpet:'#315353',accent:'#86e1d3'},vision:170,guardSpeed:1.8,dogs:0,
  loot:[[.33,.25],[.76,.71]],shadow:[[.03,.70,.20,.24],[.63,.59,.23,.23]],
  obstacles:[[.47,.30,.07,.25,'vitrine']],patrols:[]};

const HEIST_LEVELS = [
  { name:'Les galeries endormies', description:'Une première infiltration, des cachettes généreuses et deux chiens.', vision:170, guardSpeed:1.8, dogs:2,
    loot:[[.23,.25],[.73,.27],[.57,.76]],
    extra:[], shadow:[[.02,.70,.17,.25],[.04,.08,.14,.22],[.81,.53,.15,.14],[.37,.79,.15,.15]] },
  { name:'La collection interdite', description:'De nouvelles vitrines modifient les passages. Trois chiens surveillent les reliques.', vision:180, guardSpeed:1.95, dogs:3,
    loot:[[.34,.18],[.85,.23],[.38,.83],[.15,.57]],
    extra:[[.32,.20,.07,.08],[.69,.80,.11,.04]], shadow:[[.02,.70,.14,.24],[.38,.08,.12,.18],[.83,.53,.13,.14],[.18,.80,.14,.14]] },
  { name:'La ronde de minuit', description:'Quatre chiens et des gardes plus rapides. Utilisez les leurres pour ouvrir un passage.', vision:190, guardSpeed:2.1, dogs:4,
    loot:[[.19,.18],[.78,.58],[.40,.85],[.86,.18],[.16,.86]],
    extra:[[.30,.20,.09,.05],[.59,.54,.10,.04],[.30,.82,.05,.08]], shadow:[[.02,.72,.13,.22],[.08,.08,.12,.17],[.84,.79,.12,.13],[.39,.49,.15,.07]] },
  { name:'Le pavillon des ombres', description:'Les chemins se resserrent. Cinq chiens et une surveillance renforcée.', vision:205, guardSpeed:2.25, dogs:5,
    loot:[[.38,.27],[.86,.19],[.68,.90],[.15,.56],[.58,.78],[.83,.59]],
    extra:[[.32,.16,.06,.08],[.59,.16,.06,.08],[.30,.57,.08,.05],[.73,.82,.06,.05]], shadow:[[.02,.73,.12,.21],[.39,.18,.07,.13],[.82,.55,.10,.10],[.53,.82,.10,.10]] },
  { name:'Le dernier saphir', description:'Volez six reliques pour libérer le Saphir d’Atlas. Son vol déclenche le verrouillage : fuyez avant la fin du compte à rebours !', vision:220, guardSpeed:2.4, dogs:6,
    loot:[[.40,.17],[.86,.28],[.69,.88],[.15,.18],[.15,.58],[.40,.78],[.87,.62]],
    extra:[[.30,.16,.06,.08],[.60,.17,.06,.08],[.30,.57,.08,.05],[.72,.82,.07,.04],[.60,.56,.07,.04]], shadow:[[.02,.73,.12,.21],[.40,.08,.07,.12],[.84,.55,.10,.09],[.40,.80,.09,.10]] }
];

// Cinq plans réellement différents ; les coordonnées restent indépendantes de l’écran.
const HEIST_MAPS = [
  { district:'AILE DES ANTIQUITÉS', theme:{floor:['#2c253e','#302740'],carpet:'#41304c',accent:'#d8ac7e'},
    obstacles:[[.18,.32,.18,.07],[.64,.32,.18,.07],[.18,.68,.18,.07],[.64,.68,.18,.07],[.46,.36,.08,.12,'statue'],[.46,.59,.08,.12,'statue'],[.05,.47,.24,.035],[.71,.47,.24,.035]],
    patrols:[[[.13,.15],[.43,.15],[.43,.43],[.13,.43]],[[.58,.12],[.88,.12],[.88,.43],[.58,.43]],[[.15,.60],[.43,.60],[.43,.88],[.15,.88]],[[.58,.57],[.88,.57],[.88,.88],[.58,.88]]] },
  { district:'LES ARCHIVES BLEUES', theme:{floor:['#172e40','#1b3546'],carpet:'#25465a',accent:'#83d2ec'},
    obstacles:[[.22,.13,.06,.28,'wall'],[.22,.59,.06,.27,'wall'],[.48,.20,.06,.25,'wall'],[.48,.62,.06,.26,'wall'],[.73,.12,.06,.28,'wall'],[.73,.60,.06,.25,'wall'],[.34,.47,.08,.05],[.60,.48,.07,.05]],
    patrols:[[[.12,.16],[.17,.16],[.17,.44],[.12,.44]],[[.61,.12],[.66,.12],[.66,.40],[.61,.40]],[[.12,.57],[.17,.57],[.17,.9],[.12,.9]],[[.87,.60],[.9,.60],[.9,.9],[.87,.9]]] },
  { district:'LA COUR DES STATUES', theme:{floor:['#30362c','#353b30'],carpet:'#444b34',accent:'#bddc8a'},
    obstacles:[[.27,.25,.09,.10,'statue'],[.64,.25,.09,.10,'statue'],[.27,.64,.09,.10,'statue'],[.64,.64,.09,.10,'statue'],[.43,.38,.14,.23,'statue'],[.08,.46,.18,.04],[.74,.46,.18,.04]],
    patrols:[[[.15,.14],[.4,.14],[.4,.20],[.15,.20]],[[.6,.14],[.86,.14],[.86,.20],[.6,.20]],[[.15,.58],[.15,.9],[.4,.9],[.4,.58]],[[.6,.59],[.86,.59],[.86,.9],[.6,.9]]] },
  { district:'LE LABYRINTHE POURPRE', theme:{floor:['#382337','#40283d'],carpet:'#59334e',accent:'#eba3c5'},
    obstacles:[[.22,.12,.46,.055,'wall'],[.32,.34,.48,.055,'wall'],[.20,.58,.45,.055,'wall'],[.36,.79,.44,.055,'wall'],[.14,.36,.065,.09,'statue'],[.79,.65,.065,.09,'statue']],
    patrols:[[[.12,.2],[.8,.2],[.8,.28],[.12,.28]],[[.14,.50],[.85,.46],[.85,.53],[.14,.53]],[[.12,.69],[.7,.69],[.7,.74],[.12,.74]],[[.15,.91],[.88,.91],[.88,.87],[.15,.87]]] },
  { district:'LA CHAMBRE DU SAPHIR', theme:{floor:['#172f34','#1c373b'],carpet:'#284e50',accent:'#89e9ce'},
    obstacles:[[.25,.27,.15,.055,'wall'],[.60,.27,.15,.055,'wall'],[.25,.27,.055,.43,'wall'],[.695,.27,.055,.43,'wall'],[.25,.70,.15,.055,'wall'],[.60,.70,.15,.055,'wall'],[.46,.44,.08,.12,'statue'],[.10,.39,.07,.10],[.83,.74,.07,.08]],
    patrols:[[[.13,.12],[.43,.12],[.43,.21],[.13,.21]],[[.57,.12],[.88,.12],[.88,.23],[.57,.23]],[[.12,.81],[.12,.91],[.43,.91],[.43,.81]],[[.8,.35],[.9,.35],[.9,.67],[.8,.67]]] }
];
HEIST_LEVELS.forEach((level,index)=>Object.assign(level,HEIST_MAPS[index]));
// Des reliques réparties dans les pièces et non dans les murs.
HEIST_LEVELS[1].loot=[[.36,.18],[.87,.23],[.38,.83],[.14,.57]];
HEIST_LEVELS[2].loot=[[.18,.18],[.82,.58],[.40,.85],[.86,.18],[.16,.86]];
HEIST_LEVELS[3].loot=[[.38,.25],[.87,.19],[.68,.91],[.15,.55],[.58,.71],[.86,.56]];
HEIST_LEVELS[4].loot=[[.43,.17],[.86,.25],[.67,.88],[.14,.18],[.14,.58],[.40,.83],[.50,.36]];

const HEIST_DIFFICULTIES = {
  easy:{label:'Facile',vision:.85,speed:.85,detection:.65,shadow:.25,dogBonus:-1,reinforcements:1,alarmFrames:240},
  normal:{label:'Normal',vision:1,speed:1,detection:1,shadow:.35,dogBonus:0,reinforcements:2,alarmFrames:360},
  hard:{label:'Difficile',vision:1.2,speed:1.22,detection:1.5,shadow:.5,dogBonus:2,reinforcements:3,alarmFrames:540}
};

class HeistCampaign {
  constructor(storage) {
    this.storage=storage;
    if (!this.storage) { try { this.storage=localStorage; } catch (_) { /* progression en mémoire */ } }
    this.current=0; this.unlocked=0; this.completed=[]; this.records={}; this.stars={}; this.difficulty='normal';
    try {
      const data=JSON.parse(this.storage.getItem('infiltration-campaign-v1'));
      if (data) {
        if (Object.hasOwn(HEIST_DIFFICULTIES,data.difficulty)) this.difficulty=data.difficulty;
        this.unlocked=HeistCampaign.clampIndex(data.unlocked);
        this.current=Math.min(this.unlocked,HeistCampaign.clampIndex(data.current));
        this.completed=Array.isArray(data.completed) ? [...new Set(data.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<HEIST_LEVELS.length))] : [];
        if(data.records && typeof data.records==='object') for(const [key,value] of Object.entries(data.records)) {
          if(/^(easy|normal|hard):[0-4]$/.test(key) && Number.isFinite(value) && value>0) this.records[key]=value;
        }
        if(data.stars && typeof data.stars==='object') for(const [key,value] of Object.entries(data.stars)) {
          if(/^(easy|normal|hard):[0-4]$/.test(key) && Number.isInteger(value) && value>=1 && value<=3) this.stars[key]=value;
        }
      }
    } catch (_) { /* une sauvegarde absente/invalide ne bloque pas le jeu */ }
  }
  static clampIndex(value) { return Number.isInteger(value) ? Math.max(0,Math.min(HEIST_LEVELS.length-1,value)) : 0; }
  get level() { return HEIST_LEVELS[this.current]; }
  get settings() { return HEIST_DIFFICULTIES[this.difficulty]; }
  get parSeconds() { return Math.round((180+this.current*30)*({easy:1.25,normal:1,hard:.85}[this.difficulty])); }
  rating(seconds,detections) {
    const stealth=Number.isFinite(detections) && detections===0;
    const swift=Number.isFinite(seconds) && seconds>0 && seconds<=this.parSeconds;
    return {stars:1+Number(stealth)+Number(swift),stealth,swift,par:this.parSeconds};
  }
  get mission() {
    return {...this.level,vision:Math.round(this.level.vision*this.settings.vision),guardSpeed:this.level.guardSpeed*this.settings.speed,
      dogs:Math.max(1,this.level.dogs+this.settings.dogBonus)};
  }
  setDifficulty(value) {
    if (!Object.hasOwn(HEIST_DIFFICULTIES,value)) return false;
    this.difficulty=value; this.save(); return true;
  }
  select(index) {
    if (!Number.isInteger(index) || index<0 || index>this.unlocked) return false;
    this.current=index; this.save(); return true;
  }
  complete(seconds,rating) {
    if(Number.isFinite(seconds) && seconds>0) {
      const key=`${this.difficulty}:${this.current}`;
      this.records[key]=Math.min(this.records[key] || Infinity,seconds);
      if(Number.isInteger(rating) && rating>=1 && rating<=3) this.stars[key]=Math.max(this.stars[key] || 0,rating);
    }
    if (!this.completed.includes(this.current)) this.completed.push(this.current);
    this.unlocked=Math.max(this.unlocked,Math.min(HEIST_LEVELS.length-1,this.current+1));
    this.save();
  }
  advance(won) { if (won) this.select(Math.min(HEIST_LEVELS.length-1,this.current+1)); }
  save() {
    try { this.storage.setItem('infiltration-campaign-v1',JSON.stringify({current:this.current,unlocked:this.unlocked,completed:this.completed,records:this.records,stars:this.stars,difficulty:this.difficulty})); } catch (_) { /* stockage facultatif */ }
  }
}
