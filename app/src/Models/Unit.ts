import * as uuid from "uuid";
import { randomJob } from "./Job";

export type Unit = {
	id: string,
	name: string,
	job: string,
	squad: string | null,
	force: string | null
	currentHp: number,
	maxHp: number,
	strength: number,
	constitution: number,
	intelligence: number,
	wisdom: number,
	dexterity: number,
	charisma: number,
	luck: number,
	exp: number,
	lvl: number,
}

export const makeUnit = (): Unit => {
	return {
		id: uuid.v4(),
		name: uuid.v4().slice(0, 8),
		job: "knight",
		squad: null,
		force: "PLAYER",
		currentHp: 100,
		maxHp: 100,
		strength: 10,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		dexterity: 10,
		charisma: 10,
		luck: 10,
		exp: 0,
		lvl: 1,
	}
}

export const randomUnit = (): Unit => {
	return {
		...makeUnit(),
		name: "unit-" + Math.random().toString(36).substring(7),
		job: randomJob().id
	}
}