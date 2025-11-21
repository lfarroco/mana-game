import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { setCurrentScene, getState } from "@Models/State";
import { startButton } from "./components/new_run_button";
import { startGame } from "../../Game/effects/startGame";
import { cloudsBg } from "./components/cloudsBg";
import { optionsButton } from "./components/optionsButton";
import { goFullscreenButton } from "./components/goFullscreenButton";
import { resumeGameButton } from "./components/resumeGameButton";
import { logo } from "./components/logo";
import { init } from "@Components/Tooltip";

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {
	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
		//@ts-ignore
		window.titleScene = this;
	}

	create() {
		setCurrentScene(this);

		AudioManager.playMusic("music_ageofdisjunction");

		cloudsBg();

		logo();

		[
			resumeGameButton,
			startButton,
			optionsButton,
			goFullscreenButton,
		].forEach((fn, index) => fn(500 + index * 100));

		this.input.keyboard?.on("keydown-ENTER", startGame);

		// const PGIurl = 'https://cdn.jsdelivr.net/gh/SilverTree7622/Phaser3_GUI_Inspector@latest/dist/PGInspector.js';
		// const PGIele = document.createElement('script');
		// PGIele.src = PGIurl;
		// document.head.appendChild(PGIele);
		// setTimeout(() => {
		// 	//@ts-ignore
		// 	PhaserGUIAction(this);
		// }, 500)

		//@ts-ignore
		window.triggerGameComplete = (wins: number = 0) => {
			const gameState = getState();
			gameState.gameData.player.wins = wins;
			if (wins < 10) {
				gameState.gameData.player.lives = 0;
			} else {
				gameState.gameData.player.lives = 4;
			}

			// Add dummy units for testing if empty
			if (gameState.gameData.player.units.length === 0) {
				gameState.gameData.player.units = [
					{
						id: "test-unit-1",
						cardId: "fortress",
						name: "Warrior",
						pic: "boss_city", // Assuming texture key, fallback will handle if missing
						force: "PLAYER",
						position: { x: 0, y: 0 },
						rank: 1,
						power: 10,
						life: 100,
						maxLife: 100,
						shield: 0,
						cooldown: 100,
						evade: 0,
						effects: [],
						reactions: [],
						charge: 0,
						refresh: 0,
						hasted: 0,
						slowed: 0,
						isCore: false
					},
					{
						id: "test-unit-2",
						cardId: "parry_master",
						name: "Healer",
						pic: "neutral_swordofakrane",
						force: "PLAYER",
						position: { x: 1, y: 1 },
						rank: 1,
						power: 10,
						life: 80,
						maxLife: 80,
						shield: 0,
						cooldown: 100,
						evade: 0,
						effects: [],
						reactions: [],
						charge: 0,
						refresh: 0,
						hasted: 0,
						slowed: 0,
						isCore: false
					},
					{
						id: "test-unit-3",
						cardId: "parry_master",
						name: "Healer",
						pic: "neutral_swordofakrane",
						force: "PLAYER",
						position: { x: 2, y: 2 },
						rank: 1,
						power: 10,
						life: 80,
						maxLife: 80,
						shield: 0,
						cooldown: 100,
						evade: 0,
						effects: [],
						reactions: [],
						charge: 0,
						refresh: 0,
						hasted: 0,
						slowed: 0,
						isCore: false
					}
				];
			}

			const container = this.add.container(0, 0);
			container.setDepth(2000);
			const state = {
				resultsContainer: container,
				backgroundOverlay: null,
				isOpen: true
			};

			init();

			// Dynamic import to avoid circular dependencies if any, or just standard import
			import("../Battleground/Results/GameCompleteUI").then(module => {
				module.displayGameComplete(state, wins, gameState.gameData.player.units);
			});
		};
	}
}
