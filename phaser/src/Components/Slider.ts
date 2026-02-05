import { getCurrentScene } from "@Models/State";
import { playSoundEffect } from "@Systems/AudioManager";

export type SliderConfig = {
	width: number;
	min: number;
	max: number;
	step: number;
	initialValue: number;
	onChange: (value: number) => void;
};

export type Slider = {
	container: Phaser.GameObjects.Container;
	setValue: (value: number) => void;
	getValue: () => number;
	destroy: () => void;
};

const TRACK_HEIGHT = 8;
const TRACK_COLOR = 0x1a1a2e;
const TRACK_FILL_COLOR = 0x4a90d9;
const HANDLE_RADIUS = 16;
const HANDLE_COLOR = 0xffffff;
const HANDLE_HOVER_COLOR = 0x4a90d9;
const HANDLE_BORDER_COLOR = 0x333333;

export function createSlider(position: Vec2, config: SliderConfig): Slider {
	const { width, min, max, step, initialValue, onChange } = config;
	const scene = getCurrentScene();

	let currentValue = Math.max(min, Math.min(max, initialValue));
	let isDragging = false;

	const container = scene.add.container();

	// Track background (unfilled part)
	const trackBackground = scene.add.graphics();
	trackBackground.fillStyle(TRACK_COLOR, 1);
	trackBackground.fillRoundedRect(
		position.x - width / 2,
		position.y - TRACK_HEIGHT / 2,
		width,
		TRACK_HEIGHT,
		TRACK_HEIGHT / 2
	);
	container.add(trackBackground);

	// Track fill (filled part showing progress)
	const trackFill = scene.add.graphics();
	container.add(trackFill);

	// Handle
	const handle = scene.add.graphics();
	container.add(handle);

	// Interactive area for the entire slider (track + handle area)
	const hitArea = scene.add.rectangle(
		position.x,
		position.y,
		width + HANDLE_RADIUS * 2,
		HANDLE_RADIUS * 2 + TRACK_HEIGHT,
		0x000000,
		0
	);
	hitArea.setInteractive({ useHandCursor: true });
	container.add(hitArea);

	const valueToX = (value: number): number => {
		const ratio = (value - min) / (max - min);
		return position.x - width / 2 + ratio * width;
	};

	const xToValue = (x: number): number => {
		const ratio = (x - (position.x - width / 2)) / width;
		const rawValue = min + ratio * (max - min);
		// Snap to step
		const steppedValue = Math.round(rawValue / step) * step;
		return Math.max(min, Math.min(max, steppedValue));
	};

	const updateVisuals = () => {
		// Update track fill
		const handleX = valueToX(currentValue);
		const fillWidth = handleX - (position.x - width / 2);

		trackFill.clear();
		trackFill.fillStyle(TRACK_FILL_COLOR, 1);
		if (fillWidth > 0) {
			trackFill.fillRoundedRect(
				position.x - width / 2,
				position.y - TRACK_HEIGHT / 2,
				fillWidth,
				TRACK_HEIGHT,
				TRACK_HEIGHT / 2
			);
		}

		// Update handle
		handle.clear();
		handle.fillStyle(isDragging ? HANDLE_HOVER_COLOR : HANDLE_COLOR, 1);
		handle.lineStyle(3, HANDLE_BORDER_COLOR, 1);
		handle.fillCircle(handleX, position.y, HANDLE_RADIUS);
		handle.strokeCircle(handleX, position.y, HANDLE_RADIUS);
	};

	const setValue = (value: number) => {
		const newValue = Math.max(min, Math.min(max, Math.round(value / step) * step));
		if (newValue !== currentValue) {
			currentValue = newValue;
			updateVisuals();
			onChange(currentValue);
		}
	};

	const getValue = () => currentValue;

	// Handle pointer events
	hitArea.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
		isDragging = true;
		const newValue = xToValue(pointer.x);
		setValue(newValue);
		playSoundEffect("sfx_unit_onclick");
	});

	hitArea.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
		if (isDragging && pointer.isDown) {
			const newValue = xToValue(pointer.x);
			setValue(newValue);
		}
	});

	hitArea.on(Phaser.Input.Events.POINTER_UP, () => {
		isDragging = false;
		updateVisuals();
	});

	hitArea.on(Phaser.Input.Events.POINTER_OVER, () => {
		if (!isDragging) {
			handle.clear();
			handle.fillStyle(HANDLE_HOVER_COLOR, 1);
			handle.lineStyle(3, HANDLE_BORDER_COLOR, 1);
			const handleX = valueToX(currentValue);
			handle.fillCircle(handleX, position.y, HANDLE_RADIUS);
			handle.strokeCircle(handleX, position.y, HANDLE_RADIUS);
		}
	});

	hitArea.on(Phaser.Input.Events.POINTER_OUT, () => {
		isDragging = false;
		updateVisuals();
	});

	// Initial render
	updateVisuals();

	const destroy = () => {
		container.destroy(true);
	};

	return {
		container,
		setValue,
		getValue,
		destroy,
	};
}
