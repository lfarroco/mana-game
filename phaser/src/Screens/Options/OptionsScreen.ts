import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";
import * as optionsLabel from "@Screens/Options/Components/optionsLabel";
import * as tabButtons from "@Screens/Options/Components/tabButtons";
import * as backButton from "@Screens/Options/Components/backButton";
import { audioTab } from "@Screens/Options/Components/tabs/audio";
import { gameTab } from "@Screens/Options/Components/tabs/game";
import { graphicsTab } from "@Screens/Options/Components/tabs/graphics";
import { createEvent } from "@game/Models";
import { getScreenManager } from "../ScreenManager";
import { createScreen, screenModule } from "@mana/framework";

export type OptionsScreenEvents = {
	backToTitle: ReturnType<typeof createEvent<void>>;
};

export type OptionsPhase = "audio" | "graphics" | "game";

export const LAYOUT = {
	TITLE_Y: 40,
	TITLE_FONT_SIZE: "48px",
	BACK_BUTTON_Y: 950,

	TAB_BUTTON_Y: 120,
	TAB_BUTTON_SPACING: 200,
	TAB_BUTTON_WIDTH: 180,

	OPTIONS_START_Y: 200,
	OPTIONS_LINE_HEIGHT: 150,

	LABEL_OFFSET_Y: 0,
	VALUE_OFFSET_Y: 70,
	MULTICHOICE_VALUE_OFFSET_Y: 70,
	SPEED_VALUE_OFFSET_Y: 70,
} as const;

export const BUTTONS = {
	BOOLEAN_TOGGLE_WIDTH: 120,

	VOLUME_BUTTON_OFFSET_X: 120,
	VOLUME_BUTTON_WIDTH: 60,

	MULTICHOICE_BUTTON_OFFSET_X: 150,
	MULTICHOICE_BUTTON_WIDTH: 80,

	SPEED_BUTTON_OFFSET_X: 120,
	SPEED_BUTTON_WIDTH: 60,
} as const;

export const STYLES = {
	VALUE_TEXT_COLOR: "#FFD700",
} as const;

// ---------------------------------------------------------------------------
// Screen factory
// ---------------------------------------------------------------------------

const screen = createScreen<OptionsPhase, OptionsScreenEvents>({
	name: "options",

	// Deep-link mapper (P2): translates route params into the options tab to
	// open.  Replaces the former hardcoded `"tab"` convention in the framework
	// nav core — each screen owns the shape of its own params.
	mapDeepLink: (params): OptionsPhase | null => {
		if (!params || typeof params !== "object") return null;
		const tab = (params as { tab?: OptionsPhase }).tab;
		return tab === "audio" || tab === "graphics" || tab === "game" ? tab : null;
	},

	events: () => {
		const backToTitle = createEvent<void>();

		return {
			events: { backToTitle },
			listeners: [
				backToTitle.listen(() => {
					void getScreenManager().go("title");
				}),
			],
		};
	},

	create: async (ctx) => {
		new CloudsBackground.CloudsBackground({ preset: "aurora" });
		const label = optionsLabel.create();
		tabButtons.create(ctx);
		const back = backButton.create(ctx);
		await ctx.go("audio");
		return [label, back];
	},

	phases: {
		audio: (_ctx) => {
			tabButtons.setActiveTab("audio");
			return audioTab(LAYOUT.OPTIONS_START_Y, LAYOUT.OPTIONS_LINE_HEIGHT);
		},

		graphics: (_ctx) => {
			tabButtons.setActiveTab("graphics");
			return graphicsTab(LAYOUT.OPTIONS_START_Y);
		},

		game: (_ctx) => {
			tabButtons.setActiveTab("game");
			return gameTab(LAYOUT.OPTIONS_START_Y, LAYOUT.OPTIONS_LINE_HEIGHT);
		},
	},
});

const _oscreen = screenModule(screen);
export const { init, create, destroy, go } = _oscreen;
export const name = _oscreen.name;
export const currentPhase = _oscreen.currentPhase;
