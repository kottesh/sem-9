// Instrumented MD5. Correct against md5sum; records a snapshot after every one
// of the 64 operations so the UI can step through the state evolution.

const MD5 = (function () {
  // per-step left-rotation amounts (4 rounds x 4 repeated)
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  // K[i] = floor(2^32 * abs(sin(i+1)))
  const K = (function () {
    const k = [];
    for (let i = 0; i < 64; i++) {
      k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    }
    return k;
  })();

  const add32 = (a, b) => (a + b) >>> 0;
  const rotl = (x, c) => ((x << c) | (x >>> (32 - c))) >>> 0;
  const hex32 = (n) => (n >>> 0).toString(16).padStart(8, "0");

  // little-endian byte order for final digest words
  function wordToHexLE(n) {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    }
    return s;
  }

  function utf8Bytes(str) {
    return Array.from(new TextEncoder().encode(str));
  }

  // returns { padded: [bytes], origBits, blocks }
  function pad(bytes) {
    const origBits = bytes.length * 8;
    const padded = bytes.slice();
    padded.push(0x80);
    while (padded.length % 64 !== 56) padded.push(0x00);
    // 64-bit little-endian length
    let len = origBits;
    for (let i = 0; i < 8; i++) {
      padded.push(len & 0xff);
      len = Math.floor(len / 256);
    }
    return { padded, origBits, blocks: padded.length / 64 };
  }

  function roundOf(i) {
    return Math.floor(i / 16); // 0..3 -> F,G,H,I
  }

  // Compute digest + a full trace of every step (across all blocks).
  function digest(str) {
    const bytes = utf8Bytes(str);
    const { padded, origBits, blocks } = pad(bytes);

    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

    const trace = [];
    // seed snapshot
    trace.push({
      step: 0, block: 0, round: -1, fn: "seed",
      A: a0, B: b0, C: c0, D: d0,
      written: null, mg: null, k: null, s: null, m: null, fval: null,
    });

    for (let blk = 0; blk < blocks; blk++) {
      // build 16 little-endian words for this block
      const M = new Array(16);
      for (let j = 0; j < 16; j++) {
        const o = blk * 64 + j * 4;
        M[j] =
          (padded[o] |
            (padded[o + 1] << 8) |
            (padded[o + 2] << 16) |
            (padded[o + 3] << 24)) >>> 0;
      }

      let A = a0, B = b0, C = c0, D = d0;

      for (let i = 0; i < 64; i++) {
        let f, g, fn;
        const r = roundOf(i);
        if (r === 0) { f = (B & C) | (~B & D); g = i; fn = "F"; }
        else if (r === 1) { f = (D & B) | (~D & C); g = (5 * i + 1) % 16; fn = "G"; }
        else if (r === 2) { f = B ^ C ^ D; g = (3 * i + 5) % 16; fn = "H"; }
        else { f = C ^ (B | ~D); g = (7 * i) % 16; fn = "I"; }

        f = f >>> 0;
        const inner = add32(add32(add32(A, f), K[i]), M[g]);
        const rotated = rotl(inner, S[i]);
        const newB = add32(B, rotated);

        // MD5 rotate assignment: A<-D, D<-C, C<-B, B<-newB
        const oldA = A;
        A = D;
        D = C;
        C = B;
        B = newB;

        trace.push({
          step: trace.length, // running index across blocks
          localStep: i + 1,
          block: blk,
          round: r,
          fn,
          A, B, C, D,
          written: "B",       // B is the freshly written word this step
          writtenVal: newB,
          mg: g,
          m: M[g],
          k: K[i],
          s: S[i],
          fval: f,
          oldA,
        });
      }

      a0 = add32(a0, A);
      b0 = add32(b0, B);
      c0 = add32(c0, C);
      d0 = add32(d0, D);
    }

    const hexDigest =
      wordToHexLE(a0) + wordToHexLE(b0) + wordToHexLE(c0) + wordToHexLE(d0);

    return { hex: hexDigest, trace, padded, origBits, blocks, bytes };
  }

  return { digest, hex32, S, K, roundOf };
})();
