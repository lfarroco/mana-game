import { env } from "@Env";

type CustomTweenProps = Omit<
	Phaser.Types.Tweens.TweenBuilderConfig,
	"targets" | "onComplete" | "onCompleteScope" | "onCompleteParams"
> & {
	targets: Phaser.GameObjects.GameObject[] | Phaser.Geom.Mesh.Face[];
	onComplete?: () => void;
};

// How long past a tween's computed total runtime we wait before force-resolving
// it. Phaser kills tweens without firing onComplete (ScreenManager's
// `tweens.killAll()` calls `Tween.destroy()`, which never invokes
// onComplete/onStop), so an awaited transition tween would otherwise hang
// forever and freeze the phase chain. The margin is generous enough that a
// legitimately running tween always completes first; the fallback only fires
// for killed tweens.
const TWEEN_SETTLE_MARGIN_MS = 1000;
const DELAY_SETTLE_MARGIN_MS = 1000;

export async function tween(attributes: CustomTweenProps): Promise<void> {
	const { targets, onComplete: userOnCompleteCallback, ...restOfConfig } = attributes;

	if (targets.length === 0 || !targets[0]) {
		return Promise.resolve();
	}

	const phaserTweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
		...restOfConfig,
		targets: targets,
	};

	if (phaserTweenConfig.ease === undefined) {
		phaserTweenConfig.ease = "Power2";
	}

	if (phaserTweenConfig.duration === undefined) {
		phaserTweenConfig.duration = 200;
	}

	return new Promise<void>((resolve, _reject) => {
		let settled = false;
		let fallbackId: ReturnType<typeof setTimeout> | null = null;

		const finish = () => {
			if (settled) return;
			settled = true;
			if (fallbackId !== null) clearTimeout(fallbackId);
			resolve();
		};

		env.scene.tweens.add({
			...phaserTweenConfig,
			onComplete: () => {
				if (userOnCompleteCallback) {
					userOnCompleteCallback();
				}
				finish();
			},
		});

		// Fallback for tweens killed without onComplete (see module comment).
		// Phaser's config types allow Function for delay/repeat — only numbers
		// matter for the runtime estimate.
		const duration = phaserTweenConfig.duration ?? 200;
		const delay = typeof phaserTweenConfig.delay === "number" ? phaserTweenConfig.delay : 0;
		const repeat = typeof phaserTweenConfig.repeat === "number" ? phaserTweenConfig.repeat : 0;
		const yoyo = phaserTweenConfig.yoyo ?? false;
		const totalRuntime = delay + duration * (repeat + 1) * (yoyo ? 2 : 1) + TWEEN_SETTLE_MARGIN_MS;
		// repeat: -1 (infinite loops, e.g. core float) are never awaited, so a
		// wrong fallback value there is harmless — cap at a sane bound anyway.
		const fallbackAfter = totalRuntime > 0 ? totalRuntime : TWEEN_SETTLE_MARGIN_MS;
		fallbackId = setTimeout(finish, fallbackAfter);
	});
}

export const delay = (duration: number) =>
	new Promise<void>((resolve) => {
		let settled = false;
		let fallbackId: ReturnType<typeof setTimeout> | null = null;

		const finish = () => {
			if (settled) return;
			settled = true;
			if (fallbackId !== null) clearTimeout(fallbackId);
			resolve();
		};

		env.scene.time.addEvent({
			delay: duration,
			callback: finish,
		});

		// Fallback: `time.removeAllEvents()` (ScreenManager teardown) removes
		// timer events without firing their callbacks — a pending delay() would
		// otherwise hang its awaiter forever (e.g. syncPlayerBoardUnits summon
		// delays or the combat start delay), stalling the phase transition.
		fallbackId = setTimeout(finish, duration + DELAY_SETTLE_MARGIN_MS);
	});
