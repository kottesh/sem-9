# Diffie-Hellman Key Exchange

## Aim

To implement the Diffie-Hellman key exchange, which lets two parties agree on a
shared secret over an insecure channel without ever transmitting it. Both agree
on a public prime modulus `p` and generator `g`; each keeps a private exponent
and exchanges only a public value. Raising the other party's public value to
one's own private exponent yields the same shared secret on both sides, because
`(g^a)^b = (g^b)^a mod p`. Security rests on the difficulty of the discrete
logarithm problem.

## Algorithm

Diffie-Hellman is a key agreement, not an encrypt/decrypt cipher, so its two core
methods are computing a party's public value and deriving the shared secret from
the other party's public value.

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Pub}{PublicValue}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Pub{g, secret, p}}{
  \KwRet (g raised to secret) mod p \tcp*{fast modular exponentiation}
}
\end{algorithm}

\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Shared}{SharedSecret}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Shared{other\_public, my\_secret, p}}{
  \KwRet (other\_public raised to my\_secret) mod p\;
}
\end{algorithm}
```

The full exchange between Alice (private `a`) and Bob (private `b`):

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Pub}{PublicValue}
\SetKwFunction{Shared}{SharedSecret}
Alice and Bob agree on public p (prime) and g (generator)\;
A $\gets$ \Pub{g, a, p} \tcp*{Alice sends A to Bob}
B $\gets$ \Pub{g, b, p} \tcp*{Bob sends B to Alice}
$s_A$ $\gets$ \Shared{B, a, p} \tcp*{Alice computes B raised to a}
$s_B$ $\gets$ \Shared{A, b, p} \tcp*{Bob computes A raised to b}
$s_A$ equals $s_B$ = the shared secret\;
\end{algorithm}
```

## Output

**Exchange** — public parameters `p = 23`, `g = 5`; Alice's private `a = 6`,
Bob's private `b = 15`

Each side computes its public value and sends only that number across the wire:

| Party | Private | Public value = (g raised to private) mod p | Sends |
|-------|---------|--------------------------------------------|-------|
| Alice | a = 6   | (5 raised to 6) mod 23 = 8                 | A = 8 |
| Bob   | b = 15  | (5 raised to 15) mod 23 = 19               | B = 19|

Each side then raises the received value to its own private exponent:

| Party | Computes | (received raised to private) mod p | Result |
|-------|----------|------------------------------------|--------|
| Alice | B^a mod p | (19 raised to 6) mod 23           | 2      |
| Bob   | A^b mod p | (8 raised to 15) mod 23           | 2      |

Both arrive at the same value, so no decryption step is needed; the agreement
itself is the output.

Result: shared secret established = `2`

The private exponents `a` and `b` are never sent; an eavesdropper sees only
`p`, `g`, `A = 8` and `B = 19`, and recovering the secret would require solving
the discrete logarithm.
