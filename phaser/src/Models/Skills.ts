import { EffectReaction } from "../TriggerSystem/TriggerSystem";
import { Unit } from "./Entities/Unit";

export type Skill = {
	name: string;
	id: string;
	description: string;
	reactions: EffectReaction[];
	traits: ((u: Unit) => Unit)[];
};

export const isDamage = (u: Unit) => u.effects.some(e => e.id === "damage");
export const isShield = (u: Unit) => u.effects.some(e => e.id === "shield");
export const isPoison = (u: Unit) => u.effects.some(e => e.id === "poison");
export const isRegen = (u: Unit) => u.effects.some(e => e.id === "regen");

const reduceCd = (u: Unit, percent: number) => ({
	...u,
	cooldown: Math.max(u.cooldown - (u.cooldown * percent), 1000)
});
const addCd = (u: Unit, percent: number) => ({
	...u,
	cooldown: u.cooldown * (1 + percent)
});

const modPwr = (u: Unit, percent: number) => ({
	...u,
	power: u.power * percent
});

export const skillsIndex: {
	[key: string]: Skill
} = {
	"♈": {
		name: "Aries",
		id: "aries",
		traits: [
			u => isDamage(u) ? reduceCd(u, 0.15) : u,
			u => isShield(u) ? modPwr(u, 0.9) : u,
		],
		reactions: [],
		description: "Damage dealers have 15% reduced cooldown. Shields have 10% less power."
	},
	"♉": {
		name: "Taurus",
		id: "taurus",
		traits: [
			u => isShield(u) ? modPwr(u, 1.2) : u,
			u => isDamage(u) ? modPwr(u, 0.9) : u,
		],
		description: "Shields have 20% more power. Damage dealers have 10% less power.",
		reactions: [],
	},
	"♊": {
		id: "gemini",
		name: "Gemini",
		reactions: [],
		traits: [
			u => isDamage(u) ? reduceCd(u, 0.1) : u,
			u => isRegen(u) ? modPwr(u, 0.95) : u,
		],
		description: "Damage dealers have 10% reduced cooldown. Healers have 5% less power."
	},
	"♋": {
		id: "cancer",
		name: "Cancer",
		reactions: [],
		traits: [
			u => isRegen(u) ? modPwr(u, 1.15) : u,
			u => isDamage(u) ? reduceCd(u, 0.1) : u,
		],
		description: "Healers have 15% more power. Damage dealers have 10% increased cooldown."
	},
	"♌": {
		id: "leo",
		name: "Leo",
		reactions: [],
		traits: [
			u => isDamage(u) ? modPwr(u, 1.2) : u,
			u => isDamage(u) ? addCd(u, 0.1) : u,
		],
		description: "Damage dealers have 20% more power but 10% increased cooldown."
	},
	"♍": {
		id: "virgo",
		name: "Virgo",
		reactions: [],
		traits: [
			u => isDamage(u) ? reduceCd(u, 0.1) : u,
			u => isRegen(u) ? modPwr(u, 0.95) : u,
		],
		description: "Damage dealers have 10% reduced cooldown. Healers have 5% less power."
	},
	"♎": {
		id: "libra",
		name: "Libra",
		reactions: [],
		traits: [
			u => isDamage(u) ? modPwr(u, 1.2) : u,
			u => isShield(u) ? modPwr(u, 0.9) : u,
		],
		description: "Damage dealers have 20% more power. Shields have 10% less power."
	},
	"♏": {
		id: "scorpio",
		name: "Scorpio",
		reactions: [],
		traits: [
			u => isDamage(u) ? reduceCd(u, 0.1) : u,
			u => isShield(u) ? modPwr(u, 0.9) : u,
		],
		description: "Damage dealers have 10% reduced cooldown. Shields have 10% less power."
	},
	"♐": {
		id: "sagittarius",
		name: "Sagittarius",
		reactions: [],
		traits: [
			u => isDamage(u) ? addCd(u, 0.1) : u,
			u => isRegen(u) ? modPwr(u, 0.95) : u,
		],
		description: "Damage dealers have 10% increased cooldown. Healers have 5% less power."
	},
	"♑": {
		id: "capricorn",
		name: "Capricorn",
		reactions: [],
		traits: [
			u => isDamage(u) ? modPwr(u, 1.2) : u,
			u => isDamage(u) ? reduceCd(u, 0.15) : u,
		],
		description: "All units have 5% more power. Damage dealers have 10% increased cooldown."
	},
	"♒": {
		id: "aquarius",
		name: "Aquarius",
		reactions: [],
		traits: [
			u => isDamage(u) ? reduceCd(u, 0.15) : u,
			u => isShield(u) ? modPwr(u, 0.9) : u,
		],
		description: "Damage dealers have 15% reduced cooldown. Shields have 10% less power."
	},
	"♓": {
		id: "pisces",
		name: "Pisces",
		reactions: [],
		traits: [
			u => isRegen(u) ? modPwr(u, 1.1) : u,
			u => isDamage(u) ? modPwr(u, 0.9) : u,
		],
		description: "Healers have 10% more power. Damage dealers have 10% less power."
	},
}


