export type BehaviorPackConfig = {
	type: "behavior";
	srcDir: string;
	outDir: string;
	manifest: string;
};

export type ResourcePackConfig = {
	type: "resource";
	srcDir: string;
	outDir: string;
	manifest: string;
};

export type PackConfig = BehaviorPackConfig | ResourcePackConfig;

export type BuildConfig = {
	packs?: PackConfig[];
	watch?: boolean;
};

export type BuildArgs = {
	bpOutDir?: string;
	rpOutDir?: string;
	version?: [number, number, number];
	watch?: boolean;
};

export type BuildConfigFunction = (args: BuildArgs) => BuildConfig | Promise<BuildConfig>;

export const defineConfig = (fn: BuildConfigFunction) => fn;
