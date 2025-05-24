import { parseTable } from "../utils";
import * as t from "./Traits";

export type CardId = string & { __cardId: true };

export type Card = {
  id: CardId;
  name: string;
  description: string;
  hp: number;
  attack: number;
  defense: number;
  cooldown: number;
  traits: t.TraitId[]
};

export const ARCHER = "archer" as CardId;
export const CLERIC = "cleric" as CardId;
export const CLERIC_OF_LIGHT = "cleric_of_light" as CardId;
export const APPRENTICE = "apprentice" as CardId;
export const KNIGHT = "knight" as CardId;
export const THIEF = "thief" as CardId;
export const DRUID = "druid" as CardId;
export const BARBARIAN = "barbarian" as CardId;
export const PIRATE = "pirate" as CardId;
export const PALADIN = "paladin" as CardId;
export const RANGER = "ranger" as CardId;
export const NECROMANCER = "necromancer" as CardId;
export const BARD = "bard" as CardId;
export const BLOB = "blob" as CardId;
export const RED_BLOB = "red_blob" as CardId;
export const BLOB_KING = "blob_king" as CardId;
export const BLOB_MAGE = "blob_mage" as CardId;
export const BLOB_KNIGHT = "blob_knight" as CardId;
export const TINY_BLOB = "tiny_blob" as CardId;
export const SKELETON = "skeleton" as CardId;
export const SKELETON_MAGE = "skeleton_mage" as CardId;

const STARTER_CARDS = [ARCHER, CLERIC, APPRENTICE, KNIGHT, THIEF, DRUID, BARBARIAN, PIRATE, PALADIN, RANGER, NECROMANCER, BARD];

const baseCards = `
Id                | Name            | HP  | ATK  | CD   | Traits
------------------|-----------------|-----|------|----------------------
${ARCHER}         | Archer          | 150 | 25   | 2000 | ${t.RANGED.id}, ${t.SNIPER.id}
${CLERIC}         | Cleric          | 180 | 0    | 3400 | ${t.HEALING_WAVE.id}, ${t.SUPPORT.id}
${CLERIC_OF_LIGHT}| Cleric of Light | 180 | 0    | 3400 | ${t.HEAL.id}, ${t.SUPPORT.id}
${APPRENTICE}     | Apprentice      | 180 | 20   | 2200 | ${t.RANGED.id}, ${t.ARCANE_MISSILES.id}
${KNIGHT}         | Knight          | 320 | 7    | 2700 | ${t.MELEE.id}, ${t.TAUNT.id}, ${t.PROTECTOR.id}
${THIEF}          | Thief           | 220 | 20   | 2000 | ${t.MELEE.id}, ${t.STEALTH.id},${t.ASSASSIN.id}
${DRUID}          | Druid           | 200 | 15   | 1000 | ${t.RANGED.id}
${BARBARIAN}      | Barbarian       | 180 | 20   | 1000 | ${t.MELEE.id}, ${t.BERSERK.id}, ${t.INITIATIVE.id}
${PIRATE}         | Pirate          | 200 | 10   | 4000 | ${t.MELEE.id}, ${t.HASTE.id}
${PALADIN}        | Paladin         | 350 | 5    | 1000 | ${t.MELEE.id}, ${t.TAUNT.id}, ${t.PROTECTOR.id}
${RANGER}         | Ranger          | 250 | 20   | 1000 | ${t.RANGED.id} 
${NECROMANCER}    | Necromancer     | 250 | 0    | 4200 | ${t.UNDEAD_STRENGTH.id}, ${t.SUMMON_SKELETON.id}, ${t.SUPPORT.id}
${BARD}           | Bard            | 250 | 0    | 3000 | ${t.HASTE.id}, ${t.SUPPORT.id}
${BLOB}           | Blob            | 110 | 10   | 2000 | ${t.MELEE.id}, ${t.SPLIT_BLOB.id}
${BLOB_MAGE}      | Blob Mage       | 90  | 10   | 2000 | ${t.RANGED.id}, ${t.SPLIT_BLOB.id}, ${t.ARCANE_MISSILES.id}
${TINY_BLOB}      | Tiny Blob       | 20  | 10   | 2000 | ${t.MELEE.id}
${SKELETON}       | Skeleton        | 60  | 10   | 2200 | ${t.MELEE.id}, ${t.UNDEAD.id}
${SKELETON_MAGE}  | Skeleton Mage   | 50  | 5    | 4400 | ${t.RANGED.id}, ${t.UNDEAD.id}, ${t.ARCANE_MISSILES.id}
`;

function parseCardsTable(table: string) {
  const data = parseTable(table);

  return data.map((d) => {
    return {
      id: d["Id"] as CardId,
      name: d["Name"],
      description: "",
      hp: parseInt(d["HP"]),
      attack: parseInt(d["ATK"]),
      defense: 0,
      cooldown: parseInt(d["CD"]),
      traits: d["Traits"]?.split(",").map((t) => t.trim() as t.TraitId).filter(t => t) || [],
    } as Card;
  })
}

// TODO: Move into single table
export const descriptions = `
Id            | Description
--------------|--------------------------------------
${ARCHER}     | A ranged attacker that can hit multiple targets
${CLERIC}     | A healer that can heal multiple targets
${APPRENTICE} | A spellcaster that can deal high damage
${KNIGHT}     | A tank that can take a lot of damage
${THIEF}      | A fast attacker that can deal high damage
${BLOB}       | A basic enemy that can deal damage
${RED_BLOB}   | A basic enemy that can explode
${BLOB_KING}  | A boss enemy that can summon other blobs
${BLOB_MAGE}  | A mage enemy that can deal high damage
${BLOB_KNIGHT}| A tank enemy that can deal damage
`;

const descriptionsMap = descriptions.trim().split("\n").slice(2).map((r) => {
  const [id, description] = r.split("|").map((c) => c.trim());
  return { id, description };
}).reduce((acc, { id, description }) => {
  acc[id] = description;
  return acc;
}
  , {} as { [key: string]: string });

function getDesctiption(card: Card): Card {
  card.description = descriptionsMap[card.id];
  return card;
}
export const cards = parseCardsTable(baseCards).map(getDesctiption);

export const starterCards = cards.filter((j) => STARTER_CARDS.includes(j.id));

export const getCard = (id: CardId): Card => cards.find((j) => j.id === id)!;