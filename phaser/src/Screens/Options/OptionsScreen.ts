import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";
import * as optionsLabel from "@Screens/Options/Components/optionsLabel";
import * as tabButtons from "@Screens/Options/Components/tabButtons";
import * as backButton from "@Screens/Options/Components/backButton";
import { audioTab } from "@Screens/Options/Components/tabs/audio";
import { gameTab } from "@Screens/Options/Components/tabs/game";
import { graphicsTab } from "@Screens/Options/Components/tabs/graphics";
import { createEvent } from "@game/Models";
import { NavigationEvent } from "../../Events";
import { createScreen, screenModule } from "../screenTracking";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type OptionsScreenEvents = {
	backToTitle: ReturnType<typeof createEvent<void>>;
};

// ---------------------------------------------------------------------------
// Phases — each tab is a phase handled by the createScreen() factory.
// Phase-scoped content is auto-destroyed on tab switch; persistent chrome
// (title, tab buttons, back button) survives transitions.
// ---------------------------------------------------------------------------

export type OptionsPhase = "audio" | "graphics" | "game";

// ---------------------------------------------------------------------------
// Element IDs for tracked objects — usable with ctx.findById / findTrackedById
// ---------------------------------------------------------------------------

export const OPTIONS_IDS = {
	tabButtons: "options.tab-buttons",
	backButton: "options.back-button",
	titleLabel: "options.title-label",
} as const;

// ---------------------------------------------------------------------------
// Layout constants (pure, framework-agnostic)
// ---------------------------------------------------------------------------

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

	events: () => {
		const e: OptionsScreenEvents = {
			backToTitle: createEvent<void>(),
		};
		return {
			events: e,
			listeners: [
				e.backToTitle.listen(NavigationEvent.toTitle.emit),
			],
		};
	},

	create: async (ctx) => {
		new CloudsBackground.CloudsBackground({ preset: "aurora" });
		ctx.add(optionsLabel.create(), { id: OPTIONS_IDS.titleLabel });
		tabButtons.create(ctx);
		ctx.add(backButton.create(ctx), { id: OPTIONS_IDS.backButton });
		await ctx.go("audio");
	},

	phases: {
		audio: (ctx) => {
			ctx.add(audioTab(LAYOUT.OPTIONS_START_Y, LAYOUT.OPTIONS_LINE_HEIGHT));
			tabButtons.setActiveTab("audio");
		},

		graphics: (ctx) => {
			ctx.add(graphicsTab(LAYOUT.OPTIONS_START_Y));
			tabButtons.setActiveTab("graphics");
		},

		game: (ctx) => {
			ctx.add(gameTab(LAYOUT.OPTIONS_START_Y, LAYOUT.OPTIONS_LINE_HEIGHT));
			tabButtons.setActiveTab("game");
		},
	},
});

// ---------------------------------------------------------------------------
// ScreenModule exports — the shape Client.ts expects
// ---------------------------------------------------------------------------

const _oscreen = screenModule(screen);
export const { init, create, destroy, go } = _oscreen;
export const name = _oscreen.name;
export const currentPhase = _oscreen.currentPhase;
