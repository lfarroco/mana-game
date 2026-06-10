import * as Chara from "@Systems/Chara/Chara";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as animation from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";

const PURCHASE_FAILED_SNAP_DURATION_MS = 150;

export const onShopPurchaseFailed = (chara: Chara.Chara, vec: Vec2) => {
	Tooltip.hideTooltip();
	animation.tween({
		targets: [chara],
		...vec,
		duration: PURCHASE_FAILED_SNAP_DURATION_MS,
	});
};

export const onShopPurchaseSuccesful = (chara: Chara.Chara) => {
	Tooltip.hideTooltip();
	AudioManager.playSoundEffect("sfx_artifact_equipweapon");
	const charaState = Chara.mustGetState(chara);
	const { events } = io.screens.battleground;

	events.onUnitPurchased.emit({
		unitId: charaState.unit.id,
		session: state.session
	});
};
