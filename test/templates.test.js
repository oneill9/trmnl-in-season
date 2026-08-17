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

  hasCategoryBullets() {
    return /\.ins-category::before/.test(this.stylesheet);
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

  hasCompleteCategoryRows(sectionName) {
    const categoryPath = `shortlist.${sectionName}.categories`;

    return (
      this.markup.includes(`{% for category in ${categoryPath} %}`) &&
      this.markup.includes("{{ category.name | escape }}") &&
      this.markup.includes("{% for example in category.examples %}") &&
      this.markup.includes("{{ example.name | escape }}")
    );
  }

  categoryRule() {
    return this.stylesheet.match(
      /\.ins-layout--full \.ins-category \{([^}]+)\}/
    )?.[1];
  }

  categoryTextRule(part) {
    return this.stylesheet.match(
      new RegExp(`\\.ins-layout--full \\.ins-category__${part} \\{([^}]+)\\}`)
    )?.[1];
  }

  hasDenseInlineCategoryRows() {
    const categoryRule = this.categoryRule();
    const nameRule = this.categoryTextRule("name");
    const examplesRule = this.categoryTextRule("examples");

    return (
      /display:\s*block/.test(categoryRule ?? "") &&
      /border-bottom:\s*0/.test(categoryRule ?? "") &&
      /font:\s*800/.test(nameRule ?? "") &&
      /font:\s*500/.test(examplesRule ?? "") &&
      [nameRule, examplesRule].every(
        (rule) =>
          /display:\s*inline/.test(rule ?? "") &&
          /overflow:\s*visible/.test(rule ?? "") &&
          /white-space:\s*normal/.test(rule ?? "")
      )
    );
  }

  hasResponsiveHorizontalPanels() {
    const boardRule = this.stylesheet.match(
      /\.ins-layout--full \.ins-board \{([^}]+)\}/
    )?.[1];

    return (
      this.markup.includes(
        "ins-board ins-board--{{ shortlist.layout_balance }}"
      ) &&
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(boardRule ?? "") &&
      this.stylesheet.includes(".ins-board--fruit-empty") &&
      this.stylesheet.includes(".ins-board--fruit-quarter") &&
      this.stylesheet.includes(".ins-board--fruit-third") &&
      this.stylesheet.includes(".ins-board--balanced")
    );
  }

  hasCollapsedEmptyFruitPanel() {
    const rule = this.stylesheet.match(
      /\.ins-layout--full \.ins-board--fruit-empty \{([^}]+)\}/
    )?.[1];

    return /grid-template-rows:\s*56px\s+minmax\(0,\s*1fr\)/.test(
      rule ?? ""
    );
  }

  hasArtworkOnlySectionMarkers() {
    return (
      (this.markup.match(/class="ins-section__header/g) ?? []).length === 2 &&
      !this.markup.includes("ins-section__title")
    );
  }

  hasAlignedCategoryColumns() {
    const categoryRule = this.categoryRule();
    const nameRule = this.categoryTextRule("name");
    const examplesRule = this.categoryTextRule("examples");

    return (
      /display:\s*grid/.test(categoryRule ?? "") &&
      /grid-template-columns:\s*84px\s+minmax\(0,\s*1fr\)/.test(
        categoryRule ?? ""
      ) &&
      /font:\s*700 14px/.test(nameRule ?? "") &&
      /font:\s*500 15px/.test(examplesRule ?? "") &&
      [nameRule, examplesRule].every(
        (rule) =>
          /display:\s*block/.test(rule ?? "") &&
          /white-space:\s*normal/.test(rule ?? "")
      )
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

  categoryListRule() {
    return this.stylesheet.match(
      new RegExp(
        `\\.ins-layout--${this.layout.replace("_", "-")} \\.ins-category-list \\{([^}]+)\\}`
      )
    )?.[1];
  }

  categoryRule() {
    return this.stylesheet.match(
      new RegExp(
        `\\.ins-layout--${this.layout.replace("_", "-")} \\.ins-category \\{([^}]+)\\}`
      )
    )?.[1];
  }

  categoryTextRule(part) {
    return this.stylesheet.match(
      new RegExp(
        `\\.ins-layout--${this.layout.replace("_", "-")} \\.ins-category__${part} \\{([^}]+)\\}`
      )
    )?.[1];
  }

  hasPackedCategoryRows() {
    const listRule = this.categoryListRule();

    return (
      /align-content:\s*start/.test(listRule ?? "") &&
      /grid-auto-rows:\s*max-content/.test(listRule ?? "") &&
      /gap:\s*0/.test(listRule ?? "")
    );
  }

  hasWholeLineCategoryRows() {
    const listRule = this.categoryListRule();
    const categoryRule = this.categoryRule();

    return (
      /grid-auto-rows:\s*max-content/.test(listRule ?? "") &&
      /-webkit-box-orient:\s*vertical/.test(categoryRule ?? "") &&
      /-webkit-line-clamp:\s*var\(--ins-category-lines\)/.test(
        categoryRule ?? ""
      )
    );
  }

  hasCategoryLineBudgetMarkup() {
    return this.markup.includes(
      "--ins-category-lines: {{ category.line_limit }}"
    );
  }

  hasCategorySeparators() {
    return !/border-bottom:\s*0/.test(this.categoryRule() ?? "");
  }

  hasLeftAlignedCategoryRows() {
    return /text-align:\s*left/.test(this.categoryRule() ?? "");
  }

  hasFlowingCategoryText() {
    const categoryRule = this.categoryRule();
    const nameRule = this.categoryTextRule("name");
    const examplesRule = this.categoryTextRule("examples");

    return (
      /display:\s*(?:block|-webkit-box)/.test(categoryRule ?? "") &&
      [nameRule, examplesRule].every(
        (rule) =>
          /display:\s*inline/.test(rule ?? "") &&
          /overflow:\s*visible/.test(rule ?? "") &&
          /white-space:\s*normal/.test(rule ?? "")
      )
    );
  }
}

describe("Liquid layout contract", () => {
  test.each(LAYOUTS)("%s renders data and setup states", (layout) => {
    const markup = template(layout);

    expect(markup).toContain("{% if has_data %}");
    expect(markup).toContain("Choose your country");
    expect(markup).toContain("{% if has_items %}");
    expect(markup).toContain("No common fresh harvests");
    expect(markup).not.toContain('class="title_bar"');
    expect(markup).not.toMatch(/National harvest guide|guide_label/);
  });

  test("full layout renders complete produce grouped into categories", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasCompleteCategoryRows("fruits")).toBe(true);
    expect(fullScreen.hasCompleteCategoryRows("vegetables")).toBe(true);
    expect(fullScreen.markup).not.toContain("preview_density");
    expect(fullScreen.markup).not.toContain("fruit_more");
    expect(fullScreen.markup).not.toContain("vegetable_more");
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

  test("full-screen categories align bold labels beside regular wrapping names", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasAlignedCategoryColumns()).toBe(true);
    expect(fullScreen.hasCategoryBullets()).toBe(false);
  });

  test("full-screen uses responsive horizontal panels", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasResponsiveHorizontalPanels()).toBe(true);
    expect(fullScreen.hasCollapsedEmptyFruitPanel()).toBe(true);
  });

  test("full-screen uses botanical artwork without text section headings", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasInlineBotanicalArt("fruit")).toBe(true);
    expect(fullScreen.hasInlineBotanicalArt("vegetables")).toBe(true);
    expect(fullScreen.hasArtworkOnlySectionMarkers()).toBe(true);
    expect(fullScreen.botanicalArtEdgeInset()).toBe(2);
  });

  test("full-screen header uses a text-only wordmark without a source QR or counts", () => {
    const fullScreen = new FullScreenLayoutDriver();

    expect(fullScreen.hasTextOnlyWordmark()).toBe(true);
    expect(fullScreen.hasBrandBeforeHeading()).toBe(true);
    expect(fullScreen.hasSourceQrCode()).toBe(false);
    expect(fullScreen.hasSectionCounts()).toBe(false);
    expect(fullScreen.hasLegacyHeaderCopy()).toBe(false);
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

  test("full-screen categories retain bottom clearance without a footer", () => {
    const fullScreen = new FullScreenLayoutDriver();

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

  test("half-horizontal allocates only complete lines to category rows", () => {
    const halfHorizontal = new CompactLayoutDriver("half_horizontal");

    expect(halfHorizontal.hasWholeLineCategoryRows()).toBe(true);
    expect(halfHorizontal.hasCategoryLineBudgetMarkup()).toBe(true);
    expect(halfHorizontal.hasCategorySeparators()).toBe(false);
    expect(halfHorizontal.hasLeftAlignedCategoryRows()).toBe(true);
  });

  test("half-horizontal flows additional produce onto available lines", () => {
    const halfHorizontal = new CompactLayoutDriver("half_horizontal");

    expect(halfHorizontal.hasFlowingCategoryText()).toBe(true);
  });

  test("half-vertical adopts the full-screen header hierarchy", () => {
    const halfVertical = new CompactLayoutDriver("half_vertical");

    expect(halfVertical.literalCount("In Season")).toBe(1);
    expect(halfVertical.hasFooter()).toBe(false);
    expect(halfVertical.hasExplicitBoldMonth()).toBe(true);
    expect(halfVertical.markup).toContain(
      '<span class="ins-brand__name">In Season</span>'
    );
    expect(halfVertical.markup).toMatch(/country_short_name \| escape/);
  });

  test("half-vertical section headings use compact botanical art", () => {
    const halfVertical = new CompactLayoutDriver("half_vertical");

    expect(halfVertical.hasInlineBotanicalArt("fruit")).toBe(true);
    expect(halfVertical.hasInlineBotanicalArt("vegetables")).toBe(true);
    expect(halfVertical.orientationRule()).toMatch(/height:\s*\d+px/);
    expect(halfVertical.orientationRule()).toMatch(/max-width:\s*\d+%/);
  });

  test("half-vertical shows only conditional group overflow counts", () => {
    const halfVertical = new CompactLayoutDriver("half_vertical");

    expect(halfVertical.hasTotalCounts()).toBe(false);
    expect(halfVertical.hasConditionalOverflowFor("fruits")).toBe(true);
    expect(halfVertical.hasConditionalOverflowFor("vegetables")).toBe(true);
  });

  test("half-vertical packs category rows without separators", () => {
    const halfVertical = new CompactLayoutDriver("half_vertical");

    expect(halfVertical.hasPackedCategoryRows()).toBe(true);
    expect(halfVertical.hasCategorySeparators()).toBe(false);
  });

  test("quadrant adopts the shared compact header hierarchy", () => {
    const quadrant = new CompactLayoutDriver("quadrant");

    expect(quadrant.literalCount("In Season")).toBe(1);
    expect(quadrant.hasFooter()).toBe(false);
    expect(quadrant.hasExplicitBoldMonth()).toBe(true);
    expect(quadrant.markup).toContain(
      '<span class="ins-brand__name">In Season</span>'
    );
    expect(quadrant.markup).toMatch(/country_short_name \| escape/);
  });

  test("quadrant section headings use compact botanical art", () => {
    const quadrant = new CompactLayoutDriver("quadrant");

    expect(quadrant.hasInlineBotanicalArt("fruit")).toBe(true);
    expect(quadrant.hasInlineBotanicalArt("vegetables")).toBe(true);
    expect(quadrant.orientationRule()).toMatch(/height:\s*\d+px/);
    expect(quadrant.orientationRule()).toMatch(/max-width:\s*\d+%/);
  });

  test("quadrant shows only conditional group overflow counts", () => {
    const quadrant = new CompactLayoutDriver("quadrant");

    expect(quadrant.hasTotalCounts()).toBe(false);
    expect(quadrant.hasConditionalOverflowFor("fruits")).toBe(true);
    expect(quadrant.hasConditionalOverflowFor("vegetables")).toBe(true);
  });

  test("quadrant packs category rows without separators", () => {
    const quadrant = new CompactLayoutDriver("quadrant");

    expect(quadrant.hasPackedCategoryRows()).toBe(true);
    expect(quadrant.hasCategorySeparators()).toBe(false);
  });
});
