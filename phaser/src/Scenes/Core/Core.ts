
// Co
export default class Core extends Phaser.Scene {

	constructor() {
		super('CoreScene');
	}

	preload() {

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

	}
	create() { }
}