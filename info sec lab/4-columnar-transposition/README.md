# Columnar Transposition Cipher

## Aim

To implement the keyword columnar transposition cipher. The plaintext is written
row by row into a grid whose width equals the key length; the columns are then
read out in the order given by ranking the key's letters alphabetically (ties
keep their left-to-right order). It only reorders characters, so spaces,
punctuation and case are preserved.

## Algorithm

```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{Encrypt}
\SetKwFunction{Order}{ColumnOrder}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Order{key}}{
  \KwRet column indices sorted by key letter (stable, ascending)\;
}
\Fn{\Encrypt{plain\_text, key}}{
  cols $\gets$ length of key\;
  order $\gets$ \Order{key}\;
  cipher $\gets$ ""\;
  \ForEach{col in order}{
    idx $\gets$ col\;
    \While{idx $<$ length of plain\_text}{
      append plain\_text[idx] to cipher\;
      idx $\gets$ idx + cols \tcp*{step down the column}
    }
  }
  \KwRet cipher\;
}
\end{algorithm}

\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Decrypt}{Decrypt}
\SetKwFunction{Order}{ColumnOrder}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Decrypt{cipher\_text, key}}{
  cols $\gets$ length of key\; len $\gets$ length of cipher\_text\;
  order $\gets$ \Order{key}\;
  fullRows $\gets$ len div cols\; remainder $\gets$ len mod cols\;
  \ForEach{col in order}{
    height $\gets$ fullRows + (1 if col $<$ remainder else 0)\;
    column[col] $\gets$ next height characters of cipher\_text\;
  }
  plain $\gets$ ""\;
  \For{i $\gets$ 0 \KwTo len - 1}{
    c $\gets$ i mod cols\;
    append next unread character of column[c] to plain \tcp*{read row by row}
  }
  \KwRet plain\;
}
\end{algorithm}
```

## Output

**Encrypt** — key `ZEBRA`, plaintext `MEETATNOON`

The key ranks its columns alphabetically (`A` is lowest); ties would keep
left-to-right order. Below each column header is its read rank:

| Column     | Z | E | B | R | A |
|------------|---|---|---|---|---|
| read rank  | 4 | 2 | 1 | 3 | 0 |

The plaintext is written row by row into a 5-column grid:

```
Z E B R A
M E E T A
T N O O N
```

Columns are then read out lowest rank first (A, B, E, R, Z):

| Read order | Column | Rank | Characters |
|------------|--------|------|------------|
| 1          | A      | 0    | A N        |
| 2          | B      | 1    | E O        |
| 3          | E      | 2    | E N        |
| 4          | R      | 3    | T O        |
| 5          | Z      | 4    | M T        |

Result: `MEETATNOON` -> `ANEOENTOMT`

**Decrypt** — key `ZEBRA`, ciphertext `ANEOENTOMT`

With 10 characters over 5 columns there are 2 full rows and no remainder, so each
column holds exactly 2 characters. The ciphertext is sliced back in read order:

| Read order | Column | Height | Slice |
|------------|--------|--------|-------|
| 1          | A      | 2      | AN    |
| 2          | B      | 2      | EO    |
| 3          | E      | 2      | EN    |
| 4          | R      | 2      | TO    |
| 5          | Z      | 2      | MT    |

Reading the reconstructed grid row by row (Z E B R A per row) recovers the text.

Result: `ANEOENTOMT` -> `MEETATNOON`
