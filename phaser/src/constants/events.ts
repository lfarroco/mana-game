export const GameEvents = {
	GOLD_CHANGED: "gold_changed",
	/**
	 * Emitted when the battle wave setup is complete, before the first tick of combat.
	 * Units, relics and other systems can listen to this to apply battle-start effects.
	 */
	BATTLE_START_SETUP_COMPLETE: "battle_start_setup_complete",
};