export const SPINNER_FRAMES = ["\u280b", "\u2819", "\u2839", "\u2838", "\u283c", "\u2834", "\u2826", "\u2827", "\u2807", "\u280f"] as const;

/** Frame-based spinner. Pure tick logic; the caller decides when to render. */
export class Spinner {
    private i = 0;

    /** Return the current frame and advance. */
    frame(): string {
        const f = SPINNER_FRAMES[this.i % SPINNER_FRAMES.length]!;
        this.i++;
        return f;
    }

    reset(): void {
        this.i = 0;
    }
}
