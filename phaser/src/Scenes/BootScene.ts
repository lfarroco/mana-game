/**
 * BootScene — the game's first Phaser scene.
 *
 * Loads every asset once (Phaser's caches are game-wide, so screen scenes use
 * them without re-loading), creates `env`, initialises the stores, installs
 * the dev console helpers and wires global game events. It then hands over to
 * the title screen scene.
 *
 * This used to be `Client` — the single scene that also hosted every screen.
 * It no longer knows about screens: navigation lives in `Scenes/AppRouter.ts`.
 */

import * as Assets from "@assets";
import * as BaseCollection from "@game/BaseCollection";
import * as Config from "@config";
import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as GameServer from "../GameServer";
import * as DebugCommands from "../debug/debugCommands";
import { createEnv } from "@Env";
import { ClientState } from "@Models/ClientState";
import { GameEvent } from "../Events";

/** Phaser scene key of the boot scene. */
export const BOOT_SCENE_KEY = "boot";

/** Scene the boot sequence hands over to. */
export const FIRST_SCENE_KEY = "title";

// Hold references to navigation disposers to prevent GC
const _navDisposers: (() => void)[] = [];

/**
 * Wire global game-event listeners.  These react to domain events (screen
 * shown, run started, etc.) and call the appropriate service — keeping
 * screens free of direct imports to AudioManager, Tooltip, etc.
 *
 * Disposers are stored permanently (never torn down).  Event payloads must
 * never carry Phaser game-object references.
 */
function wireGameEvents(): (() => void)[] {
	return [
		GameEvent.screenShown.listen(({ name: _name }) => {
			Tooltip.init();
		}),
	];
}

export default (clientState: ClientState) =>
	class BootScene extends Phaser.Scene {
		constructor() {
			super({ key: BOOT_SCENE_KEY });
		}

		preload() {
			this.createLoadingBar();

			if (Config.DISABLE_ASSETS) return;

			this.loadUnitAssets();
			this.loadUIAssets();
			this.loadAudioAssets();
		}

		createLoadingBar() {
			const width = this.cameras.main.width;
			const height = this.cameras.main.height;

			const progressBar = this.add.graphics();
			const progressBox = this.add.graphics();
			progressBox.fillStyle(0x222222, 0.8);
			progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

			const loadingText = this.make.text({
				x: width / 2,
				y: height / 2 - 50,
				text: "Loading...",
				style: {
					font: "20px monospace",
					color: "#ffffff",
				},
			});
			loadingText.setOrigin(0.5, 0.5);

			const percentText = this.make.text({
				x: width / 2,
				y: height / 2,
				text: "0%",
				style: {
					font: "18px monospace",
					color: "#ffffff",
				},
			});
			percentText.setOrigin(0.5, 0.5);

			this.load.on("progress", function (value: number) {
				percentText.setText(Math.round(value * 100) + "%");
				progressBar.clear();
				progressBar.fillStyle(0xffffff, 1);
				progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
			});

			this.load.on("complete", function () {
				progressBar.destroy();
				progressBox.destroy();
				loadingText.destroy();
				percentText.destroy();
			});
		}

		loadUIAssets() {
			this.load.image(Assets.images.logo);
			[
				"ui/armory",
				"ui/assassin",
				"ui/commander",
				"ui/dark_ritual",
				"ui/forest_pools",
				"ui/frontier_fort",
				"ui/improve_damage",
				"ui/improve_haste",
				"ui/improve_heal",
				"ui/improve_regen",
				"ui/improve_shield",
				"ui/improve_slow",
				"ui/power_distributor",
				"ui/power_absorber",
				"ui/sacrifice",
				"ui/thunder_spire",
				"ui/toxic",
				"ui/trial_circuit",
				"ui/upgrade_unit",
				"ui/silver_medal",
				"ui/gold_medal",
			].forEach((key) => this.load.image(key, `assets/${key}.png`));
		}

		loadUnitAssets() {
			const uniquePics = new Set(
				BaseCollection.ALL_CARDS.filter((card) => !card.isCore).map((card) => card.pic)
			);

			for (const pic of uniquePics) {
				this.load.atlas(pic, `assets/heroes/${pic}.png`, `assets/heroes/${pic}.json`);
				this.load.json(`${pic}-anims`, `assets/heroes/${pic}-anims.json`);
			}

			this.load.image("blue-stone", "assets/blue-stone.png");
			this.load.image("haste-stone", "assets/haste-stone.png");
			this.load.image("red-stone", "assets/red-stone.png");
			this.load.image("yellow-stone", "assets/yellow-stone.png");
			this.load.image("green-stone", "assets/green-stone.png");
			this.load.image("purple-stone", "assets/purple-stone.png");
			this.load.image("healing-stone", "assets/healing-stone.png");
			this.load.image("rocky-stone", "assets/rocky-stone.png");
			this.load.image("void-stone", "assets/void-stone.png");
		}

		loadAudioAssets() {
			[
				"sfx_ui_error",
				"sfx_ui_modalwindow_swoosh_enter",
				"sfx_ui_modalwindow_swoosh_exit",
				"sfx_unit_onclick",
				"sfx_artifact_equipweapon",
				"sfx_voidhunter_death",
				"sfx_spell_truestrike",
				"sfx_spell_tranquility",
				"sfx_spell_manavortex",
				"sfx_unit_run_magical_4",
				"sfx_voidhunter_attack_impact",
				"sfx_spell_deathstrikeseal",
				"sfx_spell_heal",
				"sfx_spell_graspofagony",
				"sfx_spell_icepillar",
				"sfx_spell_voidwalk",
				"sfx_spell_bladebreaker",
				"sfx_ui_select",
				"sfx_victory_reward_chant",
				"sfx_victory_match",
				"sfx_artifact_equipmask",
				"sfx_notification",
				"sfx_spell_innerfocus",
				"music_ageofdisjunction",
				"music_battlemap_vetruv",
				"music_playmode",
			].forEach((key) => this.load.audio(key, `assets/audio/${key}.m4a`));
		}

		create() {
			createEnv(this, clientState, (action) =>
				GameServer.getServer().handleAction(clientState.session.player_id, action)
			);

			OptionsStore.init();
			StatsStore.init();

			// Dev-only console helpers (window.__debug) — no-op in production builds.
			DebugCommands.installDebugCommands();

			// Wire global game-event reactions (Tooltip, audio, stats, …)
			_navDisposers.push(...wireGameEvents());

			// Hand the screen over to the first real screen scene. Phaser boots
			// only the first scene in the config array, so this is the one
			// explicit hand-off; every later transition goes through AppRouter.
			this.scene.start(FIRST_SCENE_KEY);
		}
	};
