// LESSON 1 — the grid and absolute positioning.
// A terminal is a grid of cells with ONE cursor. You move it with escape codes.
// Escape code = ESC (\x1b) + "[" + args + a letter. The terminal reads these as
// COMMANDS, not text. (If you pipe this to a file you'll see the raw codes —
// proof that they're just bytes a real terminal interprets.)
//
// Run it in a REAL terminal:   node 01-hello-cursor.mjs

const out = process.stdout;

out.write("\x1b[2J");     // clear the whole screen
out.write("\x1b[H");      // cursor home = row 1, col 1

out.write("\x1b[3;10H");  // ABSOLUTE move: row 3, column 10
out.write("X  <- I am at row 3, col 10");

out.write("\x1b[6;1H");   // row 6, col 1
out.write("These land exactly where I told the cursor to go.");

out.write("\x1b[9;1H");   // park low so the shell prompt returns cleanly
out.write("done. (press enter)\n");
