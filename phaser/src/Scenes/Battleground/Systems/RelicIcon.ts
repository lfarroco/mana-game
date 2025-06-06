import * as uuid from "uuid";
import { Relic, playerForce } from "../../../Models/Force";
import { getState } from "../../../Models/State";
import { Flyout } from "../../../Systems/Flyout";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../BattlegroundScene";
import { displayError } from "./UIManager";

export class RelicIcon extends Phaser.GameObjects.Image {

	id: string;
	owned: boolean = false;
	private wasDroppedOnZone = false;

	constructor(
		scene: BattlegroundScene,
		public baseX: number,
		public baseY: number,
		public relic: string,
		public iconSize: number,
		public flyout: Flyout
	) {
		super(scene, baseX, baseY, relic);
		this.setDisplaySize(iconSize - 40, iconSize - 40);
		scene.add.existing(this);

		this.setInteractive({ draggable: true });

		this.on("drag", (p: Pointer) => {
			this.x = p.x;
			this.y = p.y;
		});

		this.on("dragstart", () => {
			this.wasDroppedOnZone = false;
		});
		this.on("drop", this.handleDrop);
		this.on("dragend", this.handleDragEnd);

		this.id = uuid.v4();
		this.setName(this.id);

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
		if (this.wasDroppedOnZone) return;
		this.tweenToSlot();
		this.wasDroppedOnZone = false;
	};

	private handleDropRelicIntoSlot(zone: Phaser.GameObjects.Zone) {

		const [_, x_, y_] = zone.name.split("-");

		if (!this.owned)
			this.flyout.remove(this);

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
				.find((child) => child.name === occupier.id) as RelicIcon;

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
