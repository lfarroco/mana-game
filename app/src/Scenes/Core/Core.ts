import { signals, listeners } from "../../Models/Signals";
import { getState } from "../../Models/State";

// over-complicated phaser type :shrug:
type PhaserAudio = Phaser.Sound.HTML5AudioSound |
	Phaser.Sound.NoAudioSound |
	Phaser.Sound.WebAudioSound

export default class Core extends Phaser.Scene {
	music: PhaserAudio | null = null

	constructor() {
		super('CoreScene');

		listeners([
			[signals.PLAY_MUSIC, () => { this.music?.play() }],
			[signals.STOP_MUSIC, () => { this.music?.stop() }],
		])
	}

	preload() {
		this.load.audio('theme', [
			'assets/audio/main_theme.mp3',
			'assets/audio/main_theme.ogg',
			//'jshaw_a_dream_of_first_flight',
		]);
	}

	create() {

		this.music = this.sound.add('theme');

		this.music.setVolume(0.05);

		const state = getState();

		if (state.options.music)
			this.music.play();

	}
}