"use strict";

const {
  CATEGORY_GROUPS,
  COUNTRIES,
  PRODUCE,
  SOURCES,
} = require("../src/transform");

describe("seasonal data contract", () => {
  test("supports the agreed country catalogue", () => {
    expect(Object.keys(COUNTRIES)).toEqual([
      "united_kingdom",
      "ireland",
      "united_states",
      "canada",
      "australia",
      "new_zealand",
    ]);
  });

  test.each(Object.entries(COUNTRIES))(
    "%s contains between 40 and 60 common produce items",
    (_countryCode, country) => {
      expect(country.items.length).toBeGreaterThanOrEqual(40);
      expect(country.items.length).toBeLessThanOrEqual(60);
    }
  );

  test.each(Object.entries(COUNTRIES))(
    "%s has valid, unique, fully evidenced items",
    (_countryCode, country) => {
      const ids = country.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);

      country.items.forEach((item) => {
        expect(PRODUCE[item.id]).toBeDefined();
        expect(item.months.length).toBeGreaterThan(0);
        expect(new Set(item.months).size).toBe(item.months.length);
        item.months.forEach((month) => {
          expect(Number.isInteger(month)).toBe(true);
          expect(month).toBeGreaterThanOrEqual(1);
          expect(month).toBeLessThanOrEqual(12);
        });
        expect(Number.isInteger(item.popularity)).toBe(true);
        expect(item.popularity).toBeGreaterThan(0);

        const evidenceIsValid = item.sources.every((sourceId) =>
          Boolean(SOURCES[sourceId])
        );
        const hasAuthoritativeSource = item.sources.some(
          (sourceId) => SOURCES[sourceId].authoritative
        );
        expect(evidenceIsValid).toBe(true);
        expect(hasAuthoritativeSource || item.sources.length >= 2).toBe(true);
      });
    }
  );

  test("contains only fruit and vegetable categories", () => {
    const categories = new Set(
      Object.values(PRODUCE).map((produce) => produce.category)
    );

    expect(categories).toEqual(new Set(["fruit", "vegetable"]));
    expect(PRODUCE).not.toHaveProperty("mushroom");
    expect(PRODUCE).not.toHaveProperty("rhubarb");
  });

  test("assigns every produce item to exactly one matching display category", () => {
    const groupedIds = CATEGORY_GROUPS.flatMap((group) => group.items);

    expect(groupedIds.sort()).toEqual(Object.keys(PRODUCE).sort());
    expect(new Set(groupedIds).size).toBe(groupedIds.length);
    CATEGORY_GROUPS.forEach((group) => {
      group.items.forEach((produceId) => {
        expect(PRODUCE[produceId].category).toBe(group.category);
      });
    });
  });
});
