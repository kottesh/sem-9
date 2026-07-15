"use strict";

// RSA over BigInt. Small-but-real: pick two primes, derive the keypair,
// then encrypt each character's code point as m^e mod n and back with m^d mod n.
// Everything here is exact integer arithmetic — no floating point, no rounding.

// Greatest common divisor.
function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a < 0n ? -a : a;
}

// Extended Euclid: returns [g, x, y] with a*x + b*y = g = gcd(a, b).
function egcd(a, b) {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - (a / b) * y];
}

// Modular inverse of a mod m (a and m coprime), normalised to [0, m).
function modInverse(a, m) {
  const [g, x] = egcd(((a % m) + m) % m, m);
  if (g !== 1n) throw new Error("no modular inverse exists");
  return ((x % m) + m) % m;
}

// Fast modular exponentiation: base^exp mod mod.
function modPow(base, exp, mod) {
  if (mod === 1n) return 0n;
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

// Miller-Rabin primality test (deterministic enough for the small primes here).
function isProbablePrime(n) {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n;
  let r = 0n;
  while ((d & 1n) === 0n) { d >>= 1n; r += 1n; }
  const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const a of witnesses) {
    if (a % n === 0n) continue;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let i = 0n; i < r - 1n; i++) {
      x = (x * x) % n;
      if (x === n - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

// A random prime in [min, max]. Used by the "roll fresh primes" action.
function randomPrimeInRange(min, max) {
  const span = max - min + 1n;
  for (let tries = 0; tries < 5000; tries++) {
    const bits = span.toString(2).length;
    let r = 0n;
    for (let i = 0; i < bits; i += 30) {
      r = (r << 30n) | BigInt(Math.floor(Math.random() * (1 << 30)));
    }
    const candidate = min + (r % span) | 1n; // keep it odd
    if (candidate <= max && candidate >= min && isProbablePrime(candidate)) {
      return candidate;
    }
  }
  throw new Error("could not find a prime in range");
}

// Derive a full keypair from two primes. Returns every intermediate value so
// the UI can show the derivation, not just the final keys.
function deriveKeypair(p, q, preferredE) {
  if (!isProbablePrime(p)) throw new Error(`p = ${p} is not prime`);
  if (!isProbablePrime(q)) throw new Error(`q = ${q} is not prime`);
  if (p === q) throw new Error("p and q must be different primes");

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  // Choose e coprime with phi. Try the preferred value, then common defaults,
  // then scan upward.
  let e = preferredE && gcd(preferredE, phi) === 1n && preferredE > 1n && preferredE < phi
    ? preferredE
    : null;
  if (e === null) {
    for (const candidate of [65537n, 17n, 5n, 3n]) {
      if (candidate < phi && gcd(candidate, phi) === 1n) { e = candidate; break; }
    }
  }
  if (e === null) {
    for (let c = 3n; c < phi; c += 2n) {
      if (gcd(c, phi) === 1n) { e = c; break; }
    }
  }
  if (e === null) throw new Error("could not choose a public exponent e");

  const d = modInverse(e, phi);

  return { p, q, n, phi, e, d };
}

// Encrypt one message: each char code must be < n. Returns array of BigInt.
function encryptMessage(text, e, n) {
  const out = [];
  for (const ch of text) {
    const m = BigInt(ch.codePointAt(0));
    if (m >= n) {
      throw new Error(
        `character "${ch}" (code ${m}) is >= n (${n}); choose larger primes`
      );
    }
    out.push(modPow(m, e, n));
  }
  return out;
}

// Decrypt: turn an array of BigInt cipher values back into text.
function decryptMessage(cipher, d, n) {
  let text = "";
  for (const c of cipher) {
    const m = modPow(c, d, n);
    text += String.fromCodePoint(Number(m));
  }
  return text;
}

window.RSA = {
  gcd,
  modInverse,
  modPow,
  isProbablePrime,
  randomPrimeInRange,
  deriveKeypair,
  encryptMessage,
  decryptMessage,
};
