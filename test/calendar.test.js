"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
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

describe.each(Object.entries(COUNTRIES))("%s seasonal calendar", (countryCode, country) => {
  const slug = countryCode.replace(/_/g, "-");
  const calendar = () => fs.readFileSync(path.join(__dirname, "..", "docs", slug, "index.html"), "utf8");
  const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  test.each(months)("matches the complete catalogue for month %i", (month) => {
    const html = calendar();
    const result = run(
      { country: countryCode },
      { now: () => new Date(Date.UTC(2026, month - 1, 15, 12)) }
    );
    const row = html.match(new RegExp(`<tr id="[a-z]+" data-month="${month}">([\\s\\S]*?)</tr>`))[1];

    expect(html.match(/data-month="/g)).toHaveLength(12);
    expect(row).toContain(`<th scope="row">${result.month_name}</th>`);
    expect(html).toContain(`href="#${result.month_name.toLowerCase()}"`);
    for (const [category, items] of [["fruit", result.fruits], ["vegetable", result.vegetables]]) {
      expect(produceIds(row, category)).toEqual(items.map((item) => item.id));
      for (const item of items) {
        expect(row).toContain(`<li data-produce="${item.id}">${escapeHtml(item.name)}</li>`);
      }
      if (items.length === 0) {
        expect(row).toContain(`No fresh ${category} harvests in this catalogue.`);
      }
    }
    const expectedIds = country.items.filter((item) => item.months.includes(month)).map((item) => item.id).sort();
    expect([...produceIds(row, "fruit"), ...produceIds(row, "vegetable")].sort()).toEqual(expectedIds);
  });

  test("links every evidence source and explains catalogue limits", () => {
    const html = calendar();
    for (const id of new Set(country.items.flatMap((item) => item.sources))) {
      expect(html).toContain(`href="${escapeHtml(SOURCES[id].url)}"`);
      expect(html).toContain(escapeHtml(SOURCES[id].title));
    }
    expect(html).toContain("long-term storage");
    expect(html).toContain("heated greenhouses");
    expect(html).toContain("protected methods");
    expect(html).toContain("does not mean shops have no");
    expect(html).toContain("not a local crop forecast");
    expect(html).toContain("latitude, altitude, cultivar");
    expect(html).toContain(`href="../#${slug}"`);
  });

  test("provides a mobile layout and country-specific search metadata", () => {
    const html = calendar();
    const titleCountry = countryCode === "united_kingdom" ? "UK" : country.name;
    expect(html).toContain(`<title>${titleCountry} Seasonal Fruit &amp; Vegetable Calendar | In Season</title>`);
    expect(html).toContain(`<link rel="canonical" href="https://oneill9.github.io/trmnl-in-season/${slug}/">`);
    expect(html.match(/<meta name="description" content="([^"]+)"/)[1]).toContain(titleCountry);
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).toContain("@media (max-width: 520px)");
    expect(html).toContain('.calendar-label { display: block;');
    expect(html).toContain('href="../style.css"');
    expect(html).toContain('src="../in-season-icon.png"');
    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  test("matches the generated page", () => {
    const { renderCalendar } = require("../scripts/generate-calendar");
    expect(calendar()).toBe(renderCalendar(countryCode));
  });
});

test.each([
  ["ireland", "Bord Bia"],
  ["netherlands", "United Kingdom and Ireland fresh-harvest windows"],
  ["belgium", "neighbouring northern France"],
  ["france", "Belgium and northern France fresh-harvest windows"],
  ["germany", "only open-field months"],
  ["united-states", "climate zones"],
  ["canada", "Ontario and British Columbia"],
  ["australia", "temperate and subtropical"],
  ["new-zealand", "North and South Islands"],
])("%s explains its regional evidence limitations", (slug, explanation) => {
  const html = fs.readFileSync(path.join(__dirname, "..", "docs", slug, "index.html"), "utf8");
  expect(html).toContain(explanation);
});

test.each([
  ["netherlands", ["uk_rhs", "uk_worcestershire", "ireland_bord_bia"]],
  ["france", ["be_brussels_environment"]],
])("%s links the evidence used to narrow storage periods", (slug, sourceIds) => {
  const html = fs.readFileSync(path.join(__dirname, "..", "docs", slug, "index.html"), "utf8");
  for (const id of sourceIds) {
    expect(html).toContain(`href="${SOURCES[id].url}"`);
  }
});

test("every calendar has a unique title, description and canonical URL", () => {
  const pages = Object.keys(COUNTRIES).map((code) => fs.readFileSync(
    path.join(__dirname, "..", "docs", code.replace(/_/g, "-"), "index.html"), "utf8"
  ));
  for (const pattern of [/<title>([^<]+)<\/title>/, /<meta name="description" content="([^"]+)"/, /<link rel="canonical" href="([^"]+)"/]) {
    expect(new Set(pages.map((html) => html.match(pattern)[1])).size).toBe(pages.length);
  }
});

test("the deployment command generates every supported calendar from scratch", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "in-season-calendars-"));
  try {
    for (const directory of ["scripts", "src"]) {
      fs.mkdirSync(path.join(sandbox, directory));
    }
    fs.copyFileSync(path.join(__dirname, "..", "src", "transform.js"), path.join(sandbox, "src", "transform.js"));
    fs.copyFileSync(path.join(__dirname, "..", "scripts", "generate-calendar.js"), path.join(sandbox, "scripts", "generate-calendar.js"));
    fs.cpSync(path.join(__dirname, "..", "scripts", "templates"), path.join(sandbox, "scripts", "templates"), { recursive: true });
    const result = spawnSync(process.execPath, [path.join(sandbox, "scripts", "generate-calendar.js")], { encoding: "utf8" });
    expect(result.status).toBe(0);
    for (const code of Object.keys(COUNTRIES)) {
      const relativePath = path.join("docs", code.replace(/_/g, "-"), "index.html");
      expect(fs.readFileSync(path.join(sandbox, relativePath), "utf8")).toBe(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
    }
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
