# Rail Fence Cipher

## Aim

To implement the Rail Fence cipher, a transposition cipher that writes the text
in a zig-zag pattern across a number of "rails" (rows), then reads the rails off
one after another to form the ciphertext. It only reorders characters, so every
character (including spaces, punctuation, and case) is preserved.

## Algorithm

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{Encrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Encrypt{plain\_text, rails}}{
  \If{rails $\leq$ 1}{ \KwRet plain\_text \tcp*{nothing to fold} }
  lines $\gets$ array of rails empty strings\;
  rail $\gets$ 0\; dir $\gets$ +1\;
  \ForEach{character ch in plain\_text}{
    append ch to lines[rail]\;
    \If{rail = 0}{ dir $\gets$ +1 }
    \If{rail = rails - 1}{ dir $\gets$ -1 }
    rail $\gets$ rail + dir \tcp*{bounce between top and bottom rail}
  }
  \KwRet concatenation of all lines\;
}
\end{algorithm}

\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Decrypt}{Decrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Decrypt{cipher\_text, rails}}{
  \If{rails $\leq$ 1}{ \KwRet cipher\_text }
  rail\_of $\gets$ rail index for each position \tcp*{re-walk the same zig-zag}
  lines $\gets$ slice cipher\_text into rails, taking each rail's count in order\;
  idx $\gets$ array of rails zeros\;
  plain $\gets$ empty string of same length\;
  \ForEach{position i following the zig-zag}{
    rail $\gets$ rail\_of[i]\;
    plain[i] $\gets$ lines[rail][idx[rail]]\;
    idx[rail] $\gets$ idx[rail] + 1\;
  }
  \KwRet plain\;
}
\end{algorithm}
```

## Output

**Encrypt** — plaintext `HELLOWORLD`, rails `3`

Writing the letters in a zig-zag over 3 rails (a dot marks an empty cell):

```
rail 0:  H . . . O . . . L .
rail 1:  . E . L . W . R . D
rail 2:  . . L . . . O . . .
```

Each character lands on a rail as the path bounces down then up:

| Char | Index | Rail |
|------|-------|------|
| H    | 0     | 0    |
| E    | 1     | 1    |
| L    | 2     | 2    |
| L    | 3     | 1    |
| O    | 4     | 0    |
| W    | 5     | 1    |
| O    | 6     | 2    |
| R    | 7     | 1    |
| L    | 8     | 0    |
| D    | 9     | 1    |

Reading the rails top to bottom: rail 0 = `HOL`, rail 1 = `ELWRD`, rail 2 = `LO`.

Result: `HELLOWORLD` -> `HOLELWRDLO`

**Decrypt** — ciphertext `HOLELWRDLO`, rails `3`

Re-walking the zig-zag shows each rail holds a known number of characters, so the
ciphertext is sliced back into the rails first:

| Rail | Count | Slice of `HOLELWRDLO` |
|------|-------|-----------------------|
| 0    | 3     | HOL                   |
| 1    | 5     | ELWRD                 |
| 2    | 2     | LO                    |

Then the zig-zag is followed again, taking the next unused character from the
rail that each position belongs to (0,1,2,1,0,1,2,1,0,1), rebuilding the text.

Result: `HOLELWRDLO` -> `HELLOWORLD`
