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

  test("full layout renders complete category lists", () => {
    const markup = template("full");

    expect(markup).toContain("{% for produce in fruits %}");
    expect(markup).toContain("{% for produce in vegetables %}");
    expect(markup).not.toContain("compact.full");
  });

  test.each(["half_horizontal", "half_vertical", "quadrant"])(
    "%s renders its popularity-ranked compact lists and remainder",
    (layout) => {
      const markup = template(layout);

      expect(markup).toContain(`compact.${layout}.fruits.items`);
      expect(markup).toContain(`compact.${layout}.vegetables.items`);
      expect(markup).toContain(`compact.${layout}.fruits.more_count`);
      expect(markup).toContain(`compact.${layout}.vegetables.more_count`);
    }
  );

  test.each(LAYOUTS)("%s escapes dynamic text", (layout) => {
    const markup = template(layout);

    expect(markup).toMatch(/produce\.name \| escape/);
    expect(markup).toMatch(/country_(?:short_)?name \| escape/);
    expect(markup).toMatch(/month_name \| escape/);
  });
});
