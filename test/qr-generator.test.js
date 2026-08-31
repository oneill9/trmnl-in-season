"use strict";

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const jsQR = require("jsqr");

const generateQr = require("../scripts/generate-qr.js");

const SOURCES_URL = "https://oneill9.github.io/trmnl-in-season/";
const QART_PAYLOAD = /^https:\/\/oneill9\.github\.io\/trmnl-in-season\/#\d+$/;
const LADDER_VARIANTS = ["v5l", "v5m", "v6h", "v7h"];
const DITHER_STYLES = ["threshold", "floyd-steinberg", "scatter"];
const MODULE_SCALES = [2, 3];
const QR_DIR = path.join(__dirname, "..", "_build", "qr");

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(path.join(QR_DIR, file)));
}

function luminance(png) {
  const { width, height, data } = png;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    gray[i] =
      0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  return gray;
}

function binarize(gray) {
  const bits = new Uint8ClampedArray(gray.length);

  for (let i = 0; i < gray.length; i += 1) {
    bits[i] = gray[i] < 128 ? 0 : 255;
  }

  return bits;
}

function toRgba(bits) {
  const rgba = new Uint8ClampedArray(bits.length * 4);

  for (let i = 0; i < bits.length; i += 1) {
    rgba[i * 4] = bits[i];
    rgba[i * 4 + 1] = bits[i];
    rgba[i * 4 + 2] = bits[i];
    rgba[i * 4 + 3] = 255;
  }

  return rgba;
}

function decodeExact(png) {
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
}

function decodeEInk(png) {
  return jsQR(toRgba(binarize(luminance(png))), png.width, png.height);
}

describe("QArt sources QR generator", () => {
  let manifest;

  beforeAll(() => {
    manifest = generateQr.generate({ outDir: QR_DIR });
  });

  test("emits the full candidate ladder with a manifest", () => {
    expect(Array.isArray(manifest.candidates)).toBe(true);

    const qartEntries = manifest.candidates.filter((c) => c.kind === "qart");
    const plainEntries = manifest.candidates.filter((c) => c.kind === "plain");

    expect(qartEntries.length).toBe(
      LADDER_VARIANTS.length * DITHER_STYLES.length * MODULE_SCALES.length
    );
    expect(plainEntries.length).toBe(MODULE_SCALES.length);

    for (const variant of LADDER_VARIANTS) {
      for (const style of DITHER_STYLES) {
        for (const scale of MODULE_SCALES) {
          const entry = qartEntries.find(
            (c) => c.variant === variant && c.style === style && c.scale === scale
          );

          expect(entry).toBeDefined();
          expect(fs.existsSync(path.join(QR_DIR, entry.file))).toBe(true);
        }
      }
    }
  });

  test.each(LADDER_VARIANTS)(
    "%s candidates encode the sources URL with a numeric fragment",
    (variant) => {
      const entries = manifest.candidates.filter(
        (c) => c.kind === "qart" && c.variant === variant
      );

      expect(entries.length).toBe(DITHER_STYLES.length * MODULE_SCALES.length);

      for (const entry of entries) {
        const decoded = decodeExact(readPng(entry.file));

        expect(decoded).not.toBeNull();
        expect(decoded.data).toMatch(QART_PAYLOAD);
      }
    }
  );

  test("plain reference candidates encode the sources URL without a fragment", () => {
    const entries = manifest.candidates.filter((c) => c.kind === "plain");

    expect(entries.length).toBe(MODULE_SCALES.length);

    for (const entry of entries) {
      const decoded = decodeExact(readPng(entry.file));

      expect(decoded).not.toBeNull();
      expect(decoded.data).toBe(SOURCES_URL);
    }
  });

  test("every candidate decodes on a 1-bit e-ink-accurate render", () => {
    for (const entry of manifest.candidates) {
      const decoded = decodeEInk(readPng(entry.file));

      expect(decoded).not.toBeNull();
      expect(decoded.data).toEqual(expect.any(String));
    }
  });

  test("candidates render at exact module scale with a quiet zone", () => {
    for (const entry of manifest.candidates) {
      const png = readPng(entry.file);
      const expectedSide = (entry.modules + 8) * entry.scale;

      expect(png.width).toBe(expectedSide);
      expect(png.height).toBe(expectedSide);
    }
  });
});