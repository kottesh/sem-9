"use strict";

// Wiring for the SHA-1 bench: hash live as the user types, render the 40-nibble
// digest, flare the nibbles that changed since the last hash (the avalanche),
// and expose the internal machinery (padding, registers, round trace).

const S = window.SHA1;

const el = {
  message: document.getElementById("message"),
  digest: document.getElementById("digest"),
  lenLabel: document.getElementById("lenLabel"),
  avalancheCount: document.getElementById("avalancheCount"),
  avalancheText: document.getElementById("avalancheText"),
  padView: document.getElementById("padView"),
  regView: document.getElementById("regView"),
  roundBody: document.getElementById("roundBody"),
  flipBit: document.getElementById("flipBit"),
  clear: document.getElementById("clear"),
  copy: document.getElementById("copy"),
};

let lastDigest = null;

function renderDigest(hex, prevHex) {
  el.digest.innerHTML = "";
  for (let i = 0; i < hex.length; i++) {
    const span = document.createElement("span");
    span.className = "nib";
    span.textContent = hex[i];
    // flare the nibble amber if it differs from the previous hash
    if (prevHex && prevHex[i] !== hex[i]) span.classList.add("flip");
    el.digest.appendChild(span);
  }
}

function renderPadding(bytes) {
  const padded = S.padMessage(bytes);
  const msgLen = bytes.length;
  const parts = [];
  for (let i = 0; i < padded.length; i++) {
    const h = padded[i].toString(16).padStart(2, "0");
    if (i < msgLen) parts.push(h);
    else if (i === msgLen) parts.push(`<span class="mark">${h}</span>`); // the 0x80 marker
    else if (i >= padded.length - 8) parts.push(`<span class="lenbytes">${h}</span>`); // 64-bit length
    else parts.push(`<span class="pad0">${h}</span>`); // zero fill
  }
  const blocks = padded.length / 64;
  el.padView.innerHTML =
    `${parts.join(" ")}<span class="summary">` +
    `${bytes.length} msg bytes + padding = ${padded.length} bytes = ${blocks} block${blocks > 1 ? "s" : ""} of 512 bits</span>`;
}

function renderMachine(trace) {
  const last = trace.blocks[trace.blocks.length - 1];

  // Registers = the final chaining values (h0..h4).
  const labels = ["h0", "h1", "h2", "h3", "h4"];
  el.regView.innerHTML = last.chaining
    .map(
      (hex, i) =>
        `<div class="reg"><div class="lbl">${labels[i]}</div><div class="hex">${hex}</div></div>`
    )
    .join("");

  // Round trace: show all 80 rounds of the final block (scrollable).
  el.roundBody.innerHTML = last.rounds
    .map(
      (r) =>
        `<tr><td class="t">${r.t}</td><td>${r.a}</td><td>${r.b}</td><td>${r.c}</td><td>${r.d}</td><td>${r.e}</td></tr>`
    )
    .join("");
}

function refresh(flare) {
  const text = el.message.value;
  const bytes = S.toBytes(text);
  const { digest, trace } = S.sha1(text, true);

  el.lenLabel.textContent = `${bytes.length} byte${bytes.length === 1 ? "" : "s"} in`;
  renderDigest(digest, flare ? lastDigest : null);

  if (flare && lastDigest) {
    const diff = S.bitDiff(lastDigest, digest);
    const pct = ((diff / 160) * 100).toFixed(0);
    el.avalancheCount.textContent = `${diff} / 160`;
    el.avalancheText.textContent = `bits changed (${pct}%) versus the previous input — SHA-1's avalanche in action.`;
  } else {
    el.avalancheCount.textContent = "Avalanche";
    el.avalancheText.textContent =
      "edit one character and roughly half of the 160 output bits should move.";
  }

  renderPadding(bytes);
  renderMachine(trace);
  lastDigest = digest;
}

el.message.addEventListener("input", () => refresh(true));

el.flipBit.addEventListener("click", () => {
  const v = el.message.value;
  if (!v) {
    el.message.value = "a";
  } else {
    // toggle the low bit of the last character's code point
    const arr = Array.from(v);
    const ch = arr[arr.length - 1];
    const flipped = String.fromCodePoint(ch.codePointAt(0) ^ 1);
    arr[arr.length - 1] = flipped;
    el.message.value = arr.join("");
  }
  refresh(true);
});

el.clear.addEventListener("click", () => {
  el.message.value = "";
  refresh(true);
});

el.copy.addEventListener("click", async () => {
  const { digest } = S.sha1(el.message.value);
  try {
    await navigator.clipboard.writeText(digest);
    el.copy.textContent = "Copied ✓";
    setTimeout(() => (el.copy.textContent = "Copy digest"), 1400);
  } catch {
    el.copy.textContent = "Copy failed";
    setTimeout(() => (el.copy.textContent = "Copy digest"), 1400);
  }
});

// First paint (no flare — nothing to compare against yet).
refresh(false);
