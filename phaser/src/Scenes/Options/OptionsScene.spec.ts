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
import toggle_sound_enabled from "./events/toggle_sound_enabled";
import toggle_music_enabled from "./events/toggle_music_enabled";

const spec: SceneSpec<OptionsSceneState> = {
	name: "OptionsScene",
	create: [
		clouds_bg,
		title,
		tabs,
	],
	events: [
		{ ev: switch_tab, handler: log },
		{ ev: switch_tab, handler: switch_tab },
		{ ev: switch_tab, handler: render_tab },
		{ ev: "create", handler: render_tab, arg: "audio" },
		{ ev: update_sound_volume, handler: {
			key: "wee", handler: (a) =>{
			console.log("update_sound_volume", a)
		} }},
		{ ev: update_music_volume, handler: update_music_volume },
		{ ev: toggle_sound_enabled, handler: toggle_sound_enabled },
		{ ev: toggle_music_enabled, handler: toggle_music_enabled }
	],
	input: [
		{ ev: "keydown-ESC", handler: return_to_title }
	],
	state: {
		currentTab: "video"
	},
};

export default spec;

export type OptionsSceneState = {
	currentTab: string
}