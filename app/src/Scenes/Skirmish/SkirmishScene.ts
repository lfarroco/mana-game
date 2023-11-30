import Phaser from "phaser";
import { emit, events, listeners } from "../../Models/Signals";
import { preload } from "./preload";
import { Unit, makeUnit } from "../../Models/Unit";
import { SpineGameObject } from "@esotericsoftware/spine-phaser";
import { getState } from "../../Models/State";

const sqdA = [
	{
		pos: { x: 1, y: 0 },
		unit: makeUnit()
	},
	{
		pos: { x: 1, y: 1 },
		unit: makeUnit()
	},
	{
		pos: { x: 1, y: 2 },
		unit: makeUnit()
	},
	{
		pos: { x: 0, y: 0 },
		unit: makeUnit()
	},
	{
		pos: { x: 0, y: 1 },
		unit: makeUnit()
	},
]
const sqdB = [
	{
		pos: { x: 1, y: 0 },
		unit: { ...makeUnit(), force: "CPU" }
	},
	{
		pos: { x: 1, y: 1 },
		unit: { ...makeUnit(), force: "CPU" }
	},
	{
		pos: { x: 1, y: 2 },
		unit: { ...makeUnit(), force: "CPU" }
	},
	{
		pos: { x: 0, y: 0 },
		unit: { ...makeUnit(), force: "CPU" }
	},
	{
		pos: { x: 0, y: 1 },
		unit: { ...makeUnit(), force: "CPU" }
	},
]

class SkirmishScene extends Phaser.Scene {
	bg: Phaser.GameObjects.Image | null = null;
	charas: SpineGameObject[] = [];
	units: Unit[] = [];
	squadA: string = "";
	squadB: string = "";
	constructor() {
		super("SkirmishScene");

		console.log("SkirmishScene constructor")
		listeners([
			[events.SKIRMISH_STARTED, (squadA: string, squadB: string) => {
				this.squadA = squadA
				this.squadB = squadB
				this.scene.start()
			}
			],
			[events.SKIRMISH_ENDED, () => {
				this.scene.stop()
				this.children.removeAll()
			}],
		]);

	}

	preload = preload;
	create = () => {

		this.bg = this.add.image(0, 0, "bgs/castle").setOrigin(0, 0);

		const a = this.renderSquad(sqdA, true)
		const b = this.renderSquad(sqdB, false)

		this.children.sort("y")

		this.units = [...sqdA, ...sqdB].map(spec => spec.unit)
		this.charas = [...a, ...b]

		this.combat();

		//@ts-ignore
		window.skirmish = this
	}


	update() {
	}


	renderSquad(units: { pos: { x: number, y: number }, unit: Unit }[], isLeft: boolean) {
		return units.map(spec => {

			const baseX = isLeft ? 200 : 850;
			const baseY = 450
			const spacingX = 150
			const spacingY = 100
			const diagonalOffset = isLeft ? 50 : -50
			const backOffset = 0

			const spine = createSpineBody(this,
				baseX + (spec.pos.x * spacingX) - (spec.pos.y * diagonalOffset) - (!isLeft && spec.pos.x === 1 ? 300 : 0),
				baseY + (spec.pos.y * spacingY) + (spec.pos.x === 0 ? backOffset : 0),
				spec.unit).setName(spec.unit.id)
			const scale = 0.3
			spine.setScale(isLeft ? -scale : scale, scale)

			return spine
		})
	}

	combat() {

		const initiative = this.units.map(unit => {
			return {
				unit,
				initiative: Math.random()
			}
		}).sort((a, b) => b.initiative - a.initiative)

		const turn = 0;

		const combat = {
			turn,
			initiative,
			actions: []
		}

		this.turn(combat)

	}

	turn(combat: { turn: number, initiative: { unit: Unit, initiative: number }[], actions: any[] }) {

		const state = getState()

		const currentUnit = combat.initiative[combat.turn].unit

		const target = this.units.filter(unit => unit.force !== currentUnit.force)[0]

		console.log(currentUnit, target)

		const isLeft = currentUnit.force === "PLAYER"

		const activeUnitSprite = this.charas.find(chara => chara.name === currentUnit.id)
		const targetUnitSprite = this.charas.find(chara => chara.name === target.id)

		if (!activeUnitSprite || !targetUnitSprite) return

		const sourceX = activeUnitSprite.x
		const sourceY = activeUnitSprite.y

		this.tweens.add({
			targets: activeUnitSprite,
			x: targetUnitSprite.x + (isLeft ? -100 : 100),
			y: targetUnitSprite.y,
			duration: 1000 / state.speed,
			ease: 'Power2',
			onComplete: () => {

				this.tweens.add({
					targets: activeUnitSprite,
					x: sourceX,
					y: sourceY,
					duration: 1000 / state.speed,
					ease: 'Power2',
					onComplete: () => {
						combat.turn++
						//if (combat.turn < combat.initiative.length) {
						if (combat.turn < 2) {
							this.turn(combat)
						} else {
							emit(events.SKIRMISH_ENDED, this.squadA, this.squadB)
						}
					}
				});

			}
		});


	}

}
function createSpineBody(scene: Phaser.Scene, x: number, y: number, unit: Unit): SpineGameObject {
	const spine: SpineGameObject = scene
		//@ts-ignore
		.add.spine(x, y, "spine-data", "spine-atlas");
	spine.scale = 0.4;

	//@ts-ignore
	spine.skeleton.setSkinByName(unit.job);
	//@ts-ignore
	spine.animationState.setAnimation(0, "idle", true);
	spine.setName(unit.id);
	return spine;
}

export default SkirmishScene;


