# Playfair Cipher

## Aim

To implement the Playfair cipher, a digraph substitution cipher that encrypts
letters two at a time using a 5x5 key matrix. The alphabet is fit into 25 cells
by merging `J` into `I`; text is uppercased and non-letters are dropped. Repeated
letters in a pair are split with an `X`, and an odd-length message is padded with
a trailing `X`.

## Algorithm

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{Encrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Encrypt{plain\_text, key}}{
  grid $\gets$ 5x5 matrix from key then A..Z (J merged into I)\;
  text $\gets$ sanitize(plain\_text) \tcp*{uppercase, letters only, J to I}
  digraphs $\gets$ split text into pairs \tcp*{insert X between equal letters; pad tail with X}
  cipher $\gets$ ""\;
  \ForEach{pair (a, b) in digraphs}{
    (r1, c1) $\gets$ position of a\;
    (r2, c2) $\gets$ position of b\;
    \uIf{r1 = r2}{ c1 $\gets$ (c1 + 1) mod 5\; c2 $\gets$ (c2 + 1) mod 5 \tcp*{same row: shift right} }
    \uElseIf{c1 = c2}{ r1 $\gets$ (r1 + 1) mod 5\; r2 $\gets$ (r2 + 1) mod 5 \tcp*{same col: shift down} }
    \Else{ swap(c1, c2) \tcp*{rectangle: swap columns} }
    append grid[r1][c1] and grid[r2][c2] to cipher\;
  }
  \KwRet cipher\;
}
\end{algorithm}

\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Decrypt}{Decrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Decrypt{cipher\_text, key}}{
  grid, digraphs built as in Encrypt\;
  plain $\gets$ ""\;
  \ForEach{pair (a, b) in digraphs}{
    (r1, c1) $\gets$ position of a\;
    (r2, c2) $\gets$ position of b\;
    \uIf{r1 = r2}{ c1 $\gets$ (c1 - 1) mod 5\; c2 $\gets$ (c2 - 1) mod 5 \tcp*{same row: shift left} }
    \uElseIf{c1 = c2}{ r1 $\gets$ (r1 - 1) mod 5\; r2 $\gets$ (r2 - 1) mod 5 \tcp*{same col: shift up} }
    \Else{ swap(c1, c2) \tcp*{rectangle: swap columns} }
    append grid[r1][c1] and grid[r2][c2] to plain\;
  }
  \KwRet plain\;
}
\end{algorithm}
```

## Output

**Encrypt** — key `MONARCHY`, plaintext `BALLOON`

The key builds this 5x5 matrix (row, col are 0-based):

```
    0  1  2  3  4
0   M  O  N  A  R
1   C  H  Y  B  D
2   E  F  G  I  K
3   L  P  Q  S  T
4   U  V  W  X  Z
```

`BALLOON` splits into digraphs `BA LX LO ON` (the double `LL` is split by an `X`).
Each pair is enciphered by its rule:

| Digraph | Positions | Rule | New positions | Cipher |
|---------|-----------|------|---------------|--------|
| B A     | (1,3) (0,3) | same col -> shift down | (2,3) (1,3) | I B    |
| L X     | (3,0) (4,3) | rectangle -> swap cols | (3,3) (4,0) | S U    |
| L O     | (3,0) (0,1) | rectangle -> swap cols | (3,1) (0,0) | P M    |
| O N     | (0,1) (0,2) | same row -> shift right | (0,2) (0,3) | N A    |

Result: `BALLOON` -> `IBSUPMNA`

**Decrypt** — key `MONARCHY`, ciphertext `IBSUPMNA`

The same matrix and pairing are used; row/column rules move the opposite way.

| Digraph | Positions | Rule | New positions | Plain |
|---------|-----------|------|---------------|-------|
| I B     | (2,3) (1,3) | same col -> shift up | (1,3) (0,3) | B A   |
| S U     | (3,3) (4,0) | rectangle -> swap cols | (3,0) (4,3) | L X   |
| P M     | (3,1) (0,0) | rectangle -> swap cols | (3,0) (0,1) | L O   |
| N A     | (0,2) (0,3) | same row -> shift left | (0,1) (0,2) | O N   |

Result: `IBSUPMNA` -> `BALXLOON`

The recovered `BALXLOON` still holds the padding `X` inserted during encryption;
Playfair cannot tell filler `X`s from real ones, so removing them is left to the
reader.
