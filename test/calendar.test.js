"use strict";

const fs = require("fs");
const path = require("path");
const { COUNTRIES, SOURCES, run } = require("../src/transform");

const calendarPath = path.join(__dirname, "..", "docs", "united-kingdom", "index.html");
const months = Array.from({ length: 12 }, (_, index) => index + 1);

function page() {
  return fs.readFileSync(calendarPath, "utf8");
}

function monthRow(month) {
  return page().match(new RegExp(`<tr id="[a-z]+" data-month="${month}">([\\s\\S]*?)</tr>`))[1];
}

function produceIds(row, category) {
  const cell = row.match(new RegExp(`<td data-category="${category}">([\\s\\S]*?)</td>`))[1];
  return [...cell.matchAll(/<li data-produce="([^"]+)">/g)].map((match) => match[1]);
}

describe("UK seasonal calendar", () => {
  test.each(months)("shows every plugin harvest for month %i in static HTML", (month) => {
    const result = run(
      { country: "united_kingdom" },
      { now: () => new Date(Date.UTC(2026, month - 1, 15, 12)) }
    );
    const row = monthRow(month);

    expect(row).toContain(`<th scope="row">${result.month_name}</th>`);
    expect(produceIds(row, "fruit")).toEqual(result.fruits.map((item) => item.id));
    expect(produceIds(row, "vegetable")).toEqual(result.vegetables.map((item) => item.id));
    for (const item of [...result.fruits, ...result.vegetables]) {
      expect(row).toContain(`>${item.name}</li>`);
    }
    expect(page()).toContain(`href="#${result.month_name.toLowerCase()}"`);
  });

  test("distinguishes fresh harvests from stored produce and explains empty months", () => {
    expect(produceIds(monthRow(1), "fruit")).toEqual([]);
    expect(monthRow(1)).toContain("No fresh fruit harvests in this catalogue.");
    expect(produceIds(monthRow(10), "fruit")).toContain("apple");
    expect(produceIds(monthRow(12), "fruit")).not.toContain("apple");
    expect(page()).toContain("long-term storage");
    expect(page()).toContain("heated greenhouses");
    expect(page()).toContain("latitude, altitude, cultivar");
    expect(page()).toContain("not a local crop forecast");
  });

  test("provides a distinct search title, canonical URL and working local assets", () => {
    expect(page()).toContain("<title>UK Seasonal Fruit &amp; Vegetable Calendar | In Season</title>");
    expect(page()).toContain('<link rel="canonical" href="https://oneill9.github.io/trmnl-in-season/united-kingdom/">');
    expect(page()).toMatch(/<meta name="description" content="[^"]+UK[^"]+">/);
    expect(page()).toContain('href="../style.css"');
    expect(page()).toContain('src="../in-season-icon.png"');
    expect(page()).toContain('href="../#united-kingdom"');
    expect(page()).toContain('href="https://trmnl.com/recipes/407471"');
    expect(page()).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  test("links to the catalogue's UK evidence sources", () => {
    const sourceIds = new Set(COUNTRIES.united_kingdom.items.flatMap((item) => item.sources));
    for (const sourceId of sourceIds) {
      expect(page()).toContain(`href="${SOURCES[sourceId].url}"`);
      expect(page()).toContain(SOURCES[sourceId].title);
    }
  });

  test("keeps the committed calendar in sync with its generator and catalogue", () => {
    const { renderCalendar } = require("../scripts/generate-calendar");

    expect(page()).toBe(renderCalendar());
  });
});
