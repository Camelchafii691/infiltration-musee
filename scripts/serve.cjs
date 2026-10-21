const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};

function createGameServer() {
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    if(!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{Allow:'GET, HEAD'}); res.end(); return; }
    let route;
    try { route=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch (_) { res.writeHead(400); res.end(); return; }
    if(route==='/') route='/index.html';
    // Ne jamais exposer .git, les secrets, les tests ou les fichiers de travail.
    const allowed=['/index.html','/style.css','/libraries/p5.min.js'].includes(route) ||
      /^\/js\/[a-z0-9-]+\.js$/.test(route) || /^\/assets\/[a-z0-9-]+\.(png|svg)$/.test(route);
    if(!allowed) { res.writeHead(404); res.end(); return; }
    try {
      const file=path.resolve(root,'.'+route);
      const real=await fs.realpath(file);
      if(!real.startsWith(root+path.sep)) { res.writeHead(404); res.end(); return; }
      const data=await fs.readFile(real);
      res.writeHead(200,{'Content-Type':types[path.extname(real)] || 'application/octet-stream','Content-Length':data.length});
      res.end(req.method==='HEAD' ? undefined : data);
    } catch (_) { res.writeHead(404); res.end(); }
  });
}
if(require.main===module) {
  const port=Number(process.env.HEIST_PORT || 8080);
  const host=process.env.HEIST_HOST || '127.0.0.1';
  if(!Number.isInteger(port)||port<1||port>65535) throw new Error('HEIST_PORT doit être compris entre 1 et 65535.');
  const server=createGameServer();
  server.on('error',error=>{console.error('Serveur : '+error.message);process.exitCode=1;});
  server.listen(port,host,()=>console.log('IN•FILTRATION : http://'+host+':'+port));
}
module.exports={createGameServer};
