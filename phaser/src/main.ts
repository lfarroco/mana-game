import { initialState } from "./Models/State";
import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";
import { OptionsSystemManager } from "./Systems/OptionsSystem/OptionsSystemManager";
import { AudioSystem } from "./Systems/AudioSystem/AudioSystem";
import * as TraitEffectsImpl from "./TraitSystem/TraitEffects/Implementations";

const state = initialState();

const game = initGame(state);

// Global, one-time registration systems
// TODO: move more global systems that are started in BattlegroundScene here

// Initialize the options system with event support
const optionsSystemManager = OptionsSystemManager.initialize(game.events);
initializeOptionsStore(game, optionsSystemManager.getEventEmitter());

// Initialize audio system to respond to sound/music option changes
const audioSystem = new AudioSystem(game);
audioSystem.initialize();

TraitEffectsImpl.registerAllTraitEffects();