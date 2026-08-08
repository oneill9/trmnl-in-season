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

  botanicalHeaderCountWithEightPixelPadding() {
    return (
      this.markup.match(
        /class="ins-section__header p--2 flex flex--center flex--center-y"/g
      ) ?? []
    ).length;
  }

  hasSourceQrCode() {
    return this.markup.includes("{{ source_page_url | qr_code }}");
  }

  hasTextOnlyWordmark() {
    return (
      this.markup.includes('<span class="ins-brand__name">In Season</span>') &&
      !this.markup.includes('class="ins-brand__mark"') &&
      !this.stylesheet.includes(".ins-brand__mark") &&
      !this.markup.includes("ins-wordmark__lead")
    );
  }

  hasSectionHeaderDivider() {
    const rule = this.stylesheet.match(
      /\.ins-section__header \{([^}]+)\}/
    )?.[1];

    return /border-bottom:/.test(rule ?? "");
  }

  botanicalArtEdgeInset() {
    const rule = this.stylesheet.match(/\.ins-section__art \{([^}]+)\}/)?.[1];

    return Number(rule?.match(/clip-path:\s*inset\(0\s+(\d+)px\)/)?.[1]);
  }

  botanicalArtVerticalOffset() {
    const rule = this.stylesheet.match(
      /\.ins-layout--full \.ins-section__art \{([^}]+)\}/
    )?.[1];

    return Number(rule?.match(/transform:\s*translateY\((\d+)px\)/)?.[1]);
  }

  hasBrandBeforeHeading() {
    return (
      this.markup.indexOf('class="ins-brand ') <
      this.markup.indexOf('class="ins-header__copy"')
    );
  }

  listFlow(listName) {
    const rule = this.stylesheet.match(
      new RegExp(`\\.ins-produce-list--${listName} \\{([^}]+)\\}`)
    )?.[1];

    return rule?.match(/grid-auto-flow:\s*(\w+)/)?.[1];
  }

  hasSectionCounts() {
    return this.markup.includes("ins-section__count");
  }

  hasFooter() {
    return this.markup.includes('class="title_bar"');
  }

  hasLegacyHeaderCopy() {
    return /Harvesting now|guide_label|>in {{ country_name/.test(this.markup);
  }

  hasExplicitBoldMonth() {
    const monthMarkup =
      '<span class="ins-heading__month">{{ month_name | escape }}</span>';
    const monthRule = this.stylesheet.match(
      /\.ins-heading__month \{([^}]+)\}/
    )?.[1];

    return (
      this.markup.includes(monthMarkup) &&
      /font-weight:\s*800/.test(monthRule ?? "")
    );
  }

  produceListBottomPadding() {
    const rule = this.stylesheet.match(
      /\.ins-layout--full \.ins-produce-list \{([^}]+)\}/
    )?.[1];

    return Number(rule?.match(/padding-bottom:\s*(\d+)px/)?.[1]);
  }

  produceListRowGap() {
    const rule = this.stylesheet.match(
      /\.ins-layout--full \.ins-produce-list \{([^}]+)\}/
    )?.[1];

    return Number(rule?.match(/row-gap:\s*(\d+)px/)?.[1]);
  }

  produceListRowCount() {
    const rule = this.stylesheet.match(
      /\.ins-layout--density-maximum \.ins-produce-list \{([^}]+)\}/
    )?.[1];

    return Number(
      rule?.match(/grid-template-rows:\s*repeat\((\d+),/)?.[1]
    );
  }

  headingLineHeight() {
    const rule = this.stylesheet.match(/\.ins-heading \{([^}]+)\}/)?.[1];

    return Number(rule?.match(/line-height:\s*([\d.]+)/)?.[1]);
  }

  fullScreenHeadingFontSize() {
    const rule = this.stylesheet.match(
      /\.ins-layout--full \.ins-heading \{([^}]+)\}/
    )?.[1];

    return Number(rule?.match(/font:\s*[^;]*?(\d+)px\//)?.[1]);
  }

  brandFontSize() {
    const rule = this.stylesheet.match(/\.ins-brand__name \{([^}]+)\}/)?.[1];

    return Number(rule?.match(/font:\s*[^;]*?(\d+)px\//)?.[1]);
  }

  hasRepeatedFooterContext() {
    return /class="instance"[\s\S]*country_short_name[\s\S]*month_name/.test(
      this.markup
    );
  }

}

class CompactLayoutDriver {
  constructor(layout) {
    this.layout = layout;
    this.markup = template(layout);
    this.stylesheet = template("shared");
  }

  literalCount(copy) {
    return this.markup.split(copy).length - 1;
  }

  hasFooter() {
    return this.markup.includes('class="title_bar"');
  }

  hasExplicitBoldMonth() {
    return this.markup.includes(
      '<span class="ins-heading__month">{{ month_name | escape }}</span>'
    );
  }

  hasInlineBotanicalArt(sectionName) {
    return this.markup.includes(
      `class="ins-section__art ins-section__art--${sectionName}"`
    );
  }

  hasTotalCounts() {
    return /total_count|fruit_count|vegetable_count|\d+ items/.test(
      this.markup
    );
  }

  hasConditionalOverflowFor(sectionName) {
    const path = `compact.${this.layout}.${sectionName}.more_count`;
    const conditional = `{% if ${path} > 0 %}`;
    const indicator = `+{{ ${path} }} groups`;

    return (
      this.markup.includes(conditional) &&
      this.markup.includes(indicator) &&
      !this.markup.includes(`${indicator}{% else %}`)
    );
  }

  orientationRule() {
    return this.stylesheet.match(
      new RegExp(
        `\\.ins-layout--${this.layout.replace("_", "-")} \\.ins-section__art \\{([^}]+)\\}`
      )
    )?.[1];
  }
}

describe("Liquid layout contract", () => {
  test.each(LAYOUTS)("%s renders data and setup states", (layout) => {
    const markup = template(layout);

    expect(markup).toContain("{% if has_data %}");
    expect(markup).toContain("Choose your country");
    expect(markup).toContain("{% if has_items %}");
    expect(markup).toContain("No common fresh harvests");
    if (["full", "half_horizontal"].includes(layout)) {
      expect(markup).not.toContain('class="title_bar"');
    } else {
      expect(markup).toContain('class="title_bar"');
    }
    if (["half_vertical", "quadrant"].includes(layout)) {
      expect(markup).toMatch(/National harvest guide|guide_label/);
    }
  });

  test("full layout renders complete readable produce lists", () => {
    const markup = template("full");

    expect(markup).toContain("{% assign fruit_limit = 24 %}");
    expect(markup).toContain("{% assign vegetable_limit = 36 %}");
    expect(markup).not.toContain("preview_density");
    expect(markup).toMatch(
      /{% for produce in shortlist\.fruits\.items limit: fruit_limit %}/
    );
    expect(markup).toMatch(
      /{% for produce in shortlist\.vegetables\.items limit: vegetable_limit %}/
    );
    expect(markup).not.toContain("fruit_more");
    expect(markup).not.toContain("vegetable_more");
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

  test("full-screen produce names use TRMNL's readable list typography", () => {
    const stylesheet = template("shared");
    const produceRule = stylesheet.match(/\.ins-produce \{([^}]+)\}/)?.[1];

    expect(produceRule).toMatch(
      /font: 500 21px\/1\.2 "Inter Variable", Inter, sans-serif/
    );
    expect(produceRule).not.toMatch(/letter-spacing/);
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
    expect(fullScreen.botanicalHeaderCountWithEightPixelPadding()).toBe(2);
    expect(fullScreen.hasSectionHeaderDivider()).toBe(false);
    expect(fullScreen.botanicalArtEdgeInset()).toBe(2);
    expect(fullScreen.botanicalArtVerticalOffset()).toBe(8);
  });

  test("full-screen header uses a text-only wordmark without a source QR or counts", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasTextOnlyWordmark()).toBe(true);
    expect(fullScreen.hasBrandBeforeHeading()).toBe(true);
    expect(fullScreen.hasSourceQrCode()).toBe(false);
    expect(fullScreen.hasSectionCounts()).toBe(false);
    expect(fullScreen.hasLegacyHeaderCopy()).toBe(false);
  });

  test("full-screen produce lists fill each row from left to right", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.listFlow("fruit")).toBe("row");
    expect(fullScreen.listFlow("vegetables")).toBe("row");
  });

  test("full-screen header gives the month explicit bold emphasis", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasExplicitBoldMonth()).toBe(true);
  });

  test("full-screen date and country match the wordmark size", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.fullScreenHeadingFontSize()).toBe(21);
    expect(fullScreen.fullScreenHeadingFontSize()).toBe(
      fullScreen.brandFontSize()
    );
  });

  test("full-screen lists leave eight pixels of bottom clearance", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.produceListBottomPadding()).toBe(8);
  });

  test("full-screen lists fit twelve readable rows without a footer", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.produceListRowCount()).toBe(12);
    expect(fullScreen.produceListRowGap()).toBe(2);
    expect(fullScreen.hasFooter()).toBe(false);
  });

  test("full-screen heading leaves room for month-name descenders", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.headingLineHeight()).toBeGreaterThanOrEqual(1.2);
  });

  test("full-screen footer does not repeat the country and month", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasRepeatedFooterContext()).toBe(false);
  });

  test("half-horizontal adopts the full-screen header hierarchy", () => {
    const halfHorizontal = new CompactLayoutDriver("half_horizontal");

    expect(halfHorizontal.literalCount("In Season")).toBe(1);
    expect(halfHorizontal.hasFooter()).toBe(false);
    expect(halfHorizontal.hasExplicitBoldMonth()).toBe(true);
    expect(halfHorizontal.markup).toContain(
      '<span class="ins-brand__name">In Season</span>'
    );
    expect(halfHorizontal.markup).toMatch(/country_short_name \| escape/);
  });

  test("half-horizontal section headings use compact botanical art", () => {
    const halfHorizontal = new CompactLayoutDriver("half_horizontal");

    expect(halfHorizontal.hasInlineBotanicalArt("fruit")).toBe(true);
    expect(halfHorizontal.hasInlineBotanicalArt("vegetables")).toBe(true);
    expect(halfHorizontal.orientationRule()).toMatch(/height:\s*\d+px/);
    expect(halfHorizontal.orientationRule()).toMatch(/max-width:\s*\d+%/);
  });

  test("half-horizontal shows only conditional group overflow counts", () => {
    const halfHorizontal = new CompactLayoutDriver("half_horizontal");

    expect(halfHorizontal.hasTotalCounts()).toBe(false);
    expect(halfHorizontal.hasConditionalOverflowFor("fruits")).toBe(true);
    expect(halfHorizontal.hasConditionalOverflowFor("vegetables")).toBe(true);
  });
});
