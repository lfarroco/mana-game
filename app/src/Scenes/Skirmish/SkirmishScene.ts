import Phaser from "phaser";
import { emit, events, listeners } from "../../Models/Signals";
import { preload } from "./preload";
import { Unit } from "../../Models/Unit";
import { SpineGameObject } from "@esotericsoftware/spine-phaser";
import { getState } from "../../Models/State";
import { Squad, getMembers } from "../../Models/Squad";

class SkirmishScene extends Phaser.Scene {
	constructor() {
		super("SkirmishScene");

		listeners([
			[events.SKIRMISH_STARTED, (squadA: string, squadB: string) => {
				this.scene.start(this, { squadA, squadB })


			}
			],
			[events.SKIRMISH_ENDED, () => {
				this.scene.stop()
				this.children.removeAll()
			}],
		]);

	}

	preload = preload;
	create = ({ squadA, squadB }: { squadA: string, squadB: string }) => {

		this.renderBackground();

		this.combat(squadA, squadB)

		//@ts-ignore
		window.skirmish = this
	}


	private renderBackground() {
		const bg = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'bgs/castle');
		let scaleX = this.cameras.main.width / bg.width;
		let scaleY = this.cameras.main.height / bg.height;
		let scale = Math.max(scaleX, scaleY);
		bg.setScale(scale).setScrollFactor(0);
	}

	update() {
	}


	renderSquad(squad: Squad, isLeft: boolean) {
		const units = getMembers(squad)
		const charas = units.map((unit, index) => {

			const baseX = isLeft ? 350 : 650;
			const baseY = 450
			const spacingY = 50
			const diagonalOffset = isLeft ? 50 : -50

			const spine = createSpineBody(this,
				baseX - (index * diagonalOffset),
				baseY + (index * spacingY),
				unit,
			).setName(unit.id)
			const scale = 0.25
			spine.setScale(isLeft ? -scale : scale, scale)

			return spine
		})

		return { units, charas }
	}

	combat(squadA: string, squadB: string) {
		const state = getState()
		const sa = state.squads.find(squad => squad.id === squadA) as Squad
		const sb = state.squads.find(squad => squad.id === squadB) as Squad

		const a = this.renderSquad(sa, true);
		const b = this.renderSquad(sb, false);

		const charas = [...a.charas, ...b.charas]
		const units = [...a.units, ...b.units]

		const initiative = units.map(unit => {
			return {
				unit,
				initiative: Math.random()
			}
		}).sort((a, b) => b.initiative - a.initiative)

		const turn = 0;

		const combat = {
			turn,
			initiative,
			squads: [sa.id, sb.id],
			units,
			charas,
			actions: []
		}

		this.turn(combat)

	}

	turn(combat: {
		charas: SpineGameObject[],
		squads: string[],
		units: Unit[], turn: number, initiative: { unit: Unit, initiative: number }[], actions: any[]
	}) {

		const state = getState()

		const currentUnit = combat.initiative[combat.turn].unit

		const target = combat.units.filter(unit => unit.force !== currentUnit.force)[0]

		const isLeft = currentUnit.force === "PLAYER"

		const activeChara = combat.charas.find(chara => chara.name === currentUnit.id)
		const targetChara = combat.charas.find(chara => chara.name === target.id)

		if (!activeChara || !targetChara) return

		const sourceX = activeChara.x
		const sourceY = activeChara.y

		activeChara.animationState.setAnimation(0, "run", true)

		this.tweens.add({
			targets: activeChara,
			x: targetChara.x + (isLeft ? -100 : 100),
			y: targetChara.y,
			duration: 1000 / state.speed,
			ease: 'Power2',
			onComplete: () => {

				activeChara.animationState.setAnimation(0, "slash", false)
				this.time.delayedCall(500 / state.speed, () => {

					targetChara.animationState.setAnimation(0, "flinch", false)
					this.time.delayedCall(500 / state.speed, () => {
						targetChara.animationState.setAnimation(0, "idle", false)
					});

					activeChara.animationState.setAnimation(0, "run", false)

					this.tweens.add({
						targets: activeChara,
						x: sourceX,
						y: sourceY,
						duration: 1000 / state.speed,
						ease: 'Power2',
						onComplete: () => {
							activeChara.animationState.setAnimation(0, "idle", true)
							combat.turn++
							//if (combat.turn < combat.initiative.length) {
							if (combat.turn < 2) {
								this.turn(combat)
							} else {
								emit(events.SKIRMISH_ENDED, combat.squads[0], combat.squads[1])
							}
						}
					});

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


