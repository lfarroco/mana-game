import BattlegroundScene from "../BattlegroundScene";

export function pingAt(scene: BattlegroundScene, x: number, y: number) {
	const ping = scene.add.image(x, y, "cursor").setScale(0.5);

	scene.tweens.add({
		targets: ping,
		scale: 1,
		alpha: 0,
		ease: "Cubic.easeOut", // 'Cubic', 'Elastic', 'Bounce', 'Back
		duration: 1000,
		onComplete: () => {
			ping.destroy();
		},
	});
}
