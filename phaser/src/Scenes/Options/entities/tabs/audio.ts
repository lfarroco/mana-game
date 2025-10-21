import { Entity } from "@Models/Entities/Entity";
import { BooleanSpec } from "../controls/boolean";
import { AddChildren, Container } from "@PhaserIO";
import { vec2 } from "@Models/Geometry";
import { MIDDLE_SCREEN_X } from "@Constants/constants";
import { VolumeSpec } from "../controls/volume";
import update_sound_volume from "@Scenes/Options/events/update_sound_volume";
import update_music_volume from "@Scenes/Options/events/update_music_volume";
import toggle_music_enabled from "@Scenes/Options/events/toggle_music_enabled";
import toggle_sound_enabled from "@Scenes/Options/events/toggle_sound_enabled";

function create() {

	const container = Container();

	const sound = BooleanSpec({
		key: "options.sound",
		label: "Sound",
		event: toggle_sound_enabled.key,
		position: vec2(MIDDLE_SCREEN_X, 200),
		persist: true
	}).create();

	const soundVolume = VolumeSpec(
		"options.soundVolume",
		"Sound Volume",
		vec2(MIDDLE_SCREEN_X, 400),
		update_sound_volume.key
	).create();

	const music = BooleanSpec({
		key: "options.music",
		event: toggle_music_enabled.key,
		label: "Music",
		position: vec2(MIDDLE_SCREEN_X, 600),
		persist: true
	}).create();

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