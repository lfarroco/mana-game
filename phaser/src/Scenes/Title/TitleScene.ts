import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { images } from "../../assets";
import * as AudioManager from "@Systems/AudioManager";
import { createManaApp } from "../../mana";
import type { ManaApp, ManaMsg } from "../../mana";
import type { ComponentState } from "../../mana/types";
import { TitleApp, type TitleMsg, type TitleProps } from "./TitleApp";
import type { ManaCloudsBackgroundHandle } from "../../mana/components/CloudsBackgroundApp";

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {
	cloudsBackground?: ManaCloudsBackgroundHandle;
	private manaApp?: ManaApp<TitleMsg, TitleProps>;

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
	}

	preload() {
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
		].forEach(key => {
			this.load.atlas(key, `assets/heroes/${key}.png`, `assets/heroes/${key}.json`);
			this.load.animation(`${key}-anims`, `assets/heroes/${key}-anims.json`);
		});

		this.load.audio('sfx_artifact_equipmask', 'assets/audio/sfx_artifact_equipmask.m4a');

		this.load.audio('sfx_notification', 'assets/audio/notification.m4a');

	}

	create() {
		AudioManager.playMusic('music_ageofdisjunction');

		this.manaApp = createManaApp<TitleMsg, TitleProps>(this, TitleApp, {
			update: this.handleManaMessage,
			initialProps: this.getTitleAppProps(),
		});

		this.input.keyboard?.on('keydown-ENTER', this.startGame, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);
		this.events.once(Phaser.Scenes.Events.DESTROY, this.onSceneDestroy, this);
	}

	openOptions() {
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.OPTIONS);
		});
	}

	openDebug() {
		this.cameras.main.fade(300, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.DEBUG);
		});
	}

	startGame() {
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.BATTLEGROUND);
		});
	}

	toggleFullscreen() {
		if (this.scale.isFullscreen) {
			this.scale.stopFullscreen();
		} else {
			this.scale.startFullscreen();
		}
	}

	private getTitleAppProps(gameSize?: Phaser.Structs.Size): TitleProps {
		const centerX = gameSize ? gameSize.width / 2 : this.cameras.main.centerX;
		const centerY = gameSize ? gameSize.height / 2 : this.cameras.main.centerY;
		const sceneWidth = gameSize ? gameSize.width : this.scale.width;
		const sceneHeight = gameSize ? gameSize.height : this.scale.height;
		return {
			centerX,
			centerY,
			sceneWidth,
			sceneHeight,
			logoOffsetY: 200,
			buttonSpacing: 100,
		};
	}

	private handleManaMessage = (
		msg: TitleMsg,
		state: ComponentState<TitleMsg | ManaMsg>
	): ComponentState<TitleMsg | ManaMsg> => {
		switch (msg.type) {
			case 'START_GAME':
				this.startGame();
				break;
			case 'OPEN_OPTIONS':
				this.openOptions();
				break;
		}
		return state;
	};

	private onSceneShutdown = (): void => {
		this.manaApp?.unmount();
		this.manaApp = undefined;
		this.input.keyboard?.off('keydown-ENTER', this.startGame, this);
	};

	private onSceneDestroy = (): void => {
		this.cloudsBackground?.destroy();
		this.cloudsBackground = undefined;
	};
}
