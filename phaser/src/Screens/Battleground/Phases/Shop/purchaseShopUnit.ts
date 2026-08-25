import { Unit, type SessionData } from "@game/Models";
import { checkRecruitEligibility } from "@game/Actions/recruitValidation";
import * as Chara from "@Components/Chara/Chara";
import * as i18n from "@i18n/i18n";
import * as uiEvents from "@Screens/Battleground/Components/UI/events";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as animation from "@Utils/animation";
import * as Effects from "../../../../FX";
import { env } from "@Env";
import {
	beginPhaseTransition,
	endPhaseTransition,
	finishPhase,
	restorePhaseExit,
} from "../../BattlegroundScreen";

const PURCHASE_FAILED_SNAP_DURATION_MS = 150;
const SHOP_UPGRADE_PROJECTILE_COUNT = 8;
const SHOP_UPGRADE_PROJECTILE_STAGGER_MS = 45;

export type PurchaseResult =
	| { ok: true; wasUpgrade: boolean }
	| { ok: false; reason: "PARTY_FULL" | "SLOT_OCCUPIED" | "NOT_ACQUIRED" };

/**
 * Validate and execute a shop unit purchase (click or drag), then run the
 * purchase visuals and phase transition. Single path shared by both input
 * gestures so the click/drag purchase flows can't drift apart.
 *
 * User-facing failures (party full / slot occupied) show a toast here; the
 * caller is responsible for path-specific feedback such as snapping the
 * dragged chara back to the shop.
 */
export async function purchaseShopUnit({
	cardId,
	shopCharaId,
	targetSlot,
}: {
	cardId: string;
	shopCharaId: string;
	targetSlot: Vec2 | null;
}): Promise<PurchaseResult> {
	const { session: currentSession } = env.state;

	const check = checkRecruitEligibility(currentSession, cardId, targetSlot);
	if (!check.ok) {
		uiEvents.onPurchaseFailed(i18n.getName(cardId), check.reason);
		return { ok: false, reason: check.reason };
	}

	const previousTeamUnits = JSON.parse(JSON.stringify(currentSession.team.units)) as Unit[];
	const previousTeamUnitIds = new Set(previousTeamUnits.map((u) => u.id));

	// Slide the shop out while the recruit request is in flight (masks the
	// server round-trip), mirroring dispatchAction's pre-exit. The next phase
	// switch skips the exit since it already ran here.
	const previousPhase = env.state.session.phase;
	const exitDone = beginPhaseTransition();

	try {
		let session: SessionData;
		try {
			({ session } = await env.dispatch({
				type: "recruit_unit",
				unitId: cardId,
				targetSlot,
			}));
		} catch (err) {
			// The request failed — bring the shop back into view.
			await restorePhaseExit().catch(() => {});
			throw err;
		}

		await exitDone;

		const wasUpgrade = previousTeamUnits.some((u) => u.cardId === cardId);
		const didAddUnit = session.team.units.find(
			(u) => u.cardId === cardId && !previousTeamUnitIds.has(u.id)
		);
		if (!wasUpgrade && !didAddUnit) {
			// The server rejected the recruit — restore the shop UI.
			await restorePhaseExit().catch(() => {});
			return { ok: false, reason: "NOT_ACQUIRED" };
		}

		// The acquisition is valid — destroy the dragged shop chara as soon as it
		// is dropped instead of leaving it visible through the rest of the purchase
		// flow. Capture its position first so the upgrade effect can still animate
		// from the drop location.
		const draggedChara = Chara.hasCharaById(shopCharaId)
			? Chara.mustGetCharaById(shopCharaId)
			: null;
		const dragSourceVec: Vec2 | null = draggedChara ? [draggedChara.x, draggedChara.y] : null;
		if (draggedChara) {
			Chara.destroy(draggedChara);
		}

		env.updateState({ ...env.state, session });
		await finishPhase(previousPhase, () =>
			playPurchaseFeedback({
				cardId,
				shopCharaId,
				dragSourceVec,
				wasUpgrade,
			})
		);

		return { ok: true, wasUpgrade };
	} finally {
		endPhaseTransition();
	}
}

/** Snap a failed drag purchase back to its starting position. */
export function onShopUnitDragPurchaseFailed({
	shopCharaId,
	dragStartVec,
}: {
	shopCharaId: string;
	dragStartVec: Vec2;
}) {
	const chara = Chara.mustGetCharaById(shopCharaId);

	Tooltip.hideTooltip();
	const [x, y] = dragStartVec;
	void animation.tween({
		targets: [chara],
		x,
		y,
		duration: PURCHASE_FAILED_SNAP_DURATION_MS,
	});
}

async function playPurchaseFeedback({
	cardId,
	shopCharaId,
	dragSourceVec,
	wasUpgrade,
}: {
	cardId: string;
	shopCharaId: string | null;
	dragSourceVec?: Vec2 | null;
	wasUpgrade: boolean;
}): Promise<void> {
	const unit = env.state.session.team.units.find((u) => u.cardId === cardId);
	if (!unit) {
		throw new Error(`Purchased unit with cardId ${cardId} not found in session team units`);
	}

	// On the drag path the shop chara is destroyed at drop time, so sourceChara
	// is null here and the upgrade effect uses dragSourceVec instead. On the
	// click path the shop chara still exists and is destroyed at the end of
	// this handler.
	const sourceChara =
		shopCharaId && Chara.hasCharaById(shopCharaId) ? Chara.mustGetCharaById(shopCharaId) : null;

	Tooltip.hideTooltip();
	AudioManager.playSoundEffect("sfx_artifact_equipweapon");

	if (wasUpgrade) {
		await handleUpgradedUnitPurchase(unit, sourceChara, dragSourceVec);
	} else {
		await handleNewUnitPurchase(unit);
	}

	if (sourceChara) {
		Chara.destroy(sourceChara);
	}
}

async function handleUpgradedUnitPurchase(
	upgradedUnit: Unit,
	sourceChara: Chara.Chara | null,
	dragSourceVec?: Vec2 | null
): Promise<void> {
	const targetChara = Chara.hasCharaById(upgradedUnit.id)
		? Chara.mustGetCharaById(upgradedUnit.id)
		: null;

	// The effect source is the shop chara when it still exists (click path);
	// on the drag path it was destroyed at drop time, so fall back to the
	// captured drop position.
	const source: Vec2 | null = sourceChara
		? [sourceChara.x, sourceChara.y]
		: (dragSourceVec ?? null);

	if (source && targetChara) {
		const target: Vec2 = [targetChara.x, targetChara.y - 30];
		await playShopUpgradeEffect(source, target);
	}

	if (targetChara) {
		// Promotion (bronze -> silver -> gold -> platinum): the duplicate-card
		// transfer above ends with the power-up — a golden beam rising from the
		// unit. The rank-orb color change is synced with the beam's flash via
		// the start callback.
		await Effects.powerUpEffect({ x: targetChara.x, y: targetChara.y - 30 }, () =>
			Chara.refreshCharaInPlace(upgradedUnit)
		);
	} else {
		// Refresh the chara's stats in place rather than re-summoning it
		// (avoids a duplicate summon with the board reconciliation pass).
		Chara.refreshCharaInPlace(upgradedUnit);
	}

	Chara.enableBoardInteractivity(Chara.mustGetCharaById(upgradedUnit.id));
}

async function handleNewUnitPurchase(newUnit: Unit): Promise<void> {
	await Chara.refreshChara(newUnit);
	Chara.enableBoardInteractivity(Chara.mustGetCharaById(newUnit.id));
}

async function playShopUpgradeEffect(source: Vec2, target: Vec2): Promise<void> {
	await Promise.all(
		Array.from({ length: SHOP_UPGRADE_PROJECTILE_COUNT }, async (_, index) => {
			await animation.delay(index * SHOP_UPGRADE_PROJECTILE_STAGGER_MS);
			await Effects.arcaneMissileTargeted(source, target, {
				amplitudeMin: 4,
				amplitudeMax: 12,
				particleScale: 1.2,
				impact: {
					scale: 1.4,
					speed: 140,
					lifespan: 180,
					alpha: 0.7,
				},
			});
		})
	);
}
