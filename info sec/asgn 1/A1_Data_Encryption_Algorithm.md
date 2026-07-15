---
title: "Assignment 1: Data Encryption Algorithm"
subtitle: "Information Security"
date: "July 15, 2026"
geometry: margin=1in
fontsize: 11pt
linkcolor: blue
---

# A1: Data Encryption Algorithm

## Question 1 — DES for Cloud File Storage

*A company encrypts confidential files using DES before storing them in the cloud.*

### 1.1 Does DES provide sufficient security today?

DES (adopted 1977) is a symmetric block cipher that encrypts data in **64-bit
blocks** using a **56-bit key**, applying a **16-round Feistel network** made
of S-box substitutions and permutations.

**DES is no longer secure today, for these reasons:**

- **The key is too short.** A 56-bit key means only about $2^{56}$ possible
  keys, which modern computers can try one by one (brute force) in a
  reasonable time.
- **It has already been broken in practice.** The EFF's *Deep Crack* machine
  cracked DES in 56 hours back in 1998; today GPUs, FPGAs, and cloud computing
  can do it in hours or even minutes.
- **It is weak against cryptanalysis.** DES can be attacked using differential
  and linear cryptanalysis, which recover the key faster than brute force.
- **Its block size is too small.** Because blocks are only 64 bits, encrypting
  large amounts of data leads to repeated blocks that enable collision attacks
  such as Sweet32.
- **It is officially retired.** NIST has withdrawn DES, so it is no longer
  approved for protecting sensitive information.

### 1.2 Suggested improvements

- **Switch to AES**, which uses 128/192/256-bit keys and a 128-bit block, and
  is fast because most CPUs have built-in hardware support for it.
- **Use authenticated encryption like AES-GCM**, which protects both the
  secrecy of the file and detects if anyone tampered with it.
- **Use a secure mode with a fresh IV.** Avoid ECB mode and give every file a
  new random initialization vector so identical files don't produce identical
  ciphertext.
- **Manage keys properly.** Store keys in a Key Management Service (KMS) or
  hardware module (HSM), rotate them regularly, and never store them next to
  the encrypted files.
- **Use envelope encryption.** Encrypt each file with its own data key, then
  encrypt that data key using a master key kept in the KMS.
- **Add defense in depth.** Combine encryption with TLS during upload, access
  controls, logging, and integrity checks (HMAC or digital signatures).

---

## Question 2 — Upgrading from DES to Triple DES (3DES)

*A financial institution upgrades from DES to Triple DES (3DES).*

### 2.1 How 3DES improves security over DES

3DES runs the DES algorithm three times on each block using the
**Encrypt–Decrypt–Encrypt (EDE)** scheme:

$$C = E_{K_3}\big(D_{K_2}(E_{K_1}(P))\big)$$

- **It uses a much longer key.** With three separate keys the total key length
  becomes 168 bits instead of DES's 56 bits, which makes brute force
  impractical.
- **It stays backward compatible.** If all three keys are the same
  ($K_1 = K_2 = K_3$), 3DES produces the same result as plain DES, so old
  systems can be upgraded smoothly.
- **It reuses a well-studied algorithm.** Since it is built on DES, no new
  untested cipher is introduced — the underlying maths is already trusted.
- **Three stages are needed, not two.** Double DES can be broken by a
  meet-in-the-middle attack (only about $2^{57}$ effort), so a third
  encryption stage is added to restore strength.
- **Its real strength is ~112 bits.** The same meet-in-the-middle idea limits
  3-key 3DES to about 112 bits of effective security rather than the full 168.

### 2.2 Is 3DES sufficient for modern applications?

**No — 3DES is now deprecated and should not be used for new systems:**

- **Its 64-bit block is still too small.** Like DES, it is vulnerable to the
  Sweet32 collision attack when large volumes of data are encrypted — a real
  risk for a bank handling many transactions.
- **It is slow.** Running DES three times makes 3DES much slower than AES,
  which also benefits from hardware acceleration.
- **It has been officially phased out.** NIST disallowed 3DES for new
  applications after 2023, and standards like PCI DSS restrict its use in
  finance.
- **Its ~112-bit security is below modern requirements**, which recommend at
  least 128 bits.

**Recommendation:** Move to AES (128 or 256-bit) with an authenticated mode
such as AES-GCM. 3DES should only be kept temporarily to support old systems.

---

## Question 3 — One-Bit Change Causes Large Ciphertext Change

*A security analyst observes that changing one bit of plaintext drastically
changes the ciphertext in DES.*

### 3.1 Identifying and explaining the phenomenon

This is called the **Avalanche Effect** — when changing just one bit of the
input (plaintext or key) causes a large, unpredictable change in the output,
ideally flipping about **half of the ciphertext bits**.

**How DES produces this effect:**

- **Diffusion.** DES's permutation and expansion steps spread the influence of
  each input bit across many positions in the output.
- **Confusion.** The non-linear S-boxes make a single bit change propagate in
  an unpredictable way.
- **Repeated rounds.** Over 16 Feistel rounds, that one small change cascades
  round after round — like an avalanche — until roughly half the output bits
  have flipped.

Together these implement Shannon's two design principles of **confusion** and
**diffusion**.

### 3.2 Importance in secure encryption systems

- **It hides patterns.** Two very similar plaintexts produce completely
  different ciphertexts, so attackers can't relate inputs by looking at
  outputs.
- **It resists differential cryptanalysis.** Since input differences map to
  seemingly random output differences, this common attack becomes very hard.
- **It prevents partial leakage.** An attacker can't deduce part of the
  plaintext from a small, localized change in the ciphertext.
- **It signals good design.** A strong avalanche effect shows the cipher has
  proper diffusion and confusion.
- **It applies to the key too.** Changing one key bit should also change the
  ciphertext drastically, which helps resist related-key attacks.

**In summary:** a strong avalanche effect is a hallmark of a robust cipher; if
it were missing, attackers could correlate inputs and outputs and break the
system.
