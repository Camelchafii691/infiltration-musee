const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('interface : plein écran retiré, étoiles, réactions et finale conservées',()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sketch=fs.readFileSync(path.join(root,'js/sketch.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.doesNotMatch(html,/fullscreen|plein écran/i);
  assert.doesNotMatch(sketch,/bindFullscreen|requestFullscreen/);
  assert.doesNotMatch(css,/fullscreen/i);
  assert.equal(fs.existsSync(path.join(root,'js/fullscreen.js')),false);
  assert.match(html,/id="homeRating"/);
  assert.match(html,/id="endRating"/);
  assert.match(sketch,/beginFinalEscape/);
  assert.match(sketch,/PixelRenderer.guardExpressions/);
});
