import { z } from "zod";

export interface JsonSchema {
    type: "object";
    properties: Record<string, Record<string, unknown>>;
    required: string[];
}

export interface ToolContext<C> {
    deps: C;
    signal?: AbortSignal;
}

export interface ToolResult {
    /** Compact payload returned to the model. */
    llm: unknown;
    /** Optional side effect to render rich output for the human. */
    render?: () => void;
}

/**
 * A vendor-neutral tool definition. Authors write this shape only; provider
 * adapters translate `jsonSchema` into whatever wire format an LLM API needs.
 */
export interface Tool<C = unknown, A = unknown> {
    name: string;
    description: string;
    parameters: z.ZodType<A>;
    jsonSchema: JsonSchema;
    execute(args: A, ctx: ToolContext<C>): Promise<ToolResult>;
}

export interface ToolInput<C, A> {
    name: string;
    description: string;
    parameters: z.ZodType<A>;
    execute(args: A, ctx: ToolContext<C>): Promise<ToolResult>;
}

/** Convert a subset of zod schemas into JSON Schema for tool declarations. */
export function zodToJsonSchema(schema: z.ZodType): JsonSchema {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape ?? {};
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const [key, raw] of Object.entries(shape)) {
        let field = raw as z.ZodTypeAny;
        let optional = false;
        const description = field._def.description as string | undefined;

        if (field instanceof z.ZodOptional) {
            optional = true;
            field = field.unwrap();
        }
        if (field instanceof z.ZodDefault) {
            optional = true;
            field = field._def.innerType;
        }

        properties[key] = describeField(field, description);
        if (!optional) required.push(key);
    }

    return { type: "object", properties, required };
}

function describeField(field: z.ZodTypeAny, description?: string): Record<string, unknown> {
    const desc = description ?? (field._def.description as string | undefined);
    const base: Record<string, unknown> = {};
    if (desc) base.description = desc;

    if (field instanceof z.ZodString) return { type: "string", ...base };
    if (field instanceof z.ZodNumber) return { type: "number", ...base };
    if (field instanceof z.ZodBoolean) return { type: "boolean", ...base };
    if (field instanceof z.ZodEnum) return { type: "string", enum: field._def.values, ...base };
    if (field instanceof z.ZodArray) {
        return { type: "array", items: describeField(field._def.type), ...base };
    }
    if (field instanceof z.ZodObject) {
        const nested = zodToJsonSchema(field);
        return { ...nested, ...base };
    }
    return { type: "string", ...base };
}

/** Author a tool; the JSON schema is derived once from the zod params. */
export function defineTool<C, A>(input: ToolInput<C, A>): Tool<C, A> {
    return {
        name: input.name,
        description: input.description,
        parameters: input.parameters,
        jsonSchema: zodToJsonSchema(input.parameters),
        execute: input.execute
    };
}
