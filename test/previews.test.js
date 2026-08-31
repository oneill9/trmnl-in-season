"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

class DevicePreviewDriver {
  constructor() {
    this.repositoryRoot = path.join(__dirname, "..");
    this.outDir = fs.mkdtempSync(path.join(os.tmpdir(), "in-season-previews-"));
    this.candidatePath = path.join(
      this.repositoryRoot,
      "_build",
      "qr",
      "qr-v5l-rotation-0.png"
    );
  }

  cleanup() {
    fs.rmSync(this.outDir, { recursive: true, force: true });
  }

  generateWithCandidate() {
    return spawnSync(
      process.execPath,
      [
        "scripts/generate-previews.js",
        "--out",
        this.outDir,
        "--qr",
        this.candidatePath,
      ],
      {
        cwd: this.repositoryRoot,
        encoding: "utf8",
      }
    );
  }

  fullLandscape() {
    return fs.readFileSync(path.join(this.outDir, "full-og-landscape.html"), "utf8");
  }

  candidateDataUri() {
    return `data:image/png;base64,${fs.readFileSync(this.candidatePath).toString("base64")}`;
  }

  sourceTemplate() {
    return fs.readFileSync(path.join(this.repositoryRoot, "src", "full.liquid"), "utf8");
  }
}

describe("device preview generator", () => {
  test("can preview a generated QR without changing the source template", () => {
    const previews = new DevicePreviewDriver();
    const sourceBefore = previews.sourceTemplate();

    try {
      const result = previews.generateWithCandidate();

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(previews.fullLandscape()).toContain(previews.candidateDataUri());
      expect(previews.sourceTemplate()).toBe(sourceBefore);
    } finally {
      previews.cleanup();
    }
  });
});
