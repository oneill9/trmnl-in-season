"use strict";

const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PNG } = require("pngjs");
const jsQR = require("jsqr");
const {
  BinaryBitmap,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} = require("@zxing/library");
const { QrCode, Ecc } = require("../scripts/vendor/qrcodegen.js");

const generateQr = require("../scripts/generate-qr.js");

const SOURCES_URL = "https://oneill9.github.io/trmnl-in-season/";
const QART_PAYLOAD = /^https:\/\/oneill9\.github\.io\/trmnl-in-season\/#\d+$/;
const ROTATIONS = [0, 90, 180, 270];

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function luminance(png) {
  const gray = new Uint8ClampedArray(png.width * png.height);

  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = Math.round(
      0.299 * png.data[i * 4] +
        0.587 * png.data[i * 4 + 1] +
        0.114 * png.data[i * 4 + 2]
    );
  }

  return gray;
}

function toRgba(gray) {
  const rgba = new Uint8ClampedArray(gray.length * 4);

  for (let i = 0; i < gray.length; i += 1) {
    rgba[i * 4] = gray[i];
    rgba[i * 4 + 1] = gray[i];
    rgba[i * 4 + 2] = gray[i];
    rgba[i * 4 + 3] = 255;
  }

  return rgba;
}

function rotateClockwise(png) {
  const rotated = new PNG({ width: png.height, height: png.width });

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const source = (y * png.width + x) * 4;
      const targetX = png.height - 1 - y;
      const targetY = x;
      const target = (targetY * rotated.width + targetX) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        rotated.data[target + channel] = png.data[source + channel];
      }
    }
  }

  return rotated;
}

function cameraRender(png) {
  const source = luminance(png);
  const softened = new Uint8ClampedArray(source.length);

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      let sum = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        const sampleY = y + dy;
        if (sampleY < 0 || sampleY >= png.height) continue;

        for (let dx = -1; dx <= 1; dx += 1) {
          const sampleX = x + dx;
          if (sampleX < 0 || sampleX >= png.width) continue;
          const distance = Math.abs(dx) + Math.abs(dy);
          if (distance > 1) continue;
          const weight = distance === 0 ? 4 : 1;

          sum += source[sampleY * png.width + sampleX] * weight;
          count += weight;
        }
      }

      const blurred = sum / count;
      softened[y * png.width + x] = Math.round(40 + (blurred / 255) * 175);
    }
  }

  const rendered = new PNG({ width: png.width, height: png.height });
  rendered.data.set(toRgba(softened));
  return rendered;
}

function decodeWithJsQr(png) {
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

function decodeWithZxing(png) {
  const source = new RGBLuminanceSource(luminance(png), png.width, png.height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));

  try {
    return new QRCodeReader().decode(bitmap).getText();
  } catch {
    return null;
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

class QArtCandidateDriver {
  constructor(outDir, entry) {
    this.entry = entry;
    this.png = readPng(path.join(outDir, entry.file));
  }

  payloads(png = this.png) {
    return {
      jsQr: decodeWithJsQr(png),
      zxing: decodeWithZxing(png),
    };
  }

  cameraPayloads() {
    return this.payloads(rotateClockwise(cameraRender(this.png)));
  }
}

class QArtGeneratorDriver {
  constructor({ freshProcess = false } = {}) {
    this.outDir = fs.mkdtempSync(path.join(os.tmpdir(), "trmnl-qart-"));
    if (freshProcess) {
      execFileSync(
        process.execPath,
        [
          "-e",
          "require('./scripts/generate-qr.js').generate({ outDir: process.argv[1] });",
          this.outDir,
        ],
        { cwd: path.join(__dirname, "..") }
      );
      this.manifest = JSON.parse(
        fs.readFileSync(path.join(this.outDir, "manifest.json"), "utf8")
      );
    } else {
      this.manifest = generateQr.generate({ outDir: this.outDir });
    }
  }

  cleanup() {
    fs.rmSync(this.outDir, { recursive: true, force: true });
  }

  candidates() {
    return this.manifest.candidates.map(
      (entry) => new QArtCandidateDriver(this.outDir, entry)
    );
  }

  solveV5Low({ mask = 0 } = {}) {
    const solved = generateQr.solveQArt(5, Ecc.LOW, mask, () => 0.5);
    const qr = new QrCode(5, Ecc.LOW, solved.data, mask);

    return {
      claimedTargetMismatches() {
        return solved.claims.filter(
          (claim) => !claim.hardZero && qr.modules[claim.y][claim.x] !== claim.targetDark
        );
      },
    };
  }
}

describe("QArt sources QR generator", () => {
  let generator;

  beforeAll(() => {
    generator = new QArtGeneratorDriver();
  });

  afterAll(() => {
    generator.cleanup();
  });

  test("every claimed coordinate renders the requested target module", () => {
    expect(generator.solveV5Low().claimedTargetMismatches()).toHaveLength(0);
  });

  test("emits one deterministic V5-L review candidate per rotation", () => {
    expect(generator.manifest.generatedAt).toBeUndefined();
    expect(generator.manifest.candidates).toHaveLength(ROTATIONS.length);
    expect(generator.manifest.candidates.map((entry) => entry.rotation)).toEqual(ROTATIONS);

    for (const entry of generator.manifest.candidates) {
      expect(entry).toMatchObject({
        kind: "qart",
        version: 5,
        ecl: "L",
        scale: 2,
        modules: 37,
        width: 90,
        height: 90,
      });
      expect(entry.similarity).toBeGreaterThanOrEqual(0.6);
      expect(entry.placement.targetWidth / entry.placement.targetHeight).toBeCloseTo(0.8, 1);
      expect(fs.existsSync(path.join(generator.outDir, entry.file))).toBe(true);
    }
  });

  test("every candidate decodes with two independent readers", () => {
    for (const candidate of generator.candidates()) {
      for (const payload of Object.values(candidate.payloads())) {
        expect(payload).toMatch(QART_PAYLOAD);
      }
    }
  });

  test("every candidate survives deterministic blur, contrast loss, and rotation", () => {
    for (const candidate of generator.candidates()) {
      for (const [decoder, payload] of Object.entries(candidate.cameraPayloads())) {
        if (!QART_PAYLOAD.test(payload ?? "")) {
          throw new Error(`${candidate.entry.file} did not survive with ${decoder}`);
        }
      }
    }
  });

  test("repeated generation produces byte-identical candidates and manifest", () => {
    const repeated = new QArtGeneratorDriver({ freshProcess: true });

    try {
      expect(repeated.manifest).toEqual(generator.manifest);

      for (const entry of generator.manifest.candidates) {
        expect(sha256(path.join(repeated.outDir, entry.file))).toBe(
          sha256(path.join(generator.outDir, entry.file))
        );
      }
    } finally {
      repeated.cleanup();
    }
  });

  test("payloads retain the exact sources URL before their numeric canvas", () => {
    for (const candidate of generator.candidates()) {
      for (const payload of Object.values(candidate.payloads())) {
        expect(payload.startsWith(`${SOURCES_URL}#`)).toBe(true);
      }
    }
  });

  test("replaces stale generator artifacts with the current candidate set", () => {
    fs.writeFileSync(path.join(generator.outDir, "qr-v7h-scatter-3px.png"), "stale");
    fs.writeFileSync(path.join(generator.outDir, "index.html"), "stale");

    const manifest = generateQr.generate({ outDir: generator.outDir });
    const expectedFiles = [
      "manifest.json",
      ...manifest.candidates.map((candidate) => candidate.file),
    ].sort();

    expect(fs.readdirSync(generator.outDir).sort()).toEqual(expectedFiles);
  });
});
