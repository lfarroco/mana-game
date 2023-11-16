export type Job = {
	id: string,
	name: string
}

export const jobs = [
	{ id: "fighter", name: "Fighter" },
	{ id: "cleric", name: "Cleric" },
	{ id: "ranger", name: "Ranger" },
	{ id: "rogue", name: "Rogue" },
	{ id: "wizard", name: "Wizard" },
]

export const randomJob = (): Job => {
	return jobs[Math.floor(Math.random() * jobs.length)]
}