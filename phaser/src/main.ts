import { initialState, } from "./Models/State";
import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";
import * as TraitEffectsImpl from "./TraitSystem/TraitEffects/Implementations";

// Global, one-time registration systems
initializeOptionsStore();
TraitEffectsImpl.registerAllTraitEffects();

const state = initialState();
window.state = state; // The global state now excludes options

initGame(state);
