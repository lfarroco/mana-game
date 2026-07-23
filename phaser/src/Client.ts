import * as Assets from "@assets";
import * as Card from "@game/Entities/Card";
import * as BaseCollection from "@game/BaseCollection";
import * as Config from "@config";
import * as TitleScreen from "./Screens/Title/TitleScreen";
import * as BattlegroundScreen from "./Screens/Battleground/BattlegroundScreen";
import * as CrystalSelectionScreen from "./Screens/CrystalSelection/CrystalSelectionScreen";
import * as OptionsScreen from "./Screens/Options/OptionsScreen";
import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import * as GameServer from "./GameServer";
import { createEnv, env } from "@Env";
import { ClientState } from "@Models/ClientState";
import { NavigationEvent } from "./Events";

// ---------------------------------------------------------------------------
// Screen navigation
// ---------------------------------------------------------------------------

type ScreenModule = {
    create: () => void | Promise<void>;
    destroy?: () => void;
    init?: () => void;
};

let activeScreen: ScreenModule | null = null;
// Hold references to navigation disposers to prevent GC
const _navDisposers: (() => void)[] = [];

async function switchScreen(screen: ScreenModule): Promise<void> {
    if (activeScreen?.destroy) {
        activeScreen.destroy();
    }

    await env.fadeOut(300, 0x000000);
    env.scene.children.removeAll();
    env.scene.tweens.killAll();
    env.scene.time.removeAllEvents();

    // Re-initialize screen-local events if the module has an init()
    screen.init?.();
    await screen.create();

    activeScreen = screen;
    await env.fadeIn(300);
}

function wireNavigation(): (() => void)[] {
    return [
        NavigationEvent.toTitle.listen(() => switchScreen(TitleScreen)),
        NavigationEvent.toBattleground.listen(() => switchScreen(BattlegroundScreen)),
        NavigationEvent.toCrystals.listen(() => switchScreen(CrystalSelectionScreen)),
        NavigationEvent.toOptions.listen(() => switchScreen(OptionsScreen)),
    ];
}

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

        createEnv(
            this,
            clientState,
            (action) => GameServer.getServer()
                .handleAction(clientState.session.player_id, action),
        );

        // Wire global navigation events
        _navDisposers.push(...wireNavigation());

        // Wire battleground-specific events (one-time)
        BattlegroundScreen.wireBattlegroundEvents();

        Card.registerCollection(BaseCollection.BASE_COLLECTION_DATA);

        OptionsStore.init();

        StatsStore.init();

        // Initialize and render the title screen as the first screen
        TitleScreen.init();
        TitleScreen.create();
        activeScreen = TitleScreen;
    }
}
