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
const ROTATIONS = [0, 180];

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

  visualRows() {
    return this.entry.visual.rows.map((row) => row.split(""));
  }

  modulesMarked(mark) {
    const modules = [];
    const rows = this.visualRows();
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        if (rows[y][x] === mark) modules.push({ x, y });
      }
    }
    return modules;
  }

  outlineBounds() {
    const outline = this.modulesMarked("#");
    return {
      x0: Math.min(...outline.map(({ x }) => x)),
      y0: Math.min(...outline.map(({ y }) => y)),
      x1: Math.max(...outline.map(({ x }) => x)),
      y1: Math.max(...outline.map(({ y }) => y)),
    };
  }

  boundaryPadding() {
    const { x0, y0, x1, y1 } = this.outlineBounds();
    return Math.min(x0, y0, this.entry.modules - 1 - x1, this.entry.modules - 1 - y1);
  }

  centerOffset() {
    const { x0, y0, x1, y1 } = this.outlineBounds();
    const center = (this.entry.modules - 1) / 2;
    return {
      x: Math.abs((x0 + x1) / 2 - center),
      y: Math.abs((y0 + y1) / 2 - center),
    };
  }

  functionModuleOverlaps() {
    const dataLength = QrCode.getNumDataCodewords(this.entry.version, Ecc.LOW);
    const qr = new QrCode(
      this.entry.version,
      Ecc.LOW,
      new Array(dataLength).fill(0),
      0
    );
    const rotation = (360 - this.entry.rotation) % 360;
    const isFunction = ({ x, y }) => {
      if (rotation === 90) return qr.isFunction[qr.size - 1 - x][y];
      if (rotation === 180) return qr.isFunction[qr.size - 1 - y][qr.size - 1 - x];
      if (rotation === 270) return qr.isFunction[x][qr.size - 1 - y];
      return qr.isFunction[y][x];
    };
    return [...this.modulesMarked("#"), ...this.modulesMarked(".")].filter(isFunction);
  }

  outlineComponents() {
    const outline = new Set(this.modulesMarked("#").map(({ x, y }) => `${x},${y}`));
    let components = 0;

    while (outline.size > 0) {
      components += 1;
      const pending = [outline.values().next().value];
      outline.delete(pending[0]);
      while (pending.length > 0) {
        const [x, y] = pending.pop().split(",").map(Number);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const neighbor = `${x + dx},${y + dy}`;
            if (!outline.delete(neighbor)) continue;
            pending.push(neighbor);
          }
        }
      }
    }

    return components;
  }

  outsideModules() {
    const rows = this.visualRows();
    const size = rows.length;
    const outside = new Set();
    const pending = [];
    const add = (x, y) => {
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      if (rows[y][x] === "#" || outside.has(key)) return;
      outside.add(key);
      pending.push({ x, y });
    };

    for (let i = 0; i < size; i += 1) {
      add(i, 0);
      add(i, size - 1);
      add(0, i);
      add(size - 1, i);
    }
    while (pending.length > 0) {
      const { x, y } = pending.pop();
      add(x - 1, y);
      add(x + 1, y);
      add(x, y - 1);
      add(x, y + 1);
    }

    return outside;
  }

  enclosedNeutralModules() {
    const outside = this.outsideModules();
    return this.modulesMarked("-").filter(({ x, y }) => !outside.has(`${x},${y}`));
  }

  minimumOutlineThickness() {
    const outside = [...this.outsideModules()].map((key) => key.split(",").map(Number));
    let minimum = Infinity;
    for (const { x, y } of this.enclosedNeutralModules()) {
      for (const [outsideX, outsideY] of outside) {
        minimum = Math.min(
          minimum,
          Math.max(Math.abs(x - outsideX), Math.abs(y - outsideY)) - 1
        );
      }
    }
    return minimum;
  }

  clearanceIsOneModuleWide() {
    const rows = this.visualRows();
    return this.modulesMarked(".").every(({ x, y }) => {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (rows[y + dy]?.[x + dx] === "#") return true;
        }
      }
      return false;
    });
  }

  renderedModuleIsDark({ x, y }) {
    const quietModules = (this.png.width / this.entry.scale - this.entry.modules) / 2;
    const pixelX = Math.round((x + quietModules + 0.5) * this.entry.scale - 0.5);
    const pixelY = Math.round((y + quietModules + 0.5) * this.entry.scale - 0.5);
    const offset = (pixelY * this.png.width + pixelX) * 4;
    return this.png.data[offset] < 128;
  }

  renderedOutlineMismatches() {
    return this.modulesMarked("#").filter((module) => !this.renderedModuleIsDark(module));
  }

  renderedClearanceRate() {
    const clearance = this.modulesMarked(".");
    const matches = clearance.filter((module) => !this.renderedModuleIsDark(module));
    return matches.length / clearance.length;
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

  test("renders a complete centred hollow outline clear of fixed QR structures", () => {
    for (const candidate of generator.candidates()) {
      expect(candidate.entry.visual).toMatchObject({
        outlineThickness: 2,
        clearanceThickness: 1,
      });
      expect(candidate.visualRows()).toHaveLength(candidate.entry.modules);
      expect(candidate.outlineComponents()).toBe(1);
      expect(candidate.enclosedNeutralModules().length).toBeGreaterThanOrEqual(8);
      expect(candidate.minimumOutlineThickness()).toBeGreaterThanOrEqual(2);
      expect(candidate.clearanceIsOneModuleWide()).toBe(true);
      expect(candidate.boundaryPadding()).toBeGreaterThanOrEqual(1);
      expect(candidate.centerOffset().x).toBeLessThanOrEqual(1);
      expect(candidate.centerOffset().y).toBeLessThanOrEqual(1);
      expect(candidate.functionModuleOverlaps()).toHaveLength(0);
      expect(candidate.renderedOutlineMismatches()).toHaveLength(0);
      expect(candidate.renderedClearanceRate()).toBeGreaterThanOrEqual(0.95);
    }
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
