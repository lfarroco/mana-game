import { Entity } from "@Models/Entities/Entity";
import { BooleanSpec } from "../controls/boolean";
import { AddChildren, Container } from "@PhaserIO";
import { vec2 } from "@Models/Geometry";
import { MIDDLE_SCREEN_X } from "@Constants/constants";
import { VolumeSpec } from "../controls/volume";
import update_sound_volume from "@Scenes/Options/events/update_sound_volume";
import update_music_volume from "@Scenes/Options/events/update_music_volume";


function create() {

	const container = Container();

	const sound = BooleanSpec(
		"options.sound",
		"Sound",
		vec2(MIDDLE_SCREEN_X, 200)
	).create();

	const soundVolume = VolumeSpec(
		"options.soundVolume",
		"Sound Volume",
		vec2(MIDDLE_SCREEN_X, 400),
		update_sound_volume.key
	).create();

	const music = BooleanSpec(
		"options.music",
		"Music",
		vec2(MIDDLE_SCREEN_X, 600)
	).create();

	const musicVolume = VolumeSpec(
		"options.musicVolume",
		"Music Volume",
		vec2(MIDDLE_SCREEN_X, 800),
		update_music_volume.key
	).create();

	AddChildren(container, [sound, soundVolume, music, musicVolume])

	return container;
}

const spec: Entity<Container> = {
	key: "options/controls",
	create
}

export default spec;