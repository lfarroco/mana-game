import { v4 } from "uuid";
import { Vec2, vec2Zero } from "../Geometry";
import { TraitData } from "../../TraitSystem/Traits";
import { getCardDefinition } from "./Card";
/**
 * Represents an "instance" of a `CardDefinition` within the game's logical state.
 * A `Unit` is an actual character or entity participating in the game, holding mutable data
 * that can change during gameplay, such as current HP, position on the board, experience points (xp),
 * status effects (like hasted, slowed), and current charge/cooldown for actions.
 * Game logic and systems primarily interact with `Unit` objects.
 * It is visually represented in the scene by a `Chara` object.
 */
export type Unit = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;
  xp: number;

  attackPower: number;
  attackType: "melee" | "ranged" | "none";

  cooldown: number;
  crit: number;
  evade: number;

  traits: TraitData[];

  charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
  refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

  hasted: number;
  slowed: number;
};

export const makeUnit = (force: string, cardId: string, position = vec2Zero()): Unit => {

  const card = getCardDefinition(cardId);
  const unit = {
    ...card,
    id: v4(),
    cardId,
    force,
    position,
    maxHp: card.hp,
    crit: 0,
    evade: 0,
    xp: 0,
    attackType: card.attack && card.traits.some(k => k.id === "ranged") ? "ranged" :
      card.attack && card.traits.some(t => t.id === "melee") ? "melee" : "none",
    attackPower: card.attack || 0,
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    traits: card.traits,
  }
  return unit as Unit
};
