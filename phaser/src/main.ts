import { initialState } from "./Models/State";
import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";
import * as TraitEffectsImpl from "./TraitSystem/TraitEffects/Implementations";

const state = initialState();

const game = initGame(state);

// Global, one-time registration systems
// TODO: move more global systems that are started in BattlegroundScene here
initializeOptionsStore(game);
TraitEffectsImpl.registerAllTraitEffects();