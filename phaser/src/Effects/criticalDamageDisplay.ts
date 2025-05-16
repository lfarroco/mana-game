import { tween } from "../Utils/animation";

export async function criticalDamageDisplay(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	damage: number,
) {
	const critBg = scene.add.image(
		x, y,
		'damage_display'
	);
	critBg.setScale(0);

	const dmg = scene.add.text(
		x, y,
		`${damage}`,
		{
			fontSize: '100px',
			color: '#000000',
			stroke: '#000000',
			strokeThickness: 4,
			align: 'center',
			fontStyle: 'bold',
		}
	);
	dmg.setOrigin(0.5);
	dmg.setScale(0);

	await tween({
		targets: [critBg, dmg],
		scale: 0.8,
		ease: 'Bounce.easeOut',
	});

	await tween({
		targets: [critBg, dmg],
		alpha: 0,
	});

	[critBg, dmg].forEach(fx => fx.destroy());
}
