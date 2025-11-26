import { images } from "../../assets";
import { SCENE_KEYS } from "@Constants/constants";

export default class Core extends Phaser.Scene {
	constructor() {
		super("CoreScene");
	}

	preload() {
		this.load.image("cloud_001", "assets/fx/cloud_001.png");
		this.load.image("cloud_002", "assets/fx/cloud_002.png");
		this.load.image("cloud_003", "assets/fx/cloud_003.png");
		this.load.image("cloud_004", "assets/fx/cloud_004.png");
		this.load.image("cloud_005", "assets/fx/cloud_005.png");
		this.load.image("cloud_006", "assets/fx/cloud_006.png");
		this.load.image("cloud_007", "assets/fx/cloud_007.png");

		this.load.image("blue-stone", "assets/blue-stone.png");
		this.load.image("haste-stone", "assets/haste-stone.png");
		this.load.image("red-stone", "assets/red-stone.png");
		this.load.image("yellow-stone", "assets/yellow-stone.png");
		this.load.image("green-stone", "assets/green-stone.png");
		this.load.image("purple-stone", "assets/purple-stone.png");

		//sfx_ui_error.m4a
		this.load.audio("sfx_ui_error", "assets/audio/sfx_ui_error.m4a");

		//sfx_ui_modalwindow_swoosh_enter.m4a
		this.load.audio(
			"sfx_ui_modalwindow_swoosh_enter",
			"assets/audio/sfx_ui_modalwindow_swoosh_enter.m4a"
		);
		//sfx_ui_modalwindow_swoosh_exit.m4a
		this.load.audio(
			"sfx_ui_modalwindow_swoosh_exit",
			"assets/audio/sfx_ui_modalwindow_swoosh_exit.m4a"
		);

		//sfx_unit_onclick.m4a
		this.load.audio("sfx_unit_onclick", "assets/audio/sfx_unit_onclick.m4a");

		this.load.audio("sfx_artifact_equipweapon", "assets/audio/sfx_artifact_equipweapon.m4a");

		this.load.audio("sfx_voidhunter_death", "assets/audio/sfx_voidhunter_death.m4a");
		this.load.audio("sfx_spell_truestrike", "assets/audio/sfx_spell_truestrike.m4a");
		this.load.audio("sfx_spell_tranquility", "assets/audio/sfx_spell_tranquility.m4a");
		this.load.audio("sfx_spell_manavortex", "assets/audio/sfx_spell_manavortex.m4a");

		this.load.audio("sfx_unit_run_magical_4", "assets/audio/sfx_unit_run_magical_4.m4a");

		this.load.audio("sfx_voidhunter_attack_impact", "assets/audio/sfx_voidhunter_attack_impact.m4a");
		this.load.audio("sfx_spell_deathstrikeseal", "assets/audio/sfx_spell_deathstrikeseal.m4a");

		this.load.audio("sfx_ui_select", "assets/audio/sfx_ui_select.m4a");

		this.load.audio("sfx_victory_reward_chant", "assets/audio/sfx_victory_reward_chant.m4a");
		this.load.audio("sfx_victory_match", "assets/audio/sfx_victory_match.m4a");

		this.load.audio("music_ageofdisjunction", "assets/music/music_ageofdisjunction.m4a");
		this.load.audio("music_battlemap_vetruv", "assets/music/music_battlemap_vetruv.m4a");
		this.load.audio("music_playmode", "assets/music/music_playmode.m4a");

		this.load.image(images.logo);

		// Hero assets are now lazy-loaded in Chara.ts


		this.load.audio("sfx_artifact_equipmask", "assets/audio/sfx_artifact_equipmask.m4a");

		this.load.audio("sfx_notification", "assets/audio/notification.m4a");
	}

	create() {
		this.game.scene.start(SCENE_KEYS.TITLE);
	}
}
