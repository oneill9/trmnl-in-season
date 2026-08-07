"use strict";

const fs = require("fs");
const path = require("path");

class DependabotPolicyDriver {
  constructor() {
    this.configPath = path.join(
      __dirname,
      "..",
      ".github",
      "dependabot.yml"
    );
  }

  config() {
    return fs.readFileSync(this.configPath, "utf8");
  }

  updatePolicy(packageEcosystem) {
    const escapedEcosystem = packageEcosystem.replace("-", "\\-");
    return this.config().match(
      new RegExp(
        `package-ecosystem: "${escapedEcosystem}"([\\s\\S]*?)(?=\\n  - package-ecosystem:|$)`
      )
    )?.[1];
  }
}

describe("Dependabot maintenance policy", () => {
  test.each(["github-actions", "bundler", "npm"])(
    "checks %s dependencies every Monday morning",
    (packageEcosystem) => {
      const dependabot = new DependabotPolicyDriver();
      const policy = dependabot.updatePolicy(packageEcosystem);

      expect(policy).toContain('directory: "/"');
      expect(policy).toContain('interval: "weekly"');
      expect(policy).toContain('day: "monday"');
      expect(policy).toContain('time: "06:00"');
      expect(policy).toContain('timezone: "Europe/London"');
    }
  );

  test.each(["github-actions", "bundler", "npm"])(
    "groups routine %s updates while keeping major upgrades separate",
    (packageEcosystem) => {
      const dependabot = new DependabotPolicyDriver();
      const policy = dependabot.updatePolicy(packageEcosystem);

      expect(policy).toContain("routine-updates:");
      expect(policy).toContain('patterns: ["*"]');
      expect(policy).toContain('update-types: ["minor", "patch"]');
      expect(policy).not.toContain('update-types: ["major"');
    }
  );
});
