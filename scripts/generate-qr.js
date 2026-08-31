/*
 * QArt sources QR generator.
 *
 * Implements the QArt technique from https://research.swtch.com/qart:
 * the dithered In Season icon is engineered into the QR payload itself.
 * The code encodes https://oneill9.github.io/trmnl-in-season/#<digits>
 * (the numeric fragment is silently ignored by browsers) and the digits'
 * bits are the degrees of freedom the picture is drawn with. A
 * Reed-Solomon basis (valid blocks are closed under XOR) plus
 * Gauss-Jordan elimination lets us pin chosen pixels to the dithered
 * image while the code stays a valid, uncorrupted QR symbol.
 *
 * The claim loop, BitBlock Gauss-Jordan structure, contrast ordering,
 * and invalid-group (>= 1000) hard-zero retry follow Russ Cox's reference
 * implementation (rsc.io/qr/qart). QR encoding, masking, penalties, and
 * module topology come from the vendored Nayuki encoder (scripts/vendor/).
 *
 * Usage:
 *   node scripts/generate-qr.js                     write the ladder to _build/qr
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
const ROTATIONS = [0, 90, 180, 270];

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

/* ---------- icon target ---------- */

let iconLum = null;

function loadIconLuminance() {
  if (iconLum) return iconLum;
  const png = PNG.sync.read(fs.readFileSync(ICON_PATH));
  const { width, height, data } = png;
  const lum = new Float32Array(width * height);

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const alpha = data[i * 4 + 3] / 255;
      if (alpha > 0.06) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const r = data[i * 4] * alpha + 255 * (1 - alpha);
      const g = data[i * 4 + 1] * alpha + 255 * (1 - alpha);
      const b = data[i * 4 + 2] * alpha + 255 * (1 - alpha);
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  if (x1 < 0) throw new Error("icon has no visible content");

  const pad = 4;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad);
  y1 = Math.min(height - 1, y1 + pad);
  const cropW = x1 - x0 + 1;
  const cropH = y1 - y0 + 1;
  const crop = new Float32Array(cropW * cropH);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      crop[y * cropW + x] = lum[(y0 + y) * width + (x0 + x)];
    }
  }

  iconLum = { width: cropW, height: cropH, lum: crop };
  return iconLum;
}

function rotateTarget(target, size, rotation) {
  if (rotation === 0) return target;
  const rotated = new Float32Array(target.length);

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

      rotated[targetY * size + targetX] = target[y * size + x];
    }
  }

  return rotated;
}

function resampleTarget(size, rotation = 0) {
  const { width, height, lum } = loadIconLuminance();
  const target = new Float32Array(size * size).fill(255);
  const targetWidth = Math.max(1, Math.round((size * width) / height));
  const targetHeight = size;
  const offsetX = Math.floor((size - targetWidth) / 2);

  for (let y = 0; y < targetHeight; y += 1) {
    const y0 = Math.floor((y * height) / targetHeight);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const x0 = Math.floor((x * width) / targetWidth);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / targetWidth));
      let sum = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          sum += lum[sy * width + sx];
          count += 1;
        }
      }
      target[y * size + offsetX + x] = sum / count;
    }
  }

  return {
    target: rotateTarget(target, size, rotation),
    targetWidth,
    targetHeight,
  };
}

function darkThreshold(target, size) {
  // The glyph composites well above pure-black luminance (coral on white
  // lands around 129), so the dark/light midpoint comes from the data:
  // mean luminance of the visibly dark half of the grid.
  const sorted = Array.from(target).sort((a, b) => a - b);
  const darkMean =
    sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.35))).reduce(
      (sum, v) => sum + v,
      0
    ) / Math.max(1, Math.floor(sorted.length * 0.35));
  const background = sorted[sorted.length - 1];
  return Math.min(192, Math.max(96, (darkMean + background) / 2));
}

/* ---------- picture placement over the claimable canvas ---------- */

function claimableGrid(maps, size) {
  const claimable = new Uint8Array(size * size);
  for (const { x, y } of maps.gridPos) claimable[y * size + x] = 1;
  return claimable;
}

function placeTarget(target, size, claimable, darkCut, keep = 1) {
  // Scale the trimmed glyph to several window sizes and slide it over the
  // symbol (rsc's Dx/Dy panning), ranking placements by how many glyph-dark
  // pixels land on claimable modules. Pixels outside the window render as
  // background (light target).
  const toDark = (values, n) => {
    const bits = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i += 1) bits[i] = values[i] < darkCut ? 1 : 0;
    return bits;
  };
  const shrink = (values, outSize) => {
    const out = new Float32Array(outSize * outSize);
    for (let y = 0; y < outSize; y += 1) {
      const sy0 = Math.floor((y * size) / outSize);
      const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * size) / outSize));
      for (let x = 0; x < outSize; x += 1) {
        const sx0 = Math.floor((x * size) / outSize);
        const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * size) / outSize));
        let sum = 0;
        let count = 0;
        for (let sy = sy0; sy < sy1; sy += 1) {
          for (let sx = sx0; sx < sx1; sx += 1) {
            sum += values[sy * size + sx];
            count += 1;
          }
        }
        out[y * outSize + x] = sum / count;
      }
    }
    return out;
  };

  const ranked = [];
  for (let win = size - 8; win >= 12; win -= 2) {
    const darkW = toDark(shrink(target, win), win);
    for (let dy = 0; dy + win <= size; dy += 1) {
      for (let dx = 0; dx + win <= size; dx += 1) {
        let score = 0;
        for (let y = 0; y < win; y += 1) {
          for (let x = 0; x < win; x += 1) {
            if (!darkW[y * win + x]) continue;
            score += claimable[(y + dy) * size + (x + dx)] ? 1 : -3;
          }
        }
        ranked.push({ score, win, dx, dy });
      }
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  if (!ranked.length || ranked[0].score <= 0) {
    ranked.unshift({ score: 0, win: size, dx: 0, dy: 0 });
  }

  return ranked.slice(0, keep).map(({ win, dx, dy }) => {
    const glyph = win === size ? target.slice() : shrink(target, win);
    const placed = new Float32Array(size * size).fill(255);
    for (let y = 0; y < win; y += 1) {
      for (let x = 0; x < win; x += 1) {
        placed[(y + dy) * size + (x + dx)] = glyph[y * win + x];
      }
    }
    return { target: placed, win, dx, dy };
  });
}

function contrastField(target, size) {
  const field = new Float32Array(size * size);
  const del = 5;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let dy = -del; dy <= del; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= size) continue;
        for (let dx = -del; dx <= del; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= size) continue;
          const v = target[ny * size + nx];
          sum += v;
          sumSq += v * v;
          count += 1;
        }
      }
      const avg = sum / count;
      field[y * size + x] = sumSq / count - avg * avg;
    }
  }

  return field;
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
  const { positions } = codewordBitPositions(version, ecl);
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

  return { geom, gridPos, dataSeq, ecSeq };
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
  const size = version * 4 + 17;
  const sampled = resampleTarget(size, rotation);
  const darkCut = darkThreshold(sampled.target, size);
  const placements = placeTarget(
    sampled.target,
    size,
    claimableGrid(maps, size),
    darkCut,
    keep
  );
  return placements.map((placed) => ({
    size,
    target: placed.target,
    darkCut,
    placement: {
      win: placed.win,
      dx: placed.dx,
      dy: placed.dy,
      targetWidth: Math.round((sampled.targetWidth * placed.win) / size),
      targetHeight: Math.round((sampled.targetHeight * placed.win) / size),
    },
  }));
}

function solveQArt(version, ecl, mask, rng, rotation = 0, layout = null) {
  const maps = buildMaps(version, ecl);
  const { geom, gridPos, dataSeq, ecSeq } = maps;
  const size = version * 4 + 17;
  if (!layout) layout = prepareLayouts(version, ecl, rotation)[0];
  const target = layout.target;
  const darkCut = layout.darkCut;
  const contrast = contrastField(target, size);
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

  // Candidates: digit bits + all EC bits, with grid position, target, contrast.
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
        targ: target[y * size + x],
        contrast: contrast[y * size + x],
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
        targ: target[y * size + x],
        contrast: contrast[y * size + x],
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
        const tier = candidate.targ < darkCut ? 2 : 1;
        candidate.priority =
          tier * 1e12 + candidate.contrast * 256 + Math.floor(rng() * 256);
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
        let bval = candidate.targ < darkCut ? 1 : 0;
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
      targetDark: candidate.targ < darkCut,
      hardZero: candidate.hardZero,
    })),
    size,
    target,
    darkCut,
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

/* ---------- candidate ladder ---------- */

function targetSimilarity(qr, solved) {
  const { dx, dy, win } = solved.placement;
  let darkMatches = 0;
  let darkTotal = 0;
  let lightMatches = 0;
  let lightTotal = 0;

  for (let y = dy; y < dy + win; y += 1) {
    for (let x = dx; x < dx + win; x += 1) {
      const targetDark = solved.target[y * solved.size + x] < solved.darkCut;
      const actualDark = qr.modules[y][x];

      if (targetDark) {
        darkTotal += 1;
        if (actualDark) darkMatches += 1;
      } else {
        lightTotal += 1;
        if (!actualDark) lightMatches += 1;
      }
    }
  }

  const darkScore = darkTotal === 0 ? 1 : darkMatches / darkTotal;
  const lightScore = lightTotal === 0 ? 1 : lightMatches / lightTotal;
  return 0.75 * darkScore + 0.25 * lightScore;
}

const SEED_TRIES = 2;
const PLACEMENT_TRIES = 2;

function renderQArtCandidate(rotation) {
  let best = null;

  for (const layout of prepareLayouts(VERSION, ECL, rotation, PLACEMENT_TRIES)) {
    for (let mask = 0; mask < 8; mask += 1) {
      for (let seed = 0; seed < SEED_TRIES; seed += 1) {
        const rng = mulberry32(
          fnv1a(`v5l:rotation${rotation}:mask${mask}:threshold:${seed}`)
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
        const penalty = qr.getPenaltyScore();
        const similarity = targetSimilarity(qr, solved);
        if (
          !best ||
          similarity > best.similarity ||
          (similarity === best.similarity && penalty < best.penalty)
        ) {
          best = { qr, penalty, similarity, solved, mask, png, seed };
        }
      }
    }
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
      similarity: Number(rendered.similarity.toFixed(6)),
      placement: rendered.solved.placement,
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
