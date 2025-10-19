import * as Phaser from "phaser";
import * as constants from "../../Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { getState } from "@Models/State";
import { registerEntity } from "@Models/Entities/Entity";

import spec from "./TitleScene.spec"

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {
	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
	}

	create() {
		getState().currentScene = this;

		//@ts-ignore
		window.titleScene = this;

		spec.create.forEach(registerEntity)

		AudioManager.playMusic('music_ageofdisjunction');

		spec.input.forEach(([key, event]) => {
			if (key.startsWith("keydown-"))
				this.input.keyboard?.on(key, () => {
					event.handler();
				});
		})
	}
}
