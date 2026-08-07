"use strict";

const fs = require("fs");
const path = require("path");

const LAYOUTS = [
  "full",
  "half_horizontal",
  "half_vertical",
  "quadrant",
];

function template(name) {
  return fs.readFileSync(
    path.join(__dirname, "..", "src", `${name}.liquid`),
    "utf8"
  );
}

class FullScreenLayoutDriver {
  constructor() {
    this.markup = template("full");
    this.stylesheet = template("shared");
  }

  columnCount(listName) {
    const rule = this.stylesheet.match(
      new RegExp(`\\.ins-produce-list--${listName} \\{([^}]+)\\}`)
    )?.[1];
    const columnDeclaration = rule?.match(
      /grid-template-columns:\s*repeat\((\d+),/
    );

    return Number(columnDeclaration?.[1]);
  }

  hasProduceBullets() {
    return /\.ins-produce::before/.test(this.stylesheet);
  }

  hasInlineBotanicalArt(sectionName) {
    return this.markup.includes(
      `class="ins-section__art ins-section__art--${sectionName}"`
    );
  }

  hasSourceQrCode() {
    return this.markup.includes("{{ source_page_url | qr_code }}");
  }

  hasLegacyHeaderCopy() {
    return /Harvesting now|guide_label|>in {{ country_name/.test(this.markup);
  }

}

describe("Liquid layout contract", () => {
  test.each(LAYOUTS)("%s renders data and setup states", (layout) => {
    const markup = template(layout);

    expect(markup).toContain("{% if has_data %}");
    expect(markup).toContain("Choose your country");
    expect(markup).toContain("{% if has_items %}");
    expect(markup).toContain("No common fresh harvests");
    expect(markup).toContain('class="title_bar"');
    if (layout !== "full") {
      expect(markup).toMatch(/National harvest guide|guide_label/);
    }
  });

  test("full layout renders the maximum readable shortlists and remainders", () => {
    const markup = template("full");

    expect(markup).toContain("{% assign fruit_limit = 14 %}");
    expect(markup).toContain("{% assign vegetable_limit = 24 %}");
    expect(markup).not.toContain("preview_density");
    expect(markup).toMatch(
      /{% for produce in shortlist\.fruits\.items limit: fruit_limit %}/
    );
    expect(markup).toMatch(
      /{% for produce in shortlist\.vegetables\.items limit: vegetable_limit %}/
    );
    expect(markup).toContain("fruit_more");
    expect(markup).toContain("vegetable_more");
  });

  test.each(["half_horizontal", "half_vertical", "quadrant"])(
    "%s renders category summaries with two examples and a remainder",
    (layout) => {
      const markup = template(layout);

      expect(markup).toContain(`compact.${layout}.fruits.categories`);
      expect(markup).toContain(`compact.${layout}.vegetables.categories`);
      expect(markup).toContain("{% for example in category.examples %}");
      expect(markup).toContain("{{ category.name | escape }}");
      expect(markup).toContain("{{ example.name | escape }}");
      expect(markup).toContain(`compact.${layout}.fruits.more_count`);
      expect(markup).toContain(`compact.${layout}.vegetables.more_count`);
    }
  );

  test.each(LAYOUTS)("%s escapes location and date text", (layout) => {
    const markup = template(layout);

    expect(markup).toMatch(/country_(?:short_)?name \| escape/);
    expect(markup).toMatch(/month_name \| escape/);
  });

  test("full layout escapes produce names", () => {
    expect(template("full")).toMatch(/produce\.name \| escape/);
  });

  test("full-screen produce names use a legible 22px type size", () => {
    const stylesheet = template("shared");
    const produceRule = stylesheet.match(/\.ins-produce \{([^}]+)\}/)?.[1];

    expect(produceRule).toMatch(/font: [^;]*22px/);
  });

  test("full-screen lists maximise readable content without bullets", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.columnCount("fruit")).toBe(2);
    expect(fullScreen.columnCount("vegetables")).toBe(3);
    expect(fullScreen.hasProduceBullets()).toBe(false);
  });

  test("full-screen section headings use botanical art", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasInlineBotanicalArt("fruit")).toBe(true);
    expect(fullScreen.hasInlineBotanicalArt("vegetables")).toBe(true);
  });

  test("full-screen header uses a source QR without explanatory copy", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasSourceQrCode()).toBe(true);
    expect(fullScreen.hasLegacyHeaderCopy()).toBe(false);
  });
});
