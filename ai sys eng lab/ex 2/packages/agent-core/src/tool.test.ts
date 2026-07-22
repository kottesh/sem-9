import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineTool, zodToJsonSchema } from "./tool.js";

describe("zodToJsonSchema", () => {
    it("converts a simple object schema", () => {
        const schema = z.object({
            name: z.string().describe("the name"),
            count: z.number().optional()
        });
        const json = zodToJsonSchema(schema);
        expect(json.type).toBe("object");
        expect(json.properties.name).toMatchObject({ type: "string", description: "the name" });
        expect(json.properties.count).toMatchObject({ type: "number" });
        expect(json.required).toEqual(["name"]);
    });

    it("handles booleans, enums and arrays", () => {
        const schema = z.object({
            on: z.boolean(),
            mode: z.enum(["a", "b"]),
            tags: z.array(z.string())
        });
        const json = zodToJsonSchema(schema);
        expect(json.properties.on).toMatchObject({ type: "boolean" });
        expect(json.properties.mode).toMatchObject({ enum: ["a", "b"] });
        expect(json.properties.tags).toMatchObject({ type: "array" });
    });

    it("produces an empty-object schema for z.object({})", () => {
        const json = zodToJsonSchema(z.object({}));
        expect(json).toEqual({ type: "object", properties: {}, required: [] });
    });
});

describe("defineTool", () => {
    it("returns the tool and derives a JSON schema from the zod params", () => {
        const tool = defineTool({
            name: "greet",
            description: "greets",
            parameters: z.object({ who: z.string() }),
            async execute(args) {
                return { llm: { hi: args.who } };
            }
        });
        expect(tool.name).toBe("greet");
        expect(tool.jsonSchema.type).toBe("object");
        expect(tool.jsonSchema.properties.who).toMatchObject({ type: "string" });
    });

    it("execute receives typed, validated args", async () => {
        const tool = defineTool({
            name: "add",
            description: "adds",
            parameters: z.object({ a: z.number(), b: z.number() }),
            async execute(args) {
                return { llm: args.a + args.b };
            }
        });
        const parsed = tool.parameters.parse({ a: 2, b: 3 });
        const res = await tool.execute(parsed, { deps: {} });
        expect(res.llm).toBe(5);
    });
});
