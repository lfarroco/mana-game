import type { PlaybackState } from "./types";
import * as CombatLogger from "@game/Combat/CombatLogger";
import * as Chara from "@Components/Chara/Chara";

/**
 * A unit reacted to another unit's effect — fade its sprite in from a white
 * silhouette (the same fade used by the beam-summon display) so the reaction
 * is clearly readable on the board.
 */
export const handleReaction = (
	log: CombatLogger.ReactionEntry,
	_playbackState: PlaybackState,
): void => {
	const chara = Chara.mustGetCharaById(log.unitId);
	Chara.fadeInFromWhite(chara);
};
