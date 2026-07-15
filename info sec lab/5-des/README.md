# DES (Data Encryption Standard)

## Aim

To implement DES, a 64-bit block cipher built on a 16-round Feistel network with
a 56-bit effective key. A single block is encrypted with an initial permutation,
16 rounds of expansion / key mixing / S-box substitution / permutation, and a
final permutation; decryption runs the same rounds with the subkeys reversed.
Arbitrary text is handled in ECB mode with PKCS#5 padding, and the ciphertext is
shown as hexadecimal.

## Algorithm

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{EncryptBlock}
\SetKwFunction{F}{Feistel}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Encrypt{block, key}}{
  subkeys[0..15] $\gets$ key schedule of key \tcp*{PC1, rotate halves, PC2}
  block $\gets$ IP(block) \tcp*{initial permutation}
  (L, R) $\gets$ left and right 32 bits of block\;
  \For{round $\gets$ 0 \KwTo 15}{
    prevR $\gets$ R\;
    R $\gets$ L XOR \F{R, subkeys[round]}\;
    L $\gets$ prevR\;
  }
  preoutput $\gets$ (R, L) \tcp*{note the final swap}
  \KwRet FP(preoutput) \tcp*{final permutation}
}
\Fn{\F{R, subkey}}{
  x $\gets$ E(R) XOR subkey \tcp*{expand 32 to 48 bits, mix key}
  y $\gets$ S-box substitution of x \tcp*{8 boxes, 6 bits in, 4 bits out}
  \KwRet P(y) \tcp*{permutation}
}
\end{algorithm}

\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Decrypt}{DecryptBlock}
\SetKwFunction{F}{Feistel}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Decrypt{block, key}}{
  subkeys[0..15] $\gets$ key schedule of key \tcp*{same schedule as encryption}
  block $\gets$ IP(block)\;
  (L, R) $\gets$ left and right 32 bits of block\;
  \For{round $\gets$ 0 \KwTo 15}{
    prevR $\gets$ R\;
    R $\gets$ L XOR \F{R, subkeys[15 - round]} \tcp*{reversed: K16, K15, ..., K1}
    L $\gets$ prevR\;
  }
  preoutput $\gets$ (R, L)\;
  \KwRet FP(preoutput)\;
}
\end{algorithm}
```

For arbitrary text the block cipher is wrapped: pad the plaintext to a multiple
of 8 bytes with PKCS#5, encrypt each 8-byte block independently (ECB), and print
the bytes as hex. Decryption reverses this and strips the padding.

## Output

**Encrypt (single block)** — the standard DES test vector

| Field       | Value (hex)          |
|-------------|----------------------|
| plaintext   | `0123456789ABCDEF`   |
| key         | `133457799BBCDFF1`   |
| ciphertext  | `85E813540F0AB405`   |

The 16 rounds run in order and the block matches the published FIPS result.

**Decrypt (single block)** — same key, reversed subkeys

| Field       | Value (hex)          |
|-------------|----------------------|
| ciphertext  | `85E813540F0AB405`   |
| key         | `133457799BBCDFF1`   |
| plaintext   | `0123456789ABCDEF`   |

**Encrypt (text mode)** — plaintext `HELLO`, key `secret_k`

`HELLO` is 5 bytes, so PKCS#5 pads it to 8 bytes (append three `0x03` bytes),
making one block. That block is DES-encrypted and printed as hex.

| Step            | Value                         |
|-----------------|-------------------------------|
| plaintext bytes | `48 45 4C 4C 4F`              |
| after padding   | `48 45 4C 4C 4F 03 03 03`     |
| ciphertext hex  | `CE25474AD7A640DA`            |

Result: `HELLO` -> `CE25474AD7A640DA`

**Decrypt (text mode)** — ciphertext `CE25474AD7A640DA`, key `secret_k`

The hex is decoded to one 8-byte block, DES-decrypted, and the PKCS#5 padding
(the trailing `0x03` bytes) is removed.

| Step             | Value                         |
|------------------|-------------------------------|
| decrypted bytes  | `48 45 4C 4C 4F 03 03 03`     |
| after unpadding  | `48 45 4C 4C 4F`              |
| plaintext        | `HELLO`                       |

Result: `CE25474AD7A640DA` -> `HELLO`
