# Caesar Cipher

## Aim

To implement the Caesar cipher, a monoalphabetic substitution cipher that
encrypts text by shifting each alphabetic character a fixed number of positions
down the alphabet, and decrypts by shifting back by the same amount. Non-letters
are left unchanged and letter case is preserved.

## Algorithm

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{Encrypt}
\SetKwFunction{Decrypt}{Decrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Encrypt{plain\_text, shift}}{
  cipher\_text $\gets$ ""\;
  \ForEach{character ch in plain\_text}{
    \uIf{ch is an uppercase letter}{
      offset $\gets$ (ch $-$ `A' $+$ shift) mod 26\;
      append (`A' $+$ offset) to cipher\_text\;
    }
    \uElseIf{ch is a lowercase letter}{
      offset $\gets$ (ch $-$ `a' $+$ shift) mod 26\;
      append (`a' $+$ offset) to cipher\_text\;
    }
    \Else{
      append ch to cipher\_text \tcp*{leave non-letters as-is}
    }
  }
  \KwRet cipher\_text\;
}
\end{algorithm}

\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{Encrypt}
\SetKwFunction{Decrypt}{Decrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Decrypt{cipher\_text, shift}}{
  \KwRet \Encrypt{cipher\_text, $-$shift} \tcp*{shift back by the same amount}
}
\end{algorithm}
```

## Output

**Encrypt** — plaintext `HELLO`, shift `3`

Each letter's position (A = 0 to Z = 25) is advanced by 3, wrapping around with
`mod 26`.

| Char | Position | final_pos = (pos + shift) mod 26 | Cipher char |
|------|----------|-----------------------|-------------|
| H    | 7        | (7 + 3) mod 26 = 10   | K           |
| E    | 4        | (4 + 3) mod 26 = 7    | H           |
| L    | 11       | (11 + 3) mod 26 = 14  | O           |
| L    | 11       | (11 + 3) mod 26 = 14  | O           |
| O    | 14       | (14 + 3) mod 26 = 17  | R           |

Result: `HELLO` -> `KHOOR`

**Decrypt** — ciphertext `KHOOR`, shift `3`

Each letter is moved back by 3 (equivalently, encrypt with shift `-3`); the
`+ 26` before `mod 26` keeps the result non-negative.

| Char | Position | final_pos = (pos - shift) mod 26 | Plain char |
|------|----------|-----------------------|------------|
| K    | 10       | (10 - 3) mod 26 = 7   | H          |
| H    | 7        | (7 - 3) mod 26 = 4    | E          |
| O    | 14       | (14 - 3) mod 26 = 11  | L          |
| O    | 14       | (14 - 3) mod 26 = 11  | L          |
| R    | 17       | (17 - 3) mod 26 = 14  | O          |

Result: `KHOOR` -> `HELLO`
