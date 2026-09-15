/// <reference types="jest" />

import {
  createTutorialStore,
  defaultTutorialProgress,
  parseTutorialProgress,
  TUTORIAL_STORAGE_KEY,
  type TutorialStorage,
} from "./tutorialStore";

const memoryStorage = (
  initial?: string,
): TutorialStorage & { value: string | null } => {
  const holder = {
    value: initial ?? null,
    getItem: (key: string) =>
      key === TUTORIAL_STORAGE_KEY ? holder.value : null,
    setItem: (key: string, value: string) => {
      if (key === TUTORIAL_STORAGE_KEY) holder.value = value;
    },
  };
  return holder;
};

describe("parseTutorialProgress", () => {
  it("returns defaults for missing or unparseable payloads", () => {
    expect(parseTutorialProgress(null)).toEqual(defaultTutorialProgress());
    expect(parseTutorialProgress("")).toEqual(defaultTutorialProgress());
    expect(parseTutorialProgress("{not json")).toEqual(
      defaultTutorialProgress(),
    );
  });

  it("rejects non-object payloads", () => {
    expect(parseTutorialProgress("[1,2]")).toEqual(defaultTutorialProgress());
    expect(parseTutorialProgress("42")).toEqual(defaultTutorialProgress());
    expect(parseTutorialProgress('"seen"')).toEqual(defaultTutorialProgress());
  });

  it("reads a valid payload", () => {
    expect(
      parseTutorialProgress(
        JSON.stringify({ seen: true, completed: true, furthestSlide: 13 }),
      ),
    ).toEqual({ seen: true, completed: true, furthestSlide: 13 });
  });

  it("treats a completed run as seen even when the seen flag is missing", () => {
    expect(
      parseTutorialProgress(
        JSON.stringify({ completed: true, furthestSlide: 13 }),
      ),
    ).toEqual({
      seen: true,
      completed: true,
      furthestSlide: 13,
    });
  });

  it("clamps a negative or fractional furthest slide", () => {
    expect(
      parseTutorialProgress(JSON.stringify({ furthestSlide: -5 }))
        .furthestSlide,
    ).toBe(0);
    expect(
      parseTutorialProgress(JSON.stringify({ furthestSlide: 3.7 }))
        .furthestSlide,
    ).toBe(3);
    expect(
      parseTutorialProgress(JSON.stringify({ furthestSlide: "9" }))
        .furthestSlide,
    ).toBe(0);
  });

  it("keeps valid fields when a sibling field is malformed", () => {
    expect(
      parseTutorialProgress(
        JSON.stringify({ seen: true, completed: "yes", furthestSlide: 2 }),
      ),
    ).toEqual({ seen: true, completed: false, furthestSlide: 2 });
  });
});

describe("tutorial store", () => {
  const TOTAL = 14;

  it("starts unseen", () => {
    const store = createTutorialStore(memoryStorage());
    expect(store.get()).toEqual({
      seen: false,
      completed: false,
      furthestSlide: 0,
    });
  });

  it("marks seen and remembers the slide the player stopped on", () => {
    const storage = memoryStorage();
    const store = createTutorialStore(storage);
    expect(store.markSeen(4, TOTAL)).toEqual({
      seen: true,
      completed: false,
      furthestSlide: 4,
    });
    expect(JSON.parse(storage.value ?? "{}")).toEqual({
      seen: true,
      completed: false,
      furthestSlide: 4,
    });
  });

  it("keeps the furthest slide monotonic", () => {
    const store = createTutorialStore(memoryStorage());
    store.markSeen(6, TOTAL);
    expect(store.markSeen(2, TOTAL).furthestSlide).toBe(6);
  });

  it("marks completed only on the last slide", () => {
    const store = createTutorialStore(memoryStorage());
    expect(store.markSeen(TOTAL - 2, TOTAL).completed).toBe(false);
    expect(store.markSeen(TOTAL - 1, TOTAL).completed).toBe(true);
  });

  it("clamps a furthest slide beyond the last slide", () => {
    const store = createTutorialStore(memoryStorage());
    expect(store.markSeen(99, TOTAL).furthestSlide).toBe(TOTAL - 1);
  });

  it("reads a previously persisted payload", () => {
    const store = createTutorialStore(
      memoryStorage(
        JSON.stringify({ seen: true, completed: false, furthestSlide: 7 }),
      ),
    );
    expect(store.get()).toEqual({
      seen: true,
      completed: false,
      furthestSlide: 7,
    });
  });

  it("resets back to defaults", () => {
    const store = createTutorialStore(memoryStorage());
    store.markSeen(5, TOTAL);
    expect(store.reset()).toEqual({
      seen: false,
      completed: false,
      furthestSlide: 0,
    });
    expect(store.get().seen).toBe(false);
  });

  it("survives a storage that throws on read and write", () => {
    const throwing: TutorialStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createTutorialStore(throwing);
    expect(store.get()).toEqual({
      seen: false,
      completed: false,
      furthestSlide: 0,
    });
    expect(store.markSeen(3, TOTAL).seen).toBe(true);
  });
});
