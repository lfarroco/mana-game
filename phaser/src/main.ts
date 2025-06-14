import { initialState, } from "./Models/State";
import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";
import * as TraitEffectsImpl from "./TraitSystem/TraitEffects/Implementations";

// Global, one-time registration systems
initializeOptionsStore();
TraitEffectsImpl.registerAllTraitEffects();
// TODO: move more global systems that are started in BattlegroundScene here

const state = initialState();

initGame(state);
