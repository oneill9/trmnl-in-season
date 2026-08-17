"use strict";

const {
  CATEGORY_LIMITS,
  FULL_SCREEN_LIMITS,
  run,
} = require("../src/transform");

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

  test("builds complete abundance-ranked full-screen categories", () => {
    const result = new SeasonalityDriver().execute();

    expect(result.shortlist.fruits.items).toHaveLength(
      result.fruit_count
    );
    expect(result.shortlist.vegetables.items).toHaveLength(
      result.vegetable_count
    );
    [result.shortlist.fruits, result.shortlist.vegetables].forEach(
      (category) => {
        expect(category.items.map((item) => item.popularity)).toEqual(
          [...category.items]
            .map((item) => item.popularity)
            .sort((first, second) => first - second)
        );
        expect(category.categories.map((group) => group.item_count)).toEqual(
          [...category.categories]
            .map((group) => group.item_count)
            .sort((first, second) => second - first)
        );
        expect(
          category.categories
            .flatMap((group) => group.examples.map((item) => item.id))
            .sort()
        ).toEqual(category.items.map((item) => item.id).sort());
      }
    );
    expect(result.shortlist.fruits.more_count).toBe(0);
    expect(result.shortlist.vegetables.more_count).toBe(0);
  });

  test.each([
    ["2026-01-15T12:00:00.000Z", "fruit-empty"],
    ["2026-05-15T12:00:00.000Z", "fruit-quarter"],
    ["2026-09-15T12:00:00.000Z", "fruit-third"],
  ])("balances UK full-screen panels for %s", (date, expectedBalance) => {
    const result = new SeasonalityDriver().at(date).execute();

    expect(result.shortlist.layout_balance).toBe(expectedBalance);
    [result.shortlist.fruits, result.shortlist.vegetables].forEach(
      (category) => {
        expect(category.row_demand).toBe(
          Math.ceil(category.categories.length / 2)
        );
      }
    );
  });

  test("balances equally dense fruit and vegetable panels", () => {
    const result = new SeasonalityDriver()
      .forCountry("australia")
      .at("2026-03-15T12:00:00.000Z")
      .execute();

    expect(result.shortlist.fruits.row_demand).toBe(4);
    expect(result.shortlist.vegetables.row_demand).toBe(4);
    expect(result.shortlist.layout_balance).toBe("balanced");
  });

  test.each([
    "united_kingdom",
    "ireland",
    "united_states",
    "canada",
    "australia",
    "new_zealand",
  ])("full-screen capacity covers every month for %s", (country) => {
    for (let month = 0; month < 12; month += 1) {
      const result = new SeasonalityDriver()
        .forCountry(country)
        .at(new Date(Date.UTC(2026, month, 15, 12)).toISOString())
        .execute();

      expect(result.fruit_count).toBeLessThanOrEqual(
        FULL_SCREEN_LIMITS.fruit
      );
      expect(result.vegetable_count).toBeLessThanOrEqual(
        FULL_SCREEN_LIMITS.vegetable
      );
      [result.shortlist.fruits, result.shortlist.vegetables].forEach(
        (category) => {
          expect(
            category.categories
              .flatMap((group) => group.examples.map((item) => item.id))
              .sort()
          ).toEqual(category.items.map((item) => item.id).sort());
        }
      );
    }
  });

  test.each([
    ["united_kingdom", "united-kingdom"],
    ["ireland", "ireland"],
    ["united_states", "united-states"],
    ["canada", "canada"],
    ["australia", "australia"],
    ["new_zealand", "new-zealand"],
  ])(
    "links %s to its public source section",
    (country, sourceSection) => {
      const result = new SeasonalityDriver().forCountry(country).execute();

      expect(result.source_page_url).toBe(
        `https://oneill9.github.io/trmnl-in-season/#${sourceSection}`
      );
    }
  );

  test("builds abundance-ranked compact categories", () => {
    const result = new SeasonalityDriver().execute();

    expect(
      result.compact.half_horizontal.fruits.categories.map(
        (category) => category.name
      )
    ).toEqual([
      "Berries",
      "Stone Fruit",
      "Orchard Fruit",
      "Vines & Figs",
    ]);
    expect(
      names(result.compact.half_horizontal.fruits.categories[0].examples)
    ).toEqual([
      "Strawberries",
      "Raspberries",
      "Blackberries",
      "Blueberries",
      "Blackcurrants",
      "Gooseberries",
    ]);
    expect(
      result.compact.half_horizontal.fruits.categories.map(
        (category) => category.line_limit
      )
    ).toEqual([3, 2, 1, 1]);
    expect(
      result.compact.half_horizontal.vegetables.categories.map(
        (category) => category.line_limit
      )
    ).toEqual([1, 1, 1, 1, 1, 1, 1]);

    Object.entries(CATEGORY_LIMITS).forEach(([layout, limits]) => {
      [
        ["fruits", limits.fruit],
        ["vegetables", limits.vegetable],
      ].forEach(([categoryName, limit]) => {
        const categorySummary = result.compact[layout][categoryName];
        expect(categorySummary.categories.length).toBeLessThanOrEqual(limit);
        expect(
          categorySummary.categories.map((category) => category.item_count)
        ).toEqual(
          [...categorySummary.categories]
            .map((category) => category.item_count)
            .sort((first, second) => second - first)
        );
        categorySummary.categories.forEach((category) => {
          if (layout === "half_horizontal") {
            expect(category.examples).toHaveLength(category.item_count);
          } else {
            expect(category.examples.length).toBeLessThanOrEqual(2);
          }
          expect(category.examples.map((item) => item.popularity)).toEqual(
            [...category.examples]
              .map((item) => item.popularity)
              .sort((first, second) => first - second)
          );
        });
      });
    });
  });

  test.each([
    ["united_kingdom", "2026-09-15T12:00:00.000Z"],
    ["australia", "2026-02-15T12:00:00.000Z"],
  ])(
    "half-horizontal exposes every item in dense %s category rows",
    (country, date) => {
      const result = new SeasonalityDriver()
        .forCountry(country)
        .at(date)
        .execute();

      ["fruits", "vegetables"].forEach((categoryName) => {
        const categories =
          result.compact.half_horizontal[categoryName].categories;

        expect(
          categories.reduce(
            (lineCount, category) => lineCount + category.line_limit,
            0
          )
        ).toBeLessThanOrEqual(7);
        categories.forEach(
          (category) => {
            expect(category.examples).toHaveLength(category.item_count);
            expect(category.line_limit).toBeGreaterThanOrEqual(1);
          }
        );
      });
    }
  );

  test("half-screen layouts use reclaimed space for higher category limits", () => {
    expect(CATEGORY_LIMITS.half_horizontal).toEqual({
      fruit: 7,
      vegetable: 7,
    });
    expect(CATEGORY_LIMITS.half_vertical).toEqual({
      fruit: 7,
      vegetable: 8,
    });
  });

  test("quadrant uses reclaimed space for four category groups per panel", () => {
    expect(CATEGORY_LIMITS.quadrant).toEqual({
      fruit: 4,
      vegetable: 4,
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
