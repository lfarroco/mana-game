import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getMultiplayerRatingDelta, getMultiplayerVictoryTier } from "./multiplayer-rating.ts";

Deno.test("getMultiplayerVictoryTier returns null below bronze", () => {
	assertEquals(getMultiplayerVictoryTier(0), null);
	assertEquals(getMultiplayerVictoryTier(4), null);
});

Deno.test("getMultiplayerVictoryTier maps bronze silver and gold thresholds", () => {
	assertEquals(getMultiplayerVictoryTier(5), "bronze");
	assertEquals(getMultiplayerVictoryTier(7), "bronze");
	assertEquals(getMultiplayerVictoryTier(8), "silver");
	assertEquals(getMultiplayerVictoryTier(9), "silver");
	assertEquals(getMultiplayerVictoryTier(10), "gold");
	assertEquals(getMultiplayerVictoryTier(13), "gold");
});

Deno.test("getMultiplayerRatingDelta awards rating from the final victory tier", () => {
	assertEquals(getMultiplayerRatingDelta(0), 1);
	assertEquals(getMultiplayerRatingDelta(4), 1);
	assertEquals(getMultiplayerRatingDelta(5), 2);
	assertEquals(getMultiplayerRatingDelta(8), 4);
	assertEquals(getMultiplayerRatingDelta(10), 6);
});
