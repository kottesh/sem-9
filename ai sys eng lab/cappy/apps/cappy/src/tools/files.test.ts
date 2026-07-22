import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileTool, writeFileTool, listFilesTool } from "./files.js";

let dir: string;
const ctx = () => ({ deps: { ui: { fileView: () => {}, info: () => {} } } }) as any;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cappy-"));
});
afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe("readFileTool", () => {
    it("reads a file's contents", async () => {
        const p = join(dir, "resume.md");
        writeFileSync(p, "# Experience\nDid things");
        const res = await readFileTool.execute({ path: p }, ctx());
        expect((res.llm as any).content).toContain("Did things");
    });

    it("reports an error for a missing file", async () => {
        const res = await readFileTool.execute({ path: join(dir, "nope.txt") }, ctx());
        expect((res.llm as any).error).toBeTruthy();
    });
});

describe("writeFileTool", () => {
    it("writes content and creates parent dirs", async () => {
        const p = join(dir, "out", "improved.md");
        const res = await writeFileTool.execute({ path: p, content: "better resume" }, ctx());
        expect((res.llm as any).ok).toBe(true);
        expect(existsSync(p)).toBe(true);
        expect(readFileSync(p, "utf8")).toBe("better resume");
    });
});

describe("listFilesTool", () => {
    it("lists entries in a directory", async () => {
        writeFileSync(join(dir, "a.txt"), "1");
        writeFileSync(join(dir, "b.txt"), "2");
        const res = await listFilesTool.execute({ path: dir }, ctx());
        const names = (res.llm as any).entries.map((e: any) => e.name).sort();
        expect(names).toEqual(["a.txt", "b.txt"]);
    });
});
