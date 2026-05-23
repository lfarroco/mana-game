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
const TRACK_COLOR = 0x0a0a15;
const TRACK_BORDER_COLOR = 0x00ffff;
const TRACK_FILL_COLOR = 0x00ffff;
const TRACK_GLOW_COLOR = 0x00ffff;
const HANDLE_RADIUS = 14;
const HANDLE_COLOR = 0x00ffff;
const HANDLE_HOVER_COLOR = 0xff00ff;
const HANDLE_CORE_COLOR = 0xffffff;

export function createSlider(position: Vec2, config: SliderConfig): Slider {
	const { width, min, max, step, initialValue, onChange } = config;

	let currentValue = Math.max(min, Math.min(max, initialValue));
	let isDragging = false;

	const container = io.scene.add.container();

	// Track glow (outer glow effect)
	const trackGlow = io.scene.add.graphics();
	trackGlow.lineStyle(4, TRACK_GLOW_COLOR, 0.3);
	trackGlow.strokeRoundedRect(
		position.x - width / 2 - 2,
		position.y - TRACK_HEIGHT / 2 - 2,
		width + 4,
		TRACK_HEIGHT + 4,
		(TRACK_HEIGHT + 4) / 2
	);
	container.add(trackGlow);

	// Track background (unfilled part)
	const trackBackground = io.scene.add.graphics();
	trackBackground.fillStyle(TRACK_COLOR, 1);
	trackBackground.lineStyle(2, TRACK_BORDER_COLOR, 0.5);
	trackBackground.fillRoundedRect(
		position.x - width / 2,
		position.y - TRACK_HEIGHT / 2,
		width,
		TRACK_HEIGHT,
		TRACK_HEIGHT / 2
	);
	trackBackground.strokeRoundedRect(
		position.x - width / 2,
		position.y - TRACK_HEIGHT / 2,
		width,
		TRACK_HEIGHT,
		TRACK_HEIGHT / 2
	);
	container.add(trackBackground);

	// Track fill (filled part showing progress)
	const trackFill = io.scene.add.graphics();
	container.add(trackFill);

	// Handle
	const handle = io.scene.add.graphics();
	container.add(handle);

	// Interactive area for the entire slider (track + handle area)
	const hitArea = io.scene.add.rectangle(
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
		const glowColor = isDragging ? HANDLE_HOVER_COLOR : TRACK_GLOW_COLOR;

		trackFill.clear();
		if (fillWidth > 0) {
			// Neon glow effect for fill (multiple layers)
			trackFill.fillStyle(glowColor, 0.2);
			trackFill.fillRoundedRect(
				position.x - width / 2 - 3,
				position.y - TRACK_HEIGHT / 2 - 3,
				fillWidth + 6,
				TRACK_HEIGHT + 6,
				(TRACK_HEIGHT + 6) / 2
			);
			trackFill.fillStyle(glowColor, 0.4);
			trackFill.fillRoundedRect(
				position.x - width / 2 - 1,
				position.y - TRACK_HEIGHT / 2 - 1,
				fillWidth + 2,
				TRACK_HEIGHT + 2,
				(TRACK_HEIGHT + 2) / 2
			);
			// Core bright fill
			trackFill.fillStyle(TRACK_FILL_COLOR, 1);
			trackFill.fillRoundedRect(
				position.x - width / 2,
				position.y - TRACK_HEIGHT / 2,
				fillWidth,
				TRACK_HEIGHT,
				TRACK_HEIGHT / 2
			);
		}

		// Update handle with neon glow effect
		handle.clear();
		const handleColor = isDragging ? HANDLE_HOVER_COLOR : HANDLE_COLOR;

		// Outer glow layers
		handle.fillStyle(handleColor, 0.15);
		handle.fillCircle(handleX, position.y, HANDLE_RADIUS + 8);
		handle.fillStyle(handleColor, 0.25);
		handle.fillCircle(handleX, position.y, HANDLE_RADIUS + 4);
		handle.fillStyle(handleColor, 0.4);
		handle.fillCircle(handleX, position.y, HANDLE_RADIUS + 2);

		// Main handle with bright border
		handle.fillStyle(handleColor, 1);
		handle.fillCircle(handleX, position.y, HANDLE_RADIUS);

		// Inner bright core
		handle.fillStyle(HANDLE_CORE_COLOR, 0.9);
		handle.fillCircle(handleX, position.y, HANDLE_RADIUS - 4);
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
			const handleX = valueToX(currentValue);

			// Outer glow layers (using hover color)
			handle.fillStyle(HANDLE_HOVER_COLOR, 0.15);
			handle.fillCircle(handleX, position.y, HANDLE_RADIUS + 8);
			handle.fillStyle(HANDLE_HOVER_COLOR, 0.25);
			handle.fillCircle(handleX, position.y, HANDLE_RADIUS + 4);
			handle.fillStyle(HANDLE_HOVER_COLOR, 0.4);
			handle.fillCircle(handleX, position.y, HANDLE_RADIUS + 2);

			// Main handle
			handle.fillStyle(HANDLE_HOVER_COLOR, 1);
			handle.fillCircle(handleX, position.y, HANDLE_RADIUS);

			// Inner bright core
			handle.fillStyle(HANDLE_CORE_COLOR, 0.9);
			handle.fillCircle(handleX, position.y, HANDLE_RADIUS - 4);
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
