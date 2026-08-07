"use strict";

const fs = require("fs");
const path = require("path");

// Driver layer

class RecipeSettingsDriver {
  constructor() {
    this.settingsPath = path.join(__dirname, "..", "src", "settings.yml");
  }

  contents() {
    return fs.readFileSync(this.settingsPath, "utf8");
  }

  authorBio() {
    return this.contents().match(
      /- keyname: about_in_season[\s\S]*?(?=\n- keyname:|$)/
    )?.[0];
  }
}

describe("public TRMNL recipe settings", () => {
  test("provides public discovery and support details without exposing email", () => {
    const settings = new RecipeSettingsDriver();
    const authorBio = settings.authorBio();

    expect(authorBio).toBeDefined();
    expect(authorBio).toContain("field_type: author_bio");
    expect(authorBio).toContain("category: nature,life");
    expect(authorBio).toContain(
      "github_url: https://github.com/oneill9/trmnl-in-season"
    );
    expect(authorBio).toContain(
      "learn_more_url: https://oneill9.github.io/trmnl-in-season/"
    );
    expect(authorBio).not.toContain("email_address:");
  });

  test("pins the TRMNL Framework used by published installations", () => {
    const settings = new RecipeSettingsDriver().contents();

    expect(settings).toContain("framework_version: 3.2.0");
    expect(settings).not.toContain("framework_version: latest");
  });

  test("describes the recipe in terms users can understand before installing", () => {
    const settings = new RecipeSettingsDriver().contents();

    expect(settings).toContain(
      "description: Monthly fruit and veg by country."
    );
  });
});
