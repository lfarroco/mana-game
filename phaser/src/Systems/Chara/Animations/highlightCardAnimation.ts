import { Chara } from "../Chara";
import { tween, } from "../../../Utils/animation";

export async function highlightCardAnimation(
	activeChara: Chara,
) {

	await tween({
		targets: [activeChara],
		scale: 1.1,
	})

	await tween({
		targets: [activeChara],
		scale: 1,
	})

}
