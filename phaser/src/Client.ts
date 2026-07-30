import * as Assets from "@assets";
import * as BaseCollection from "@game/BaseCollection";
import * as Config from "@config";
import * as TitleScreen from "./Screens/Title/TitleScreen";
import * as BattlegroundScreen from "./Screens/Battleground/BattlegroundScreen";
import * as CrystalSelectionScreen from "./Screens/CrystalSelection/CrystalSelectionScreen";
import * as OptionsScreen from "./Screens/Options/OptionsScreen";
import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as GameServer from "./GameServer";
import { createEnv, env } from "@Env";
import { ClientState } from "@Models/ClientState";
import { GameEvent, NavigationEvent } from "./Events";

// ---------------------------------------------------------------------------
// Screen navigation
// ---------------------------------------------------------------------------

type ScreenModule = {
    name: string;
    create: () => void | Promise<void>;
    destroy?: () => void;
    init?: () => void;
};

let activeScreen: ScreenModule | null = null;
// Hold references to navigation disposers to prevent GC
const _navDisposers: (() => void)[] = [];

// ---------------------------------------------------------------------------
// Navigation serialisation — prevents interleaved switchScreen calls from
// concurrent navigation events (rapid clicks, async emits).  If multiple
// navigations queue while one is in flight, only the latest target runs.
// TODO: actually, the inverse is preferrable: ignore the new event.
// ---------------------------------------------------------------------------
let navChain: Promise<void> = Promise.resolve();
let pendingNavTarget: ScreenModule | null = null;

async function doSwitchScreen(screen: ScreenModule): Promise<void> {
    if (activeScreen) {
        await GameEvent.screenHidden.emit({ name: activeScreen.name });
        if (activeScreen.destroy) {
            activeScreen.destroy();
        }
    }

    // Disable scene input to flush any stale interactive-object references from
    // the InputPlugin (cursors, pointer tracking, registered objects). We re-enable
    // after the new screen is rendered.
    env.scene.input.enabled = false;

    await env.fadeOut(300, 0x000000);
    env.scene.children.removeAll(true);
    env.scene.tweens.killAll();
    env.scene.time.removeAllEvents();

    // Reset the default cursor — the howToPlay container on the title screen sets
    // scene.input.setDefaultCursor("pointer") in its pointerover handler, and if
    // the container is destroyed before pointerout fires the cursor stays "pointer"
    // permanently across the whole scene.
    env.scene.input.setDefaultCursor("default");

    // Re-initialize screen-local events if the module has an init()
    screen.init?.();
    await screen.create();

    activeScreen = screen;
    await GameEvent.screenShown.emit({ name: screen.name });

    await env.fadeIn(300);

    // Re-enable scene input now that the new screen is fully rendered
    env.scene.input.enabled = true;
}

async function switchScreen(screen: ScreenModule): Promise<void> {
    // Already on this screen and no pending navigation — skip immediately.
    if (screen === activeScreen && pendingNavTarget === null) return;

    // Remember the latest target; earlier queued targets will be skipped.
    pendingNavTarget = screen;

    // Chain the navigation after any already-in-flight transition.
    navChain = navChain.then(async () => {
        const target = pendingNavTarget;
        // Nothing pending, or we already landed on it — skip.
        if (!target || target === activeScreen) return;
        pendingNavTarget = null;
        await doSwitchScreen(target);
    });

    await navChain;
}

function wireNavigation(): (() => void)[] {
    return [
        NavigationEvent.toTitle.listen(() => switchScreen(TitleScreen)),
        NavigationEvent.toBattleground.listen(() => switchScreen(BattlegroundScreen)),
        NavigationEvent.toCrystals.listen(() => switchScreen(CrystalSelectionScreen)),
        NavigationEvent.toOptions.listen(() => switchScreen(OptionsScreen)),
    ];
}

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
            "ui/gold_medal"
        ].forEach((key) =>
            this.load.image(key, `assets/${key}.png`)
        );
    }

    loadUnitAssets() {

        const uniquePics = new Set(
            BaseCollection.ALL_CARDS
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
        // Wire global game-event reactions (Tooltip, audio, stats, …)
        _navDisposers.push(...wireGameEvents());

        OptionsStore.init();

        StatsStore.init();

        // Initialize and render the title screen as the first screen
        TitleScreen.init();
        TitleScreen.create();
        activeScreen = TitleScreen;
    }
}
