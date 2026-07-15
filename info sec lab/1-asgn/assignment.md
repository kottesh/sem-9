---
title: "Substitution and Transposition Ciphers"
subtitle: "Information Security Laboratory --- Assignment 1"
author: ""
date: ""
---

# Aim

To study and implement classical **substitution** and **transposition**
cipher techniques, and to perform encryption and decryption using each of
them.

1. **Substitution techniques**
   i.   Caesar cipher
   ii.  Playfair cipher
   iii. Hill cipher
   iv.  Vigenere cipher
2. **Transposition techniques**
   - Rail Fence cipher
   - Row & Column (Columnar) Transposition

---

# Theory

## Substitution vs. Transposition

A **substitution cipher** replaces each plaintext symbol with another symbol.
The *position* of the symbol is kept, but its *identity* is changed.

A **transposition cipher** keeps every plaintext symbol unchanged but
rearranges their *positions* according to some system. The letters are the
same; only their order changes.

Both are classical (pre-modern) ciphers and are easily broken today, but they
form the conceptual foundation of modern symmetric cryptography (confusion and
diffusion).

---

# Part 1 --- Substitution Techniques

## i. Caesar Cipher

### Principle

The Caesar cipher shifts every letter of the plaintext by a fixed number `k`
positions down the alphabet (wrapping around).

```
Encryption:  C = (P + k) mod 26
Decryption:  P = (C - k) mod 26
```

where `P` and `C` are letters mapped to `0..25` (A=0, B=1, ... Z=25).

### Example (k = 3)

```
Plaintext : H  E  L  L  O
Values    : 7  4  11 11 14
+3 mod 26 : 10 7  14 14 17
Ciphertext: K  H  O  O  R
```

**Encryption:** `HELLO`  ->  `KHOOR`

**Decryption:** `KHOOR` - 3 (mod 26)  ->  `HELLO`

---

## ii. Playfair Cipher

### Principle

The Playfair cipher encrypts **digraphs** (pairs of letters) using a 5x5 key
matrix built from a keyword (I and J share one cell).

**Rules:**

1. Build a 5x5 matrix: keyword first (no repeats), then remaining letters
   (I/J combined).
2. Split the plaintext into letter pairs. If a pair has two identical letters,
   insert `X` between them. If the text length is odd, pad with `X`.
3. For each pair:
   - **Same row**  -> replace each letter with the one to its **right**.
   - **Same column** -> replace each letter with the one **below** it.
   - **Rectangle** -> replace each letter with the letter in its own row but
     in the column of the other letter.

Decryption reverses the shifts (left / up).

### Example (keyword = `MONARCHY`)

Key matrix:

```
M O N A R
C H Y B D
E F G I/J K
L P Q S T
U V W X Z
```

Encrypt plaintext `INSTRUMENTS` -> pairs: `IN ST RU ME NT SX`

```
IN -> GA   (rectangle)
ST -> TL   (same row)
RU -> MZ   (rectangle)
ME -> LC   (same column, wrap)
NT -> AQ   (rectangle)
SX -> BX / handled as pair with padding
```

**Encryption:** `INSTRUMENTS`  ->  `GATLMZCLRQXA` (pairs shown above)

Decryption applies the inverse (shift left / up / rectangle) to recover the
plaintext, then strips the padding `X`.

---

## iii. Hill Cipher

### Principle

The Hill cipher is a **polygraphic** substitution cipher based on linear
algebra. Plaintext is grouped into vectors of size `n` and multiplied by an
`n x n` key matrix `K` (mod 26).

```
Encryption:  C = (K  . P) mod 26
Decryption:  P = (K^-1 . C) mod 26
```

`K` must be invertible mod 26 (i.e. gcd(det(K), 26) = 1).

### Example (2x2 key)

```
K = | 3  3 |        Plaintext = "HI"
    | 2  5 |
```

Map letters: `H=7`, `I=8`, so `P = [7, 8]`.

**Encryption:**

```
C0 = (3*7 + 3*8) mod 26 = (21 + 24) mod 26 = 45 mod 26 = 19 -> T
C1 = (2*7 + 5*8) mod 26 = (14 + 40) mod 26 = 54 mod 26 =  2 -> C
```

**Encryption:** `HI`  ->  `TC`

**Decryption:** det(K) = (3*5 - 3*2) = 9, and `9^-1 mod 26 = 3`.

```
K^-1 = 3 * |  5 -3 |  mod 26 = |  15  17 |
           | -2  3 |          |  20   9 |

P0 = (15*19 + 17*2) mod 26 = (285 + 34) mod 26 = 319 mod 26 = 7 -> H
P1 = (20*19 +  9*2) mod 26 = (380 + 18) mod 26 = 398 mod 26 = 8 -> I
```

`TC`  ->  `HI`.

---

## iv. Vigenere Cipher

### Principle

The Vigenere cipher is a **poly-alphabetic** substitution cipher. A repeating
keyword defines a different Caesar shift for each position.

```
Encryption:  C = (P + K) mod 26
Decryption:  P = (C - K) mod 26
```

where `K` is the keyword letter (repeated) aligned with each plaintext letter.

### Example (keyword = `KEY`)

```
Plaintext : H  E  L  L  O
Key (rep) : K  E  Y  K  E
P values  : 7  4  11 11 14
K values  : 10 4  24 10 4
Sum mod 26: 17 8  9  21 18
Ciphertext: R  I  J  V  S
```

**Encryption:** `HELLO`  ->  `RIJVS`

**Decryption:** `RIJVS` - `KEYKE` (mod 26)  ->  `HELLO`

---

# Part 2 --- Transposition Techniques

## Rail Fence Cipher

### Principle

Plaintext is written diagonally over a number of "rails" (rows) in a zig-zag
pattern, then read off row by row to form the ciphertext.

### Example (rails = 3)

Plaintext: `WEAREDISCOVERED`

Write in zig-zag over 3 rails:

```
W . . . E . . . C . . . R . .
. E . R . D . S . O . E . E .
. . A . . . I . . . V . . . D
```

Read row by row:

```
Row 1: W E C R
Row 2: E R D S O E E
Row 3: A I V D
```

**Encryption:** `WEAREDISCOVERED`  ->  `WECRERDSOEEAIVD`

**Decryption:** rebuild the zig-zag frame of the same size, place the
ciphertext into the rails row by row, then read diagonally to recover
`WEAREDISCOVERED`.

---

## Row & Column (Columnar) Transposition

### Principle

Write the plaintext in rows under a keyword. Number the columns by the
alphabetical order of the keyword letters. Read the columns out in that
numeric order to produce the ciphertext.

### Example (keyword = `ZEBRA`)

Column order from `ZEBRA` (alphabetical rank): `Z=5 E=2 B=1 R=4 A=... `
Ranks: `A=1, B=2, E=3, R=4, Z=5` -> keyword columns get order
`Z->5, E->3, B->2, R->4, A->1`.

Plaintext: `MEETMEATNOON` (pad with `X` to fill the grid)

```
Keyword : Z  E  B  R  A
Order   : 5  3  2  4  1
          ------------------
          M  E  E  T  M
          E  A  T  N  O
          O  N  X  X  X
```

Read columns in order 1..5:

```
Order 1 (A): M O X
Order 2 (B): E T X
Order 3 (E): E A N
Order 4 (R): T N X
Order 5 (Z): M E O
```

**Encryption:** `MEETMEATNOON`  ->  `MOXETXEANTNXMEO`

**Decryption:** recreate the grid dimensions, fill the columns back in numeric
order, then read row by row and strip the padding to recover `MEETMEATNOON`.

---

# Result

The substitution ciphers (Caesar, Playfair, Hill, Vigenere) and the
transposition ciphers (Rail Fence, Columnar) were studied and their
encryption / decryption processes were successfully demonstrated with worked
examples.

| Technique       | Type          | Unit encrypted     |
|-----------------|---------------|--------------------|
| Caesar          | Substitution  | single letter      |
| Playfair        | Substitution  | digraph (2 letters)|
| Hill            | Substitution  | n-letter block     |
| Vigenere        | Substitution  | single letter      |
| Rail Fence      | Transposition | reorders letters   |
| Columnar        | Transposition | reorders letters   |
