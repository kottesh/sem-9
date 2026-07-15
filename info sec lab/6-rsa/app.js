"use strict";

const $ = (id) => document.getElementById(id);
const R = window.RSA;

let keys = null;      // current derived keypair
let cipher = null;    // last encrypted array of BigInt

function parseBig(str) {
  const t = str.trim();
  if (!/^\d+$/.test(t)) throw new Error(`"${str}" is not a whole number`);
  return BigInt(t);
}

// Build one ledger row.
function row({ cls = "", sym, formula, value, valClass = "" }) {
  const el = document.createElement("div");
  el.className = "row " + cls;
  el.innerHTML = `
    <div class="sym">${sym}<span class="formula">${formula}</span></div>
    <div class="val ${valClass}">${value}</div>`;
  return el;
}

function renderLedger(k) {
  const ledger = $("ledger");
  ledger.innerHTML = "";
  ledger.append(
    row({ sym: "p · q", formula: "modulus n", value: `${k.p} · ${k.q} = <b style="color:var(--brass)">${k.n}</b>`, cls: "" }),
    row({ sym: "φ(n)", formula: "(p−1)(q−1)", value: `(${k.p - 1n})(${k.q - 1n}) = ${k.phi}` }),
    row({ cls: "public", sym: "e", formula: "gcd(e, φ) = 1", value: String(k.e), valClass: "pub" }),
    row({ cls: "private", sym: "d", formula: "e·d ≡ 1 (mod φ)", value: String(k.d), valClass: "priv" }),
    row({ cls: "key public", sym: "public key", formula: "share freely", value: `(e = ${k.e},  n = ${k.n})`, valClass: "pub" }),
    row({ cls: "key private", sym: "private key", formula: "keep secret", value: `(d = ${k.d},  n = ${k.n})`, valClass: "priv" }),
  );
}

function setOutput(el, html, { empty = false, error = false } = {}) {
  el.className = "output" + (empty ? " empty" : "") + (error ? " err" : "");
  el.innerHTML = html;
}

function derive() {
  try {
    const p = parseBig($("p").value);
    const q = parseBig($("q").value);
    const eRaw = $("e").value.trim();
    const preferredE = eRaw ? parseBig(eRaw) : null;

    keys = R.deriveKeypair(p, q, preferredE);
    // reflect the actually-chosen e back into the field
    $("e").value = String(keys.e);
    renderLedger(keys);

    // any prior ciphertext no longer matches these keys
    cipher = null;
    setOutput($("cipherOut"), "Keys changed — encrypt again to seal a message.", { empty: true });
    setOutput($("plainOut"), "Recovered text appears here after you decrypt.", { empty: true });
  } catch (err) {
    keys = null;
    setOutput($("ledger") && $("cipherOut"), "", {}); // no-op guard
    $("ledger").innerHTML =
      `<div class="output err">Could not forge keys: ${err.message}</div>`;
  }
}

function roll() {
  // two distinct primes roughly in the hundreds → n large enough for ASCII,
  // still small enough to read every digit.
  const p = R.randomPrimeInRange(200n, 900n);
  let q = R.randomPrimeInRange(200n, 900n);
  while (q === p) q = R.randomPrimeInRange(200n, 900n);
  $("p").value = String(p);
  $("q").value = String(q);
  $("e").value = ""; // let the deriver choose a valid e
  derive();
}

function encrypt() {
  if (!keys) { derive(); if (!keys) return; }
  try {
    const text = $("plaintext").value;
    if (text.length === 0) throw new Error("nothing to encrypt");
    cipher = R.encryptMessage(text, keys.e, keys.n);
    const html = cipher.map((c) => `<span class="num">${c}</span>`).join(" ");
    setOutput($("cipherOut"), html);
    setOutput($("plainOut"), "Sealed. Now open it with the private key →", { empty: true });
  } catch (err) {
    cipher = null;
    setOutput($("cipherOut"), `${err.message}`, { error: true });
  }
}

function decrypt() {
  if (!keys) { setOutput($("plainOut"), "Forge a keypair first.", { error: true }); return; }
  if (!cipher) { setOutput($("plainOut"), "Encrypt a message first.", { error: true }); return; }
  try {
    const text = R.decryptMessage(cipher, keys.d, keys.n);
    setOutput($("plainOut"), `<span class="plain">${escapeHtml(text)}</span>`);
  } catch (err) {
    setOutput($("plainOut"), `${err.message}`, { error: true });
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("derive").addEventListener("click", derive);
$("roll").addEventListener("click", roll);
$("encrypt").addEventListener("click", encrypt);
$("decrypt").addEventListener("click", decrypt);

// derive once on load so the ledger isn't empty
derive();
