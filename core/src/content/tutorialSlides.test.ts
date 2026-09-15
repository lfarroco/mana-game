/// <reference types="jest" />

import * as Card from "../Entities/Card";
import { SANDBOX_ABILITY_KINDS } from "./tutorialSandbox";
import {
  TUTORIAL_SLIDES,
  slideGate,
  type TutorialBbcItem,
  type TutorialDemoItem,
  type TutorialDragDropItem,
  type TutorialInspectItem,
  type TutorialSandboxItem,
  type TutorialSlideItem,
} from "./tutorialSlides";

afterAll(() => {
  Card.resetCardsMap();
});

const TUTORIAL_KEYS_PATTERN = /^tutorial\.slide\d+\.row\d+$/;

const demoItems = (slide: TutorialSlideItem[]): TutorialDemoItem[] =>
  slide.filter((item): item is TutorialDemoItem => item.kind === "demo");

const sandboxItems = (slide: TutorialSlideItem[]): TutorialSandboxItem[] =>
  slide.filter((item): item is TutorialSandboxItem => item.kind === "sandbox");

const dragDropItems = (slide: TutorialSlideItem[]): TutorialDragDropItem[] =>
  slide.filter(
    (item): item is TutorialDragDropItem => item.kind === "dragDrop",
  );

const inspectItems = (slide: TutorialSlideItem[]): TutorialInspectItem[] =>
  slide.filter((item): item is TutorialInspectItem => item.kind === "inspect");

const allDemoUnits = (slide: TutorialSlideItem[]) => [
  ...demoItems(slide).flatMap((d) => d.units),
  ...sandboxItems(slide).flatMap((s) => s.units),
  ...dragDropItems(slide).flatMap((d) => [
    ...d.units,
    {
      cardId: d.cardId,
      force: "PLAYER_FORCE",
      position: [0, 0] as [number, number],
    },
  ]),
  ...inspectItems(slide).flatMap((i) => i.units),
];

describe("tutorial slide content", () => {
  it("defines 14 slides", () => {
    expect(TUTORIAL_SLIDES.length).toBe(14);
  });

  it("every slide has at least one item", () => {
    for (const slide of TUTORIAL_SLIDES) {
      expect(slide.length).toBeGreaterThan(0);
    }
  });

  it("text/title keys match the owning slide number and have a y offset", () => {
    TUTORIAL_SLIDES.forEach((slide, slideIndex) => {
      const slideNumber = slideIndex + 1;
      for (const item of slide) {
        if (item.kind === "text" || item.kind === "title") {
          expect(item.key).toMatch(TUTORIAL_KEYS_PATTERN);
          expect(item.key.startsWith(`tutorial.slide${slideNumber}.`)).toBe(
            true,
          );
          expect(item.y).toBeGreaterThan(0);
        }
      }
    });
  });

  it("bbc rows use a known ability color, exactly one label source, and the owning slide's keys", () => {
    TUTORIAL_SLIDES.forEach((slide, slideIndex) => {
      const slideNumber = slideIndex + 1;
      for (const item of slide) {
        if (item.kind !== "bbcode") continue;
        const bbc = item as TutorialBbcItem;
        expect(bbc.y).toBeGreaterThan(0);
        expect([
          "damage",
          "shield",
          "heal",
          "regen",
          "poison",
          "haste",
          "slow",
          "charge",
          "increase_power",
          "increase_critical",
        ]).toContain(bbc.color);
        // exactly one of labelKey / label
        expect((bbc.labelKey !== undefined) !== (bbc.label !== undefined)).toBe(
          true,
        );
        expect(bbc.textKey).toMatch(TUTORIAL_KEYS_PATTERN);
        expect(bbc.textKey.startsWith(`tutorial.slide${slideNumber}.`)).toBe(
          true,
        );
      }
    });
  });

  it("demo units reference known cards and in-bounds indices", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const demo of demoItems(slide)) {
        expect(demo.units.length).toBeGreaterThan(0);
        for (const unit of demo.units) {
          expect(Card.hasCardDefinition(unit.cardId)).toBe(true);
          expect(unit.force.length).toBeGreaterThan(0);
        }
        if (demo.castLoop) {
          expect(demo.castLoop.casterIndex).toBeGreaterThanOrEqual(0);
          expect(demo.castLoop.casterIndex).toBeLessThan(demo.units.length);
          expect(demo.castLoop.targetIndex).toBeGreaterThanOrEqual(0);
          expect(demo.castLoop.targetIndex).toBeLessThan(demo.units.length);
          expect(demo.castLoop.fxDelayMs).toBeGreaterThan(0);
        }
        if (demo.statusTick) {
          // status ticks only accompany a cast demo (regen/poison counters)
          expect(demo.castLoop).toBeDefined();
          expect(demo.statusTick.delayMs).toBeGreaterThan(0);
        }
        if (demo.showcase) {
          expect(demo.showcase.unitIndex).toBeGreaterThanOrEqual(0);
          expect(demo.showcase.unitIndex).toBeLessThan(demo.units.length);
        }
        if (demo.reactionPop) {
          // a reaction pop needs a target and a delay
          expect(demo.reactionIndex).toBeGreaterThanOrEqual(0);
          expect(demo.reactionIndex).toBeLessThan(demo.units.length);
          expect(demo.reactionDelayMs).toBeGreaterThan(0);
          expect(demo.triggerLabelKey).toBeDefined();
        }
      }
    });
  });

  it("every demo unit declares exactly one placement, and it is in bounds", () => {
    for (const slide of TUTORIAL_SLIDES) {
      for (const unit of allDemoUnits(slide)) {
        // Exactly one of `position` (board cell) / `screen` (pixels).
        expect(
          (unit.position !== undefined) !== (unit.screen !== undefined),
        ).toBe(true);

        if (unit.position) {
          const [x, y] = unit.position;
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(2);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(2);
        }

        if (unit.screen) {
          // Inside the 1920x1080 canvas, clear of the header and the Exit row.
          const [x, y] = unit.screen;
          expect(x).toBeGreaterThanOrEqual(120);
          expect(x).toBeLessThanOrEqual(1800);
          expect(y).toBeGreaterThanOrEqual(100);
          expect(y).toBeLessThanOrEqual(920);
        }
      }
    }
  });

  it("screen-positioned demo units never overlap the tutorial chrome", () => {
    // Reserved regions of the 1920x1080 canvas (see the layout notes in
    // tutorialSlides.ts). A unit is centred on a ~250px sprite, so each test
    // box is +/-125px around its authored position.
    const CHIP_WIDTH = 330;
    const CHIP_GAP = 30;
    const READOUT_WIDTH = 440;
    const READOUT_HEIGHT = 400;
    const NEXT_BUTTON = { left: 1700, right: 1920, top: 440, bottom: 640 };
    const HALF_UNIT = 125;

    const overlaps = (
      a: { left: number; right: number; top: number; bottom: number },
      b: { left: number; right: number; top: number; bottom: number },
    ): boolean =>
      a.right > b.left &&
      a.left < b.right &&
      a.bottom > b.top &&
      a.top < b.bottom;

    const unitBox = (x: number, y: number) => ({
      left: x - HALF_UNIT,
      right: x + HALF_UNIT,
      top: y - HALF_UNIT,
      bottom: y + HALF_UNIT,
    });

    for (const slide of TUTORIAL_SLIDES) {
      // Only the chrome this slide actually renders is reserved.
      const panels: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      }[] = [];

      for (const sandbox of sandboxItems(slide)) {
        const columns = Math.max(1, sandbox.paletteColumns ?? 1);
        panels.push({
          left: sandbox.paletteX,
          right:
            sandbox.paletteX + columns * CHIP_WIDTH + (columns - 1) * CHIP_GAP,
          top: sandbox.paletteStartY,
          bottom: sandbox.paletteStartY + sandbox.paletteSpacingY * 5 + 62,
        });
        panels.push({
          left: sandbox.readoutX,
          right: sandbox.readoutX + READOUT_WIDTH,
          top: sandbox.readoutY,
          bottom: sandbox.readoutY + READOUT_HEIGHT,
        });
      }

      for (const inspect of inspectItems(slide)) {
        // Panel box + the widest row (840px from panelX, see inspectPanel).
        panels.push({
          left: inspect.panelX - 30,
          right: inspect.panelX + 900,
          top: inspect.rowsY - 150,
          bottom: inspect.rowsY + inspect.rowSpacingY * inspect.rows.length,
        });
        panels.push({
          left: inspect.panelX,
          right: inspect.panelX + 840,
          top: inspect.rowsY,
          bottom: inspect.rowsY + inspect.rowSpacingY * inspect.rows.length,
        });
      }

      for (const unit of allDemoUnits(slide)) {
        if (!unit.screen) continue;
        const box = unitBox(unit.screen[0], unit.screen[1]);

        // Never under the palette / readout / inspector panels, and never under
        // the Next button (the one control on the right edge).
        for (const panel of panels) {
          expect({
            unit: unit.cardId,
            panel,
            overlaps: overlaps(box, panel),
          }).toEqual({
            unit: unit.cardId,
            panel,
            overlaps: false,
          });
        }
        // The Next button only exists next to a gated slide's units.
        expect(overlaps(box, NEXT_BUTTON)).toBe(false);

        // ...and inside the canvas, clear of the header and the Exit row.
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(1920);
        expect(box.top).toBeGreaterThanOrEqual(100);
        expect(box.bottom).toBeLessThanOrEqual(980);

        // ...and clear of the wrap-up chrome: the Exit button and the
        // "finishToContinue" hint that sits under it.
        expect(box.bottom).toBeLessThanOrEqual(930);
      }
    }
  });

  it("slides with a cast loop use the looping fx kinds and consistent pop text", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const demo of demoItems(slide)) {
        if (!demo.castLoop) continue;
        const { fx, popText } = demo.castLoop;
        if (fx !== undefined) {
          expect(["damage", "shield", "heal", "regen", "poison"]).toContain(fx);
        }
        expect(popText.kind).toBeDefined();
        if (typeof popText.value === "string") {
          expect(["power", "powerTenth"]).toContain(popText.value);
        } else {
          expect(popText.value).toBeGreaterThan(0);
        }
        if (demo.statusTick) {
          // regen/poison counters heal-damage the target every tick
          expect(fx === "regen" || fx === "poison").toBe(true);
        }
      }
    });
  });
});

describe("interactive slide gates", () => {
  /** Slides whose Next must stay locked until the player does something. */
  const INTERACTIVE_SLIDES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  it("every interactive slide declares a gate", () => {
    for (const oneBased of INTERACTIVE_SLIDES) {
      expect(slideGate(TUTORIAL_SLIDES[oneBased - 1])).toBeDefined();
    }
  });

  it("only the wrap-up slide is free play", () => {
    const freePlay = TUTORIAL_SLIDES.map((slide, i) =>
      slideGate(slide) ? null : i + 1,
    ).filter((n): n is number => n !== null);
    expect(freePlay).toEqual([14]);
  });

  it("every cast gate names abilities that exist on the slide's palette", () => {
    TUTORIAL_SLIDES.forEach((slide, index) => {
      const gate = slideGate(slide);
      if (gate?.kind !== "cast") return;
      const paletteIds = new Set(
        sandboxItems(slide).flatMap((s) => s.palette.map((a) => a.id)),
      );
      // Slide 2 has no sandbox: its gate is an interaction flag, not a cast.
      expect(paletteIds.size).toBeGreaterThan(0);
      for (const id of gate.abilityIds) {
        expect(paletteIds.has(id)).toBe(true);
      }
      expect(slide).toBe(TUTORIAL_SLIDES[index]);
    });
  });

  it("tick gates only appear on a slide that can actually tick", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      const gate = slideGate(slide);
      if (gate?.kind !== "ticks") return;
      expect(gate.count).toBeGreaterThan(0);
      expect(
        sandboxItems(slide).some((s) =>
          s.palette.some((a) => a.kind === "poison" || a.kind === "regen"),
        ),
      ).toBe(true);
    });
  });

  it("selection gates never ask for more rows than the slide has", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      const gate = slideGate(slide);
      if (gate?.kind !== "selections") return;
      const rows = inspectItems(slide).reduce((n, i) => n + i.rows.length, 0);
      expect(gate.count).toBeGreaterThan(0);
      expect(gate.count).toBeLessThanOrEqual(rows);
    });
  });

  it("flag gates name flags the slide declares", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      const gate = slideGate(slide);
      if (gate?.kind !== "flags") return;
      const declared = new Set(
        slide
          .filter(
            (i): i is Extract<TutorialSlideItem, { kind: "flags" }> =>
              i.kind === "flags",
          )
          .flatMap((i) => i.flags.map((f) => f.id)),
      );
      // Drag-and-drop and trigger demos report synthetic flag ids, so a slide
      // with no `flags` item is allowed (progress treats the gate as satisfiable
      // only through the interaction that reports it).
      if (declared.size === 0) return;
      for (const flag of gate.flags) {
        expect(declared.has(flag)).toBe(true);
      }
    });
  });
});

describe("interactive slide content", () => {
  it("sandbox slides reference known cards and valid palettes", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const sandbox of sandboxItems(slide)) {
        expect(Card.hasCardDefinition(sandbox.targetCardId)).toBe(true);
        expect(sandbox.life).toBeGreaterThan(0);
        expect(sandbox.palette.length).toBeGreaterThan(0);
        const ids = new Set<string>();
        for (const ability of sandbox.palette) {
          expect(SANDBOX_ABILITY_KINDS).toContain(ability.kind);
          expect(ids.has(ability.id)).toBe(false);
          ids.add(ability.id);
          expect(ability.power).toBeGreaterThanOrEqual(0);
          expect(ability.color.length).toBeGreaterThan(0);
        }
        expect(sandbox.paletteSpacingY).toBeGreaterThan(0);
      }
    });
  });

  it("sandbox demos pair a caster with the sandbox target", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const sandbox of sandboxItems(slide)) {
        expect(sandbox.units.length).toBeGreaterThan(1);
        expect(sandbox.units[1].cardId).toBe(sandbox.targetCardId);
        if (sandbox.castLoop) {
          expect(sandbox.castLoop.casterIndex).toBe(0);
          expect(sandbox.castLoop.targetIndex).toBe(1);
        }
      }
    });
  });

  it("drag-and-drop slides offer a real card onto real board cells", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const drop of dragDropItems(slide)) {
        expect(Card.hasCardDefinition(drop.cardId)).toBe(true);
        expect(drop.targets.length).toBeGreaterThan(0);
        for (const [x, y] of drop.targets) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(2);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  it("inspector slides reference known cards and in-bounds row sources", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const inspect of inspectItems(slide)) {
        expect(inspect.rows.length).toBeGreaterThan(0);
        expect(inspect.unitIndex).toBeGreaterThanOrEqual(0);
        expect(inspect.unitIndex).toBeLessThan(inspect.units.length);
        for (const row of inspect.rows) {
          const source = row.sourceIndex ?? inspect.unitIndex;
          const target = row.targetIndex ?? inspect.units.length - 1;
          expect(source).toBeGreaterThanOrEqual(0);
          expect(source).toBeLessThan(inspect.units.length);
          expect(target).toBeGreaterThanOrEqual(0);
          expect(target).toBeLessThan(inspect.units.length);
          expect(inspect.rowSpacingY).toBeGreaterThan(0);
        }
      }
    });
  });
});
