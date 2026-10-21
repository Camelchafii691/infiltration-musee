const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/touch-controls.js'), 'utf8') + '\nthis.TouchControls = TouchControls;', context);
const Controls = context.TouchControls;

test('joystick : zone morte, axes et diagonale bornée', () => {
  assert.equal(Controls.axis(3, 2).x, 0);
  assert.equal(Controls.axis(38, 0).x, 1);
  assert.equal(Controls.axis(-38, 0).x, -1);
  assert.equal(Controls.axis(0, 100).y, 1);
  const diagonal = Controls.axis(100, -100);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
});

test('deux pointeurs : joystick et sprint restent indépendants puis se libèrent', () => {
  class Element {
    constructor() { this.events = new Map(); this.style = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
    setAttribute() {}
    addEventListener(type, fn) { this.events.set(type, fn); }
    removeEventListener(type) { this.events.delete(type); }
    setPointerCapture() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 118, height: 118 }; }
    emit(type, pointerId, x=59, y=59) { this.events.get(type)?.({pointerId, clientX:x, clientY:y}); }
  }
  const nodes = Object.fromEntries(['joystick','joystickThumb','touchSprint','touchSteal','touchPause','touchCrouch','touchDecoy'].map(id => [id,new Element()]));
  context.window = new Element();
  const controls = new Controls({ getElementById: id => nodes[id] });
  nodes.joystick.emit('pointerdown', 1, 97, 59);
  nodes.touchSprint.emit('pointerdown', 2);
  assert.equal(controls.x, 1);
  assert.equal(controls.sprint, true);
  nodes.joystick.emit('pointercancel', 1);
  assert.equal(controls.x, 0);
  assert.equal(controls.sprint, true);
  nodes.touchSprint.emit('pointerup', 2);
  assert.equal(controls.sprint, false);
  controls.destroy();
  assert.equal(nodes.joystick.events.size, 0);
});
