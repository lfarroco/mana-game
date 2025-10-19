import { Entity } from "@Models/Entities/Entity";
import { BooleanSpec } from "../controls/boolean";
import { AddChildren, Container } from "@PhaserIO";
import { vec2 } from "@Models/Geometry";
import { MIDDLE_SCREEN_X } from "@Constants/constants";


function create() {

	const container = Container();

	const sound = BooleanSpec(
		"options.sound",
		"Sound",
		vec2(MIDDLE_SCREEN_X, 300)
	).create();

	// this.createVolumeOption('Sound Volume', startY + lineHeight,
	// 	() => this.currentSoundVolume,
	// 	(value: number) => {
	// 		this.currentSoundVolume = value;
	// 		setOption('soundVolume', value);
	// 		this.soundVolumeValueText.setText((Math.round(value * 100)) + '%');
	// 	},
	// 	(text: Phaser.GameObjects.Text) => this.soundVolumeValueText = text
	// );

	const music = BooleanSpec(
		"options.music",
		"Music",
		vec2(MIDDLE_SCREEN_X, 500)
	).create();
	// this.createBooleanOption('Music', startY + lineHeight * 2,
	// 	() => this.currentMusicSetting,
	// 	(value: boolean) => {
	// 		this.currentMusicSetting = value;
	// 		setOption('music', value);
	// 		this.musicValueText.setText(value ? 'ON' : 'OFF');
	// 	},
	// 	(text: Phaser.GameObjects.Text) => this.musicValueText = text
	// );

	// this.createVolumeOption('Music Volume', startY + lineHeight * 3,
	// 	() => this.currentMusicVolume,
	// 	(value: number) => {
	// 		this.currentMusicVolume = value;
	// 		setOption('musicVolume', value);
	// 		this.musicVolumeValueText.setText((Math.round(value * 100)) + '%');
	// 	},
	// 	(text: Phaser.GameObjects.Text) => this.musicVolumeValueText = text
	// );

	AddChildren(container, [sound, music])

	return container;
}

const spec: Entity<Container> = {
	key: "options/controls",
	create
}

export default spec;