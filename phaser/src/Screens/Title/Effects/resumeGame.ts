import { env } from "@Env";
import * as loadGame from "../../../Storage/loadGame"
import * as BattlegroundScreen from "../../Battleground/BattlegroundScreen";

export const resumeGame = async () => {

	await env.fadeOut(500, 0x000);

	env.scene.children.removeAll();

	loadGame.loadGame();

	BattlegroundScreen.create();

	await env.fadeIn(300);
}