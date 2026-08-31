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
 * The claim loop, BitBlock Gauss-Jordan structure, contrast importance
 * ordering, Floyd-Steinberg pass, and the invalid-group (>= 1000)
 * hard-zero retry all follow Russ Cox's reference implementation
 * (rsc.io/qr/qart). QR encoding, masking, penalties, and the module
 * topology come from the vendored nayuki encoder (scripts/vendor/).
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
const ICON_PATH = path.join(ROOT, "src", "assets", "in-season-icon.png");
const SOURCES_URL = "https://oneill9.github.io/trmnl-in-season/";
const QUIET_MODULES = 4;

const VARIANTS = {
  v5l: { version: 5, ecl: Ecc.LOW },
  v5m: { version: 5, ecl: Ecc.MEDIUM },
  v6h: { version: 6, ecl: Ecc.HIGH },
  v7h: { version: 7, ecl: Ecc.HIGH },
};
const STYLES = ["threshold", "floyd-steinberg", "scatter"];
const SCALES = [2, 3];

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

function resampleTarget(size) {
  const { width, height, lum } = loadIconLuminance();
  const target = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    const y0 = Math.floor((y * height) / size);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / size));
    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor((x * width) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / size));
      let sum = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          sum += lum[sy * width + sx];
          count += 1;
        }
      }
      target[y * size + x] = sum / count;
    }
  }

  return target;
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

function placeTarget(target, size, claimable, darkCut) {
  // Scale the trimmed glyph to several window sizes and slide it over the
  // symbol (rsc's Dx/Dy panning), keeping the placement that puts the most
  // glyph-dark pixels on claimable modules. Pixels outside the window
  // render as background (light target).
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

  let best = null;
  for (const win of [size - 8, size - 12, size - 16, size - 20]) {
    if (win < 8) continue;
    const darkW = toDark(shrink(target, win), win);
    for (let dy = 0; dy + win <= size; dy += 2) {
      for (let dx = 0; dx + win <= size; dx += 2) {
        let score = 0;
        for (let y = 0; y < win; y += 1) {
          for (let x = 0; x < win; x += 1) {
            if (!darkW[y * win + x]) continue;
            score += claimable[(y + dy) * size + (x + dx)] ? 1 : -3;
          }
        }
        if (!best || score > best.score) best = { score, win, dx, dy };
      }
    }
  }
  if (!best || best.score <= 0) best = { score: 0, win: size, dx: 0, dy: 0 };

  const { win, dx, dy } = best;
  const glyph = win === size ? target.slice() : shrink(target, win);
  const placed = new Float32Array(size * size).fill(255);
  for (let y = 0; y < win; y += 1) {
    for (let x = 0; x < win; x += 1) {
      placed[(y + dy) * size + (x + dx)] = glyph[y * win + x];
    }
  }

  return { target: placed, win, dx, dy };
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

/* ---------- message bit layout ---------- */

const URL_FRAGMENT = `${SOURCES_URL}#`;

function digitBudget(version, ecl) {
  const capacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
  const bbit = 4 + 8 + URL_FRAGMENT.length * 8 + 14;
  const groups = Math.floor((capacityBits - bbit - 4) / 10);
  return { capacityBits, bbit, groups, mbit: bbit + groups * 10 };
}

function buildMessage(version, ecl, groups) {
  const { capacityBits, bbit, mbit } = digitBudget(version, ecl);
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
  void mbit;
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
    const bit = 7 - (s & 7);
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

function solveQArt(version, ecl, mask, style, rng) {
  const maps = buildMaps(version, ecl);
  const { geom, gridPos, dataSeq, ecSeq } = maps;
  const size = version * 4 + 17;
  const rawTarget = resampleTarget(size);
  const contrast = contrastField(rawTarget, size);
  const darkCut = darkThreshold(rawTarget, size);
  const placed = placeTarget(rawTarget, size, claimableGrid(maps, size), darkCut);
  const target = placed.target;
  const { bbit, groups, mbit } = digitBudget(version, ecl);
  const rsDiv = QrCode.reedSolomonComputeDivisor(geom.eccLen);

  // Digit bits by message byte, mapped to their owning block.
  const digitBitsByBlock = [];
  for (let j = 0; j < geom.numBlocks; j += 1) digitBitsByBlock.push([]);
  for (let g = bbit; g < mbit; g += 1) {
    const byte = g >> 3;
    for (let j = 0; j < geom.numBlocks; j += 1) {
      if (byte >= geom.chunkStart[j] && byte < geom.chunkStart[j] + geom.dataLen[j]) {
        const bi = (byte - geom.chunkStart[j]) * 8 + (7 - (g & 7));
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
        if (style === "scatter") {
          candidate.priority =
            tier * 1e12 +
            (Math.floor(rng() * 128) +
              64 * ((candidate.x + candidate.y) % 2) +
              64 * (((candidate.x + candidate.y) % 3) % 2)) *
              256 +
            Math.floor(rng() * 256);
        } else {
          candidate.priority =
            tier * 1e12 +
            candidate.contrast * 256 +
            Math.floor(rng() * 256);
        }
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
      let marked = false;
      for (let j = 0; j < geom.numBlocks; j += 1) {
        if (byte >= geom.chunkStart[j] && byte < geom.chunkStart[j] + geom.dataLen[j]) {
          const bi = (byte - geom.chunkStart[j]) * 8 + (7 - (hardBit & 7));
          const candidate = candidatesByBlock[j].find((c) => !c.isEc && c.bi === bi);
          if (!candidate) throw new Error("hard zero bit unclaimable");
          if (!candidate.hardZero) {
            candidate.hardZero = true;
            marked = true;
          }
          break;
        }
      }
      invalid += 1;
      void marked;
    }
    if (invalid === 0) break;
    if (attempt === 39) throw new Error("digit groups never converged");
  }

  // Second pass: Floyd-Steinberg diffusion over claimed pixels. rsc's
  // reference only propagates rightward, which we keep for fidelity.
  if (style === "floyd-steinberg") {
    const dtarg = new Map();
    const claimedAt = new Map();
    for (const candidate of claimed) {
      dtarg.set(candidate, candidate.targ);
      claimedAt.set(candidate.y * size + candidate.x, candidate);
    }
    const ordered = claimed.slice().sort((a, b) => a.y - b.y || a.x - b.x);

    for (const candidate of ordered) {
      const targ = dtarg.get(candidate);
      const dark = targ < darkCut;
      let pval = dark ? 1 : 0;
      let v = dark ? 0 : 255;
      let bval = pval ^ maskBit(mask, candidate.x, candidate.y);
      if (candidate.hardZero && bval !== 0) {
        bval ^= 1;
        pval ^= 1;
        v ^= 255;
      }

      blocks[candidate.block].reset(candidate.bitIndex, bval);
      candidate.pval = pval;

      const err = targ - v;
      const right = claimedAt.get(candidate.y * size + candidate.x + 1);
      if (right) dtarg.set(right, dtarg.get(right) + (err * 7) / 16);
    }
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
    size,
    placement: { win: placed.win, dx: placed.dx, dy: placed.dy, darkCut },
  };
}

function readMessageBit(blocks, geom, g) {
  const byte = g >> 3;
  for (let j = 0; j < geom.numBlocks; j += 1) {
    if (byte >= geom.chunkStart[j] && byte < geom.chunkStart[j] + geom.dataLen[j]) {
      const bi = (byte - geom.chunkStart[j]) * 8 + (7 - (g & 7));
      return (blocks[j].B[bi >> 3] >> (7 - (bi & 7))) & 1;
    }
  }
  throw new Error("message bit out of range");
}

/* ---------- rendering ---------- */

function renderPng(qr, scale) {
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
      if (!qr.modules[y][x]) continue;
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

function writePng(png, filePath) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

/* ---------- candidate ladder ---------- */

function renderQArtCandidate(variantKey, style, scale) {
  const { version, ecl } = VARIANTS[variantKey];
  let best = null;

  for (let mask = 0; mask < 8; mask += 1) {
    const rng = mulberry32(fnv1a(`${variantKey}:${style}:mask${mask}`));
    let solved;
    try {
      solved = solveQArt(version, ecl, mask, style, rng);
    } catch (error) {
      continue;
    }
    const qr = new QrCode(version, ecl, solved.data, mask);
    const png = renderPng(qr, scale);
    if (!validatePayload(png, solved.payload)) continue;
    const penalty = qr.getPenaltyScore();
    if (!best || penalty < best.penalty) {
      best = { qr, penalty, solved, mask, png };
    }
  }

  if (!best) return null;
  return best;
}

function renderPlainCandidate(version, ecl, scale) {
  const urlBytes = Array.from(Buffer.from(SOURCES_URL, "utf8"));
  const qr = new QrCode(version, ecl, QrSegmentBytes(urlBytes), -1);
  const png = renderPng(qr, scale);
  if (!validatePayload(png, SOURCES_URL)) return null;

  return { qr, penalty: qr.getPenaltyScore(), mask: qr.mask, png };
}

function QrSegmentBytes(bytes) {
  const bits = [];
  appendBits(4, 4, bits);
  appendBits(bytes.length, 8, bits);
  for (const byte of bytes) appendBits(byte, 8, bits);
  const capacityBits = QrCode.getNumDataCodewords(VARIANTS_PLAIN_VERSION, Ecc.HIGH) * 8;
  appendBits(0, Math.min(4, capacityBits - bits.length), bits);
  appendBits(0, (8 - (bits.length % 8)) % 8, bits);
  for (let padByte = 0xec; bits.length < capacityBits; padByte ^= 0xec ^ 0x11)
    appendBits(padByte, 8, bits);
  return packCodewords(bits);
}

const VARIANTS_PLAIN_VERSION = 5;

function generate({ outDir = QR_DIR } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const candidates = [];

  for (const variantKey of Object.keys(VARIANTS)) {
    for (const style of STYLES) {
      for (const scale of SCALES) {
        const rendered = renderQArtCandidate(variantKey, style, scale);
        if (!rendered) {
          console.warn(`qr: dropped candidate ${variantKey}/${style}/${scale}px (unsolvable)`);
          continue;
        }
        const { version, ecl } = VARIANTS[variantKey];
        const file = `qr-${variantKey}-${style}-${scale}px.png`;
        writePngTo(rendered.png, path.join(outDir, file));
        candidates.push({
          kind: "qart",
          variant: variantKey,
          version,
          ecl: ecl === Ecc.LOW ? "L" : ecl === Ecc.MEDIUM ? "M" : "H",
          style,
          scale,
          file,
          modules: rendered.qr.size,
          width: rendered.png.width,
          height: rendered.png.height,
          payload: rendered.solved.payload,
          controlled: rendered.solved.controlled,
          mask: rendered.mask,
          penalty: rendered.penalty,
        });
      }
    }
  }

  for (const scale of SCALES) {
    const rendered = renderPlainCandidate(5, Ecc.HIGH, scale);
    if (!rendered) {
      console.warn(`qr: dropped plain v5h reference at ${scale}px`);
      continue;
    }
    const file = `qr-v5h-plain-${scale}px.png`;
    writePngTo(rendered.png, path.join(outDir, file));
    candidates.push({
      kind: "plain",
      variant: "v5h",
      version: 5,
      ecl: "H",
      style: "plain",
      scale,
      file,
      modules: rendered.qr.size,
      width: rendered.png.width,
      height: rendered.png.height,
      payload: SOURCES_URL,
      controlled: 0,
      mask: rendered.mask,
    });
  }

  const manifest = { generatedAt: new Date().toISOString(), candidates };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

function writePngTo(png, filePath) {
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

module.exports = { generate, solveQArt, VARIANTS, STYLES, SCALES, QR_DIR };