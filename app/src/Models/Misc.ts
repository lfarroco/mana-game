
export type WindowVec = {
	tag: "_windowvec",
	x: number,
	y: number,
}

export type BoardVec = {
	tag: "_boardvec",
	x: number,
	y: number,
}

export const windowVec = (x: number, y: number): WindowVec => ({
	tag: "_windowvec",
	x, y
})

export const boardVec = (x: number, y: number): BoardVec => ({
	tag: "_boardvec",
	x, y
})
