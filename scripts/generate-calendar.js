"use strict";

const fs = require("fs");
const path = require("path");
const { COUNTRIES, SOURCES, run } = require("../src/transform");

const ROOT = path.join(__dirname, "..");
const TEMPLATE_PATH = path.join(__dirname, "templates", "calendar.html");
const CALENDAR_GUIDANCE = {
  united_kingdom: {
    lang: "en-GB",
    location: "the UK",
    description: "Find UK seasonal fruit and vegetables for every month, from winter roots to summer berries. A fresh-harvest calendar with sources and regional guidance.",
    caption: "Typical UK fresh harvests, grouped into fruit and vegetables. Months with no fruit listed have no fresh fruit harvests in this catalogue.",
    availability: "British apples sold in winter may have been stored after harvest. A blank fruit month does not mean shops have no British fruit.",
    sources: "The catalogue draws on RHS fruit gardening calendars, vegetable crop planning and harvesting guidance, alongside the council's seasonal eating guide.",
  },
  ireland: {
    lang: "en-IE",
    location: "Ireland",
    regional: "Bord Bia provides the national seasonal guide. Coastal exposure and local growing conditions can shift harvests within Ireland, so check with nearby growers.",
    sources: "The catalogue draws on Bord Bia's Best in Season calendar, using fresh domestic harvest periods rather than storage or protected-growing availability.",
  },
  netherlands: {
    lang: "en",
    location: "the Netherlands",
    regional: "Voedingscentrum covers open fields, plastic tunnels and unheated greenhouses without marking stored produce. For apples, pears, onions, pumpkins, carrots, beetroot, celeriac and cabbage, the catalogue keeps months within the United Kingdom and Ireland fresh-harvest windows. It omits forced chicory.",
    sources: "The catalogue draws on Voedingscentrum's seasonal calendar. The UK and Ireland sources support the fresh-harvest checks described above.",
    additionalSources: ["uk_rhs", "uk_worcestershire", "ireland_bord_bia"],
  },
  belgium: {
    lang: "en",
    location: "Belgium",
    regional: "The Brussels Environment calendar covers Belgium and neighbouring northern France. It excludes heated greenhouses and marks stored produce separately. The catalogue keeps only fresh months and omits forced chicory.",
    sources: "The catalogue draws on Brussels Environment's local and seasonal calendar. Its cross-border coverage is a guide to typical harvests, rather than a forecast for every Belgian grower.",
  },
  france: {
    lang: "en",
    location: "France",
    regional: "ADEME does not mark stored produce. For apples, pears, carrots, beetroot, celeriac, turnips, pumpkins and squash, the catalogue keeps months within the Belgium and northern France fresh-harvest windows. This northern overlap is conservative for warmer French regions. It omits onions, imported citrus and tropical fruit, and forced chicory.",
    sources: "The catalogue draws on ADEME's seasonal calendar, with Brussels Environment supporting the fresh-harvest checks described above.",
    additionalSources: ["be_brussels_environment"],
  },
  germany: {
    lang: "en",
    location: "Germany",
    regional: "Verbraucherzentrale separates open-field, foil-or-fleece, greenhouse and stored produce. The catalogue keeps only open-field months, so it omits tomatoes, peppers, aubergines and salad cucumbers. Harvest timing still varies between warmer lowlands and cooler or higher areas.",
    sources: "The catalogue draws on Verbraucherzentrale's calendar for home-grown produce, using its open-field harvest periods.",
  },
  united_states: {
    lang: "en-US",
    location: "the United States",
    regional: "The United States spans several climate zones. The USDA guide describes broad seasons, and this catalogue uses common harvest periods in the main producing regions. A crop being harvested in one state does not establish nationwide availability. Check local growers for timing in your state.",
    sources: "The catalogue draws on the USDA SNAP-Ed Seasonal Produce Guide. Its broad seasonal guidance is rounded to calendar months for this national catalogue.",
  },
  canada: {
    lang: "en-CA",
    location: "Canada",
    regional: "The catalogue uses the overlap between Ontario and British Columbia fresh-harvest periods when their calendars differ. It excludes storage and greenhouse periods identified by the sources. These two provinces do not describe every Canadian climate or growing region.",
    sources: "The catalogue draws on Foodland Ontario's availability guide and Buy BC's seasonal chart, keeping their overlapping fresh-harvest periods.",
  },
  australia: {
    lang: "en-AU",
    location: "Australia",
    regional: "The catalogue keeps seasons shared by the temperate and subtropical guides from Sydney and Brisbane. Availability in one state does not count as nationwide availability. Tropical, inland and cooler southern regions can have different harvest timing.",
    sources: "The catalogue draws on Sydney Local Health District and Brisbane City Council seasonal guides, using their shared harvest periods.",
  },
  new_zealand: {
    lang: "en-NZ",
    location: "New Zealand",
    regional: "Harvest timing varies between the North and South Islands and between warmer coastal and cooler inland areas. The seasonal work calendar and national vegetable chart provide broad guidance, so check nearby growers for local harvests.",
    sources: "The catalogue draws on Work and Income's fruit and vegetable seasonal work calendar and Horticulture New Zealand's vegetable seasonability chart.",
  },
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function produceList(items, category) {
  if (items.length === 0) {
    return `<p class="note">No fresh ${category} harvests in this catalogue.</p>`;
  }
  return `<ul class="harvest-list">${items.map((item) =>
    `<li data-produce="${item.id}">${escapeHtml(item.name)}</li>`
  ).join("")}</ul>`;
}

function renderCalendar(countryCode = "united_kingdom") {
  const country = COUNTRIES[countryCode];
  const guidance = CALENDAR_GUIDANCE[countryCode];
  const slug = countryCode.replace(/_/g, "-");
  const titleCountry = countryCode === "united_kingdom" ? "UK" : country.name;
  const months = Array.from({ length: 12 }, (_, index) => run(
    { country: countryCode },
    { now: () => new Date(Date.UTC(2026, index, 15, 12)) }
  ));
  const navigation = months.map((month) =>
    `            <a href="#${month.month_name.toLowerCase()}">${month.month_name}</a>`
  ).join("\n");
  const rows = months.map((month) => `            <tr id="${month.month_name.toLowerCase()}" data-month="${month.month}">
              <th scope="row">${month.month_name}</th>
              <td data-category="fruit"><span class="calendar-label" aria-hidden="true">Fruit</span>${produceList(month.fruits, "fruit")}</td>
              <td data-category="vegetable"><span class="calendar-label" aria-hidden="true">Vegetables</span>${produceList(month.vegetables, "vegetable")}</td>
            </tr>`).join("\n");
  const sourceIds = [...new Set([
    ...country.items.flatMap((item) => item.sources),
    ...(guidance.additionalSources || []),
  ])];
  const sources = sourceIds.map((id) =>
    `          <li><a href="${escapeHtml(SOURCES[id].url)}">${escapeHtml(SOURCES[id].title)}</a></li>`
  ).join("\n");

  const values = {
    LANG: escapeHtml(guidance.lang),
    DESCRIPTION: escapeHtml(guidance.description || `Find ${country.name} seasonal fruit and vegetables for every month. A fresh-harvest calendar with evidence sources and regional guidance.`),
    TITLE_COUNTRY: escapeHtml(titleCountry),
    COUNTRY_NAME: escapeHtml(country.name),
    SLUG: slug,
    LOCATION: escapeHtml(guidance.location),
    CAPTION: escapeHtml(guidance.caption || `Typical fresh harvests in ${guidance.location}, grouped into fruit and vegetables. Empty lists mean no fresh harvests in this selected catalogue.`),
    AVAILABILITY_NOTE: escapeHtml(guidance.availability || "Locally grown produce sold outside these harvest months may have been stored after harvest. A blank fruit or vegetable month does not mean shops have no locally grown produce."),
    REGIONAL_NOTE: guidance.regional ? `        <p>${escapeHtml(guidance.regional)}</p>\n` : "",
    SOURCE_SUMMARY: escapeHtml(guidance.sources),
    MONTH_NAV: navigation,
    MONTH_ROWS: rows,
    SOURCES: sources,
  };

  return fs.readFileSync(TEMPLATE_PATH, "utf8")
    .replace(/\{\{([A-Z_]+)\}\}/g, (_match, key) => values[key]);
}

if (require.main === module) {
  for (const countryCode of Object.keys(COUNTRIES)) {
    const outputPath = path.join(ROOT, "docs", countryCode.replace(/_/g, "-"), "index.html");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderCalendar(countryCode));
    console.log(`calendar: wrote ${path.relative(ROOT, outputPath)}`);
  }
}

module.exports = { renderCalendar };
