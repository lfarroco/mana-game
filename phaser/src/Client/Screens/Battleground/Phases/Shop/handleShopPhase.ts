import * as Types from "@Core/Types";
import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import * as CharaShop from "@Screens/Battleground/Components/Shop/CharaShop";
import * as Shop from "@Screens/Battleground/Components/Shop/ShopPanel";
import * as DiscardZone from "@Screens/Battleground/Components/Shop/DiscardZone";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as animation from "@Utils/animation";
import * as Effects from "@Effects";

const PURCHASE_FAILED_SNAP_DURATION_MS = 150;
const SHOP_UPGRADE_PROJECTILE_COUNT = 8;
const SHOP_UPGRADE_PROJECTILE_STAGGER_MS = 45;

let initialized = false;

function init() {
	if (initialized) return;
	initialized = true;

	const { events } = io.screens.battleground;

	events.onUnitPurchased.listen(onUnitPurchased);
	events.onUnitSold.listen(onUnitSold);
	events.onShopUnitDragPurchaseFailed.listen(onShopUnitDragPurchaseFailed);
	events.phaseFinished.listen(closeShop)
}

export async function handleShopPhase() {

	init();

	const { session } = state;
	const shopCardIds = session.options.map((o) => o.id);
	const cardDefs = shopCardIds
		.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

	Shop.addSkipButton();

	await CharaShop.renderTavernCharas(cardDefs);

	await Shop.SlideIn();

}

async function closeShop(phase: Types.PhaseType) {
	if (phase !== "shop") return;
	await Shop.SlideOut();
}

async function onUnitPurchased({
	session,
	previousTeamUnits,
	shopCharaId,
}: {
	session: Types.SessionData,
	previousTeamUnits: Unit.Unit[],
	shopCharaId: string | null,
}) {
	const purchaseResult = classifyPurchaseResult(previousTeamUnits, session.team.units);
	const sourceChara =
		shopCharaId && Chara.hasCharaById(shopCharaId)
			? Chara.mustGetCharaById(shopCharaId)
			: null;

	Tooltip.hideTooltip();
	AudioManager.playSoundEffect("sfx_artifact_equipweapon");

	if (purchaseResult?.type === "upgrade") {
		await handleUpgradedUnitPurchase(purchaseResult.unit, sourceChara);
	} else if (purchaseResult?.type === "new") {
		await handleNewUnitPurchase(purchaseResult.unit);
	}

	if (sourceChara) {
		Chara.destroy(sourceChara);
	}

	await Shop.SlideOut();
}

async function handleUpgradedUnitPurchase(
	upgradedUnit: Unit.Unit,
	sourceChara: Chara.Chara | null,
): Promise<void> {
	const targetChara = Chara.hasCharaById(upgradedUnit.id)
		? Chara.mustGetCharaById(upgradedUnit.id)
		: null;

	if (sourceChara && targetChara) {
		await playShopUpgradeEffect(sourceChara, targetChara);
	}

	await Chara.refreshChara(upgradedUnit);
	Chara.enableBoardInteractivity(Chara.mustGetCharaById(upgradedUnit.id));
}

async function handleNewUnitPurchase(newUnit: Unit.Unit): Promise<void> {
	await Chara.refreshChara(newUnit);
	Chara.enableBoardInteractivity(Chara.mustGetCharaById(newUnit.id));
}

function onUnitSold({ unitId }: { session: Types.SessionData, unitId: string }) {
	if (Chara.hasCharaById(unitId)) {
		Chara.destroy(Chara.mustGetCharaById(unitId));
	}

	DiscardZone.hide();
}

function onShopUnitDragPurchaseFailed({
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

async function playShopUpgradeEffect(sourceChara: Chara.Chara, targetChara: Chara.Chara): Promise<void> {
	const source: Vec2 = [sourceChara.x, sourceChara.y];
	const target: Vec2 = [targetChara.x, targetChara.y - 30];

	await Promise.all(
		Array.from({ length: SHOP_UPGRADE_PROJECTILE_COUNT }, async (_, index) => {
			await animation.delay(index * SHOP_UPGRADE_PROJECTILE_STAGGER_MS);
			await Effects.arcaneMissileTargeted(source, target, {
				amplitudeMin: 4,
				amplitudeMax: 12,
				particleScale: 1.2,
				speedMultiplier: 1.4,
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

function findUpdatedUnit(previousTeamUnits: Unit.Unit[], nextTeamUnits: Unit.Unit[]): Unit.Unit | null {
	const previousUnitsById = new Map(previousTeamUnits.map((unit) => [unit.id, unit] as const));

	const upgradedUnit = nextTeamUnits.find((unit) => {
		const previousUnit = previousUnitsById.get(unit.id);
		return previousUnit ? previousUnit.rank !== unit.rank : false;
	});

	if (upgradedUnit) {
		return upgradedUnit;
	}

	const newUnit = nextTeamUnits.find((unit) => !previousUnitsById.has(unit.id));
	return newUnit ?? null;
}

function classifyPurchaseResult(
	previousTeamUnits: Unit.Unit[],
	nextTeamUnits: Unit.Unit[]
): { type: "upgrade" | "new"; unit: Unit.Unit } | null {
	const purchasedUnit = findUpdatedUnit(previousTeamUnits, nextTeamUnits);
	if (!purchasedUnit) {
		return null;
	}

	const existedBeforePurchase = previousTeamUnits.some((unit) => unit.id === purchasedUnit.id);

	if (existedBeforePurchase) {
		return { type: "upgrade", unit: purchasedUnit };
	}

	return { type: "new", unit: purchasedUnit };
}