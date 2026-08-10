"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

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

class ServerLauncherDriver {
  constructor() {
    this.repositoryRoot = path.join(__dirname, "..");
    this.launcherPath = path.join(
      this.repositoryRoot,
      "scripts",
      "start-server.sh"
    );
    this.readmePath = path.join(this.repositoryRoot, "README.md");
  }

  startWithoutInstalledDependencies() {
    const sandbox = fs.mkdtempSync(
      path.join(os.tmpdir(), "in-season-server-launcher-")
    );
    const commandLog = path.join(sandbox, "commands.log");

    this.writeExecutable(
      sandbox,
      "bundle",
      `printf 'bundle %s\\n' "$*" >> "$SERVER_LAUNCHER_LOG"
if [[ "$1" == "check" ]]; then
  exit 1
fi
if [[ "$1" == "exec" ]]; then
  /bin/sleep 0.1
fi`
    );
    this.writeExecutable(sandbox, "curl", "exit 0");
    this.writeExecutable(
      sandbox,
      "open",
      `printf 'open %s\\n' "$*" >> "$SERVER_LAUNCHER_LOG"`
    );

    const result = spawnSync(this.launcherPath, [], {
      cwd: this.repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${sandbox}:${process.env.PATH}`,
        SERVER_LAUNCHER_LOG: commandLog,
      },
      timeout: 5000,
    });
    const commands = fs.existsSync(commandLog)
      ? fs.readFileSync(commandLog, "utf8").trim().split("\n")
      : [];

    fs.rmSync(sandbox, { recursive: true, force: true });

    return { ...result, commands };
  }

  documentation() {
    return fs.readFileSync(this.readmePath, "utf8");
  }

  writeExecutable(directory, name, body) {
    const commandPath = path.join(directory, name);
    fs.writeFileSync(commandPath, `#!/usr/bin/env bash\n${body}\n`, {
      mode: 0o755,
    });
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

  test("starts the preview and opens it after installing missing dependencies", () => {
    const launcher = new ServerLauncherDriver();
    const result = launcher.startWithoutInstalledDependencies();

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.commands).toEqual([
      "bundle check",
      "bundle install",
      "bundle exec trmnlp serve",
      "open http://localhost:4567",
    ]);
    expect(launcher.documentation()).toContain("scripts/start-server.sh");
  });
});
