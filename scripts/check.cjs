const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let count=0;
for(const directory of ['js','scripts','tests']) {
  for(const file of fs.readdirSync(path.join(root,directory))) {
    if(!/\.(js|cjs)$/.test(file)) continue;
    const result=spawnSync(process.execPath,['--check',path.join(root,directory,file)],{encoding:'utf8'});
    if(result.status!==0) { process.stderr.write(result.stderr || 'Échec syntaxe\n'); process.exit(1); }
    count++;
  }
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const resource=match[1].split(/[?#]/)[0];
  if(!resource || /^(https?:|data:)/.test(resource)) continue;
  const full=path.resolve(root,resource);
  if(!full.startsWith(root+path.sep) || !fs.statSync(full).isFile()) throw new Error('Ressource invalide : '+resource);
}
const hash=crypto.createHash('sha1').update(fs.readFileSync(path.join(root,'js/vehicle.js'))).digest('hex');
if(hash!=='61427c125ba990812e0861bdb598e6cf665f3a73') throw new Error('La classe Vehicle du cours a été modifiée.');
for(const document of ['README.md',...fs.readdirSync(path.join(root,'docs')).filter(file=>file.endsWith('.md')).map(file=>'docs/'+file)]) {
  const text=fs.readFileSync(path.join(root,document),'utf8');
  for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if(/^(https?:|mailto:|#)/.test(match[1])) continue;
    const target=path.resolve(root,path.dirname(document),match[1].split('#')[0]);
    if(!target.startsWith(root+path.sep) || !fs.existsSync(target)) throw new Error('Lien local manquant dans '+document+' : '+match[1]);
  }
}
if(!fs.existsSync(path.join(root,'libraries/p5-LICENSE.txt'))) throw new Error('Licence de p5.js absente.');
console.log(count+' fichiers JavaScript valides ; ressources et liens présents ; Vehicle original et licence p5 conservés.');
