/**
 * Tutorial demo teardown.
 *
 * Player report: "the two cores rendered in the first slide stay on screen even
 * after the tutorial is closed".
 *
 * `Chara.summon` adds a unit straight to the scene and only resolves after the
 * summon beam has landed, so a demo slide that is torn down mid-summon owns no
 * other reference to the unit. The demo must destroy a chara that lands after
 * teardown, and unregister every chara it adopted when it is destroyed — the
 * scene teardown alone leaves orphans in the display list and in the global
 * Chara registry.
 */

import { renderTutorialSlide } from "./renderTutorialSlide";
import * as Chara from "@Components/Chara/Chara";
import * as Card from "@game/Entities/Card";
import type { TutorialSlide } from "@game/content/tutorialSlides";

type FakeContainer = {
	active: boolean;
	list: unknown[];
	add: (child: unknown) => FakeContainer;
	addAt: (child: unknown, index: number) => FakeContainer;
	remove: (child: unknown, destroyChild?: boolean) => FakeContainer;
	once: (event: string, cb: () => void) => FakeContainer;
	destroy: () => void;
};

jest.mock("@Env", () => {
	const makeFake = () => {
		const listeners: (() => void)[] = [];
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
					if (destroyChild) (child as FakeContainer).destroy();
				}
				return c;
			},
			once(event: string, cb: () => void) {
				if (event === "destroy") listeners.push(cb);
				return c;
			},
			destroy() {
				if (!c.active) return;
				c.active = false;
				// Phaser's Container.preDestroy destroys its children before the
				// container's own DESTROY event fires.
				c.list.splice(0).forEach((kid) => (kid as { destroy?: () => void } | null)?.destroy?.());
				listeners.splice(0).forEach((cb) => cb());
			},
		};
		return c;
	};

	return {
		env: { scene: {} },
		makeContainer: jest.fn((children?: unknown[]) => {
			const container = makeFake();
			if (children) container.add(children.filter(Boolean));
			return container;
		}),
	};
});

jest.mock("@Components/Chara/Chara", () => ({
	summon: jest.fn(),
	destroy: jest.fn(),
	getUnit: jest.fn(),
	playAnimation: jest.fn(),
	playAnimationAfterRepeat: jest.fn(),
	mustGetState: jest.fn(),
}));

jest.mock("@Components/Chara/Animations", () => ({ popText: jest.fn() }));
jest.mock("@Components/Chara/createDescription", () => ({ createDescription: jest.fn() }));
jest.mock("@game/Entities/Card", () => ({ makeUnit: jest.fn() }));
jest.mock("@game/data/abilityColors", () => ({ ABILITY_COLORS: {} }));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/damage", () => ({
	damageFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/shield", () => ({
	shieldFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/heal", () => ({
	healFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/poison", () => ({
	poisonFx: jest.fn(),
}));
jest.mock("@Screens/Battleground/Phases/Combat/logHandlers/visuals/regen", () => ({
	regenFx: jest.fn(),
}));
jest.mock("@Utils/animation", () => ({ delay: jest.fn() }));
jest.mock("@i18n/i18n", () => ({ t: (key: string) => key }));
jest.mock("@Constants", () => ({}));

/** Slide 1's demo: the two cores from the player report. */
const DEMO_SLIDE: TutorialSlide = [
	{
		kind: "demo",
		units: [
			{ cardId: "mana_crystal", force: "PLAYER_FORCE", position: [-2, 0.5] },
			{ cardId: "protective_crystal", force: "PLAYER_FORCE", position: [0, 0.5] },
		],
	},
];

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const renderSlide = () => renderTutorialSlide(DEMO_SLIDE) as unknown as FakeContainer;

describe("renderTutorialSlide demo teardown", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(Card.makeUnit as jest.Mock).mockImplementation((force, cardId, position) => ({
			id: `${cardId}-id`,
			cardId,
			force,
			position,
		}));
	});

	it("destroys a chara whose summon lands after the slide is torn down", async () => {
		const charas = [{ id: "chara-1" }, { id: "chara-2" }];
		const resolvers: ((chara: unknown) => void)[] = [];
		(Chara.summon as jest.Mock).mockImplementation(
			() => new Promise((resolve) => resolvers.push(resolve))
		);

		const slide = renderSlide();
		expect(resolvers).toHaveLength(2);

		// The reported path: the demo is discarded while both beams are in flight.
		slide.destroy();

		resolvers.forEach((resolve, index) => resolve(charas[index]));
		await flush();

		expect(Chara.destroy).toHaveBeenCalledTimes(2);
		expect(Chara.destroy).toHaveBeenCalledWith(charas[0]);
		expect(Chara.destroy).toHaveBeenCalledWith(charas[1]);
	});

	it("adopts summoned charas and unregisters them when the demo is destroyed", async () => {
		const charas = [{ id: "chara-1" }, { id: "chara-2" }];
		(Chara.summon as jest.Mock).mockResolvedValueOnce(charas[0]).mockResolvedValueOnce(charas[1]);

		const slide = renderSlide();
		await flush();

		const demo = slide.list[0] as FakeContainer;
		expect(demo.list).toEqual(charas);

		slide.destroy();

		// Container teardown destroys the chara game objects; the demo must also
		// run them through `Chara.destroy` so the global registry drops them.
		expect(Chara.destroy).toHaveBeenCalledWith(charas[0]);
		expect(Chara.destroy).toHaveBeenCalledWith(charas[1]);
	});
});
