import { images } from "@assets";
import { SCENE_KEYS } from "@Constants/constants";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { DISABLE_ASSETS } from "@config";

export default class Core extends Phaser.Scene {
	constructor() {
		super("CoreScene");
	}

	preload() {

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

		const assetText = this.make.text({
			x: width / 2,
			y: height / 2 + 50,
			text: "",
			style: {
				font: "18px monospace",
				color: "#ffffff",
			},
		});
		assetText.setOrigin(0.5, 0.5);

		this.load.on("progress", function (value: number) {
			percentText.setText(parseInt(value * 100 + "") + "%");
			progressBar.clear();
			progressBar.fillStyle(0xffffff, 1);
			progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
		});

		this.load.on("fileprogress", function (file: { key: string }) {
			assetText.setText("Loading asset: " + file.key);
		});

		this.load.on("complete", function () {
			progressBar.destroy();
			progressBox.destroy();
			loadingText.destroy();
			percentText.destroy();
			assetText.destroy();
		});
		
        if (DISABLE_ASSETS) return;

		this.loadUnitAssets();
        this.loadUIAssets();
        this.loadAudioAssets();

	}

    loadUIAssets() {

		this.load.image(images.logo);
		this.load.image("ui/armory", "assets/ui/armory.png");
		this.load.image("ui/assassin", "assets/ui/assassin.png");
		this.load.image("ui/commander", "assets/ui/commander.png");
		this.load.image("ui/dark_ritual", "assets/ui/dark_ritual.png");
		this.load.image("ui/forest_pools", "assets/ui/forest_pools.png");
		this.load.image("ui/frontier_fort", "assets/ui/frontier_fort.png");
		this.load.image("ui/improve_damage", "assets/ui/improve_damage.png");
		this.load.image("ui/improve_haste", "assets/ui/improve_haste.png");
		this.load.image("ui/improve_heal", "assets/ui/improve_heal.png");
		this.load.image("ui/improve_regen", "assets/ui/improve_regen.png");
		this.load.image("ui/improve_shield", "assets/ui/improve_shield.png");
		this.load.image("ui/improve_slow", "assets/ui/improve_slow.png");
		this.load.image("ui/power_distributor", "assets/ui/power_distributor.png");
		this.load.image("ui/power_absorber", "assets/ui/power_absorber.png");
		this.load.image("ui/sacrifice", "assets/ui/sacrifice.png");
		this.load.image("ui/thunder_spire", "assets/ui/thunder_spire.png");
		this.load.image("ui/toxic", "assets/ui/toxic.png");
		this.load.image("ui/trial_circuit", "assets/ui/trial_circuit.png");
		this.load.image("ui/upgrade_unit", "assets/ui/upgrade_unit.png");
		this.load.image("ui/silver_medal", "assets/ui/silver_medal.png");
		this.load.image("ui/gold_medal", "assets/ui/gold_medal.png");

    }

	loadUnitAssets() {

		const uniquePics = new Set(
			BASE_COLLECTION_DATA
              .cards
              .filter((card) => !card.isCore)
               .map((card) => card.pic)
		);

		for (const pic of uniquePics) {
			this.load.atlas(
              pic,
              `assets/heroes/${pic}.png`,
              `assets/heroes/${pic}.json`,
            );
			this.load.json(`${pic}-anims`, `assets/heroes/${pic}-anims.json`);
		}


        this.load.image("blue-stone", "assets/blue-stone.png");
		this.load.image("haste-stone", "assets/haste-stone.png");
		this.load.image("red-stone", "assets/red-stone.png");
		this.load.image("yellow-stone", "assets/yellow-stone.png");
		this.load.image("green-stone", "assets/green-stone.png");
		this.load.image("purple-stone", "assets/purple-stone.png");

	}

    loadAudioAssets(){
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

		this.load.audio( "sfx_voidhunter_attack_impact", "assets/audio/sfx_voidhunter_attack_impact.m4a"
		);
		this.load.audio("sfx_spell_deathstrikeseal", "assets/audio/sfx_spell_deathstrikeseal.m4a");

		this.load.audio("sfx_ui_select", "assets/audio/sfx_ui_select.m4a");

		this.load.audio("sfx_victory_reward_chant", "assets/audio/sfx_victory_reward_chant.m4a");
		this.load.audio("sfx_victory_match", "assets/audio/sfx_victory_match.m4a");

		this.load.audio("music_ageofdisjunction", "assets/music/music_ageofdisjunction.m4a");
		this.load.audio("music_battlemap_vetruv", "assets/music/music_battlemap_vetruv.m4a");
		this.load.audio("music_playmode", "assets/music/music_playmode.m4a");

		this.load.audio("sfx_artifact_equipmask", "assets/audio/sfx_artifact_equipmask.m4a");
		
        this.load.audio("sfx_notification", "assets/audio/notification.m4a");

        this.load.audio("sfx_artifact_equipmask", "assets/audio/sfx_artifact_equipmask.m4a");
        this.load.audio("sfx_notification", "assets/audio/notification.m4a");
        this.load.audio("sfx_spell_innerfocus", "assets/audio/sfx_spell_innerfocus.m4a");

    }

	create() {
		const collection = BASE_COLLECTION_DATA;

		registerCollection(collection);

		this.game.scene.start(SCENE_KEYS.TITLE);
	}
}
