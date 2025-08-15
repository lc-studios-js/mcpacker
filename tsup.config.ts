import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	outDir: "dist",
	clean: true,
	format: "esm",
	dts: true,
	skipNodeModulesBundle: true,
});
