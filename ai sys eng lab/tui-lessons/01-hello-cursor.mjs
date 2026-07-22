// LESSON 1: the terminal is a grid. You paint with escape codes.
// An "escape code" is: ESC (byte 0x1b, written "\x1b") + some letters/numbers.
// The terminal reads these NOT as text to show, but as COMMANDS.

const out = process.stdout;

out.write("\x1b[2J");      // CSI 2 J  = clear entire screen
out.write("\x1b[H");       // CSI H    = move cursor to home = row 1, col 1

out.write("\x1b[3;10H");   // CSI row;col H = move cursor to row 3, col 10
out.write("X");            // print an X exactly there

out.write("\x1b[5;20H");   // jump to row 5, col 20
out.write("hello");        // prints starting there

out.write("\x1b[10;1H");   // park cursor low so your shell prompt returns cleanly
out.write("\n");
