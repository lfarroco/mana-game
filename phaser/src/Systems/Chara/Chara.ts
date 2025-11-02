import Phaser from "phaser";
import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { tween } from "@Utils/animation";
import * as CharaStatsDisplay from "./CharaStatsDisplay";
import * as ChargeBarDisplay from "./ChargeBarDisplay";
import * as input from "./input";
import * as CharaTooltip from "./CharaTooltip";
import { popText } from "./Animations/popText";
import { summonEffect } from "../../Effects/summonEffect";
import { getCurrentScene, getState } from "@Models/State";
import Delaunator from "delaunator";

export type Chara = Container;

type CharaState = {
	unit: Unit;
	id: string;
	isAnimating: boolean;
	sprite: Phaser.GameObjects.Sprite;
};

const charaState = new WeakMap<Chara, CharaState>();

const charaById = new Map<string, Chara>();

export function getCharaById(id: string): Chara {
	const c = charaById.get(id);
	if (!c) throw new Error(`Chara with id ${id} not found`);
	return c;
}

export function getAllCharas(): Chara[] {
	return Array.from(charaById.values());
}

export async function summon(
	unit: Unit,
	useSummonEffect: boolean = true,
): Promise<Chara> {
	const vec = getScreenPosition(unit);
	if (useSummonEffect) {
		summonEffect(getCurrentScene(), vec);
	}
	const chara = create(unit);
	chara.setScale(0);
	chara.setAngle(-10);
	await tween({
		targets: [chara],
		scale: 1,
		angle: 0,
		ease: "Back.easeOut",
		duration: 500,
	});
	return chara;
}

export function clearAll(): void {
	getAllCharas().forEach(c => destroy(c));
}

export function create(unit: Unit): Chara {
	const position = getScreenPosition(unit);
	const container = getCurrentScene().add.container(position.x, position.y);

	const sprite = createSprite(container, unit);
	if (unit.force === constants.FORCE_ID_CPU) {
		sprite.setFlipX(true);
	}

	container.setInteractive(
		new Phaser.Geom.Rectangle(
			-constants.HALF_TILE_WIDTH,
			-constants.HALF_TILE_HEIGHT,
			constants.TILE_WIDTH,
			constants.TILE_HEIGHT
		),
		Phaser.Geom.Rectangle.Contains
	);

	const state: CharaState = {
		unit,
		id: unit.id,
		isAnimating: false,
		sprite,
	};

	charaState.set(container, state);

	input.init(container);

	charaById.set(unit.id, container);

	container.on(Phaser.Input.Events.POINTER_OVER, () => {
		if (isShopItem(unit.id)) {
			return;
		}
		CharaTooltip.onCharaPointerOver(container);
	});
	container.on(Phaser.Input.Events.POINTER_OUT, () => {
		if (isShopItem(unit.id)) {
			return;
		}
		CharaTooltip.onCharaPointerOut();
	});

	ChargeBarDisplay.create(unit, container);
	CharaStatsDisplay.create(unit, container);

	return container;
}

export function getScreenPosition(unit: Unit) {
	const slotSpacing = 8;
	const offsetX = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const offsetY = unit.force === constants.FORCE_ID_PLAYER ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	let visualX = unit.position.x;
	if (unit.force === constants.FORCE_ID_CPU) {
		visualX = 2 - unit.position.x;
	}

	return {
		x: visualX * (constants.TILE_WIDTH + slotSpacing) + constants.HALF_TILE_WIDTH + offsetX,
		y: unit.position.y * (constants.TILE_HEIGHT + slotSpacing) + constants.HALF_TILE_HEIGHT + offsetY,
	};
}

function createSprite(container: Chara, unit: Unit, _borderWidth: number = 3, _borderColor: number = 0xffffff) {
	const animCacheKey = unit.pic + '-anims';
	const animData = getCurrentScene().cache.json.get(animCacheKey);

	if (animData && animData.anims) {
		for (const anim of animData.anims) {
			const animKey = unit.pic + '_' + anim.key;
			if (!getCurrentScene().anims.exists(animKey)) {
				const animConfig = {
					...anim,
					key: animKey,
					frames: (anim.frames as { frame: string }[])
						.map((f: { frame: string }) => ({ key: unit.pic, frame: f.frame })),
				};
				getCurrentScene().anims.create(animConfig);
			}
		}
	}

	const frameNames = getCurrentScene().textures.get(unit.pic).getFrameNames();
	const idleFrames = frameNames.filter(name => name.startsWith(unit.pic + '_idle_'));
	idleFrames.sort((a, b) => {
		const numA = parseInt(a.match(/_(\d+)\.png$/)?.[1] || '0', 10);
		const numB = parseInt(b.match(/_(\d+)\.png$/)?.[1] || '0', 10);
		return numA - numB;
	});
	const firstIdle = idleFrames[0] || frameNames[0];

	const sprite = getCurrentScene().add.sprite(0, -15, unit.pic, firstIdle);
	sprite.setDisplaySize(constants.TILE_WIDTH * 1.2, constants.TILE_HEIGHT * 1.2);
	container.add(sprite);
	if (getCurrentScene().anims.exists(unit.pic + '_idle')) {
		sprite.play(unit.pic + '_idle');
	}

	if (unit.isCore) {

		sprite.setDisplaySize(constants.TILE_WIDTH * 0.8, constants.TILE_HEIGHT * 0.8);
		tween({
			targets: [sprite],
			y: Math.random() * -20 - 10,
			ease: "Cubic.EaseOut",
			duration: Math.random() * 1000 + 1000,
			yoyo: true,
			repeat: -1
		})
	}

	return sprite;
}

export function isShopItem(id: string): boolean {
	return !getState().gameData.player.units.find(u => u.id === id);
}

export function getUnit(chara: Chara): Unit {
	return mustGetState(chara).unit;
}

export function getId(chara: Chara): string {
	return mustGetState(chara).id;
}

export function updateUnitPower(chara: Chara, num: number) {
	const s = mustGetState(chara);
	const { unit } = s;
	const positive = num >= 0;
	const text = `${positive ? "+" : "-"}${num}`;

	unit.power += num;

	CharaStatsDisplay.animatePowerChange(s.id, unit.power);

	popText({
		x: chara.x,
		y: chara.y,
		text,
	});
}

export function destroy(chara: Chara) {
	chara.destroy();
	charaById.delete(getId(chara));
}


export function mustGetState(chara: Chara): CharaState {
	const s = charaState.get(chara);
	if (!s) throw new Error("Chara state not found for container");
	return s;
}

export function shake(chara: Chara) {
	const state = mustGetState(chara);
	if (state.isAnimating) return;
	state.isAnimating = true;

	const startingX = chara.x;
	chara.x += 10;

	tween({
		targets: [chara],
		x: chara.x - 20,
		alpha: 0.3,
		duration: 100,
		repeat: 3,
		onComplete: () => {
			state.isAnimating = false;
			chara.x = startingX;
			chara.alpha = 1;
		}
	});
}


export function shatter(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
	const scene = sprite.scene;
	const texture = sprite.texture;
	const frame = sprite.frame;

	// frame source rect in texture (use cut* if available; fallback to x/y/width/height)
	// const frameX = (frame as any).cutX ?? (frame as any).x ?? 0;
	// const frameY = (frame as any).cutY ?? (frame as any).y ?? 0;
	const frameWidth = (frame as any).cutWidth ?? (frame as any).width;
	const frameHeight = (frame as any).cutHeight ?? (frame as any).height;

	// sample points in frame local coordinates (texture pixels)
	const numPoints = Phaser.Math.Between(6, 8);
	const points: [number, number][] = [
		[0, 0],
		[frameWidth, 0],
		[frameWidth, frameHeight],
		[0, frameHeight],
	];
	for (let i = 0; i < numPoints; i++) {
		points.push([Phaser.Math.Between(0, frameWidth), Phaser.Math.Between(0, frameHeight)]);
	}

	// triangulate (requires Delaunator available globally)
	const delaunay = Delaunator.from(points);
	const triangles = delaunay.triangles;

	// hide original sprite
	sprite.setVisible(false);

	// world top-left of the displayed sprite (accounts for origin & scale)
	const worldX0 = sprite.x - sprite.displayWidth * sprite.originX;
	const worldY0 = sprite.y - sprite.displayHeight * sprite.originY;

	// scale factors from texture/frame pixels -> display pixels
	const scaleX = sprite.displayWidth / frameWidth;
	const scaleY = sprite.displayHeight / frameHeight;

	// iterate triangles
	for (let i = 0; i < triangles.length; i += 3) {
		const a = points[triangles[i]];
		const b = points[triangles[i + 1]];
		const c = points[triangles[i + 2]];

		// local frame coordinates (inside the frame)
		const localA = [a[0], a[1]];
		const localB = [b[0], b[1]];
		const localC = [c[0], c[1]];

		// bounds in frame space (texture pixels)
		const minLocalX = Math.min(localA[0], localB[0], localC[0]);
		const minLocalY = Math.min(localA[1], localB[1], localC[1]);
		const maxLocalX = Math.max(localA[0], localB[0], localC[0]);
		const maxLocalY = Math.max(localA[1], localB[1], localC[1]);

		const triWidth = maxLocalX - minLocalX;
		const triHeight = maxLocalY - minLocalY;

		if (triWidth < 1 || triHeight < 1) continue;

		// world position of fragment top-left (display pixels)
		const fragmentWorldX = worldX0 + minLocalX * scaleX;
		const fragmentWorldY = worldY0 + minLocalY * scaleY;

		// create RenderTexture sized in frame pixels (we will scale it to display pixels)
		const rt = scene.add.renderTexture(fragmentWorldX, fragmentWorldY, Math.ceil(triWidth), Math.ceil(triHeight));
		rt.setOrigin(0, 0);
		rt.setDepth(sprite.depth);

		// Create a Graphics positioned at the same world position as the RT.
		// Draw the triangle in *display* pixels so the geometry mask lines up with the shown RT (after scaling).
		const g = scene.add.graphics({ x: fragmentWorldX, y: fragmentWorldY });
		g.fillStyle(0xffffff, 1);
		g.beginPath();
		g.moveTo((localA[0] - minLocalX) * scaleX, (localA[1] - minLocalY) * scaleY);
		g.lineTo((localB[0] - minLocalX) * scaleX, (localB[1] - minLocalY) * scaleY);
		g.lineTo((localC[0] - minLocalX) * scaleX, (localC[1] - minLocalY) * scaleY);
		g.closePath();
		g.fillPath();
		// hide the graphics (mask still works even when invisible)
		g.visible = false;

		// create a GeometryMask from the graphics and apply to RT
		const mask = g.createGeometryMask();
		rt.setMask(mask);

		// Draw the texture frame into the RT using frame-pixel offsets (RT internal coordinates are frame pixels)
		// We need to draw the atlas frame so that the triangle region sits inside the RT:
		// draw offsets are negative minLocalX/minLocalY (in frame pixels).
		// frame.name typically identifies the frame inside the atlas.
		rt.drawFrame(texture.key, (frame as any).name ?? frame, -minLocalX, -minLocalY);

		// Now scale the RT to match display size (frame pixels -> display pixels)
		rt.setScale(scaleX, scaleY);

		// Animate the fragment outward; when complete destroy RT and graphics (mask is freed)
		const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
		const distance = Phaser.Math.Between(80, 160);
		const duration = Phaser.Math.Between(2000, 4000);

		scene.tweens.add({
			targets: rt,
			x: rt.x + Math.cos(angle) * distance,
			y: rt.y + Math.sin(angle) * distance + Phaser.Math.Between(-30, 30),
			angle: Phaser.Math.Between(-360, 360),
			alpha: 0,
			duration,
			ease: "Power2",
			onComplete: () => {
				// destroy both RT and the Graphics used for mask
				try { rt.destroy(); } catch { }
				try { g.destroy(); } catch { }
			},
		});
	}
}

