import { events, listeners } from "../../../Models/Signals";
import { getState } from "../../../Models/State";


export default class Core extends Phaser.Scene {
	preload() {
		this.load.audio('theme', [
			'assets/audio/main_theme.mp3',
			'assets/audio/main_theme.ogg',
			//'jshaw_a_dream_of_first_flight',
		]);

	}

	create() {

		const music = this.sound.add('theme');

		const state = getState()

		if (state.options.music)
			music.play();

		listeners([
			[events.PLAY_MUSIC, () => { music.play() }],
			[events.STOP_MUSIC, () => { music.stop() }],
		])
	}
}