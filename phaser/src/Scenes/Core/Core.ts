import { images } from "../../assets";
import { SCENE_KEYS } from "@Constants/constants";

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


		this.load.image('blue-stone', "assets/blue-stone.png")
		this.load.image('haste-stone', "assets/haste-stone.png")
		this.load.image('red-stone', "assets/red-stone.png")
		this.load.image('yellow-stone', "assets/yellow-stone.png")
		this.load.image('green-stone', "assets/green-stone.png")
		this.load.image('purple-stone', "assets/purple-stone.png")

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

		this.load.image(images.logo);

		[
			'boss_andromeda',
			'boss_spelleater',
			'f1_tank',
			'f3_mech',
			'f3_windgiver',
			'neutral_amu',
			'neutral_arrowwhistler',
			'neutral_golemnature',
			'neutral_golemstone',
			'boss_shadowlord',
			'boss_borealjuggernaut',
			'boss_chaosknight',
			'boss_cindera',
			'boss_crystal',
			'f1_peacekeeper',
			'f1_radiantdragoon',
			'f1_rightfulheir',
			'f1_shieldforger',
			'f1_sinergyunit',
			'f1_sister',
			'f2_chakriavatar',
			'f1_slo',
			'boss_vampire',
			'f4_plaguedr',
			'f2_firewyrm',
			'f3_sandhowler',
			'f6_crystalbeetle',
			'neutral_bloodletter',
			'f5_mech',
			'f1_mech',
			'f1_shieldforger',
			'f1_solarius',
			'neutral_voidhunter',
			'neutral_swordofakrane',
			'neutral_beastmaster',
			'f2_mage4winds',
			'neutral_gambler',
			'neutral_serpenti',
			'f6_treant',
			'f4_furosa',
			'f5_ankylos',
			'f6_myriad',
			'f3_nimbus',
			'neutral_spelljammer',
			'neutral_shuffler',
			'neutral_healingmystictwitch',
			'neutral_healingmysticbandainamco',
			'neutral_healingmystic',
			'boss_soulstealer',
			'f6_auroraguardian',
			'f3_obelyskduskwind',
			'boss_harmony',
			'neutral_timekeeper',
			'f4_klaxon',
			'f3_plague_totem',
			'f5_drogon',
			'neutral_dreamgazer',
			'f4_gloomchaser',
			'f4_horror',
			'neutral_bonereaper',
			'f4_nocturn'


		].forEach((key) => {
			this.load.atlas(key, `assets/heroes/${key}.png`, `assets/heroes/${key}.json`);
			this.load.animation(`${key}-anims`, `assets/heroes/${key}-anims.json`);
		});

		this.load.audio('sfx_artifact_equipmask', 'assets/audio/sfx_artifact_equipmask.m4a');

		this.load.audio('sfx_notification', 'assets/audio/notification.m4a');

	}

	create() {

		this.game.scene.start(SCENE_KEYS.TITLE);

	}

}