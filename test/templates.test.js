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

describe("Liquid layout contract", () => {
  test.each(LAYOUTS)("%s renders data and setup states", (layout) => {
    const markup = template(layout);

    expect(markup).toContain("{% if has_data %}");
    expect(markup).toContain("Choose your country");
    expect(markup).toContain("{% if has_items %}");
    expect(markup).toContain("No common fresh harvests");
    expect(markup).toContain('class="title_bar"');
    expect(markup).toMatch(/National harvest guide|guide_label/);
  });

  test("full layout renders readability-first shortlists and remainders", () => {
    const markup = template("full");

    expect(markup).toContain("{% for produce in shortlist.fruits.items %}");
    expect(markup).toContain(
      "{% for produce in shortlist.vegetables.items %}"
    );
    expect(markup).toContain("shortlist.fruits.more_count");
    expect(markup).toContain("shortlist.vegetables.more_count");
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
});
