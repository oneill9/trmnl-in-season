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
});
