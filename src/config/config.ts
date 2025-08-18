import type { CliArgs } from "@/types";

export type BehaviorPackConfig = {
	type: "behavior";
	name?: string;
	srcDir: string;
	outDir: string;
	manifest: string;
};

export type ResourcePackConfig = {
	type: "resource";
	name?: string;
	srcDir: string;
	outDir: string;
	manifest: string;
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
