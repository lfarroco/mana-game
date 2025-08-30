import { hideTooltip } from "@UI/Tooltip";
import { tween } from "../../../Utils/animation";
import { Chara } from "../Chara";

export const onShopPurchaseFailed = (chara: Chara, vec: Vec2) => {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: 150,
	});
}
