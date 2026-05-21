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
          "sfx_ui_select",
          "sfx_victory_reward_chant",
          "sfx_victory_match",
          "sfx_artifact_equipmask",
          "sfx_notification",
          "sfx_spell_innerfocus",
          "music_ageofdisjunction",
          "music_battlemap_vetruv",
          "music_playmode",
        ].forEach((key) => 
          this.load.audio(key, `assets/audio/${key}.m4a`)
        );

    }

	create() {
		const collection = BASE_COLLECTION_DATA;

		registerCollection(collection);

		this.game.scene.start(SCENE_KEYS.TITLE);
	}
}
