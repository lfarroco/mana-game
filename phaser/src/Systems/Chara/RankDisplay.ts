import { Unit } from "@Models/Entities/Unit";
import { scene } from "@Scenes/Battleground/BattlegroundScene";

export type RankDisplays = {
	graphics: Graphics;
	unit: Unit;
};

const index = new Map<string, RankDisplays>();

export function create(unit: Unit, container: Container) {
	const graphics = scene.add.graphics();

	container.add([graphics]);

	const state = {
		graphics,
		unit
	}

	index.set(unit.id, state);
}

export function clearAll(): void {
	index.forEach(state => {
		state.graphics.destroy();
	});
	index.clear();
}

export function update(unit: Unit) {
	const { rank } = unit;

	const colors = {
		// bronze
		1: 0xffd700,
		// silver
		2: 0xc0c0c0,
		// gold
		3: 0xffd700,
		// platinum
		4: 0xffd700,
	}

	// update color graphics
}
