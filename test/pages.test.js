"use strict";

const fs = require("fs");
const path = require("path");

class SourcesPageDriver {
  constructor() {
    this.pagePath = path.join(__dirname, "..", "docs", "index.html");
    this.workflowPath = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "pages.yml"
    );
  }

  page() {
    return fs.readFileSync(this.pagePath, "utf8");
  }

  workflow() {
    return fs.readFileSync(this.workflowPath, "utf8");
  }

  actionReferences() {
    return [...this.workflow().matchAll(/uses:\s+([^\s#]+)/g)].map(
      (match) => match[1]
    );
  }

  usesAction(actionName) {
    return this.actionReferences().some((reference) =>
      reference.startsWith(`${actionName}@`)
    );
  }

  usesOnlyImmutableActions() {
    return this.actionReferences().every((reference) =>
      /@[0-9a-f]{40}$/.test(reference)
    );
  }

  docsFileExists(name) {
    return fs.existsSync(path.join(__dirname, "..", "docs", name));
  }

  linksToPublishedRecipe() {
    return this.page().includes(
      'href="https://trmnl.com/recipes/407471"'
    );
  }
}

describe("public source guide", () => {
  test("provides a directly linkable section for every supported country", () => {
    const page = new SourcesPageDriver().page();
    const countrySections = [
      "united-kingdom",
      "ireland",
      "united-states",
      "canada",
      "australia",
      "new-zealand",
    ];

    countrySections.forEach((countrySection) => {
      expect(page).toContain(`id="${countrySection}"`);
    });
  });

  test("explains the guide and links every evidence source", () => {
    const page = new SourcesPageDriver().page();
    const expectedSourceHosts = [
      "rhs.org.uk",
      "worcestershire.gov.uk",
      "bordbia.ie",
      "snaped.fns.usda.gov",
      "ontario.ca",
      "buybc.gov.bc.ca",
      "slhd.health.nsw.gov.au",
      "brisbane.qld.gov.au",
      "workandincome.govt.nz",
      "hortnz.co.nz",
    ];

    expect(page).toContain("What \"in season\" means");
    expectedSourceHosts.forEach((sourceHost) => {
      expect(page).toContain(sourceHost);
    });
  });

  test("links to the published In Season recipe", () => {
    const page = new SourcesPageDriver();

    expect(page.linksToPublishedRecipe()).toBe(true);
  });

  test("references page assets that ship inside docs/", () => {
    const page = new SourcesPageDriver();

    expect(page.page()).toContain("in-season-icon.png");
    expect(page.docsFileExists("in-season-icon.png")).toBe(true);
  });

  test("themes the page with the TRMNL site palette", () => {
    const page = new SourcesPageDriver();

    expect(page.page()).toContain("#f8654b");
    expect(page.page()).toContain("#0d0d0d");
    expect(page.page()).not.toContain("trmnl.com/css");
  });

  test("deploys the source guide through GitHub Pages", () => {
    const workflow = new SourcesPageDriver().workflow();

    const sourceGuide = new SourcesPageDriver();

    expect(sourceGuide.usesAction("actions/configure-pages")).toBe(true);
    expect(sourceGuide.usesAction("actions/upload-pages-artifact")).toBe(true);
    expect(sourceGuide.usesAction("actions/deploy-pages")).toBe(true);
    expect(workflow).toContain("pages: write");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("path: docs");
  });

  test("uses immutable GitHub Action revisions", () => {
    const sourceGuide = new SourcesPageDriver();

    expect(sourceGuide.actionReferences()).not.toHaveLength(0);
    expect(sourceGuide.usesOnlyImmutableActions()).toBe(true);
  });
});
