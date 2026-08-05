"use strict";

const { COMPACT_LIMITS, run } = require("../src/transform");

// Test data DSL

function trmnlInput(country, timeZone) {
  return {
    trmnl: {
      plugin_settings: {
        custom_fields_values: country ? { country } : {},
      },
      user: timeZone ? { time_zone_iana: timeZone } : {},
    },
  };
}

// Driver layer

class SeasonalityDriver {
  constructor() {
    this.country = "united_kingdom";
    this.timeZone = "Europe/London";
    this.now = new Date("2026-08-05T12:00:00.000Z");
  }

  forCountry(country) {
    this.country = country;
    return this;
  }

  inTimeZone(timeZone) {
    this.timeZone = timeZone;
    return this;
  }

  at(isoTimestamp) {
    this.now = new Date(isoTimestamp);
    return this;
  }

  withoutCountry() {
    this.country = null;
    return this;
  }

  execute() {
    return run(trmnlInput(this.country, this.timeZone), {
      now: () => this.now,
    });
  }
}

function names(items) {
  return items.map((item) => item.name);
}

describe("TRMNL seasonality transform", () => {
  test("returns the complete UK August harvest in alphabetical categories", () => {
    const result = new SeasonalityDriver().execute();

    expect(result.has_data).toBe(true);
    expect(result.has_items).toBe(true);
    expect(result.country_name).toBe("United Kingdom");
    expect(result.country_short_name).toBe("UK");
    expect(result.month_name).toBe("August");
    expect(names(result.fruits)).toEqual(
      [...names(result.fruits)].sort((first, second) =>
        first.localeCompare(second, "en", { sensitivity: "base" })
      )
    );
    expect(names(result.fruits)).toEqual(
      expect.arrayContaining(["Apples", "Blackberries", "Strawberries"])
    );
    expect(names(result.vegetables)).toEqual(
      expect.arrayContaining(["Aubergines", "Courgettes", "Tomatoes"])
    );
    expect(names(result.vegetables)).not.toContain("Brussels sprouts");
    expect(result.total_count).toBe(
      result.fruit_count + result.vegetable_count
    );
  });

  test("handles southern-hemisphere seasons independently", () => {
    const result = new SeasonalityDriver()
      .forCountry("australia")
      .inTimeZone("Australia/Sydney")
      .at("2026-01-15T12:00:00.000Z")
      .execute();

    expect(result.month_name).toBe("January");
    expect(names(result.fruits)).toEqual(
      expect.arrayContaining(["Mangoes", "Peaches", "Watermelons"])
    );
    expect(names(result.vegetables)).toContain("Tomatoes");
    expect(names(result.fruits)).not.toContain("Apples");
  });

  test.each([
    {
      country: "united_states",
      month: "2026-07-15T12:00:00.000Z",
      expected: ["Eggplants", "Zucchini", "Corn", "Scallions"],
    },
    {
      country: "australia",
      month: "2026-01-15T12:00:00.000Z",
      expected: ["Eggplants", "Zucchini", "Capsicums", "Silverbeet"],
    },
    {
      country: "new_zealand",
      month: "2026-03-15T12:00:00.000Z",
      expected: ["Eggplants", "Courgettes", "Capsicums", "Kūmara"],
    },
  ])("uses local produce names for $country", ({ country, month, expected }) => {
    const result = new SeasonalityDriver()
      .forCountry(country)
      .at(month)
      .execute();

    expect(names(result.vegetables)).toEqual(expect.arrayContaining(expected));
  });

  test("uses the user's timezone at a month boundary", () => {
    const result = new SeasonalityDriver()
      .forCountry("united_states")
      .inTimeZone("America/New_York")
      .at("2026-03-01T00:30:00.000Z")
      .execute();

    expect(result.month).toBe(2);
    expect(result.month_name).toBe("February");
    expect(names(result.fruits)).toContain("Oranges");
  });

  test("accepts labels and common aliases from TRMNL settings", () => {
    const labelResult = new SeasonalityDriver()
      .forCountry("New Zealand")
      .execute();
    const aliasResult = new SeasonalityDriver().forCountry("UK").execute();

    expect(labelResult.country_code).toBe("new_zealand");
    expect(aliasResult.country_code).toBe("united_kingdom");
  });

  test("builds popularity-ranked compact lists with accurate remainders", () => {
    const result = new SeasonalityDriver().execute();

    Object.entries(COMPACT_LIMITS).forEach(([layout, limits]) => {
      const compact = result.compact[layout];
      expect(compact.fruits.items.length).toBeLessThanOrEqual(limits.fruit);
      expect(compact.vegetables.items.length).toBeLessThanOrEqual(
        limits.vegetable
      );
      expect(compact.fruits.items.map((item) => item.popularity)).toEqual(
        [...compact.fruits.items]
          .map((item) => item.popularity)
          .sort((first, second) => first - second)
      );
      expect(compact.fruits.items.length + compact.fruits.more_count).toBe(
        result.fruit_count
      );
      expect(
        compact.vegetables.items.length + compact.vegetables.more_count
      ).toBe(result.vegetable_count);
    });
  });

  test("returns an explicit state when country is missing", () => {
    const result = new SeasonalityDriver().withoutCountry().execute();

    expect(result.has_data).toBe(false);
    expect(result.country_name).toBeNull();
    expect(result.error_message).toBe("Choose a supported country.");
    expect(result.fruits).toEqual([]);
    expect(result.vegetables).toEqual([]);
  });

  test("returns an explicit state for an unsupported country", () => {
    const result = new SeasonalityDriver().forCountry("France").execute();

    expect(result.has_data).toBe(false);
    expect(result.country_code).toBe("france");
    expect(result.error_message).toBe("That country is not supported.");
  });

  test("distinguishes a valid quiet month from missing configuration", () => {
    const result = new SeasonalityDriver()
      .forCountry("canada")
      .inTimeZone("America/Toronto")
      .at("2026-01-15T12:00:00.000Z")
      .execute();

    expect(result.has_data).toBe(true);
    expect(result.has_items).toBe(false);
    expect(result.country_name).toBe("Canada");
    expect(result.total_count).toBe(0);
    expect(result.error_message).toBeNull();
  });

  test("returns a valid guide for every supported country and month", () => {
    const countryCodes = [
      "united_kingdom",
      "ireland",
      "united_states",
      "canada",
      "australia",
      "new_zealand",
    ];

    countryCodes.forEach((country) => {
      for (let month = 0; month < 12; month += 1) {
        const result = new SeasonalityDriver()
          .forCountry(country)
          .inTimeZone("UTC")
          .at(new Date(Date.UTC(2026, month, 15, 12)).toISOString())
          .execute();

        expect(result.has_data).toBe(true);
        expect(result.error_message).toBeNull();
      }
    });
  });

  test("does not expose evidence metadata to Liquid templates", () => {
    const result = new SeasonalityDriver().execute();

    result.fruits.concat(result.vegetables).forEach((item) => {
      expect(item).not.toHaveProperty("sources");
      expect(item).not.toHaveProperty("months");
    });
  });
});
