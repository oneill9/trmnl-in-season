"use strict";

const fs = require("fs");
const path = require("path");
const { COUNTRIES, SOURCES, run } = require("../src/transform");

const ROOT = path.join(__dirname, "..");
const TEMPLATE_PATH = path.join(__dirname, "templates", "united-kingdom.html");
const OUTPUT_PATH = path.join(ROOT, "docs", "united-kingdom", "index.html");

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

function renderCalendar() {
  const months = Array.from({ length: 12 }, (_, index) => run(
    { country: "united_kingdom" },
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
  const sourceIds = [...new Set(COUNTRIES.united_kingdom.items.flatMap((item) => item.sources))];
  const sources = sourceIds.map((id) =>
    `          <li><a href="${escapeHtml(SOURCES[id].url)}">${escapeHtml(SOURCES[id].title)}</a></li>`
  ).join("\n");

  return fs.readFileSync(TEMPLATE_PATH, "utf8")
    .replace("{{MONTH_NAV}}", navigation)
    .replace("{{MONTH_ROWS}}", rows)
    .replace("{{SOURCES}}", sources);
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, renderCalendar());
  console.log("calendar: wrote docs/united-kingdom/index.html");
}

module.exports = { renderCalendar };
