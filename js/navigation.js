/** Graphe de visibilité partagé par la meute : contourne les coins sans téléporter. */
class MuseumNavigation {
  static rayDistance(origin,angle,maximum,obstacles) {
    const dx=Math.cos(angle),dy=Math.sin(angle); let nearest=maximum;
    for(const o of obstacles) {
      let near=0,far=maximum;
      for(const [position,direction,min,max] of [[origin.x,dx,o.x,o.x+o.w],[origin.y,dy,o.y,o.y+o.h]]) {
        if(Math.abs(direction)<1e-9) { if(position<min || position>max) {far=-1;break;} }
        else {
          let a=(min-position)/direction,b=(max-position)/direction;
          if(a>b) [a,b]=[b,a]; near=Math.max(near,a); far=Math.min(far,b);
        }
      }
      if(near<=far && far>=0) nearest=Math.min(nearest,near);
    }
    return nearest;
  }
  constructor(obstacles,bounds,radius=6) {
    this.obstacles=obstacles; this.bounds=bounds; this.padding=radius+.25;
    this.nodes=[]; const margin=radius+3;
    for(const o of obstacles) for(const [x,y] of [[o.x-margin,o.y-margin],[o.x+o.w+margin,o.y-margin],[o.x+o.w+margin,o.y+o.h+margin],[o.x-margin,o.y+o.h+margin]]) {
      const p=createVector(x,y);
      if(this.free(p)) this.nodes.push(p);
    }
    this.edges=this.nodes.map(()=>[]);
    for(let i=0;i<this.nodes.length;i++) for(let j=i+1;j<this.nodes.length;j++) {
      if(this.clear(this.nodes[i],this.nodes[j])) {
        const cost=this.nodes[i].dist(this.nodes[j]);
        this.edges[i].push([j,cost]); this.edges[j].push([i,cost]);
      }
    }
  }
  free(p) {
    const b=this.bounds,m=this.padding;
    return p.x>=b.x+m && p.x<=b.x+b.w-m && p.y>=b.y+m && p.y<=b.y+b.h-m && !this.obstacles.some(o=>o.containsPoint(p,m));
  }
  clear(a,b) { return !this.obstacles.some(o=>segmentIntersectsRect(a,b,o,this.padding)); }
  route(start,target) {
    let goal=target.copy();
    if(!this.free(goal)) {
      const candidates=this.nodes.filter(p=>this.free(p)).sort((a,b)=>a.dist(goal)-b.dist(goal));
      if(!candidates.length) return [];
      goal=candidates[0].copy();
    }
    if(this.clear(start,goal)) return [goal];
    const n=this.nodes.length,dist=Array(n).fill(Infinity),previous=Array(n).fill(-1),seen=new Set();
    for(let i=0;i<n;i++) if(this.clear(start,this.nodes[i])) dist[i]=start.dist(this.nodes[i]);
    let finish=-1,best=Infinity;
    for(let round=0;round<n;round++) {
      let current=-1;
      for(let i=0;i<n;i++) if(!seen.has(i) && (current<0 || dist[i]<dist[current])) current=i;
      if(current<0 || !Number.isFinite(dist[current]) || dist[current]>=best) break;
      seen.add(current);
      if(this.clear(this.nodes[current],goal)) {
        const score=dist[current]+this.nodes[current].dist(goal);
        if(score<best) { best=score; finish=current; }
      }
      for(const [next,cost] of this.edges[current]) if(dist[current]+cost<dist[next]) {dist[next]=dist[current]+cost;previous[next]=current;}
    }
    if(finish<0) return [];
    const route=[goal];
    for(let i=finish;i>=0;i=previous[i]) route.unshift(this.nodes[i].copy());
    return route;
  }
}
