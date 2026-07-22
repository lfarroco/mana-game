import * as Assets from "@assets";
import * as Card from "@game/Entities/Card";
import * as BaseCollection from "@game/BaseCollection";
import * as Config from "@config";
import * as TitleScreen from "./Screens/Title/TitleScreen";
import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import * as GameServer from "./GameServer";
import { createEnv } from "./Env";
import { ClientState } from "@Models/ClientState";

export default (clientState: ClientState) => class Client extends Phaser.Scene {

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
            percentText.setText(parseInt(value * 100 + "") + "%");
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
            "ui/gold_medal"
        ].forEach((key) =>
            this.load.image(key, `assets/${key}.png`)
        );
    }

    loadUnitAssets() {

        const uniquePics = new Set(
            BaseCollection.BASE_COLLECTION_DATA
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

        const env = createEnv(
            this,
            clientState,
            (action) => GameServer.getServer()
                .handleAction(clientState.session.player_id, action),
        );

        // ~~~ Bridge to legacy io global (transitional — removed in Phase 5) ~~~
        io.setEnv(env);

        Card.registerCollection(BaseCollection.BASE_COLLECTION_DATA);

        OptionsStore.init();

        StatsStore.init();

        TitleScreen.create();
    }
}
