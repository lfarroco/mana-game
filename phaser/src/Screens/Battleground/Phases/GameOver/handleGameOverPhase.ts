import { env } from "@Env";
import { displayGameComplete } from "@Screens/Battleground/Components/Results/GameCompleteUI";

export const GameOverPhase = () => {

	return displayGameComplete(
		env.state.session.wins,
		env.state.session.team.units,
		true,
	);

};
