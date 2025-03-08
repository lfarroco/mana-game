import events from "events";
import { State, initialState, listenToStateEvents } from "./Models/State";
import { initGame } from "./initGame";
import { initUI } from "./initUI";

const eventEmitter = new events.EventEmitter();

declare global {
  interface Window {
    state: State; // TODO: this is bad
    emitter: events.EventEmitter; // TOOD: this is bad as well
  }
}

const state = initialState();
window.state = state;
window.emitter = eventEmitter;

// create this listener first so that state changes are processed first
listenToStateEvents(state);

initUI();
initGame(state);

class ExampleScene extends Phaser.Scene {
  orb!: Phaser.GameObjects.Particles.ParticleEmitter;
  explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  tween!: Phaser.Tweens.Tween;
  rays!: Phaser.GameObjects.Particles.ParticleEmitter;
  preload() {
    this.load.image("white-dot", "assets/fx/white-dot.png");
    this.load.image("light-pillar", "assets/fx/light-pillar.png");
  }

  create() {

    // Create glowing orb using graphics
    this.createSwirlingOrb();

    // Create explosion emitter
    this.explosionEmitter = this.add.particles(0, 0, 'white-dot', {
      speed: { min: 200, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      tint: [0xffff00, 0xffffff],
      maxParticles: 10,
      blendMode: 'ADD',
    });
    this.explosionEmitter.stop();

    // Movement tween
    this.tween = this.tweens.add({
      targets: this.orb,
      x: 400,
      y: 200,
      duration: 1000,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.orb.stop();
        this.rays.stop();
        this.triggerExplosion();
      }
    });
  }

  createSwirlingOrb() {

    // use particle emitter to create a glowing orb
    this.orb = this.add.particles(100, 100, 'white-dot', {
      speed: { min: 100, max: 100 },
      scale: { start: 4, end: 1 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      frequency: 30,
      maxAliveParticles: 30,
      blendMode: 'ADD',
      //golden tones 
      tint: [0xffff00, 0xffffff]
    });

    // radial rays of light that follow the orb
    this.rays = this.add.particles(10, 5, 'light-pillar', {
      speed: 100,
      scaleX: { min: 0.01, max: 0.02 },
      scaleY: { min: 0.2, max: 0.25 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xffff00, 0xffffff],
      lifespan: 30,
      frequency: 10,
      blendMode: 'ADD'
    });

    //follow the orb
    this.rays.startFollow(this.orb);

  }

  triggerExplosion() {
    this.explosionEmitter.explode(50, this.orb.x, this.orb.y);
  }

}


// document.addEventListener('contextmenu', (e) => {
//   e.preventDefault();
// });