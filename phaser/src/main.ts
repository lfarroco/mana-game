import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";
import { OptionsSystemManager } from "./Systems/OptionsSystem/OptionsSystemManager";
import { AudioSystem } from "./Systems/AudioSystem/AudioSystem";
import { AudioManager } from "./Systems/AudioManager";

const game = initGame();

// Global, one-time registration systems
// TODO: move more global systems that are started in BattlegroundScene here

// Initialize the new AudioManager singleton
const audioManager = AudioManager.getInstance();
audioManager.initialize(game);

// Initialize the options system with event support
OptionsSystemManager.initialize(game.events);
initializeOptionsStore(game);

// Initialize legacy audio system (now delegates to AudioManager)
const audioSystem = new AudioSystem(game);
audioSystem.initialize();