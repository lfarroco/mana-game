import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PlaybackState } from "./types";

const mockMustGetCharaById = jest.fn<(id: string) => unknown>();
const mockFadeInFromWhite = jest.fn<(chara: unknown) => void>();

jest.mock("@Components/Chara/Chara", () => ({
	mustGetCharaById: (id: string) => mockMustGetCharaById(id),
	fadeInFromWhite: (chara: unknown) => mockFadeInFromWhite(chara),
}));

import { handleReaction } from "./reactionHandlers";

describe("handleReaction", () => {
	const playbackState = {} as unknown as PlaybackState;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("fades the reacting unit's sprite in from white", () => {
		const chara = { id: "reactor" };
		mockMustGetCharaById.mockReturnValue(chara);

		handleReaction({ type: "reaction", unitId: "reactor" }, playbackState);

		expect(mockMustGetCharaById).toHaveBeenCalledWith("reactor");
		expect(mockFadeInFromWhite).toHaveBeenCalledWith(chara);
	});

	it("uses the unit id from the reaction log for the chara lookup", () => {
		const chara = { id: "other-unit" };
		mockMustGetCharaById.mockReturnValue(chara);

		handleReaction({ type: "reaction", unitId: "other-unit" }, playbackState);

		expect(mockMustGetCharaById).toHaveBeenCalledWith("other-unit");
		expect(mockFadeInFromWhite).toHaveBeenCalledWith(chara);
	});
});
