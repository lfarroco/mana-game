import * as Card from "@game/Entities/Card";
import { Unit } from "@game/Models";
import * as Chara from "@Systems/Chara/Chara";
import * as CharaShop from "@Screens/Battleground/Components/Shop/CharaShop";
import * as DiscardZone from "@Screens/Battleground/Components/Shop/DiscardZone";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as animation from "@Utils/animation";
import * as Effects from "../../../../FX";
import { env } from "@Env";
import type { BGContext } from "../../BattlegroundScreen";
import { skipButton } from "@Screens/Battleground/Components/skipButton";

const PURCHASE_FAILED_SNAP_DURATION_MS = 150;
const SHOP_UPGRADE_PROJECTILE_COUNT = 8;
const SHOP_UPGRADE_PROJECTILE_STAGGER_MS = 45;

export const ShopPhase = (_ctx: BGContext) => {

	const { session } = env.state;
	const shopCardIds = session.options.map((o) => o.id);
	const cardDefs = shopCardIds
		.map(Card.getCardDefinition);

	const skipButton_ = skipButton();
	const charaCards = CharaShop.renderShopCharaCards(cardDefs);

	return [
		...charaCards,
		skipButton_
	]

};

export async function onUnitPurchased({
	unitId: cardId,
	previousTeamUnits,
	shopCharaId,
}: {
	unitId: string,
	previousTeamUnits: Unit[],
	shopCharaId: string | null,
}) {
	const unit = env.state.session.team.units.find((u) => u.cardId === cardId);
	if (!unit) {
		throw new Error(`Purchased unit with cardId ${cardId} not found in session team units`);
	};

	const sourceChara =
		shopCharaId && Chara.hasCharaById(shopCharaId)
			? Chara.mustGetCharaById(shopCharaId)
			: null;

	Tooltip.hideTooltip();
	AudioManager.playSoundEffect("sfx_artifact_equipweapon");

	const wasUpgrade = previousTeamUnits.some((u) => u.cardId === cardId);

	if (wasUpgrade) {
		await handleUpgradedUnitPurchase(unit, sourceChara);
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
): Promise<void> {
	const targetChara = Chara.hasCharaById(upgradedUnit.id)
		? Chara.mustGetCharaById(upgradedUnit.id)
		: null;

	if (sourceChara && targetChara) {
		const source: Vec2 = [sourceChara.x, sourceChara.y];
		const target: Vec2 = [targetChara.x, targetChara.y - 30];
		await playShopUpgradeEffect(source, target);
	}

	await Chara.refreshChara(upgradedUnit);
	Chara.enableBoardInteractivity(Chara.mustGetCharaById(upgradedUnit.id));
}

async function handleNewUnitPurchase(newUnit: Unit): Promise<void> {
	await Chara.refreshChara(newUnit);
	Chara.enableBoardInteractivity(Chara.mustGetCharaById(newUnit.id));
}

export async function onUnitSold(unitId: string) {
	if (Chara.hasCharaById(unitId)) {
		Chara.destroy(Chara.mustGetCharaById(unitId));
	}

	DiscardZone.hide();
}

export function onShopUnitDragPurchaseFailed({
	shopCharaId,
	dragStartVec,
}: {
	shopCharaId: string;
	dragStartVec: Vec2;
}) {

	const chara = Chara.mustGetCharaById(shopCharaId)

	Tooltip.hideTooltip();
	const [x, y] = dragStartVec;
	void animation.tween({
		targets: [chara],
		x,
		y,
		duration: PURCHASE_FAILED_SNAP_DURATION_MS,
	});
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