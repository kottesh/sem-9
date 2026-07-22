// LESSON 2 — see what keys actually send.
// This is how you demystify keyboard input forever. Put the terminal in RAW mode
// (no line-buffering, no echo) and print the raw bytes of every keypress.
//
// Run it:   node 02-keydump.mjs      (press keys; Ctrl+C to quit)
//
// Try: letters, arrows, Enter, Ctrl+J, Backspace, Home/End, Alt+B.
// You'll SEE that:
//   - 'a'        -> "61"                (one byte, the letter)
//   - Enter      -> "0d" (\r)
//   - Ctrl+J     -> "0a" (\n)           <- different byte from Enter!
//   - Up arrow   -> "1b 5b 41" = ESC [ A
//   - Ctrl+A     -> "01"                (Ctrl+letter = letter minus 0x60)
//   - Backspace  -> "7f"
//   - Alt+b      -> "1b 62" = ESC b
// Now the keymap file we wrote is obvious, not magic.

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

console.log("Press keys. Ctrl+C to quit.\n");

process.stdin.on("data", (d) => {
    const bytes = [...d].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
    const shown = JSON.stringify(d); // escapes control chars so the line stays readable
    process.stdout.write(`bytes: ${bytes.padEnd(20)} raw: ${shown}\n`);
    if (d === "\x03") { // Ctrl+C
        process.stdin.setRawMode(false);
        process.exit(0);
    }
});
