import type { CliArgs } from "@/types";
import type * as esbuild from "esbuild";

export type BehaviorPackScriptsConfig = {
	entry: string;
	bundle?: boolean;
	minify?: boolean;
	sourceMap?: boolean;
	tsconfig?: string;
	esbuildOptionOverrides?: esbuild.CommonOptions;
};

export type BehaviorPackConfig = {
	type: "behavior";
	srcDir: string;
	outDir: string;
	manifest: Record<string, unknown>;
	name?: string;
	clean?: boolean;
	scripts?: BehaviorPackScriptsConfig;
	include?: string[];
	exclude?: string[];
};

export type ResourcePackConfig = {
	type: "resource";
	srcDir: string;
	outDir: string;
	manifest: Record<string, unknown>;
	name?: string;
	clean?: boolean;
	generateTextureList?: boolean;
	include?: string[];
	exclude?: string[];
};

export type PackConfig = BehaviorPackConfig | ResourcePackConfig;

export type BuildConfig = {
	packs?: PackConfig[];
	watch?: boolean;
};

export type BuildConfigFunction = (args: CliArgs) => BuildConfig | Promise<BuildConfig>;

export const defineConfig = (fn: BuildConfigFunction) => fn;

export const getPackName = (pack: PackConfig, packIndex?: number): string => {
	if (pack.name === undefined) {
		return `PACK@${packIndex ?? -1}`;
	}
	return pack.name;
};
