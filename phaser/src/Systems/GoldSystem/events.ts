export interface GoldSystemEventPayloads {
	"gold_changed": [newTotalGold: number, goldDelta: number];
}

export const GoldSystemEvents = {
	GOLD_CHANGED: "gold_changed" as const,
} as const;
