import { SceneSpec } from "@Models/Entities/Entity"
import clouds_bg from "@Entities/clouds_bg";
import title from "./entities/title";
import tabs from "./entities/tab_controls";
import return_to_title from "./events/return_to_title";
import switch_tab from "./events/switch_tab";
import log from "@Events/log";
import render_tab from "./events/render_tab";
import update_sound_volume from "./events/update_sound_volume";
import update_music_volume from "./events/update_music_volume";

export default {
	name: "OptionsScene",
	create: [
		clouds_bg,
		title,
		tabs,
	],
	events: [
		{ key: switch_tab.key, handler: log.key },
		{ key: switch_tab.key, handler: switch_tab.key },
		{ key: switch_tab.key, handler: render_tab.key },
		{ key: "create", handler: render_tab.key, arg: "audio" },
		{ key: update_sound_volume.key, handler: update_sound_volume.key },
		{ key: update_music_volume.key, handler: update_music_volume.key }
	],
	input: [
		{ key: "keydown-ESC", handler: return_to_title.key }
	],
	state: {
		currentTab: "video"
	},
} as SceneSpec<OptionsSceneState>;

export type OptionsSceneState = {
	currentTab: string
}