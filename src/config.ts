import type * as esbuild from "esbuild";
import type { CliArgs } from "./types";

export type BasePackConfig = {
	name: string;
	srcDir: string;
	outDir: string;
	manifest: Record<string, unknown>;
	include?: string[];
	exclude?: string[];
	clean?: boolean;
	convertJsoncToJson?: boolean;
	convertJson5ToJson?: boolean;
	convertYamlToJson?: boolean;
	watch?: boolean;
};

export type ScriptConfig = {
	entry: string;
	bundle?: boolean;
	minify?: boolean;
	sourceMap?: boolean;
	tsconfig?: string;
	esbuildOptionOverrides?: esbuild.CommonOptions;
};

export type BehaviorPackConfig = BasePackConfig & {
	type: "behavior";
	scripts?: ScriptConfig;
};

export type ResourcePackConfig = BasePackConfig & {
	type: "resource";
	generateTextureList?: boolean;
};

export type PackConfig = BehaviorPackConfig | ResourcePackConfig;

export type BuildConfig = {
	packs?: PackConfig[];
};

export type BuildConfigFunction = (args: CliArgs) => BuildConfig | Promise<BuildConfig>;

export const defineConfig = (fn: BuildConfigFunction) => fn;
