"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { generate: generateQrCandidates } = require("../scripts/generate-qr");
const { main: generatePreviews } = require("../scripts/generate-previews");

class DevicePreviewDriver {
  constructor() {
    this.repositoryRoot = path.join(__dirname, "..");
    this.outDir = fs.mkdtempSync(path.join(os.tmpdir(), "in-season-previews-"));
    this.qrDir = path.join(this.outDir, "qr");
    this.candidatePath = path.join(this.qrDir, "qr-v5l-rotation-0.png");
  }

  cleanup() {
    fs.rmSync(this.outDir, { recursive: true, force: true });
  }

  generateCandidate() {
    generateQrCandidates({ outDir: this.qrDir });
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
  test.each(["full", "half_horizontal", "half_vertical", "quadrant"])(
    "%s shows season markers beside produce with an explanatory legend",
    (layout) => {
      const previews = new DevicePreviewDriver();
      jest.useFakeTimers().setSystemTime(new Date("2026-08-15T12:00:00.000Z"));

      try {
        generatePreviews({ outDir: previews.outDir });
        const page = fs.readFileSync(
          path.join(previews.outDir, `${layout}-og-landscape.html`),
          "utf8"
        );

        expect(page).toContain('Apples<span class="ins-season-marker" aria-label="Starting this month">↑</span>');
        expect(page).toContain('Cherries<span class="ins-season-marker" aria-label="Finishing this month">↓</span>');
        expect(page).not.toMatch(/Cabbage<span class="ins-season-marker"/);
        expect(page).toContain('class="ins-season-legend">↑ Starting · ↓ Finishing this month');
        if (layout === "full") {
          const sourcesLabel = page.match(
            /<span class="ins-footer__label[^"]*">([\s\S]*?)<\/span>/
          )?.[1];

          expect(sourcesLabel).toBe("Sources and methodology");
        }
      } finally {
        jest.useRealTimers();
        previews.cleanup();
      }
    }
  );

  test("omits the legend and markers when no harvest windows change", () => {
    const previews = new DevicePreviewDriver();
    jest.useFakeTimers().setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

    try {
      generatePreviews({ outDir: previews.outDir });
      const page = previews.fullLandscape();

      expect(page).not.toContain('class="ins-season-marker"');
      expect(page).not.toContain('class="ins-season-legend"');
    } finally {
      jest.useRealTimers();
      previews.cleanup();
    }
  });

  test("can preview a generated QR without changing the source template", () => {
    const previews = new DevicePreviewDriver();
    const sourceBefore = previews.sourceTemplate();

    try {
      previews.generateCandidate();
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
