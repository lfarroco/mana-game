import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";
import { audioManager } from "./Systems/AudioManager";

const game = initGame();

// Initialize the new AudioManager singleton
audioManager.initialize(game);

// Initialize the options system with event support
initializeOptionsStore(game);
