import { BoardVec } from "../../Models/Misc"

export type Signals = {
	ENGAGEMENT_START: (squad: string, targetCell: BoardVec) => void,
}

export const events: { [key in keyof Signals]: keyof Signals } = {
	ENGAGEMENT_START: "ENGAGEMENT_START",
}
