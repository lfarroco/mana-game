import Phaser from 'phaser';
import { Chara } from './Chara';
import { Unit } from '@Models/Entities/Unit';

type RankDisplayComponents = {
	rankCoin: Phaser.GameObjects.Arc;
	unit: Unit;
	chara: Chara;
};

const rankDisplayMap = new Map<string, RankDisplayComponents>();

export function create(unit: Unit, chara: Chara) {
	const rankCoin = chara.scene.add
		.circle(0, 0, 100, 0xcccccc)
		.setStrokeStyle(2, 0x000000);

	chara.add(rankCoin);
	rankCoin.y = 0;

	const components: RankDisplayComponents = {
		rankCoin,
		unit,
		chara,
	};

	rankDisplayMap.set(unit.id, components);

	update(unit.id);

	chara.on('destroy', () => {
		rankDisplayMap.delete(unit.id);
	});
}

export function update(unitId: string) {
	const components = rankDisplayMap.get(unitId);
	if (!components) {
		return;
	}

	const { rankCoin, unit } = components;
	const rankColors = [0xCE8946, 0xCE8946, 0xEFBF04, 0xD9D9D9]; // bronz, silver, gold, platinum
	const color = rankColors[unit.rank - 1] || 0xcccccc;

	rankCoin.setFillStyle(color);

}

export function clearAll(): void {
	rankDisplayMap.forEach(({ rankCoin }) => {
		rankCoin.destroy();
	});
	rankDisplayMap.clear();
}