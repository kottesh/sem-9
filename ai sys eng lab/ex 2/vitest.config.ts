import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,
        pool: "threads",
        include: ["**/src/**/*.test.ts"],
        environment: "node"
    }
});
