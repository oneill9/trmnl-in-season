/*
 * QArt sources QR generator.
 *
 * Implements the QArt technique from https://research.swtch.com/qart:
 * a hollow In Season aubergine outline is engineered into the QR payload.
 * The code encodes https://oneill9.github.io/trmnl-in-season/#<digits>
 * (the numeric fragment is silently ignored by browsers) and the digits'
 * bits are the degrees of freedom the picture is drawn with. A
 * Reed-Solomon basis (valid blocks are closed under XOR) plus
 * Gauss-Jordan elimination pins the dark contour and its light outer
 * clearance while the code stays a valid, uncorrupted QR symbol.
 *
 * The claim loop, BitBlock Gauss-Jordan structure, constraint ordering,
 * and invalid-group (>= 1000) hard-zero retry follow Russ Cox's reference
 * implementation (rsc.io/qr/qart). QR encoding, masking, penalties, and
 * module topology come from the vendored Nayuki encoder (scripts/vendor/).
 *
 * Usage:
 *   node scripts/generate-qr.js                     write candidates to _build/qr
 *   node scripts/generate-qr.js --inline <file>     inline a candidate into full.liquid
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const jsQR = require("jsqr");
const {
  QrCode,
  Ecc,
  appendBits,
  ECC_CODEWORDS_PER_BLOCK,
  NUM_ERROR_CORRECTION_BLOCKS,
} = require("./vendor/qrcodegen.js");

const ROOT = path.join(__dirname, "..");
const QR_DIR = path.join(ROOT, "_build", "qr");
const FULL_LIQUID = path.join(ROOT, "src", "full.liquid");
const ICON_PATH = path.join(ROOT, "src", "assets", "in-season-qr.png");
const SOURCES_URL = "https://oneill9.github.io/trmnl-in-season/";
const QUIET_MODULES = 4;
const VERSION = 5;
const ECL = Ecc.LOW;
const SCALE = 2;
const ROTATIONS = [0, 180];
const TARGET_NEUTRAL = 0;
const TARGET_DARK = 1;
const TARGET_LIGHT = 2;
const OUTLINE_THICKNESS = 2;
const CLEARANCE_THICKNESS = 1;

/* ---------- deterministic PRNG ---------- */

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- three-state outline target ---------- */

let iconMask = null;

function loadIconMask() {
  if (iconMask) return iconMask;
  const png = PNG.sync.read(fs.readFileSync(ICON_PATH));
  let x0 = png.width;
  let y0 = png.height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] <= 15) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) throw new Error("icon has no visible content");

  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = png.data[((y0 + y) * png.width + x0 + x) * 4 + 3];
    }
  }

  iconMask = { width, height, alpha };
  return iconMask;
}

function resampleSilhouette(width, height) {
  const source = loadIconMask();
  const sampled = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor((y * source.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * source.height) / height));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor((x * source.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * source.width) / width));
      let alpha = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          alpha += source.alpha[sy * source.width + sx];
          count += 1;
        }
      }
      sampled[y * width + x] = alpha / count >= 64 ? 1 : 0;
    }
  }

  return sampled;
}

function erodeMask(mask, width, height, iterations) {
  let current = mask.slice();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const eroded = new Uint8Array(mask.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!current[y * width + x]) continue;
        let survives = true;
        for (let dy = -1; dy <= 1 && survives; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height || !current[ny * width + nx]) {
              survives = false;
              break;
            }
          }
        }
        if (survives) eroded[y * width + x] = 1;
      }
    }
    current = eroded;
  }
  return current;
}

function dilateMask(mask, width, height, iterations) {
  let current = mask.slice();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const dilated = current.slice();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!current[y * width + x]) continue;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              dilated[ny * width + nx] = 1;
            }
          }
        }
      }
    }
    current = dilated;
  }
  return current;
}

function buildLocalVisual(bodyHeight) {
  const source = loadIconMask();
  const bodyWidth = Math.max(1, Math.round((bodyHeight * source.width) / source.height));
  const width = bodyWidth + 2 * CLEARANCE_THICKNESS;
  const height = bodyHeight + 2 * CLEARANCE_THICKNESS;
  const body = new Uint8Array(width * height);
  const sampled = resampleSilhouette(bodyWidth, bodyHeight);
  for (let y = 0; y < bodyHeight; y += 1) {
    for (let x = 0; x < bodyWidth; x += 1) {
      body[(y + CLEARANCE_THICKNESS) * width + x + CLEARANCE_THICKNESS] =
        sampled[y * bodyWidth + x];
    }
  }

  const interior = erodeMask(body, width, height, OUTLINE_THICKNESS);
  const outline = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i += 1) outline[i] = body[i] && !interior[i] ? 1 : 0;
  const dilated = dilateMask(outline, width, height, CLEARANCE_THICKNESS);
  const states = new Uint8Array(body.length);
  let interiorModules = 0;
  for (let i = 0; i < states.length; i += 1) {
    if (outline[i]) states[i] = TARGET_DARK;
    else if (dilated[i] && !body[i]) states[i] = TARGET_LIGHT;
    if (interior[i]) interiorModules += 1;
  }

  return { states, width, height, bodyWidth, bodyHeight, interiorModules };
}

function rotateGrid(values, size, rotation) {
  if (rotation === 0) return values.slice();
  const rotated = new values.constructor(values.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let targetX;
      let targetY;
      if (rotation === 90) {
        targetX = size - 1 - y;
        targetY = x;
      } else if (rotation === 180) {
        targetX = size - 1 - x;
        targetY = size - 1 - y;
      } else {
        targetX = y;
        targetY = size - 1 - x;
      }
      rotated[targetY * size + targetX] = values[y * size + x];
    }
  }
  return rotated;
}

function matrixAtOutput(matrix, size, x, y, rotation) {
  if (rotation === 90) return matrix[size - 1 - x][y];
  if (rotation === 180) return matrix[size - 1 - y][size - 1 - x];
  if (rotation === 270) return matrix[x][size - 1 - y];
  return matrix[y][x];
}

function flatAtOutput(values, size, x, y, rotation) {
  if (rotation === 90) return values[(size - 1 - x) * size + y];
  if (rotation === 180) return values[(size - 1 - y) * size + size - 1 - x];
  if (rotation === 270) return values[x * size + size - 1 - y];
  return values[y * size + x];
}

function adjustableGrid(maps, version, ecl) {
  const adjustable = new Uint8Array(maps.gridPos.length ? (version * 4 + 17) ** 2 : 0);
  const { bbit, mbit } = digitBudget(version, ecl);

  for (let g = bbit; g < mbit; g += 1) {
    const byte = g >> 3;
    for (let block = 0; block < maps.geom.numBlocks; block += 1) {
      if (
        byte < maps.geom.chunkStart[block] ||
        byte >= maps.geom.chunkStart[block] + maps.geom.dataLen[block]
      ) {
        continue;
      }
      const bit = (byte - maps.geom.chunkStart[block]) * 8 + (g & 7);
      const sequence = maps.dataSeq[block][bit];
      if (sequence >= 0) {
        const { x, y } = maps.gridPos[sequence];
        adjustable[y * (version * 4 + 17) + x] = 1;
      }
      break;
    }
  }
  for (const block of maps.ecSeq) {
    for (const sequence of block) {
      if (sequence < 0) continue;
      const { x, y } = maps.gridPos[sequence];
      adjustable[y * (version * 4 + 17) + x] = 1;
    }
  }

  return adjustable;
}

function visualRows(states, size) {
  const marks = ["-", "#", "."];
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    let row = "";
    for (let x = 0; x < size; x += 1) row += marks[states[y * size + x]];
    rows.push(row);
  }
  return rows;
}

function placeVisualTargets(version, ecl, rotation, maps, keep) {
  const size = version * 4 + 17;
  const renderRotation = (360 - rotation) % 360;
  const adjustable = adjustableGrid(maps, version, ecl);
  const layouts = [];

  for (let bodyHeight = 27; bodyHeight >= 12; bodyHeight -= 1) {
    const local = buildLocalVisual(bodyHeight);
    if (local.interiorModules < 8) continue;
    const placements = [];
    for (let dy = 0; dy + local.height <= size; dy += 1) {
      for (let dx = 0; dx + local.width <= size; dx += 1) {
        const states = new Uint8Array(size * size);
        let x0 = size;
        let y0 = size;
        let x1 = -1;
        let y1 = -1;
        let functionOverlap = false;
        let adjustableScore = 0;
        let targetWeight = 0;

        for (let y = 0; y < local.height; y += 1) {
          for (let x = 0; x < local.width; x += 1) {
            const state = local.states[y * local.width + x];
            if (state === TARGET_NEUTRAL) continue;
            const targetX = dx + x;
            const targetY = dy + y;
            states[targetY * size + targetX] = state;
            if (state === TARGET_DARK) {
              x0 = Math.min(x0, targetX);
              y0 = Math.min(y0, targetY);
              x1 = Math.max(x1, targetX);
              y1 = Math.max(y1, targetY);
            }
            if (matrixAtOutput(maps.isFunction, size, targetX, targetY, renderRotation)) {
              functionOverlap = true;
            }
            const weight = state === TARGET_DARK ? 2 : 1;
            targetWeight += weight;
            if (flatAtOutput(adjustable, size, targetX, targetY, renderRotation)) {
              adjustableScore += weight;
            }
          }
        }
        if (functionOverlap || x1 < 0) continue;

        const center = (size - 1) / 2;
        const centerX = Math.abs((x0 + x1) / 2 - center);
        const centerY = Math.abs((y0 + y1) / 2 - center);
        const padding = Math.min(x0, y0, size - 1 - x1, size - 1 - y1);
        if (padding < 1 || centerX > 1 || centerY > 1) continue;

        placements.push({
          finalStates: states,
          score: adjustableScore / targetWeight,
          centerOffset: centerX + centerY,
          placement: {
            dx,
            dy,
            targetWidth: local.bodyWidth,
            targetHeight: local.bodyHeight,
            outlineBounds: { x0, y0, x1, y1 },
          },
        });
      }
    }
    placements.sort((a, b) => b.score - a.score || a.centerOffset - b.centerOffset);
    if (placements.length > 0) layouts.push(placements[0]);
  }

  return layouts.slice(0, keep).map((layout) => ({
    size,
    states: rotateGrid(layout.finalStates, size, rotation),
    finalStates: layout.finalStates,
    placement: layout.placement,
  }));
}

/* ---------- message bit layout ---------- */

const URL_FRAGMENT = `${SOURCES_URL}#`;

function digitBudget(version, ecl) {
  const capacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
  const bbit = 4 + 8 + URL_FRAGMENT.length * 8 + 14;
  const groups = Math.floor((capacityBits - bbit - 4) / 10);
  return { capacityBits, bbit, groups, mbit: bbit + groups * 10 };
}

function buildMessage(version, ecl, groups) {
  const { capacityBits } = digitBudget(version, ecl);
  const bits = [];
  const push = (value, len) => {
    appendBits(value, len, bits);
  };

  push(4, 4); // byte mode
  push(URL_FRAGMENT.length, 8);
  for (const byte of Buffer.from(URL_FRAGMENT, "utf8")) push(byte, 8);
  push(1, 4); // numeric mode
  push(groups * 3, 10);
  for (let g = 0; g < groups * 10; g += 1) bits.push(0);

  const term = Math.min(4, capacityBits - bits.length);
  push(0, term);
  push(0, (8 - (bits.length % 8)) % 8);
  for (let padByte = 0xec; bits.length < capacityBits; padByte ^= 0xec ^ 0x11)
    push(padByte, 8);

  if (bits.length !== capacityBits) throw new Error("digit budget mismatch");
  return { bits };
}

function packCodewords(bits) {
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte |= bits[i + j] << (7 - j);
    data.push(byte);
  }
  return data;
}

/* ---------- block geometry and provenance ---------- */

function blockGeometry(version, ecl) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][version];
  const rawBytes = Math.floor(QrCode.getNumRawDataModules(version) / 8);
  const numShort = numBlocks - (rawBytes % numBlocks);
  const shortBlockLen = Math.floor(rawBytes / numBlocks);
  const dataLenBase = shortBlockLen - eccLen;

  const chunkStart = [];
  const dataLen = [];
  let cursor = 0;
  for (let j = 0; j < numBlocks; j += 1) {
    const len = dataLenBase + (j < numShort ? 0 : 1);
    chunkStart.push(cursor);
    dataLen.push(len);
    cursor += len;
  }

  const blockLen = dataLenBase + 1 + eccLen;
  const seqToBlockByte = [];
  for (let i = 0; i < blockLen; i += 1) {
    for (let j = 0; j < numBlocks; j += 1) {
      if (i === dataLenBase && j < numShort) continue; // pad slot
      seqToBlockByte.push({ block: j, indexInBlock: i });
    }
  }
  if (seqToBlockByte.length !== rawBytes) throw new Error("interleave math");

  return {
    numBlocks,
    eccLen,
    rawBytes,
    numShort,
    dataLenBase,
    chunkStart,
    dataLen,
    seqToBlockByte,
  };
}

function codewordBitPositions(version, ecl) {
  const size = version * 4 + 17;
  const dataLen = QrCode.getNumDataCodewords(version, ecl);
  const zero = new QrCode(version, ecl, new Array(dataLen).fill(0), 0);
  const positions = [];

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!zero.isFunction[y][x]) positions.push({ x, y });
      }
    }
  }

  return { size, positions, isFunction: zero.isFunction };
}

function buildMaps(version, ecl) {
  const geom = blockGeometry(version, ecl);
  const { positions, isFunction } = codewordBitPositions(version, ecl);
  const gridPos = positions.slice(0, geom.rawBytes * 8);

  const dataSeq = [];
  const ecSeq = [];
  for (let j = 0; j < geom.numBlocks; j += 1) {
    dataSeq.push(new Array(geom.dataLen[j] * 8).fill(-1));
    ecSeq.push(new Array(geom.eccLen * 8).fill(-1));
  }
  for (let s = 0; s < gridPos.length; s += 1) {
    const { block, indexInBlock } = geom.seqToBlockByte[s >> 3];
    const bit = s & 7;
    if (indexInBlock < geom.dataLen[block]) {
      dataSeq[block][indexInBlock * 8 + bit] = s;
    } else {
      ecSeq[block][(indexInBlock - geom.dataLenBase - 1) * 8 + bit] = s;
    }
  }

  return { geom, gridPos, dataSeq, ecSeq, isFunction };
}

function maskBit(mask, x, y) {
  let invert;
  switch (mask) {
    case 0:
      invert = (x + y) % 2 === 0;
      break;
    case 1:
      invert = y % 2 === 0;
      break;
    case 2:
      invert = x % 3 === 0;
      break;
    case 3:
      invert = (x + y) % 3 === 0;
      break;
    case 4:
      invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      break;
    case 5:
      invert = (x * y) % 2 + ((x * y) % 3) === 0;
      break;
    case 6:
      invert = ((x * y) % 2 + ((x * y) % 3)) % 2 === 0;
      break;
    case 7:
      invert = ((x + y) % 2 + ((x * y) % 3)) % 2 === 0;
      break;
    default:
      throw new RangeError("Mask value out of range");
  }
  return invert ? 1 : 0;
}

/* ---------- BitBlock: Gauss-Jordan basis over GF(2) (rsc port) ---------- */

class BitBlock {
  constructor(nd, nc, rsDiv, bdata) {
    this.nd = nd;
    this.nc = nc;
    this.rsDiv = rsDiv;
    this.B = new Uint8Array(nd + nc);
    this.B.set(bdata, 0);
    this.B.set(QrCode.reedSolomonComputeRemainder(this.B.subarray(0, nd), rsDiv), nd);
    this.saved = [];
    this.M = [];
    for (let i = 0; i < nd * 8; i += 1) {
      const row = new Uint8Array(nd + nc);
      row[i >> 3] = 1 << (7 - (i & 7));
      row.set(QrCode.reedSolomonComputeRemainder(row.subarray(0, nd), rsDiv), nd);
      this.M.push(row);
    }
  }

  check() {
    const ecc = QrCode.reedSolomonComputeRemainder(
      this.B.subarray(0, this.nd),
      this.rsDiv
    );
    for (let i = 0; i < this.nc; i += 1) {
      if (ecc[i] !== this.B[this.nd + i]) throw new Error("codeword invalid");
    }
  }

  canSet(bi, bval) {
    const byte = bi >> 3;
    const mask = 1 << (7 - (bi & 7));
    let found = false;

    for (let j = 0; j < this.M.length; j += 1) {
      if ((this.M[j][byte] & mask) === 0) continue;
      if (!found) {
        found = true;
        if (j !== 0) {
          const swap = this.M[0];
          this.M[0] = this.M[j];
          this.M[j] = swap;
        }
        continue;
      }
      const row = this.M[j];
      for (let k = 0; k < row.length; k += 1) row[k] ^= this.M[0][k];
    }
    if (!found) return false;

    const targ = this.M[0];
    for (const row of this.saved) {
      if ((row[byte] & mask) !== 0) {
        for (let k = 0; k < row.length; k += 1) row[k] ^= targ[k];
      }
    }
    if (((this.B[byte] & mask) !== 0) !== (bval !== 0)) {
      for (let k = 0; k < targ.length; k += 1) this.B[k] ^= targ[k];
    }
    this.saved.push(targ);
    this.M.shift();
    return true;
  }

  reset(bi, bval) {
    const byte = bi >> 3;
    const mask = 1 << (7 - (bi & 7));
    if (((this.B[byte] & mask) !== 0) === (bval !== 0)) return;
    for (const row of this.saved) {
      if ((row[byte] & mask) !== 0) {
        for (let k = 0; k < row.length; k += 1) this.B[k] ^= row[k];
        return;
      }
    }
    throw new Error("reset of unset bit");
  }

  copyOut() {
    this.check();
    return {
      data: Array.from(this.B.subarray(0, this.nd)),
      ec: Array.from(this.B.subarray(this.nd)),
    };
  }
}

/* ---------- QArt solve for one (variant, style, mask) ---------- */

function prepareLayouts(version, ecl, rotation = 0, keep = 1) {
  const maps = buildMaps(version, ecl);
  return placeVisualTargets(version, ecl, rotation, maps, keep);
}

function solveQArt(version, ecl, mask, rng, rotation = 0, layout = null) {
  const maps = buildMaps(version, ecl);
  const { geom, gridPos, dataSeq, ecSeq } = maps;
  const size = version * 4 + 17;
  if (!layout) layout = prepareLayouts(version, ecl, rotation)[0];
  if (!layout) throw new Error("no safe outline placement");
  const states = layout.states;
  const { bbit, groups, mbit } = digitBudget(version, ecl);
  const rsDiv = QrCode.reedSolomonComputeDivisor(geom.eccLen);

  // Digit bits by message byte, mapped to their owning block.
  const digitBitsByBlock = [];
  for (let j = 0; j < geom.numBlocks; j += 1) digitBitsByBlock.push([]);
  for (let g = bbit; g < mbit; g += 1) {
    const byte = g >> 3;
    for (let j = 0; j < geom.numBlocks; j += 1) {
      if (byte >= geom.chunkStart[j] && byte < geom.chunkStart[j] + geom.dataLen[j]) {
        const bi = (byte - geom.chunkStart[j]) * 8 + (g & 7);
        digitBitsByBlock[j].push({ g, bi });
        break;
      }
    }
  }

  // The contour is claimed first, then its light clearance. Neutral modules
  // receive deterministic filler values only after the visual target.
  const candidatesByBlock = [];
  for (let j = 0; j < geom.numBlocks; j += 1) {
    const list = [];
    for (const { bi } of digitBitsByBlock[j]) {
      const s = dataSeq[j][bi];
      if (s < 0) continue;
      const { x, y } = gridPos[s];
      list.push({
        block: j,
        bi,
        isEc: false,
        x,
        y,
        state: states[y * size + x],
        hardZero: false,
      });
    }
    for (let e = 0; e < geom.eccLen * 8; e += 1) {
      const s = ecSeq[j][e];
      if (s < 0) continue;
      const { x, y } = gridPos[s];
      list.push({
        block: j,
        e,
        isEc: true,
        x,
        y,
        state: states[y * size + x],
        hardZero: false,
      });
    }
    candidatesByBlock.push(list);
  }

  const baseMessage = packCodewords(buildMessage(version, ecl, groups).bits);
  let message = null;
  let claimed = [];
  let blocks = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    message = baseMessage.slice();
    claimed = [];
    blocks = [];

    for (let j = 0; j < geom.numBlocks; j += 1) {
      const nd = geom.dataLen[j];
      const list = candidatesByBlock[j];

      for (const candidate of list) {
        const tier =
          candidate.state === TARGET_DARK ? 3 : candidate.state === TARGET_LIGHT ? 2 : 1;
        candidate.targetDark =
          candidate.state === TARGET_DARK ||
          (candidate.state === TARGET_NEUTRAL && rng() < 0.5);
        candidate.priority = tier * 1e12 + Math.floor(rng() * 65536);
      }
      list.sort((a, b) => b.priority - a.priority);

      const chunk = message.slice(geom.chunkStart[j], geom.chunkStart[j] + nd);
      const bb = new BitBlock(nd, geom.eccLen, rsDiv, chunk);
      const doff = geom.chunkStart[j] * 8;
      const lo = Math.max(0, Math.min(nd * 8, bbit - doff));
      const hi = Math.max(lo, Math.min(nd * 8, mbit - doff));

      for (let bi = 0; bi < lo; bi += 1) {
        const bval = (chunk[bi >> 3] >> (7 - (bi & 7))) & 1;
        if (!bb.canSet(bi, bval)) throw new Error("cannot preserve required bits");
      }
      for (let bi = hi; bi < nd * 8; bi += 1) {
        const bval = (chunk[bi >> 3] >> (7 - (bi & 7))) & 1;
        if (!bb.canSet(bi, bval)) throw new Error("cannot preserve required bits");
      }

      for (const candidate of list) {
        const bi = candidate.isEc ? nd * 8 + candidate.e : candidate.bi;
        let bval = candidate.targetDark ? 1 : 0;
        bval ^= maskBit(mask, candidate.x, candidate.y);
        if (candidate.hardZero) bval = 0;
        if (bb.canSet(bi, bval)) {
          candidate.bitIndex = bi;
          claimed.push(candidate);
        } else {
          candidate.bitIndex = null;
        }
      }

      blocks.push(bb);
    }

    let invalid = 0;
    for (let i = 0; i < groups; i += 1) {
      let value = 0;
      for (let j = 0; j < 10; j += 1) {
        const g = bbit + 10 * i + j;
        value = (value << 1) | readMessageBit(blocks, geom, g);
      }
      if (value < 1000) continue;

      const hardBit = bbit + 10 * i + 3;
      const byte = hardBit >> 3;
      for (let j = 0; j < geom.numBlocks; j += 1) {
        if (byte >= geom.chunkStart[j] && byte < geom.chunkStart[j] + geom.dataLen[j]) {
          const bi = (byte - geom.chunkStart[j]) * 8 + (hardBit & 7);
          const candidate = candidatesByBlock[j].find((c) => !c.isEc && c.bi === bi);
          if (!candidate) throw new Error("hard zero bit unclaimable");
          if (candidate.hardZero) throw new Error("hard zero retry made no progress");
          candidate.hardZero = true;
          break;
        }
      }
      invalid += 1;
    }
    if (invalid === 0) break;
    if (attempt === 39) throw new Error("digit groups never converged");
  }

  const data = [];
  for (let j = 0; j < geom.numBlocks; j += 1) {
    const out = blocks[j].copyOut();
    data.push(...out.data);
    if (out.ec.length !== geom.eccLen) throw new Error("ec length");
  }

  let digits = "";
  for (let i = 0; i < groups; i += 1) {
    let value = 0;
    for (let j = 0; j < 10; j += 1) {
      const g = bbit + 10 * i + j;
      value = (value << 1) | ((data[g >> 3] >> (7 - (g & 7))) & 1);
    }
    digits += String(Math.floor(value / 100)) + (Math.floor(value / 10) % 10) + (value % 10);
  }

  return {
    data,
    digits,
    payload: `${SOURCES_URL}#${digits}`,
    controlled: claimed.length,
    claims: claimed.map((candidate) => ({
      x: candidate.x,
      y: candidate.y,
      targetDark: candidate.targetDark,
      hardZero: candidate.hardZero,
    })),
    size,
    states,
    finalStates: layout.finalStates,
    placement: layout.placement,
  };
}

function readMessageBit(blocks, geom, g) {
  const byte = g >> 3;
  for (let j = 0; j < geom.numBlocks; j += 1) {
    if (byte >= geom.chunkStart[j] && byte < geom.chunkStart[j] + geom.dataLen[j]) {
      const bi = (byte - geom.chunkStart[j]) * 8 + (g & 7);
      return (blocks[j].B[bi >> 3] >> (7 - (bi & 7))) & 1;
    }
  }
  throw new Error("message bit out of range");
}

/* ---------- rendering ---------- */

function moduleAt(qr, x, y, rotation) {
  if (rotation === 90) return qr.modules[qr.size - 1 - x][y];
  if (rotation === 180) return qr.modules[qr.size - 1 - y][qr.size - 1 - x];
  if (rotation === 270) return qr.modules[x][qr.size - 1 - y];
  return qr.modules[y][x];
}

function renderPng(qr, scale, rotation = 0) {
  const side = (qr.size + 2 * QUIET_MODULES) * scale;
  const png = new PNG({ width: side, height: side });

  for (let i = 0; i < side * side; i += 1) {
    png.data[i * 4] = 255;
    png.data[i * 4 + 1] = 255;
    png.data[i * 4 + 2] = 255;
    png.data[i * 4 + 3] = 255;
  }
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (!moduleAt(qr, x, y, rotation)) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        const py = (y + QUIET_MODULES) * scale + dy;
        for (let dx = 0; dx < scale; dx += 1) {
          const px = (x + QUIET_MODULES) * scale + dx;
          const idx = (py * side + px) * 4;
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
        }
      }
    }
  }

  return png;
}

function validatePayload(png, expected) {
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return decoded && decoded.data === expected ? decoded.data : null;
}

/* ---------- review candidates ---------- */

function visualMetrics(qr, solved) {
  let outlineMatches = 0;
  let outlineTotal = 0;
  let clearanceMatches = 0;
  let clearanceTotal = 0;

  for (let i = 0; i < solved.states.length; i += 1) {
    const state = solved.states[i];
    if (state === TARGET_NEUTRAL) continue;
    const actualDark = qr.modules[Math.floor(i / solved.size)][i % solved.size];
    if (state === TARGET_DARK) {
      outlineTotal += 1;
      if (actualDark) outlineMatches += 1;
    } else {
      clearanceTotal += 1;
      if (!actualDark) clearanceMatches += 1;
    }
  }

  return {
    outlineMatches,
    outlineTotal,
    clearanceMatches,
    clearanceTotal,
    outlineComplete: outlineMatches === outlineTotal,
    clearanceRate: clearanceTotal === 0 ? 1 : clearanceMatches / clearanceTotal,
  };
}

const SEED_TRIES = 1;
const PLACEMENT_TRIES = 16;

function renderQArtCandidate(rotation) {
  let best = null;
  let closest = null;

  for (const layout of prepareLayouts(VERSION, ECL, rotation, PLACEMENT_TRIES)) {
    for (let mask = 0; mask < 8; mask += 1) {
      for (let seed = 0; seed < SEED_TRIES; seed += 1) {
        const rng = mulberry32(
          fnv1a(`v5l:rotation${rotation}:mask${mask}:outline:${seed}`)
        );
        let solved;
        try {
          solved = solveQArt(VERSION, ECL, mask, rng, rotation, layout);
        } catch (error) {
          continue;
        }
        const qr = new QrCode(VERSION, ECL, solved.data, mask);
        const png = renderPng(qr, SCALE, (360 - rotation) % 360);
        if (!validatePayload(png, solved.payload)) continue;
        const metrics = visualMetrics(qr, solved);
        if (!metrics.outlineComplete || metrics.clearanceRate < 0.95) {
          const misses =
            metrics.outlineTotal -
            metrics.outlineMatches +
            metrics.clearanceTotal -
            metrics.clearanceMatches;
          if (!closest || misses < closest.misses) {
            closest = { misses, metrics, placement: solved.placement, mask, seed };
          }
          continue;
        }
        const penalty = qr.getPenaltyScore();
        const targetArea = solved.placement.targetWidth * solved.placement.targetHeight;
        if (
          !best ||
          targetArea > best.targetArea ||
          (targetArea === best.targetArea && metrics.clearanceRate > best.metrics.clearanceRate) ||
          (targetArea === best.targetArea &&
            metrics.clearanceRate === best.metrics.clearanceRate &&
            penalty < best.penalty)
        ) {
          best = { qr, penalty, metrics, targetArea, solved, mask, png, seed };
        }
      }
    }
  }

  if (!best && closest) {
    console.warn(
      `qr: closest ${rotation} degree outline missed ${closest.misses} modules ` +
        `(outline ${closest.metrics.outlineMatches}/${closest.metrics.outlineTotal}, ` +
        `clearance ${closest.metrics.clearanceMatches}/${closest.metrics.clearanceTotal}, ` +
        `height ${closest.placement.targetHeight}, mask ${closest.mask}, seed ${closest.seed})`
    );
  }
  if (!best) return null;
  return best;
}

function generate({ outDir = QR_DIR } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  removeGeneratedArtifacts(outDir);
  const candidates = [];

  for (const rotation of ROTATIONS) {
    const rendered = renderQArtCandidate(rotation);
    if (!rendered) {
      console.warn(`qr: dropped V5-L candidate at ${rotation} degrees`);
      continue;
    }
    const file = `qr-v5l-rotation-${rotation}.png`;
    writePng(rendered.png, path.join(outDir, file));
    candidates.push({
      kind: "qart",
      version: VERSION,
      ecl: "L",
      scale: SCALE,
      rotation,
      file,
      modules: rendered.qr.size,
      width: rendered.png.width,
      height: rendered.png.height,
      payload: rendered.solved.payload,
      controlled: rendered.solved.controlled,
      mask: rendered.mask,
      seed: rendered.seed,
      penalty: rendered.penalty,
      similarity: Number(
        (
          (rendered.metrics.outlineMatches + rendered.metrics.clearanceMatches) /
          (rendered.metrics.outlineTotal + rendered.metrics.clearanceTotal)
        ).toFixed(6)
      ),
      placement: rendered.solved.placement,
      visual: {
        outlineThickness: OUTLINE_THICKNESS,
        clearanceThickness: CLEARANCE_THICKNESS,
        outlineModules: rendered.metrics.outlineTotal,
        clearanceModules: rendered.metrics.clearanceTotal,
        clearanceMatches: rendered.metrics.clearanceMatches,
        rows: visualRows(rendered.solved.finalStates, rendered.solved.size),
      },
    });
  }

  const manifest = { candidates };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

function removeGeneratedArtifacts(outDir) {
  for (const file of fs.readdirSync(outDir)) {
    if (file === "manifest.json" || file === "index.html" || /^qr-.*\.png$/.test(file)) {
      fs.rmSync(path.join(outDir, file), { recursive: true, force: true });
    }
  }
}

function writePng(png, filePath) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

/* ---------- inline helper ---------- */

function inlineQr(file) {
  const pngPath = path.join(QR_DIR, file);
  const base64 = fs.readFileSync(pngPath).toString("base64");
  const source = fs.readFileSync(FULL_LIQUID, "utf8");
  const pattern = /(class="ins-footer__qr"\s+src="data:image\/png;base64,)[^"]+(")/;

  if (!pattern.test(source)) throw new Error("ins-footer__qr image not found in full.liquid");
  fs.writeFileSync(FULL_LIQUID, source.replace(pattern, `$1${base64}$2`));
}

/* ---------- CLI ---------- */

if (require.main === module) {
  if (process.argv[2] === "--inline") {
    inlineQr(process.argv[3]);
    console.log(`qr: inlined ${process.argv[3]} into src/full.liquid`);
  } else {
    const manifest = generate();
    console.log(`qr: wrote ${manifest.candidates.length} candidates to ${QR_DIR}`);
  }
}

module.exports = { generate, solveQArt, ROTATIONS, QR_DIR };
