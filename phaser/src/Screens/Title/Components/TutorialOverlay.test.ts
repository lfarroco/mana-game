/**
 * Tutorial overlay slide lifecycle.
 *
 * Player report: "the two cores rendered in the first slide stay on screen even
 * after the tutorial is closed".
 *
 * `openTutorial` used to render slide 0, then immediately call `updateSlide()`,
 * which destroyed that render and rendered slide 0 a second time. The discarded
 * render's demo had already started summoning its units — and `Chara.summon`
 * adds them to the scene before resolving — so those two cores were orphaned on
 * screen permanently. The first slide must be built exactly once per open.
 */

import { openTutorial, reset } from "./TutorialOverlay";
import { renderTutorialSlide } from "./renderTutorialSlide";
import * as UIButton from "@Components/Button/UIButton";

jest.mock("./renderTutorialSlide", () => ({
	renderTutorialSlide: jest.fn(),
}));

jest.mock("@Env", () => {
	const makeFake = () => {
		const c = {
			active: true,
			list: [] as unknown[],
			add(child: unknown) {
				c.list.push(...(Array.isArray(child) ? child : [child]));
				return c;
			},
			addAt(child: unknown, index: number) {
				c.list.splice(index, 0, child);
				return c;
			},
			remove(child: unknown, destroyChild?: boolean) {
				const index = c.list.indexOf(child);
				if (index >= 0) {
					c.list.splice(index, 1);
					if (destroyChild) (child as { destroy: () => void }).destroy();
				}
				return c;
			},
			destroy: jest.fn(function (this: { active: boolean }) {
				this.active = false;
			}),
		};
		return c;
	};

	return {
		env: {
			scene: {
				add: { rectangle: jest.fn(() => ({ setInteractive: jest.fn() })) },
			},
		},
		makeContainer: jest.fn((children?: unknown[]) => {
			const container = makeFake();
			if (children) container.add(children.filter(Boolean));
			return container;
		}),
	};
});

jest.mock("@Components/Button/UIButton", () => ({ create: jest.fn() }));
jest.mock("@i18n/i18n", () => ({ t: (key: string) => key }));
jest.mock("@Constants", () => ({
	MIDDLE_SCREEN_X: 960,
	MIDDLE_SCREEN_Y: 540,
	SCREEN_WIDTH: 1920,
	SCREEN_HEIGHT: 1080,
}));
jest.mock("@game/content/tutorialSlides", () => ({
	TUTORIAL_SLIDES: [
		[{ kind: "text", key: "slide1", y: 100 }],
		[{ kind: "text", key: "slide2", y: 100 }],
	],
}));

const makeSlide = () => {
	const slide = {
		active: true,
		destroy: jest.fn(() => {
			slide.active = false;
		}),
	};
	return slide;
};

const buttonCallback = (index: number) =>
	(UIButton.create as jest.Mock).mock.calls[index][0].callback as () => void;

describe("TutorialOverlay slide lifecycle", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		reset();
		(renderTutorialSlide as jest.Mock).mockImplementation(makeSlide);
		(UIButton.create as jest.Mock).mockImplementation(() => ({
			container: {},
			disable: jest.fn(),
			enable: jest.fn(),
		}));
	});

	it("renders the first slide once per open", async () => {
		await openTutorial();

		// Twice = the discarded initial render whose demo leaked its cores.
		expect(renderTutorialSlide).toHaveBeenCalledTimes(1);
	});

	it("can be reopened after exiting", async () => {
		await openTutorial();
		buttonCallback(2)(); // exit
		await openTutorial();

		expect(renderTutorialSlide).toHaveBeenCalledTimes(2);
	});

	it("destroys the previous slide when paging", async () => {
		await openTutorial();
		const first = (renderTutorialSlide as jest.Mock).mock.results[0].value;

		buttonCallback(1)(); // next

		expect(renderTutorialSlide).toHaveBeenCalledTimes(2);
		expect(first.destroy).toHaveBeenCalled();
		expect(first.active).toBe(false);
	});
});
