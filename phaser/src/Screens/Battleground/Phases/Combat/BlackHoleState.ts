
export type BlackHoleState = {
	blackHole: Phaser.GameObjects.Shader | null;
	timer: Phaser.Time.TimerEvent | null;
	dissolve: number;
};