
export type Squad = {
	path: { x: number; y: number }[]
	id: string,
	name: string,
	force: string,
	dispatched: boolean,
	position: {
		x: number,
		y: number
	},
	members: string[]
}

export const addMember = (
	squad: Squad,
	x: number,
	y: number,
	id: string
): Squad => {
	return {
		...squad,
		members: []
	}
}

