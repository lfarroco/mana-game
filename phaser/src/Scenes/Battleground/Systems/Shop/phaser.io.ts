import { getState } from "@Models/State";

export function BringToTop(obj: Phaser.GameObjects.GameObject) {
	const scene = getState().currentScene;
	scene.children.bringToTop(obj);
}

export function Container(
) {
	const scene = getState().currentScene;
	return scene.add.container();
}

export function AddChildren(
	container: Phaser.GameObjects.Container,
	children: Phaser.GameObjects.GameObject[]
) {
	container.add(children)
}

export function SetPosition(obj: { setPosition: (x: number, y: number) => void }, vec: Vec2) {
	obj.setPosition(vec.x, vec.y);
}

export function SetVisible(obj: { setVisible: (visible: boolean) => void }, visible: boolean) {
	obj.setVisible(visible);
}

export function Show(obj: { setVisible: (visible: boolean) => void }) {
	obj.setVisible(true);
}

export function Hide(obj: { setVisible: (visible: boolean) => void }) {
	obj.setVisible(false);
}

export function Destroy(obj: Phaser.GameObjects.GameObject) {
	obj.destroy(true);
}
export function BorderedRoundRect(
	position: Vec2,
	size: Dimension,
	cornerRadius: number = 10,
	color: number = 0xffa500,
	alpha: number = 0.7) {
	const scene = getState().currentScene;
	const g = scene.add.graphics(position);
	g.lineStyle(4, 0xffffff, 0.8);
	g.fillStyle(color, alpha);
	g.fillRoundedRect(0, 0, size.width, size.height, cornerRadius);
	g.strokeRoundedRect(0, 0, size.width, size.height, cornerRadius);

	return g;
}

export function RectangularDropZone(
	name: string,
	{ x, y }: Vec2,
	{ width, height }: Dimension,
) {
	const scene = getState().currentScene;

	const zone = scene.add.zone(
		x, y,
		width, height
	);

	zone.setName(name);

	zone.setRectangleDropZone(width, height); //redundant??

	return zone;
}

export function Centralize(obj: {
	setOrigin: (n: number) => void
}) {
	obj.setOrigin(0.5);
}

export function Text(
	position: Vec2,
	text: string,
	style: Phaser.Types.GameObjects.Text.TextStyle
) {
	const scene = getState().currentScene;
	return scene.add.text(position.x, position.y, text, style);
}

export function WhenDroppedOnZone(
	obj: Phaser.GameObjects.GameObject,
	target: string,
	callback: (zone: Phaser.GameObjects.Zone) => void
) {
	obj.on(
		Phaser.Input.Events.DROP,
		(_: Pointer, actual: Phaser.GameObjects.Zone) => {
			if (target === actual.name) {
				callback(actual);
			}
		}
	);
}