import * as Logger from "@Utils/Logger";
import * as Chara from "@Systems/Chara/Chara";
import * as Card from "@Models/Entities/Card";
import * as AudioManager from "@Systems/AudioManager";
import * as Effects from "Client/FX";
import * as constants from "@Constants";
import * as State from "@Models/State";

// io is a global provided by the Phaser game bootstrap

const logger = Logger.createLogger("BrowserCombatEffects:timeout");

export const createTimeoutDamageVisualEffect = (state: State.State) => (
	targetForceId: string,
	_damage: number,
	onHit: () => void
) => {
	const target = Card.getBattleCore(state)(targetForceId);

	if (!target) {
		logger.warn(
			`[BrowserCombatEffects] onTimeoutDamageVisual: No core found for force ${targetForceId}`
		);
		onHit();
		return;
	}

	const core = Chara.mustGetCharaById(target.id);
	const colors = [0x000000];

	AudioManager.playSoundEffect("sfx_voidhunter_attack_impact");

	Effects.arcaneMissileTargeted(constants.MIDDLE_SCREEN, [core.x, core.y], {
		colors,
		blendMode: Phaser.BlendModes.NORMAL,
		onHit: () => {
			onHit();
			Chara.shake(core);
		},
	});
};

export const createTimeoutStartEffect = () => () => {
	// Handled by playback controller in multiplayer or local logic
	// For strictly local single player, we might need a way to set blackHole visible here
	// if we want to support it. But for now, empty to satisfy interface.
};