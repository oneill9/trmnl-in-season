"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

  canonicalUrls() {
    return [...this.page().matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((match) => match[1]);
  }

  sitemap() {
    return fs.readFileSync(path.join(__dirname, "..", "docs", "sitemap.xml"), "utf8");
  }

  sitemapUrls() {
    return [...this.sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1]
    );
  }

  workflow() {
    return fs.readFileSync(this.workflowPath, "utf8");
  }

  indexNowKeyFiles() {
    return fs
      .readdirSync(path.join(__dirname, "..", "docs"))
      .filter((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  }

  indexNowPayload() {
    const match = this.workflow().match(
      /--data-binary\s+'(\{[\s\S]*?\})'/
    );

    return match ? JSON.parse(match[1]) : null;
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

  reference(name) {
    return fs.readFileSync(path.join(__dirname, "..", "docs", name), "utf8");
  }

  referenceLinks() {
    return [...this.page().matchAll(/<link rel="describedby" href="([^"]+)" type="([^"]+)"/g)]
      .map((match) => ({ url: match[1], type: match[2] }));
  }

  linksToPublishedRecipe() {
    return this.page().includes(
      'href="https://trmnl.com/recipes/407471"'
    );
  }

  analyticsLoaders() {
    return [...this.page().matchAll(/<script\b[^>]*src="(https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+)"[^>]*>/g)];
  }

  analyticsCommands() {
    const scripts = [...this.page().matchAll(/<script>([\s\S]*?)<\/script>/g)];
    const analytics = scripts.find((script) => script[1].includes("gtag('config'"));
    if (!analytics) return [];
    const context = vm.createContext({});
    context.window = context;
    vm.runInContext(analytics[1], context);
    return JSON.parse(JSON.stringify(context.dataLayer.map((command) => [...command])));
  }
}

describe("public source guide", () => {
  test("lets agents discover both raw references and the seasonal evidence guide", () => {
    const page = new SourcesPageDriver();
    const baseUrl = "https://oneill9.github.io/trmnl-in-season/";

    expect(page.referenceLinks()).toEqual([
      { url: `${baseUrl}llms.txt`, type: "text/plain" },
      { url: `${baseUrl}llms.md`, type: "text/markdown" },
    ]);
    for (const name of ["llms.txt", "llms.md"]) {
      const reference = page.reference(name);
      expect(reference).toMatch(/^# In Season\n\n> /);
      expect(reference).not.toMatch(/<!doctype|<html/i);
      expect(reference).toContain(`](${baseUrl}DATA_SOURCES.md)`);
    }
    expect(page.reference("llms.txt")).toContain(`](${baseUrl}llms.md)`);
    for (const country of ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "New Zealand"]) {
      expect(page.reference("llms.md")).toContain(country);
    }
    expect(page.reference("llms.md")).toContain("https://trmnl.com/recipes/407471");
    expect(page.reference("llms.md")).toContain("domestic fresh harvest");
  });

  test("provides a sitemap containing the canonical source guide URL", () => {
    const page = new SourcesPageDriver();
    const canonicalUrl = "https://oneill9.github.io/trmnl-in-season/";

    expect(page.canonicalUrls()).toEqual([canonicalUrl]);
    expect(page.sitemap()).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(page.sitemapUrls()).toEqual([canonicalUrl]);
  });

  test("notifies IndexNow after deployment for every sitemap URL", () => {
    const page = new SourcesPageDriver();
    const keyFiles = page.indexNowKeyFiles();

    expect(keyFiles).toHaveLength(1);
    const key = path.basename(keyFiles[0], ".txt");
    expect(page.reference(keyFiles[0]).trim()).toBe(key);
    expect(page.workflow()).toContain("indexnow:");
    expect(page.workflow()).toContain("needs: deploy");
    expect(page.workflow()).toContain("--fail-with-body");
    expect(page.indexNowPayload()).toEqual({
      host: "oneill9.github.io",
      key,
      keyLocation: `https://oneill9.github.io/trmnl-in-season/${key}.txt`,
      urlList: page.sitemapUrls(),
    });
  });

  test("immediately initializes its own analytics stream with isolated project cookies", () => {
    const page = new SourcesPageDriver();
    const loaders = page.analyticsLoaders();

    expect(loaders).toHaveLength(1);
    expect(loaders[0][1]).toBe("https://www.googletagmanager.com/gtag/js?id=G-MN20E35ELS");
    expect(loaders[0][0]).toMatch(/\basync\b/);
    const configurations = page.analyticsCommands().filter((command) => command[0] === "config");
    expect(configurations).toEqual([["config", "G-MN20E35ELS", {
      cookie_path: "/trmnl-in-season/",
      cookie_prefix: "trmnl_in_season"
    }]]);
  });

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
