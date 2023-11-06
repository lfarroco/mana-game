
export type Squad = {
	id: number,
	name: string,
	members: {
		[y: number]: {
			[x: number]: number
		}
	}
}