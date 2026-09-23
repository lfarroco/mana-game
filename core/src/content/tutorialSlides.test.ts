/// <reference types="jest" />

import * as Card from "../Entities/Card";
import {
  TUTORIAL_SLIDES,
  type TutorialBbcItem,
  type TutorialDemoItem,
  type TutorialSlideItem,
} from "./tutorialSlides";

afterAll(() => {
  Card.resetCardsMap();
});

const TUTORIAL_KEYS_PATTERN = /^tutorial\.slide\d+\.row\d+$/;

const demoItems = (slide: TutorialSlideItem[]): TutorialDemoItem[] =>
  slide.filter((item): item is TutorialDemoItem => item.kind === "demo");

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
          expect(unit.position.length).toBe(2);
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
      }
    });
  });

  it("slides with a cast loop use the looping fx kinds and consistent pop text", () => {
    TUTORIAL_SLIDES.forEach((slide) => {
      for (const demo of demoItems(slide)) {
        if (!demo.castLoop) continue;
        const { fx, popText } = demo.castLoop;
        expect(["damage", "shield", "heal", "regen", "poison"]).toContain(fx);
        expect(popText.kind).toBeDefined();
        expect(["power", "powerTenth"]).toContain(popText.value);
        if (demo.statusTick) {
          // regen/poison counters heal-damage the target every tick
          expect(fx === "regen" || fx === "poison").toBe(true);
        }
      }
    });
  });
});
