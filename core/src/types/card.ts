/**
 * Card definition types — blueprints for game entities.
 */

import type { Effect, EffectReaction } from "./effect";

export type CardDefinition = {
	id: string;
	pic: string;
	power?: number;
	cooldown: number;
	effects: Effect[];
	reactions: EffectReaction[];
	isCore?: boolean;
	locked?: boolean;
	rank?: number;
	life?: number;
	critical?: number;
};

export type CardCollection = {
	id: string;
	name: string;
	cards: CardDefinition[];
};