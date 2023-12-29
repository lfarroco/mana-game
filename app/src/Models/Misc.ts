
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
export const asBoardVec = ({ x, y }: { x: number, y: number }): BoardVec => boardVec(x, y)

export const isSameBoardVec = (v1: BoardVec, v2: BoardVec) => v1.x === v2.x && v1.y === v2.y