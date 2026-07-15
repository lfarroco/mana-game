import * as Chara from "@Systems/Chara/Chara";
import * as PowerDisplay from "@Systems/Chara/PowerDisplay";
import * as Effects from "Client/FX";

export const createIncreasePowerEffect = () => (
	sourceId: string | undefined,
	targetId: string,
	_amount: number,
	_permanent: boolean,
	onHit: () => void
) => {
	const effect = async () => {
		onHit();
		PowerDisplay.updatePowerDisplay(targetId);
	};

	if (!sourceId) {
		effect();
		return;
	}

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0xffa500, 0xff8c00, 0xff4500],
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0xffa500, 0xff8c00],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: effect,
	});
};

export const createDecreasePowerEffect = () => (
	sourceId: string | undefined,
	targetId: string,
	_amount: number,
	_permanent: boolean,
	onHit: () => void,
	_delayedExecution?: number,
	affectedUnitId?: string
) => {
	const effect = async () => {
		onHit();
		PowerDisplay.updatePowerDisplay(affectedUnitId ?? targetId);
	};

	if (!sourceId) {
		effect();
		return;
	}

	const source = Chara.mustGetCharaById(sourceId);
	const target = Chara.mustGetCharaById(targetId);
	Effects.arcaneMissileTargeted([source.x, source.y], [target.x, target.y], {
		colors: [0x8a2be2, 0x9400d3, 0x9932cc],
		impact: {
			colors: [0x8a2be2, 0x9400d3],
		},
		onHit: effect,
	});
};

export const createPowerUpdateEffect = () => (unitId: string) => {
	PowerDisplay.updatePowerDisplay(unitId);
};