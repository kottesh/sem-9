export type WriteFn = (s: string) => void;

/**
 * Incremental stdout writer for live token streaming. Tracks whether any
 * content was written and whether it ended with a newline, so `end()` can
 * finish cleanly without doubling newlines.
 */
export class StreamWriter {
    private lastChar = "";

    constructor(private readonly sink: WriteFn = (s) => process.stdout.write(s)) {}

    /** Whether any content has been written. */
    get wrote(): boolean {
        return this.lastChar !== "";
    }

    write(chunk: string): void {
        if (chunk === "") return;
        this.sink(chunk);
        this.lastChar = chunk[chunk.length - 1] ?? this.lastChar;
    }

    /** Emit a trailing newline if content was written and lacks one. */
    end(): void {
        if (this.wrote && this.lastChar !== "\n") {
            this.sink("\n");
            this.lastChar = "\n";
        }
    }
}
