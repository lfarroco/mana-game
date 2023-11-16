
export type Squad = {
	id: string,
	name: string,
	force: string,
	members: {
		[y: number]: {
			[x: number]: string
		}
	}
}

export const randomSquad = (): Squad => {
	const squad: Squad = {
		id: "squad-" + Math.random().toString(36).substring(7),
		name: "squad-" + Math.random().toString(36).substring(7),
		force: "force-" + Math.random().toString(36).substring(7),
		members: {}
	}

	for (let i = 0; i < 5; i++) {
		const x = Math.floor(Math.random() * 3) + 1
		const y = Math.floor(Math.random() * 3) + 1
		squad.members[y] = {}
		squad.members[y][x] = "unit-" + Math.random().toString(36).substring(7)
	}
	return squad
}
