import type { CliArgs } from "@/types";

export type BehaviorPackConfig = {
	type: "behavior";
	srcDir: string;
	outDir: string;
	manifest: string;
	name?: string;
	clean?: boolean;
};

export type ResourcePackConfig = {
	type: "resource";
	srcDir: string;
	outDir: string;
	manifest: string;
	name?: string;
	clean?: boolean;
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
