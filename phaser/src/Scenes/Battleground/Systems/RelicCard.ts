import * as uuid from "uuid";
import { Relic, playerForce, updatePlayerGoldIO } from "../../../Models/Force";
import { getState } from "../../../Models/State";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../BattlegroundScene";
import { displayError } from "./UIManager";

export class RelicCard extends Phaser.GameObjects.Image {

	id: string;
	owned: boolean = false;
	private wasDroppedOnZone = false;
	private wasDragged = false;

	constructor(
		scene: BattlegroundScene,
		public baseX: number,
		public baseY: number,
		public relic: string,
		public iconSize: number,
		public onAcquire: () => void
	) {
		super(scene, baseX, baseY, relic);
		this.setDisplaySize(iconSize, iconSize);
		scene.add.existing(this);

		this.setInteractive({ draggable: true });

		this.on("drag", (p: Pointer) => {
			this.x = p.x;
			this.y = p.y;

			this.wasDragged = true;
		});

		this.on("dragstart", () => {
			this.wasDroppedOnZone = false;
		});
		this.on("drop", this.handleDrop);
		this.on("dragend", this.handleDragEnd);

		this.on("pointerup", this.handlePointerUp)

		this.id = uuid.v4();
		this.setName(this.id);
	}

	handlePointerUp = () => {

		if (this.wasDragged) {
			this.wasDragged = false;
			return;
		}

		this.wasDragged = false;

		const state = getState();

		if (state.gameData.player.gold < 3) {
			displayError("Not enough gold")
			return;
		}

		if (state.gameData.player.relics.length >= 4) {
			displayError("No room for a new relic")
			return;
		}

		updatePlayerGoldIO(-1);

		const slots = [
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		];

		const emptySlot = slots.find(([x, y]) => !state.gameData.player.relics
			.some(r => {
				return r.position.x === x && r.position.y === y
			}));

		if (!emptySlot) {
			throw new Error("No empty slot available")
		}

		const [x, y] = emptySlot;
		this.acquire(x, y)

		const slot = this.scene.children.getByName(`slot-${x}-${y}`)! as Image;

		this.tweenToSlot(slot.x, slot.y);

	}

	handleDrop = (_p: Pointer, zone: Phaser.GameObjects.Zone) => {

		this.wasDroppedOnZone = true;

		if (!zone?.name.startsWith("slot")) {
			this.tweenToSlot();
			return;
		}

		if (zone.name.startsWith("slot-"))
			this.handleDropRelicIntoSlot(zone);
	};

	handleDragEnd = () => {

		if (!this.wasDragged) return;
		if (this.wasDroppedOnZone) return;

		this.tweenToSlot();
		this.wasDroppedOnZone = false;
	};

	private handleDropRelicIntoSlot(zone: Phaser.GameObjects.Zone) {

		const [_, x_, y_] = zone.name.split("-");


		const occupier = getState().gameData.player
			.relics
			.find(r => r.position.x === parseInt(x_) && r.position.y === parseInt(y_));

		if (occupier && !this.owned) {
			displayError("This slot is already occupied!");
			this.tweenToSlot();
			return;
		}

		if (occupier && this.owned) {
			// switch bases
			const occupierIcon = this.scene.children.list
				.find((child) => child.name === occupier.id) as RelicCard;

			const thisRec = getState().gameData.player.relics.find(r => r.id === this.id)!;

			const tempX = this.baseX;
			const tempY = this.baseY;

			const thisX = thisRec.position.x;
			const thisY = thisRec.position.y;

			occupierIcon.tweenToSlot(tempX, tempY);
			this.tweenToSlot(occupierIcon.baseX, occupierIcon.baseY);

			occupierIcon.updateDataPosition(thisX, thisY);
			this.updateDataPosition(parseInt(x_), parseInt(y_));
		}

		if (!occupier && this.owned) {
			this.x = zone.x;
			this.y = zone.y;
			this.baseX = zone.x;
			this.baseY = zone.y;
			this.updateDataPosition(parseInt(x_), parseInt(y_));

		}

		if (!occupier && !this.owned) {
			this.x = zone.x;
			this.y = zone.y;
			this.acquire(parseInt(x_), parseInt(y_));
		}
	}

	private acquire(x: number, y: number) {

		if (!this.owned)
			this.onAcquire();

		this.owned = true;

		this.baseX = this.x;
		this.baseY = this.y;
		const relicData = {
			id: this.id,
			pic: this.relic,
			position: { x, y },
			events: {
				onBattleStart: () => {
					tween({
						targets: [this],
						scale: this.scale * 1.2,
						yoyo: true,
						repeat: 0,
					});
				}
			}
		} as Relic;

		playerForce.relics.push(relicData);
	}

	private async tweenToSlot(x: number = this.baseX, y: number = this.baseY) {
		await tween({
			targets: [this],
			x,
			y,
		});
		this.baseX = x;
		this.baseY = y;
	}

	updateDataPosition(x: number, y: number) {

		const record = getState().gameData.player.relics
			.find(r => r.id === this.id)!;

		record.position.x = x;
		record.position.y = y;
	}
}
