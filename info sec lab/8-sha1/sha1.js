"use strict";

// SHA-1 from scratch, byte-exact, no library. Returns the 160-bit digest as
// 40 lowercase hex chars, and can also hand back the machinery (padded blocks,
// the 80 expanded words, the per-round register trace) so the UI can show what
// actually happens inside the sponge.
//
// Reference: RFC 3174. Everything here is 32-bit unsigned arithmetic done with
// the >>> 0 trick to keep JS bitwise ops honest.

// Left-rotate a 32-bit word by n bits.
function rotl(x, n) {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

// 32-bit addition that stays unsigned.
function add32(a, b) {
  return (a + b) >>> 0;
}

// UTF-8 encode the message into a byte array (so emoji / accents hash correctly).
function toBytes(text) {
  return Array.from(new TextEncoder().encode(text));
}

// Pad per the spec: append 0x80, then 0x00s, then the 64-bit big-endian bit
// length, so the total is a multiple of 64 bytes (512 bits).
function padMessage(bytes) {
  const bitLen = bytes.length * 8;
  const padded = bytes.slice();
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0x00);
  // 64-bit length, big-endian. JS bit ops are 32-bit, so split high/low.
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  for (let i = 3; i >= 0; i--) padded.push((hi >>> (i * 8)) & 0xff);
  for (let i = 3; i >= 0; i--) padded.push((lo >>> (i * 8)) & 0xff);
  return padded;
}

// Split padded bytes into 512-bit blocks, each as sixteen 32-bit big-endian words.
function toBlocks(padded) {
  const blocks = [];
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(16);
    for (let j = 0; j < 16; j++) {
      const o = i + j * 4;
      w[j] =
        ((padded[o] << 24) |
          (padded[o + 1] << 16) |
          (padded[o + 2] << 8) |
          padded[o + 3]) >>> 0;
    }
    blocks.push(w);
  }
  return blocks;
}

function toHex32(x) {
  return (x >>> 0).toString(16).padStart(8, "0");
}

// The full digest, plus optional trace of the internals for teaching.
function sha1(text, wantTrace) {
  const bytes = toBytes(text);
  const padded = padMessage(bytes);
  const blocks = toBlocks(padded);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const trace = wantTrace
    ? { byteLen: bytes.length, bitLen: bytes.length * 8, blocks: [] }
    : null;

  for (let bi = 0; bi < blocks.length; bi++) {
    // Message schedule: expand 16 words to 80.
    const w = blocks[bi].slice();
    for (let t = 16; t < 80; t++) {
      w[t] = rotl((w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]) >>> 0, 1);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    const rounds = wantTrace ? [] : null;

    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) {
        f = ((b & c) | (~b & d)) >>> 0;
        k = 0x5a827999;
      } else if (t < 40) {
        f = (b ^ c ^ d) >>> 0;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = ((b & c) | (b & d) | (c & d)) >>> 0;
        k = 0x8f1bbcdc;
      } else {
        f = (b ^ c ^ d) >>> 0;
        k = 0xca62c1d6;
      }
      const tmp = add32(add32(add32(add32(rotl(a, 5), f), e), k), w[t]);
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;

      if (rounds) {
        rounds.push({
          t,
          a: toHex32(a), b: toHex32(b), c: toHex32(c),
          d: toHex32(d), e: toHex32(e),
        });
      }
    }

    h0 = add32(h0, a);
    h1 = add32(h1, b);
    h2 = add32(h2, c);
    h3 = add32(h3, d);
    h4 = add32(h4, e);

    if (trace) {
      trace.blocks.push({
        index: bi,
        words: w.map(toHex32),
        rounds,
        chaining: [h0, h1, h2, h3, h4].map(toHex32),
      });
    }
  }

  const digest =
    toHex32(h0) + toHex32(h1) + toHex32(h2) + toHex32(h3) + toHex32(h4);

  return wantTrace ? { digest, trace } : { digest };
}

// Count differing bits between two equal-length hex strings (the avalanche).
function bitDiff(hexA, hexB) {
  let diff = 0;
  for (let i = 0; i < hexA.length; i++) {
    const x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    diff += (x.toString(2).match(/1/g) || []).length;
  }
  return diff;
}

window.SHA1 = { sha1, padMessage, toBytes, bitDiff, toBlocks };
