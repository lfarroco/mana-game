import * as uuid from "uuid";
import { randomJob } from "./Job";

export type Unit = {
	id: string,
	name: string,
	job: string
}

export const makeUnit = (): Unit => {
	return {
		id: uuid.v4(),
		name: "",
		job: ""
	}
}

export const randomUnit = (): Unit => {
	return {
		...makeUnit(),
		name: "unit-" + Math.random().toString(36).substring(7),
		job: randomJob().id
	}
}