/** Rendu original en pixels, sans assets du jeu de référence. Ne modifie aucun état IA. */
class PixelRenderer {
  static visionHints(scene) {
    if(scene.debug) return;
    push(); noStroke();
    for(const guard of scene.guards) {
      const radius=Math.max(guard.proximityRadius(scene.player),guard.visionRadius*scene.player.visibilityFactor);
      // Zone de proximité à 360° : le cône seul ne doit pas laisser croire
      // que passer juste derrière un garde est toujours sans risque.
      fill(255,208,132,7);
      beginShape();
      for(let i=0;i<20;i++) {
        const angle=Math.PI*2*i/20;
        const length=MuseumNavigation.rayDistance(guard.pos,angle,guard.proximityRadius(scene.player),scene.obstacles);
        vertex(guard.pos.x+Math.cos(angle)*length,guard.pos.y+Math.sin(angle)*length);
      }
      endShape(CLOSE);
      fill(guard.state==='POURSUITE' ? color(255,95,115,25) : color(255,208,132,18));
      beginShape(); vertex(guard.pos.x,guard.pos.y);
      for(let i=0;i<=14;i++) {
        const angle=guard.facing-guard.visionAngle/2+guard.visionAngle*i/14;
        const length=MuseumNavigation.rayDistance(guard.pos,angle,radius,scene.obstacles);
        vertex(guard.pos.x+Math.cos(angle)*length,guard.pos.y+Math.sin(angle)*length);
      }
      endShape(CLOSE);
    }
    pop();
  }

  static lootEffects(effects=[],reducedMotion=false) {
    push(); noStroke(); textFont('monospace'); textAlign(CENTER); textSize(12);
    for(const effect of effects) {
      const progress=1-effect.life/45;
      fill(255,224,150,Math.round(effect.life/45*255));
      text('+1 ◆',effect.pos.x,effect.pos.y-20-(reducedMotion ? 0 : progress*25));
      for(let i=0;i<(reducedMotion ? 0 : 6);i++) {
        const angle=i*Math.PI/3,radius=8+progress*22;
        rect(effect.pos.x+Math.cos(angle)*radius,effect.pos.y+Math.sin(angle)*radius,3,3);
      }
    }
    pop();
  }
  // Petites images réutilisées au lieu de redessiner chaque pixel de chaque PNJ.
  static spriteCache = new Map();

  static sprite(agent,stride) {
    const key=[agent.kind,agent.color,stride,agent.vel.x<0].join(':');
    if(this.spriteCache.has(key)) return this.spriteCache.get(key);
    const g=createGraphics(40,48);
    g.pixelDensity(1); g.noSmooth(); g.clear(); g.translate(20,30); g.noStroke();
    const thief=agent.kind==='voleur',dog=agent.kind==='chien',rival=agent.kind==='rival';
    g.fill(9, 5, 21, 120); g.ellipse(0, 8, dog ? 22 : 20, 7);
    if (dog) {
      const flip = agent.vel.x < 0 ? -1 : 1;
      g.scale(flip, 1);
      g.fill('#3c2b58'); g.rect(-9, -3, 16, 9);
      g.fill('#d9a66b'); g.rect(-8, -5, 15, 7); g.rect(5, -8, 7, 8);
      g.fill('#72567f'); g.rect(5, -11, 3, 5); g.rect(-12, -7, 5, 3);
      g.fill('#fce4a1'); g.rect(9, -6, 3, 2);
      g.fill('#ab775c'); g.rect(-7, 2, 3, 7 - stride); g.rect(4, 2, 3, 5 + stride);
    } else {
      const outfit = thief ? '#64dcd5' : rival ? agent.color : '#bd9dc6';
      g.fill('#20162f'); g.rect(-6, -12, 12, 20);
      g.fill(outfit); g.rect(-6, -3, 12, 10); g.rect(-8, 0, 3, 5); g.rect(5, 0, 3, 5);
      g.fill(thief ? '#a9fff0' : '#eee0bc'); g.rect(-4, -11, 8, 7);
      g.fill('#302143'); g.rect(-5, -12, 10, 4);
      g.fill('#302143'); g.rect(-5, -6, 10, 3);
      g.fill(thief ? '#eece7e' : '#ffdb9e'); g.rect(agent.vel.x < 0 ? -4 : 0, -7, 4, 2);
      g.fill('#21182f'); g.rect(-5, 7, 4, 5 + stride); g.rect(1, 7, 4, 7 - stride);
      if (thief || rival) { g.fill('#a1817a'); g.rect(-9, -2, 4, 8); }
      if (agent.kind === 'chef') { g.fill('#ffcf75'); g.rect(-6, -14, 12, 3); g.rect(-2, -18, 4, 4); }
    }
    this.spriteCache.set(key,g);
    return g;
  }

  static agent(agent) {
    const p=agent.pos;
    // Une précision d’un pixel évite les petits sauts à faible vitesse.
    const x=Math.round(p.x),y=Math.round(p.y);
    const stride=agent.vel.magSq()>.09 ? Math.floor(frameCount/8)%2*2 : 0;
    const thief=agent.kind==='voleur';
    push(); translate(x,y);
    if(thief && agent.crouching) { translate(0,4); scale(1,.72); }
    image(this.sprite(agent,stride),-20,-30);
    noStroke();
    if(thief && agent.inShadow) { fill('#86e1d3'); rect(-12,-19,3,3); }
    if(agent.state==='POURSUITE') { fill('#ff797b'); rect(-1,-25,3,7); rect(-1,-16,3,3); }
    if(agent.state==='ENQUETE') { fill('#ffd084'); textAlign(CENTER); textFont('monospace'); textSize(13); text('?',0,-17); }
    if(agent.state==='OBSERVATION') {
      fill('#49334e'); rect(-10,-23,20,3);
      fill('#ffd084'); rect(-10,-23,20*agent.detectionProgress,3);
    }
    pop();
    if(window.game && window.game.debug && agent.visionRadius) {
      push(); translate(p.x,p.y); rotate(agent.facing ?? agent.vel.heading());
      noStroke(); fill(agent.state==='POURSUITE' ? color(255,100,120,35) : color(255,207,117,18));
      arc(0,0,agent.visionRadius*2,agent.visionRadius*2,-agent.visionAngle/2,agent.visionAngle/2,PIE);
      pop();
    }
    agent.showDebug();
  }
  static guardExpressions(scene) {
    // Trois bulles au maximum, sans allocation graphique ni effet clignotant.
    const visible=scene.guards.filter(g=>g.speechFrames>0)
      .sort((a,b)=>(b.state==='POURSUITE')-(a.state==='POURSUITE') || a.pos.dist(scene.player.pos)-b.pos.dist(scene.player.pos)).slice(0,3);
    const placed=[];
    push(); textFont('monospace'); textSize(9); textAlign(CENTER,CENTER); noStroke();
    for(const guard of visible) {
      const w=guard.speech.length*5.5+14,h=20;
      const x=clampValue(guard.pos.x,scene.bounds.x+w/2,scene.bounds.x+scene.bounds.w-w/2);
      const y=Math.max(scene.bounds.y+12,guard.pos.y-43);
      if(placed.some(p=>Math.abs(p.x-x)<(p.w+w)/2+4 && Math.abs(p.y-y)<24)) continue;
      placed.push({x,y,w});
      fill('#181323'); rect(x-w/2,y-h/2,w,h,3);
      fill(guard.state==='POURSUITE' ? '#ff9eaa' : '#ffe2a0'); text(guard.speech,x,y);
    }
    pop();
  }

  static obstacle(item) {
    push(); noStroke();
    const x = Math.round(item.x), y = Math.round(item.y);
    if (item.type === 'wall') {
      fill('#10151f'); rect(x+3,y+6,item.w,item.h);
      fill('#536076'); rect(x,y,item.w,item.h);
      fill('#8a92a4'); rect(x,y,item.w,3);
      fill('#303b50'); rect(x+3,y+5,item.w-6,item.h-8);
      fill('#728095');
      if(item.h>item.w) for(let offset=18;offset<item.h;offset+=22) rect(x+3,y+offset,item.w-6,2);
      else for(let offset=22;offset<item.w;offset+=30) rect(x+offset,y+4,2,item.h-7);
    } else if (item.type === 'statue') {
      fill('#1a112d'); rect(x + 4, y + item.h - 9, item.w, 14);
      fill('#58436e'); rect(x, y + item.h - 14, item.w, 12);
      fill('#8b719c'); rect(x + 4, y + item.h - 17, item.w - 8, 5);
      fill('#b6a0b0'); rect(item.pos.x - 9, y + 7, 18, item.h - 26);
      fill('#dfc6be'); rect(item.pos.x - 6, y, 12, 14);
      fill('#88718f'); rect(item.pos.x - 13, y + 19, 26, 7);
    } else {
      fill('#171126'); rect(x + 4, y + 8, item.w, item.h);
      fill('#463755'); rect(x, y, item.w, item.h);
      fill('#8d6881'); rect(x, y, item.w, 4);
      fill('#282d4b'); rect(x + 4, y + 5, item.w - 8, item.h - 12);
      fill('#3d566a'); rect(x + 7, y + 7, item.w - 14, 3);
      fill('#77c4c4'); rect(x + 9, y + 10, Math.max(4,item.w * .25), 2);
      fill('#72526b'); rect(x, y + item.h - 5, item.w, 5);
      for (let offset = 18; offset < item.w - 10; offset += 28) {
        fill('#d4ad7d'); rect(x + offset, y + item.h / 2, 6, 5);
      }
    }
    pop();
  }

  static artwork(item) {
    if (item.collected) return;
    push(); translate(Math.round(item.pos.x), Math.round(item.pos.y)); noStroke();
    const hover = Math.round(sin(frameCount * .045 + item.pos.x) * 2);
    fill(253, 204, 119, 12); circle(0, -3, 44);
    fill('#594265'); rect(-11, 9, 22, 8);
    fill('#b38c90'); rect(-10, 7, 20, 3);
    fill(item.isSapphire ? '#42c9de' : '#e2aa64'); rect(-6, -8 + hover, 12, 14);
    fill(item.isSapphire ? '#b7fff3' : '#ffe2a0'); rect(-3, -11 + hover, 6, 17);
    fill('#fff0ce'); rect(-6, -7 + hover, 3, 4);
    if (window.game && window.game.player.pos.dist(item.pos) < 38) {
      fill('#ffe6b0'); textAlign(CENTER); textSize(10); textFont('monospace'); text(item.locked ? 'PROTÉGÉ' : item.isSapphire ? 'SAPHIR · VOLER' : 'VOLER', 0, -25);
    }
    pop();
  }

  static museum(bounds,level) {
    const b = bounds;
    const theme=level.theme;
    push(); noStroke();
    fill('#171226'); rect(0, 0, width, height);
    fill('#292239'); rect(b.x, b.y, b.w, b.h);
    const tile = 24;
    for (let row = 0; row < b.h / tile; row++) {
      for (let col = 0; col < b.w / tile; col++) {
        const x = b.x + col * tile, y = b.y + row * tile;
        fill(theme.floor[(row+col)%2]);
        rect(x, y, Math.min(tile - 1, b.x + b.w - x), Math.min(tile - 1, b.y + b.h - y));
        if ((col * 13 + row * 7) % 11 === 0) { fill('#393047'); rect(x + 4,y + 5, 5, 2); }
      }
    }
    // Tapis central et bordures de pierre.
    fill(theme.carpet);
    const mapIndex=HEIST_LEVELS.indexOf(level);
    if(mapIndex===1 || mapIndex===3) {
      for(const ny of (mapIndex===1 ? [.49] : [.23,.49,.70,.9])) rect(b.x+8,b.y+b.h*ny-8,b.w-16,16);
    } else if(mapIndex===2) {
      rect(b.x+b.w*.12,b.y+b.h*.12,b.w*.76,b.h*.76);
      fill(theme.floor[0]); rect(b.x+b.w*.19,b.y+b.h*.19,b.w*.62,b.h*.62);
    } else {
      rect(b.x + b.w * .435, b.y + 8, b.w * .13, b.h - 16);
      fill(theme.accent); rect(b.x + b.w * .435, b.y + 8, 2, b.h - 16);
      rect(b.x + b.w * .565 - 2, b.y + 8, 2, b.h - 16);
    }
    for (let offset = 0; offset < b.w; offset += 32) {
      fill('#63506d'); rect(b.x + offset, b.y - 7, Math.min(30, b.w - offset), 9);
      fill('#40304e'); rect(b.x + offset, b.y + b.h - 3, Math.min(30, b.w - offset), 10);
    }
    fill('#6b5277'); rect(b.x - 7,b.y,9,b.h); rect(b.x+b.w-2,b.y,9,b.h);
    // Lanternes : halos doux derrière des pixels très contrastés.
    for (const nx of [.08,.39,.61,.92]) {
      const x = b.x+b.w*nx;
      fill(255, 188, 121, 8); circle(x,b.y+22,90); circle(x,b.y+22,55);
      fill('#b18a82'); rect(x-5,b.y+4,10,18); fill('#ffdf9d'); rect(x-3,b.y+9,6,8);
    }
    const exitY = b.y + b.h*.46;
    fill('#382d4a'); rect(b.x+b.w-19,exitY-5,20,b.h*.1+10);
    fill('#5cbfc5'); rect(b.x+b.w-12,exitY,10,b.h*.1);
    fill('#b1f6df'); rect(b.x+b.w-12,exitY,3,b.h*.1);
    fill('#c5b4ca'); textFont('monospace'); textSize(9); textAlign(RIGHT); text('EXTRACTION',b.x+b.w-24,exitY-8);
    pop();
  }

  static extraction(scene) {
    const ready=scene.player.loot===scene.artworks.length;
    const p=scene.point(.95,.51);
    push(); noFill(); stroke(ready ? '#a6ffe0' : '#726882'); strokeWeight(2);
    const pulse=ready ? sin(frameCount*.07)*3 : 0;
    circle(p.x,p.y,25+pulse);
    noStroke(); fill(ready ? '#a6ffe0' : '#99859f'); textFont('monospace'); textSize(10); textAlign(RIGHT);
    text(ready ? 'SORTIE →' : '◆ '+scene.player.loot+'/'+scene.artworks.length,p.x-14,p.y+4);
    pop();
  }

  static dust(bounds) {
    const b=bounds;
    push(); noStroke();
    // Seules les poussières sont animées ; le décor est mis en cache.
    fill(227,190,205,75);
    for (let i=0;i<22;i++) {
      const x=b.x+((i*137+frameCount*.08)%b.w);
      const y=b.y+((i*79+sin(frameCount*.008+i)*7+b.h)%b.h);
      rect(Math.round(x),Math.round(y),2,2);
    }
    pop();
  }
}
