"use strict";

const fs = require("fs");
const path = require("path");

// Driver layer

class TrmnlWorkflowDriver {
  constructor() {
    this.workflowPath = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "trmnl.yml"
    );
  }

  contents() {
    return fs.readFileSync(this.workflowPath, "utf8");
  }

  commandPosition(command) {
    return this.contents().indexOf(command);
  }

  actionReferences() {
    return [...this.contents().matchAll(/uses:\s+([^\s#]+)/g)].map(
      (match) => match[1]
    );
  }

  usesOnlyImmutableActions() {
    return this.actionReferences().every((reference) =>
      /@[0-9a-f]{40}$/.test(reference)
    );
  }
}

class RubyDependenciesDriver {
  constructor() {
    this.gemfilePath = path.join(__dirname, "..", "Gemfile");
    this.lockfilePath = path.join(__dirname, "..", "Gemfile.lock");
  }

  gemfile() {
    return fs.readFileSync(this.gemfilePath, "utf8");
  }

  lockfile() {
    return fs.readFileSync(this.lockfilePath, "utf8");
  }
}

describe("TRMNL delivery workflow", () => {
  test("verifies pull requests and deploys pushes to main", () => {
    const workflow = new TrmnlWorkflowDriver().contents();

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("trmnlp lint");
    expect(workflow).toContain("trmnlp push --force");
  });

  test("publishes only after tests and lint pass", () => {
    const workflow = new TrmnlWorkflowDriver();

    expect(workflow.commandPosition("npm test")).toBeLessThan(
      workflow.commandPosition("trmnlp lint")
    );
    expect(workflow.commandPosition("trmnlp lint")).toBeLessThan(
      workflow.commandPosition("trmnlp push --force")
    );
  });

  test("reads the TRMNL API key from GitHub secrets", () => {
    const workflow = new TrmnlWorkflowDriver().contents();

    expect(workflow).toContain(
      "TRMNL_API_KEY: ${{ secrets.TRMNL_API_KEY }}"
    );
  });

  test("uses immutable GitHub Action revisions", () => {
    const workflow = new TrmnlWorkflowDriver();

    expect(workflow.actionReferences()).not.toHaveLength(0);
    expect(workflow.usesOnlyImmutableActions()).toBe(true);
  });

  test("runs the locked TRMNL preview dependency", () => {
    const workflow = new TrmnlWorkflowDriver().contents();
    const dependencies = new RubyDependenciesDriver();

    expect(dependencies.gemfile()).toContain(
      'gem "trmnl_preview", "0.11.0"'
    );
    expect(dependencies.lockfile()).toMatch(/trmnl_preview \(0\.11\.0\)/);
    expect(workflow).toContain("bundle exec trmnlp lint");
    expect(workflow).toContain("bundle exec trmnlp push --force");
    expect(workflow).not.toContain("gem install trmnl_preview");
  });
});
