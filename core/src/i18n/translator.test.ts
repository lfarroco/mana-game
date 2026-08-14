/// <reference types="jest" />

import {
  createTranslator,
  getNativeName,
  LOCALE_NATIVE_NAMES,
  type Translator,
} from "./translator";

const locales = {
  en: {
    hello: "Hello {name}",
    "card.test.name": "Test Unit",
    greeting: "Welcome {name}, {name} is here",
  },
  es: { hello: "Hola {name}" },
};

describe("createTranslator", () => {
  let translator: Translator;

  beforeEach(() => {
    translator = createTranslator(locales, () => "en");
  });

  it("returns the key when it is missing in the current locale", () => {
    expect(translator.t("missing.key")).toBe("missing.key");
  });

  it("falls back to en for a non-en locale when the key is missing", () => {
    const esTranslator = createTranslator(locales, () => "es");
    expect(esTranslator.t("card.test.name")).toBe("Test Unit");
  });

  it("returns the key when it is missing in en too", () => {
    const esTranslator = createTranslator(locales, () => "es");
    expect(esTranslator.t("missing.key")).toBe("missing.key");
  });

  it("interpolates {param} placeholders", () => {
    expect(translator.t("hello", { name: "World" })).toBe("Hello World");
  });

  it("interpolates a param globally across multiple occurrences", () => {
    expect(translator.t("greeting", { name: "Bob" })).toBe("Welcome Bob, Bob is here");
  });

  it("interpolates multiple distinct params", () => {
    const multi = createTranslator(
      {
        en: { combo: "{a}-{b}" },
      },
      () => "en",
    );
    expect(multi.t("combo", { a: "x", b: "y" })).toBe("x-y");
  });

  it("getName resolves the card name via the current locale", () => {
    expect(translator.getName("test")).toBe("Test Unit");
  });

  it("getAvailableLocales lists the locale table keys", () => {
    expect(translator.getAvailableLocales()).toEqual(["en", "es"]);
  });

  it("uses the injected current-locale getter dynamically", () => {
    let locale = "en";
    const dynamic = createTranslator(locales, () => locale);
    expect(dynamic.t("hello", { name: "A" })).toBe("Hello A");
    locale = "es";
    expect(dynamic.t("hello", { name: "B" })).toBe("Hola B");
  });
});

describe("getNativeName", () => {
  it("returns the native name for known locales", () => {
    expect(getNativeName("en")).toBe("English");
    expect(getNativeName("es")).toBe("Español");
    expect(getNativeName("pt")).toBe("Português");
    expect(getNativeName("jp")).toBe("日本語");
    expect(getNativeName("cn")).toBe("中文");
    expect(getNativeName("ru")).toBe("Русский");
  });

  it("falls back to the locale string for unknown locales", () => {
    expect(getNativeName("xx")).toBe("xx");
  });

  it("exposes the native name table", () => {
    expect(LOCALE_NATIVE_NAMES.en).toBe("English");
  });
});
