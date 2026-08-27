import * as Board from "@Components/Board/Board";
import * as Chara from "@Components/Chara/Chara";
import * as Constants from "@Constants";
import * as EncounterCard from "@Components/EncounterCard";
import * as i18n from "@i18n/i18n";
import * as animation from "@Utils/animation";
import * as Effects from "../../../../FX";
import { AWAKEN_POWERS } from "@game/content/awakenPowers";
import { env } from "@Env";
import { BGContext, dispatchAction } from "../../BattlegroundScreen";

// Power-card layout mirrors the shop/upgrade card row (EffectCardShop).
const POWER_CARD_WIDTH = 700;
const POWER_CARD_HEIGHT = 220;
const POWER_CARD_X_OFFSET = 450;
const POWER_CARD_BASE_Y = 300;
const POWER_CARD_SPACING = 240;

/** The player board's center slot — where the awakened unit glides. */
const CENTER_SLOT = {
	x: Constants.PLAYER_BOARD_X + 1 * (Constants.TILE_WIDTH + 8) + Constants.HALF_TILE_WIDTH,
	y: Constants.PLAYER_BOARD_Y + 1 * (Constants.TILE_HEIGHT + 8) + Constants.HALF_TILE_HEIGHT,
};

/**
 * Awaken phase — the cinematic after a bronze-origin unit is promoted to gold.
 *
 * The rest of the board fades out and the slot rings vanish; the promoted unit
 * glides to the center slot and the player picks one of three offered powers
 * (reactions from the awaken-powers catalog). Picking one fires the golden
 * power-up beam (synced with the rank display already showing gold), the board
 * is resummoned, and the run continues to the next phase.
 */
export const AwakenPhase = (_ctx: BGContext) => {
	const { session } = env.state;
	const awakenUnitId = session.awakenUnitId;
	const powerIds = session.options.map((option) => option.id);

	if (!awakenUnitId) {
		console.warn("AwakenPhase", "No awakenUnitId in session — skipping cinematic");
		return [];
	}

	const unit = session.team.units.find((u) => u.id === awakenUnitId);
	if (!unit) return [];

	const chara = Chara.hasCharaById(awakenUnitId) ? Chara.mustGetCharaById(awakenUnitId) : null;
	const otherCharas = Chara.getAllCharas().filter((c) => c !== chara);
	const originalPos = chara ? { x: chara.x, y: chara.y } : { x: CENTER_SLOT.x, y: CENTER_SLOT.y };

	let isResolving = false;

	// ── Cinematic part 1: clear the stage ─────────────────────────────
	// The other units dissolve and the slot rings vanish; the awakened unit
	// takes the center slot. Runs while the choice UI builds below.
	Board.setIsInputEnabled(false);
	Board.setPlayerSlotsVisible(false);
	void (async () => {
		await Promise.all(
			otherCharas.map((c) =>
				animation.tween({
					targets: [c],
					alpha: 0,
					duration: 300,
					onComplete: () => c.setVisible(false),
				})
			)
		);

		if (chara) {
			await animation.tween({
				targets: [chara],
				x: CENTER_SLOT.x,
				y: CENTER_SLOT.y,
				duration: 500,
				ease: "Cubic.easeOut",
			});
		}
	})();

	// ── Choice UI ─────────────────────────────────────────────────────
	const title = env.scene.add
		.text(Constants.SCREEN_WIDTH / 2, 120, i18n.t("awaken.title"), Constants.titleTextConfig)
		.setOrigin(0.5);

	const prompt = env.scene.add
		.text(
			Constants.SCREEN_WIDTH / 2,
			180,
			i18n.t("awaken.prompt", { unit: i18n.getName(unit.cardId) }),
			{ ...Constants.titleTextConfig, fontSize: "34px" }
		)
		.setOrigin(0.5);

	const onSelectPower = async (powerId: string) => {
		if (isResolving) return;
		isResolving = true;

		await dispatchAction({ type: "select_encounter", encounterId: powerId }, async () => {
			// The chosen power is already applied server-side — play the
			// golden power-up beam and sync the rank display (gold) to its
			// flash, exactly like the shop promotion flow.
			const refreshedUnit = env.state.session.team.units.find((u) => u.id === awakenUnitId);
			if (chara && refreshedUnit) {
				await Effects.powerUpEffect({ x: chara.x, y: chara.y - 30 }, () =>
					Chara.refreshCharaInPlace(refreshedUnit)
				);
			}

			// ── The board is resummoned ─────────────────────────────
			// Slots return and the other units fade back in while the
			// awakened unit glides back to its slot.
			Board.setPlayerSlotsVisible(true);
			await Promise.all(
				otherCharas.map((c) => {
					c.setVisible(true);
					return animation.tween({
						targets: [c],
						alpha: 1,
						duration: 250,
						ease: "Cubic.easeOut",
					});
				})
			);
			if (chara) {
				await animation.tween({
					targets: [chara],
					x: originalPos.x,
					y: originalPos.y,
					duration: 350,
					ease: "Cubic.easeInOut",
				});
			}
			Board.setIsInputEnabled(true);
		});
	};

	const cards = powerIds
		.map((powerId, index) => {
			const power = AWAKEN_POWERS[powerId as keyof typeof AWAKEN_POWERS];
			if (!power) return null;

			return EncounterCard.createEncounterCard({
				position: [
					Constants.SCREEN_WIDTH - POWER_CARD_X_OFFSET,
					POWER_CARD_BASE_Y + index * POWER_CARD_SPACING,
				],
				size: [POWER_CARD_WIDTH, POWER_CARD_HEIGHT],
				name: i18n.t(power.nameKey),
				pic: power.icon,
				description: i18n.t(power.tooltipKey),
				onClick: () => void onSelectPower(power.id),
			});
		})
		.filter((card): card is NonNullable<typeof card> => card !== null);

	return [title, prompt, ...cards];
};
