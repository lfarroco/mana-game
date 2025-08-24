import { SCENE_KEYS } from "../../constants/constants";

export default class Core extends Phaser.Scene {

	constructor() {
		super('CoreScene');
	}

	preload() {

		this.load.image('cloud_001', 'assets/fx/cloud_001.png');
		this.load.image('cloud_002', 'assets/fx/cloud_002.png');
		this.load.image('cloud_003', 'assets/fx/cloud_003.png');
		this.load.image('cloud_004', 'assets/fx/cloud_004.png');
		this.load.image('cloud_005', 'assets/fx/cloud_005.png');
		this.load.image('cloud_006', 'assets/fx/cloud_006.png');
		this.load.image('cloud_007', 'assets/fx/cloud_007.png');

		//sfx_ui_error.m4a
		this.load.audio('sfx_ui_error', 'assets/audio/sfx_ui_error.m4a');

		//sfx_ui_modalwindow_swoosh_enter.m4a
		this.load.audio('sfx_ui_modalwindow_swoosh_enter', 'assets/audio/sfx_ui_modalwindow_swoosh_enter.m4a');
		//sfx_ui_modalwindow_swoosh_exit.m4a
		this.load.audio('sfx_ui_modalwindow_swoosh_exit', 'assets/audio/sfx_ui_modalwindow_swoosh_exit.m4a');

		//sfx_unit_onclick.m4a
		this.load.audio('sfx_unit_onclick', 'assets/audio/sfx_unit_onclick.m4a');

		this.load.audio('sfx_artifact_equipweapon', 'assets/audio/sfx_artifact_equipweapon.m4a');

		this.load.audio('sfx_victory_reward_chant', 'assets/audio/sfx_victory_reward_chant.m4a');
		this.load.audio('sfx_victory_match', 'assets/audio/sfx_victory_match.m4a');

		this.load.audio('music_ageofdisjunction', 'assets/music/music_ageofdisjunction.m4a');

		this.load.audio('music_battlemap_vetruv', 'assets/music/music_battlemap_vetruv.m4a');
	}

	create() {

		this.game.scene.start(SCENE_KEYS.TITLE);

	}

}