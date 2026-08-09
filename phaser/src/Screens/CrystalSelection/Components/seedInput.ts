import * as constants from "@Constants";
import * as keyboard from "./keyboard";
import { env } from "@Env";
import { Destroyable } from "@mana/framework";
import { CRYSTAL_IDS } from "../ids";

/** Minimal context — seedInput only needs track() for object tracking. */
interface SeedInputCtx {
	track(obj: Destroyable, opts?: { id?: string }): Destroyable;
}

export function create(ctx: SeedInputCtx) {
	// Seed selection is server-determined in multiplayer — skip the custom seed UI.
	if (env.state.session.session_type.type === "multiplayer") {
		return;
	}

	const currentSeed = env.state.session.seed;

	const x = constants.SCREEN_WIDTH - 20;
	const y = constants.SCREEN_HEIGHT - 20;
	const width = 200;
	const height = 40;

	const bg = env.scene.add
		.rectangle(x, y, width, height, 0x000000, 0.5)
		.setOrigin(1, 1)
		.setStrokeStyle(1, 0x888888)
		.setInteractive({ useHandCursor: true });
	ctx.track(bg);

	// "Seed: " label
	const label = env.scene.add
		.text(0, 0, "Seed: ", {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
		.setOrigin(1, 0.5)
		.setPosition(x - width - 10, y - height / 2);
	ctx.track(label);

	// Seed value text — passed to the keyboard for editing
	const seedText = env.scene.add
		.text(0, 0, `${currentSeed}`, {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
		.setOrigin(1, 0.5)
		.setPosition(x - 20, y - height / 2);
	ctx.track(seedText);

	// Warning text — toggled by the keyboard
	const seedWarningText = env.scene.add
		.text(0, 0, "Unlocks and stats disabled when using a custom seed", {
			...constants.defaultTextConfig,
			fontSize: "16px",
			color: "#ffff00",
		})
		.setOrigin(1, 0.5)
		.setPosition(x, y - height - 20)
		.setVisible(false);
	ctx.track(seedWarningText, { id: CRYSTAL_IDS.seedWarning });

	// Events
	bg.on("pointerdown", () => {
		keyboard.create(seedText, seedWarningText);
	});

	// Hover effects
	bg.on("pointerover", () => bg.setStrokeStyle(1, 0xffffff));
	bg.on("pointerout", () => bg.setStrokeStyle(1, 0x888888));

	env.scene.add.existing(seedText);
}
