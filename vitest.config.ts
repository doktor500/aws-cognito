import "dotenv/config";
import * as path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { PluginOption, UserConfig } from "vite";

const baseDir = path.resolve(__dirname);

export const plugins: PluginOption[] = [tsconfigPaths({ root: baseDir })];

export const rootConfig: UserConfig = {
    plugins,
    test: {
        globals: true,
        hookTimeout: 60000,
        teardownTimeout: 60000,
        testTimeout: 60000,
        reporters: ["default", "hanging-process"],
        include: ["**/*.spec.ts"],
        sequence: {
            concurrent: false,
        },
    },
};

export default defineConfig(rootConfig);