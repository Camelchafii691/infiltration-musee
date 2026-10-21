/** Joystick multi-touch : un pointeur pour bouger, un autre pour sprinter. */
class TouchControls {
  constructor(root = document) {
    this.x = 0;
    this.y = 0;
    this.sprint = false;
    this.crouch = false;
    this.pointerId = null;
    this.pad = root.getElementById('joystick');
    this.thumb = root.getElementById('joystickThumb');
    this.listeners = [];
    this.listen(this.pad, 'pointerdown', (event) => {
      if (this.pointerId !== null) return;
      this.pointerId = event.pointerId;
      this.pad.setPointerCapture(event.pointerId);
      this.move(event);
    });
    this.listen(this.pad, 'pointermove', (event) => {
      if (event.pointerId === this.pointerId) this.move(event);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.listen(this.pad, type, (event) => {
        if (event.pointerId === this.pointerId) this.resetStick();
      });
    }
    const sprint = root.getElementById('touchSprint');
    this.listen(sprint, 'pointerdown', (event) => {
      sprint.setPointerCapture(event.pointerId);
      this.sprint = true;
      sprint.classList.add('pressed');
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.listen(sprint, type, () => { this.sprint = false; sprint.classList.remove('pressed'); });
    }
    this.listen(root.getElementById('touchSteal'), 'click', () => { if (window.game) window.game.trySteal(); });
    this.listen(root.getElementById('touchPause'), 'click', () => { if (window.toggleGamePause) window.toggleGamePause(); });
    this.crouchButton=root.getElementById('touchCrouch');
    this.listen(this.crouchButton,'click',()=>{
      this.crouch=!this.crouch;
      this.crouchButton.setAttribute('aria-pressed',String(this.crouch));
      this.crouchButton.classList.toggle('pressed',this.crouch);
    });
    this.listen(root.getElementById('touchDecoy'),'click',()=>{ if (window.game) window.game.throwDecoy(); });
    this.listen(window, 'blur', () => { this.resetModes(); });
  }

  listen(target, type, callback) {
    target.addEventListener(type, callback);
    this.listeners.push([target, type, callback]);
  }

  static axis(dx, dy, radius = 38) {
    const distance = Math.hypot(dx, dy);
    if (distance < 7) return { x: 0, y: 0 };
    const length = Math.max(radius, distance);
    return { x: dx / length, y: dy / length };
  }

  move(event) {
    const rect = this.pad.getBoundingClientRect();
    const axis = TouchControls.axis(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
    this.x = axis.x;
    this.y = axis.y;
    this.thumb.style.transform = `translate(${this.x * 38}px, ${this.y * 38}px)`;
  }

  resetStick() {
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.thumb.style.transform = '';
  }

  destroy() {
    this.listeners.forEach(([target, type, callback]) => target.removeEventListener(type, callback));
    this.listeners = [];
    this.resetModes();
  }

  resetModes() {
    this.resetStick(); this.sprint=false; this.crouch=false;
    if (this.crouchButton) { this.crouchButton.setAttribute('aria-pressed','false'); this.crouchButton.classList.remove('pressed'); }
  }
}
