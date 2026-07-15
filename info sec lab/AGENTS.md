# AGENTS.md

Guidance for AI agents and contributors working in this repo.

## What this is

An **Information Security lab** built as a generic client/server over TCP. The
server hosts multiple crypto/security "exercises". A **generic client** connects,
names one exercise, and then acts as a dumb terminal pipe while that exercise
drives an interactive session over the socket.

- One client at a time (no threads, kept intentionally simple).
- Each exercise owns the socket for the whole interactive session.
- Adding an exercise requires **no Makefile edits** (auto-discovered).

## Layout

```
info sec lab/
├── Makefile            # auto-discovers exercise folders, builds server + client
├── net.hpp             # send_line / recv_line socket helpers (shared)
├── server.cpp          # accept loop + exercise registry (dispatch by name)
├── client.cpp          # generic pipe: prints server output, sends stdin
└── <no>-name/          # ONE folder per exercise
    ├── <no>-name.hpp   #   declarations: pure logic + void run_<name>(int fd)
    └── <no>-name.cpp   #   pure logic + the socket handler (NO main())
```

Example: `1-caesar-cipher/1-caesar-cipher.{hpp,cpp}` with handler `run_caesar`.

## Build & run

```bash
make            # builds ./server and ./client
./server        # terminal 1  -> listens on port 6777
./client caesar # terminal 2  -> "caesar" = the registry key
make clean
```

`./client <exe-name> [host]` — host defaults to `127.0.0.1`, port is `6777`.

## Protocol

1. Client sends the exercise name as the **first line**.
2. Server looks it up in the registry (`server.cpp`) and hands the socket to
   that handler. Unknown name -> error line + close.
3. The handler runs an interactive session using `send_line` / `recv_line`.
4. Session ends when the server closes the connection.

**Client convention (the only client<->server coupling):**
- A server line **ending in `:`** is a *prompt* → client keeps the cursor on the
  same line (prints a space, flushes) and sends back one line of stdin.
- Any other line is *informational* (banner / result) → printed with a newline.

Keep prompts ending in `:` and results/banners NOT ending in `:`, and the
generic client never needs changes.

## Adding a new exercise

Zero Makefile edits — the Makefile globs `[0-9]*-*/[0-9]*-*.cpp` and adds a
`-I` for each folder automatically.

1. `mkdir <no>-name` (e.g. `2-vigenere`).
2. Create `<no>-name/<no>-name.hpp`:
   ```cpp
   #ifndef NAME_HPP
   #define NAME_HPP
   #include <string>
   std::string doThing(std::string in, /* ... */);  // pure logic, no fd
   void run_<name>(int client_fd);                   // socket handler
   #endif
   ```
3. Create `<no>-name/<no>-name.cpp`:
   ```cpp
   #include "<no>-name.hpp"
   #include "net.hpp"
   // pure logic here (no sockets, no I/O)
   void run_<name>(int fd) {
       std::string line;
       send_line(fd, "Enter something:");   // ends in ':' => client replies
       if (!recv_line(fd, line)) return;    // returns false on EOF/error
       send_line(fd, "Result: " + doThing(line));
   }
   ```
4. Register in `server.cpp` (two lines):
   ```cpp
   #include "<no>-name.hpp"                 // with the other includes
   { "<name>", run_<name> },                // in the `registry` map
   ```
5. `make` and run `./client <name>`.

## Conventions & rules

- **No `main()` in exercise files.** The single `main` lives in `server.cpp`
  (and `client.cpp`).
- **Separate pure logic from I/O.** Algorithm functions take/return data only
  (no `fd`, no sockets) so they stay testable. Only `run_<name>(int fd)` touches
  the socket.
- **Use `send_line` / `recv_line`, never `cin` / `cout`** inside handlers — the
  "user" is on the other end of the socket.
- Handler signature is always `void run_<name>(int fd)`; the registry stores
  `void(*)(int)` (aliased as `Handler` in `server.cpp`).
- `recv_line` returns `false` on EOF/error — always check it and `return` early.
- C++17, warnings on (`-Wall -Wextra`).
- **No section-divider / banner comments** of any kind (e.g. `// -----` boxes
  or `// === Foo ===` headers). Keep comments short and inline; let the code
  structure and function names speak for themselves.

## Exercise documentation (README + PDF)

Each exercise folder carries a `README.md` written to be rendered to PDF with
pandoc + LaTeX (`algorithm2e`). It is a lab-report style writeup, NOT API docs.

### Structure (exactly these three sections, in order)

1. `# <Exercise Title>` — the H1.
2. `## Aim` — one short prose paragraph: what the cipher does and its key
   properties (what is preserved, what is dropped, etc.).
3. `## Algorithm` — the **encrypt and decrypt methods only**, typeset as
   `algorithm2e` pseudo-code inside a raw-LaTeX passthrough block (see below).
4. `## Output` — one worked encrypt example and one worked decrypt example,
   each with a short lead-in line then a step table.

### Hard constraints

- **Pseudo-code, NOT mathematical equations.** The Algorithm section is
  `algorithm2e` (Function / foreach / if-else / return), never `$$ ... $$`
  math formulae. Do not "mathify" the algorithm.
- **Only encrypt + decrypt** appear in Algorithm — no key-schedule/setup helpers,
  no socket handler.
- **LaTeX-safe characters only** (pdflatex, not xelatex). Do NOT use raw Unicode
  `− → … ≤ ≥ φ`. Use `-`, `->`, `to`, `<=`, `>=`, spell out `phi`. Em dash `—`
  in prose is fine (pandoc handles it).
- **Worked-example tables merge the calculation into ONE column**, with the
  formula in that column's header and the substituted computation in each cell,
  e.g. header `final_pos = (pos + shift) mod 26`, cell `(7 + 3) mod 26 = 10`.
  Do not split `+shift` and `mod` into separate columns.
- End each example with a `Result: INPUT -> OUTPUT` line.

### algorithm2e block template

Raw LaTeX is passed through by fencing with `{=latex}`. Underscores in
identifiers must be escaped (`plain\_text`). Use `$\gets$` for assignment,
`\tcp*{...}` for inline comments.

```` markdown
```{=latex}
\begin{algorithm}[H]
\DontPrintSemicolon
\SetKwFunction{Encrypt}{Encrypt}
\SetKwProg{Fn}{Function}{:}{}
\Fn{\Encrypt{plain\_text, key}}{
  result $\gets$ ""\;
  \ForEach{item in plain\_text}{
    \uIf{condition}{ do something\; }
    \Else{ append item to result \tcp*{note} }
  }
  \KwRet result\;
}
\end{algorithm}
```
````

### Building the PDF

The preamble that loads the package lives in a header file passed with `-H`:

```bash
# header file (create once, reuse for every exercise)
echo '\usepackage[ruled,vlined,linesnumbered]{algorithm2e}' > /tmp/algo-header.tex

pandoc README.md -o README.pdf --pdf-engine=pdflatex \
       -H /tmp/algo-header.tex -V geometry:margin=1in
```

Requires the `algorithm2e` + `algorithmicx` TeX packages (Arch:
`texlive-mathscience`). Preview with `zathura README.pdf`; to sanity-check the
render headlessly, `pdftoppm -png -r 110 -f 1 -l 1 README.pdf out` and view the
PNG. Always confirm the worked examples match the real code output.

## Notes

- Port is hardcoded to `6777` in both `server.cpp` and `client.cpp`.
- `run` is a stale prebuilt binary from before the restructure; not part of the
  build. Ignore or delete.
