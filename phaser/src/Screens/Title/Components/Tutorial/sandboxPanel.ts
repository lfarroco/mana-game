/**
 * Sandbox panel — the interactive core of the tutorial (slides 3–8).
 *
 * A caster stands beside a demo crystal; the player taps an ability chip and
 * the ability is *actually applied* through `@game/content/tutorialSandbox`
 * (the same rules the combat engine runs). The panel plays the returned numbers
 * back as combat FX, pop text, and a live readout, so the lesson "shield
 * absorbs damage first" is something the player watches happen to numbers they
 * moved themselves.
 */

import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import type { Chara as CharaType } from "@Components/Chara/Chara";
import * as Chara from "@Components/Chara/Chara";
import * as Animations from "@Components/Chara/Animations";
import { ABILITY_COLORS } from "@game/data/abilityColors";
import {
	castInSandbox,
	createSandboxState,
	isSandboxDefeated,
	previewAbsorption,
	tickStatus,
	type SandboxAbility,
	type SandboxAbilityKind,
	type SandboxState,
} from "@game/content/tutorialSandbox";
import type { TutorialSandboxItem } from "@game/content/tutorialSlides";
import { env } from "@Env";
import * as animation from "@Utils/animation";
import { FX } from "./tutorialDemo";
import { createTutorialScheduler } from "./tutorialScheduler";
import type { ProgressEvent } from "./slideProgress";

const CHIP_WIDTH = 330;
const CHIP_HEIGHT = 62;
const CHIP_RADIUS = 12;
const READOUT_WIDTH = 440;
const READOUT_HEIGHT = 400;
const BAR_WIDTH = 380;
const BAR_HEIGHT = 30;

/** The i18n key naming each ability family (chip label + readout line). */
const ABILITY_LABEL_KEYS: Record<SandboxAbilityKind, string> = {
	damage: "tooltip.effects.damage",
	shield: "tooltip.effects.shield",
	heal: "tooltip.effects.heal",
	regen: "tooltip.effects.regen",
	poison: "tooltip.effects.poison",
	haste: "tooltip.effects.haste",
	slow: "tooltip.effects.slow",
	charge: "tooltip.effects.charge",
	increase_power: "tooltip.effects.increase_power",
	increase_critical: "tooltip.effects.increase_critical",
};

/** One-line, numbers-first explanation of what an ability does (chip subtitle). */
const ABILITY_NOTE_KEYS: Partial<Record<SandboxAbilityKind, string>> = {
	damage: "tutorial.sandbox.note.damage",
	shield: "tutorial.sandbox.note.shield",
	heal: "tutorial.sandbox.note.heal",
	regen: "tutorial.sandbox.note.regen",
	poison: "tutorial.sandbox.note.poison",
	haste: "tutorial.sandbox.note.haste",
	slow: "tutorial.sandbox.note.slow",
	charge: "tutorial.sandbox.note.charge",
	increase_power: "tutorial.sandbox.note.power",
	increase_critical: "tutorial.sandbox.note.crit",
};

const formatPower = (ability: SandboxAbility): string =>
	ability.power > 0 ? `+${ability.power}` : "•";

/** Everything the panel must tear down when its slide goes away. */
type SandboxRuntime = {
	state: SandboxState;
	destroyed: boolean;
};

export interface SandboxPanel {
	container: Phaser.GameObjects.Container;
	destroy: () => void;
}

/**
 * Build the sandbox for one slide. `charas[0]` is the caster and `charas[1]`
 * the demo crystal (the authored convention — see `tutorialSlides.ts`).
 */
export const createSandboxPanel = (
	item: TutorialSandboxItem,
	charas: CharaType[],
	report: (event: ProgressEvent) => void
): SandboxPanel => {
	const scheduler = createTutorialScheduler(() => env.scene);
	const runtime: SandboxRuntime = {
		state: createSandboxState({
			life: item.life,
			maxLife: item.life,
			shield: item.initialShield ?? 0,
			poison: item.initialPoison ?? 0,
		}),
		destroyed: false,
	};

	const caster = charas[0];
	const target = charas[1] ?? charas[0];

	const container = env.container();

	// --- readout scaffolding (live values written by refresh()) ---------------
	const panel = env.scene.add.graphics();
	panel.fillStyle(0x000000, 0.45);
	panel.lineStyle(2, 0xffffff, 0.3);
	panel.fillRoundedRect(item.readoutX, item.readoutY, READOUT_WIDTH, READOUT_HEIGHT, 16);
	panel.strokeRoundedRect(item.readoutX, item.readoutY, READOUT_WIDTH, READOUT_HEIGHT, 16);

	const left = item.readoutX + 30;
	const lifeBarY = item.readoutY + 70;

	const lifeBar = env.scene.add.graphics();

	const lifeText = env.scene.add
		.text(item.readoutX + READOUT_WIDTH - 30, item.readoutY + 34, "", {
			...Constants.titleTextConfig,
			fontSize: 34,
		})
		.setOrigin(1, 0);

	const lifeCaption = env.scene.add
		.text(left, item.readoutY + 34, i18n.t("tutorial.sandbox.life"), {
			...Constants.defaultTextConfig,
			fontSize: 28,
		})
		.setOrigin(0, 0);

	const shieldText = env.scene.add
		.text(left, lifeBarY + 60, "", { ...Constants.defaultTextConfig, fontSize: 28 })
		.setOrigin(0, 0);

	const poisonText = env.scene.add
		.text(left, lifeBarY + 108, "", { ...Constants.defaultTextConfig, fontSize: 28 })
		.setOrigin(0, 0);

	const tempoText = env.scene.add
		.text(left, lifeBarY + 156, "", {
			...Constants.defaultTextConfig,
			fontSize: 26,
			color: "#ffd166",
			wordWrap: { width: READOUT_WIDTH - 60 },
		})
		.setOrigin(0, 0);

	const mathText = env.scene.add
		.text(left, lifeBarY + 250, "", {
			...Constants.defaultTextConfig,
			fontSize: 26,
			color: "#ffffff",
			wordWrap: { width: READOUT_WIDTH - 60 },
		})
		.setOrigin(0, 0);

	const promptText = item.promptKey
		? env.scene.add
				.text(
					item.readoutX + READOUT_WIDTH / 2,
					item.readoutY + READOUT_HEIGHT + 30,
					i18n.t(item.promptKey),
					{
						...Constants.defaultTextConfig,
						fontSize: 27,
						color: "#ffe066",
						align: "center",
						wordWrap: { width: READOUT_WIDTH + 120 },
					}
				)
				.setOrigin(0.5, 0)
		: null;

	// Behind the summoned units, so the readout never covers the crystal.
	[panel, lifeBar, lifeCaption, lifeText, shieldText, poisonText, tempoText, mathText].forEach(
		(object) => object.setDepth(5)
	);
	promptText?.setDepth(5);

	container.add([
		panel,
		lifeBar,
		lifeCaption,
		lifeText,
		shieldText,
		poisonText,
		tempoText,
		mathText,
	]);
	if (promptText) container.add(promptText);

	/** Paint the life bar from the current state. */
	const drawLifeBar = (state: SandboxState) => {
		const ratio = state.maxLife > 0 ? Math.max(0, state.life / state.maxLife) : 0;
		lifeBar.clear();
		// Track
		lifeBar.fillStyle(0x000000, 0.6);
		lifeBar.fillRoundedRect(left, lifeBarY, BAR_WIDTH, BAR_HEIGHT, 8);
		// Fill: green → amber → red as the crystal drops
		const color = ratio > 0.5 ? 0x2ecc71 : ratio > 0.2 ? 0xf1c40f : 0xe74c3c;
		lifeBar.fillStyle(color, 0.95);
		if (ratio > 0) {
			lifeBar.fillRoundedRect(left, lifeBarY, Math.max(6, BAR_WIDTH * ratio), BAR_HEIGHT, 8);
		}
		lifeBar.lineStyle(2, 0xffffff, 0.35);
		lifeBar.strokeRoundedRect(left, lifeBarY, BAR_WIDTH, BAR_HEIGHT, 8);
	};

	const refresh = (state: SandboxState) => {
		drawLifeBar(state);
		lifeText.setText(`${Math.max(0, Math.round(state.life))} / ${state.maxLife}`);
		shieldText.setText(
			`${i18n.t("tooltip.effects.shield")}: ${Math.round(state.shield)}${
				state.powerBonus > 0
					? `    ${i18n.t("tooltip.effects.increase_power")}: +${state.powerBonus}`
					: ""
			}`
		);
		shieldText.setColor(state.powerBonus > 0 ? "#ff8cc8" : "#ffffff");
		poisonText.setText(
			`${i18n.t("tooltip.effects.poison")}: ${Math.round(state.poison)}${
				state.regen > 0 ? `    ${i18n.t("tooltip.effects.regen")}: ${state.regen}/s` : ""
			}`
		);
		poisonText.setColor(state.poison > 0 || state.regen > 0 ? "#c41bf3" : "#ffffff");

		const tempo: string[] = [];
		if (state.cooldownMultiplier < 1) tempo.push(i18n.t("tutorial.sandbox.tempoHaste"));
		if (state.cooldownMultiplier > 1) tempo.push(i18n.t("tutorial.sandbox.tempoSlow"));
		if (state.critChance > 0) {
			tempo.push(
				`${i18n.t("tooltip.effects.increase_critical")}: ${Math.round(state.critChance * 100)}%`
			);
		}
		if (state.powerBonus > 0) {
			tempo.push(`${i18n.t("tooltip.effects.increase_power")}: +${state.powerBonus}`);
		}
		tempoText.setText(tempo.join("\n"));
	};

	const setMath = (text: string) => mathText.setText(text);

	// --- ability chips --------------------------------------------------------
	const clearTimers = () => scheduler.cancelAll();

	/** Restart the per-second status counter for poison/regen. */
	const startStatusTimer = (kind: "poison" | "regen", amount: number, intervalMs: number) => {
		scheduler.every(intervalMs, () => {
			if (runtime.destroyed || isSandboxDefeated(runtime.state)) return;
			const { state, pop } = tickStatus(runtime.state, kind, amount);
			runtime.state = state;
			Animations.popText({ x: target.x, y: target.y, text: pop.text, type: pop.kind });
			refresh(runtime.state);
			report({ kind: "tick" });
		});
	};

	const cast = (ability: SandboxAbility) => {
		if (runtime.destroyed) return;

		// The caster visibly casts: attack animation now, back to idle after.
		Chara.playAnimation(caster, "attack");
		Chara.playAnimationAfterRepeat(caster, "idle");

		const outcome = castInSandbox(runtime.state, ability);
		const previous = runtime.state;
		runtime.state = outcome.state;

		// Status casts restart their per-second counter from this cast.
		clearTimers();
		if (outcome.tickRate._tag === "some") {
			const { kind, amount, intervalMs } = outcome.tickRate.value;
			startStatusTimer(kind, amount, intervalMs);
		}

		const playPops = () => {
			if (runtime.destroyed) return;
			outcome.pops.forEach((pop) => {
				const run = () =>
					Animations.popText({ x: target.x, y: target.y, text: pop.text, type: pop.kind });
				if (pop.delayMs > 0) {
					scheduler.after(pop.delayMs, run);
				} else {
					run();
				}
			});
			refresh(runtime.state);
		};

		// FX between caster and target (when the ability has one).
		if (outcome.fx._tag === "some") {
			const fxKind = outcome.fx.value;
			if (fxKind in FX) {
				FX[fxKind as keyof typeof FX]([caster.x, caster.y], [target.x, target.y], playPops);
			} else {
				playPops();
			}
		} else {
			// Tempo/scaling abilities have no projectile — pop them over the caster.
			outcome.pops.forEach((pop) =>
				Animations.popText({ x: caster.x, y: caster.y, text: pop.text, type: pop.kind })
			);
			playPops();
		}

		// Live explanation: the arithmetic of what just happened.
		setMath(explain(ability, previous, runtime.state));

		report({ kind: "cast", id: ability.id });
		if (isSandboxDefeated(runtime.state)) {
			setMath(`${i18n.t("tutorial.sandbox.destroyed")}`);
		}
	};

	/** Human-readable arithmetic for the readout ("50 − 60 shield = 0 life lost"). */
	const explain = (ability: SandboxAbility, before: SandboxState, after: SandboxState): string => {
		switch (ability.kind) {
			case "damage": {
				const total = ability.power + before.powerBonus;
				const { absorbed, lifeLost } = previewAbsorption(before, total);
				return i18n.t("tutorial.sandbox.math.damage", {
					power: String(total),
					absorbed: String(Math.round(absorbed)),
					life: String(Math.round(lifeLost)),
				});
			}
			case "poison":
				return i18n.t("tutorial.sandbox.math.poison", {
					power: String(ability.power),
					shield: String(Math.round(before.shield)),
				});
			case "shield":
				return i18n.t("tutorial.sandbox.math.shield", { power: String(ability.power) });
			case "heal":
				return i18n.t("tutorial.sandbox.math.heal", {
					heal: String(ability.power),
					gained: String(Math.round(after.life - before.life)),
					poison: String(Math.round(before.poison - after.poison)),
				});
			case "regen":
				return i18n.t("tutorial.sandbox.math.regen", { power: String(ability.power) });
			case "haste":
				return i18n.t("tutorial.sandbox.math.haste");
			case "slow":
				return i18n.t("tutorial.sandbox.math.slow");
			case "charge":
				return i18n.t("tutorial.sandbox.math.charge");
			case "increase_power":
				return i18n.t("tutorial.sandbox.math.power", { power: String(after.powerBonus) });
			case "increase_critical":
				return i18n.t("tutorial.sandbox.math.crit", {
					crit: String(Math.round(after.critChance * 100)),
				});
		}
	};

	const paletteColumns = Math.max(1, item.paletteColumns ?? 1);
	const paletteRows = Math.ceil(item.palette.length / paletteColumns);
	item.palette.forEach((ability, index) => {
		// Fill column-by-column so a two-column palette reads top-to-bottom, then
		// left-to-right (matching how the chips are authored).
		const column = Math.floor(index / paletteRows);
		const row = index % paletteRows;
		const x = item.paletteX + column * (CHIP_WIDTH + 24);
		const y = item.paletteStartY + row * item.paletteSpacingY;
		const chip = createAbilityChip(x, y, ability, () => cast(ability));
		container.add(chip);
	});

	refresh(runtime.state);
	if (item.promptKey) setMath(i18n.t(item.promptKey));

	return {
		container,
		destroy: () => {
			runtime.destroyed = true;
			scheduler.destroy();
			container.destroy(true);
		},
	};
};

/**
 * One palette chip: the ability's real name in its real colour, the authored
 * power, and a one-line note. Hover lifts it; tapping casts it.
 */
const createAbilityChip = (
	x: number,
	y: number,
	ability: SandboxAbility,
	onTap: () => void
): Phaser.GameObjects.Container => {
	const container = env.container();

	const background = env.scene.add.graphics();
	const color = Phaser.Display.Color.HexStringToColor(
		ABILITY_COLORS[ability.color] ?? "#ffffff"
	).color;

	const draw = (hover: boolean) => {
		background.clear();
		background.fillStyle(color, hover ? 0.42 : 0.24);
		background.lineStyle(2, color, hover ? 1 : 0.6);
		background.fillRoundedRect(0, 0, CHIP_WIDTH, CHIP_HEIGHT, CHIP_RADIUS);
		background.strokeRoundedRect(0, 0, CHIP_WIDTH, CHIP_HEIGHT, CHIP_RADIUS);
	};
	draw(false);

	const label = env.scene.add
		.text(18, CHIP_HEIGHT / 2, i18n.t(ABILITY_LABEL_KEYS[ability.kind]), {
			...Constants.titleTextConfig,
			fontSize: 28,
			color: ABILITY_COLORS[ability.color] ?? "#ffffff",
		})
		.setOrigin(0, 0.5);

	const power = env.scene.add
		.text(CHIP_WIDTH - 18, CHIP_HEIGHT / 2, formatPower(ability), {
			...Constants.titleTextConfig,
			fontSize: 28,
			color: "#ffffff",
		})
		.setOrigin(1, 0.5);

	container.add([background, label, power]);

	const noteKey = ABILITY_NOTE_KEYS[ability.kind];
	if (noteKey) {
		const note = env.scene.add
			.text(18, CHIP_HEIGHT / 2 + 22, i18n.t(noteKey), {
				...Constants.defaultTextConfig,
				fontSize: 20,
				color: "#dddddd",
			})
			.setOrigin(0, 0.5);
		container.add(note);
	}

	container.setPosition(x, y);
	container.setSize(CHIP_WIDTH, CHIP_HEIGHT);
	container.setDepth(20);
	container.setInteractive(
		new Phaser.Geom.Rectangle(CHIP_WIDTH / 2, CHIP_HEIGHT / 2, CHIP_WIDTH, CHIP_HEIGHT),
		Phaser.Geom.Rectangle.Contains
	);

	container.on("pointerover", () => {
		draw(true);
		container.scene.input.setDefaultCursor("pointer");
	});
	container.on("pointerout", () => {
		draw(false);
		container.scene.input.setDefaultCursor("default");
	});
	container.on("pointerdown", () => {
		// A short press flash so the tap reads even before the FX lands.
		animation.tween({ targets: [container], scale: 0.95, duration: 80, yoyo: true });
		try {
			onTap();
		} catch (error) {
			// A failed cast must not leave the panel half-updated, and the error
			// must be visible — Phaser swallows throws inside input handlers.
			console.error(`[tutorial] casting ${ability.id} failed`, error);
		}
	});

	return container;
};
