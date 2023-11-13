
export type Squad = {
	id: string,
	name: string,
	members: {
		[y: number]: {
			[x: number]: number
		}
	}
}