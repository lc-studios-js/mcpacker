import type { PackConfig } from "@/config";
import { debounce } from "@/utils/debounce";
import { testInclusion } from "@/utils/matching";
import chalk from "chalk";
import * as chokidar from "chokidar";
import fs from "fs-extra";
import { glob } from "glob";
import JSON5 from "json5";
import path from "node:path";
import { bundleScripts } from "./bundle-scripts";

const SCRIPT_FILE_EXTENSIONS = new Set<string>([".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"]);
const TEXTURE_LIST_PATH = "textures/texture_list.json";
const TEXTURES_DIR_PREFIX = "textures/";

type BuildPackContext = {
	pack: PackConfig;
	cache: Cache;
	srcDir: string;
	outDir: string;
	signal?: AbortSignal;
};

type Cache = {
	[filePath: string]: {
		timestamp: number;
	};
};

type FileChange = {
	type: "add" | "change" | "remove";
	filePath: string;
};

const shouldInclude = (srcPath: string, pack: PackConfig): boolean => {
	const srcDir = path.resolve(pack.srcDir);
	const exclude = pack.exclude ?? [];
	exclude.push("manifest.json"); // Manifest files will be generated
	return testInclusion(srcPath, srcDir, pack.include, exclude);
};

const shouldConvertToJson = (srcPath: string): boolean => {
	const ext = path.extname(srcPath);
	return ext === ".jsonc" || ext === ".json5";
};

const getDestPath = (ctx: BuildPackContext, srcPath: string): string => {
	const { srcDir, outDir } = ctx;
	const parsedSrcPath = path.parse(srcPath);

	if (shouldConvertToJson(srcPath)) {
		parsedSrcPath.base = `${parsedSrcPath.name}.json`;
	}

	const relativePath = path.relative(srcDir, path.format(parsedSrcPath));
	return path.join(outDir, relativePath);
};

const getIncludedFiles = async (ctx: BuildPackContext): Promise<string[]> => {
	const { pack, srcDir, signal } = ctx;
	signal?.throwIfAborted();

	const queue = [srcDir];
	const files: string[] = [];

	while (queue.length > 0) {
		signal?.throwIfAborted();
		const dir = queue.shift()!;

		try {
			const entries = await fs.readdir(dir);
			const promises = entries.map(async (entry) => {
				const fullPath = path.join(dir, entry);
				if (!shouldInclude(fullPath, pack)) return;

				const stats = await fs.stat(fullPath);
				if (stats.isDirectory()) {
					queue.push(fullPath);
				} else if (stats.isFile()) {
					files.push(fullPath);
				}
			});
			await Promise.all(promises);
		} catch (error) {
			console.error(chalk.red(`Error reading directory ${dir}:`, error));
		}
	}
	return files;
};

const detectChanges = async (
	ctx: BuildPackContext,
): Promise<{ changes: FileChange[]; newCache: Cache }> => {
	const { cache, signal } = ctx;
	signal?.throwIfAborted();

	const files = await getIncludedFiles(ctx);
	const newCache: Cache = {};
	const changes: FileChange[] = [];
	const currentFiles = new Set<string>();

	for (const filePath of files) {
		signal?.throwIfAborted();
		try {
			const stats = await fs.stat(filePath);
			currentFiles.add(filePath);
			const currentTimestamp = stats.mtimeMs;
			const cachedEntry = cache[filePath];

			if (!cachedEntry) {
				changes.push({ type: "add", filePath });
			} else if (cachedEntry.timestamp !== currentTimestamp) {
				changes.push({ type: "change", filePath });
			}
			newCache[filePath] = { timestamp: currentTimestamp };
		} catch (error) {
			console.error(chalk.red(`Error processing file ${filePath}:`, error));
		}
	}

	for (const filePath in cache) {
		if (!currentFiles.has(filePath)) {
			changes.push({ type: "remove", filePath });
		}
	}
	return { changes, newCache };
};

/**
 * Applies a single file change (add, change, or remove) to the output directory.
 */
const applyFileChange = async (change: FileChange, ctx: BuildPackContext): Promise<void> => {
	const destPath = getDestPath(ctx, change.filePath);

	if (change.type === "remove") {
		if (await fs.pathExists(destPath)) {
			await fs.rm(destPath);
			const destDir = path.dirname(destPath);
			if ((await fs.readdir(destDir)).length === 0) {
				await fs.rm(destDir, { recursive: true, force: true });
			}
		}
		return;
	}

	// Handle 'add' and 'change'
	const srcContent = await fs.readFile(change.filePath);
	let destContent: Buffer | string = srcContent;
	const ext = path.extname(change.filePath);

	if (ext === ".jsonc" || ext === ".json5") {
		destContent = JSON.stringify(JSON5.parse(srcContent.toString("utf8")), null, 2);
	}

	await fs.outputFile(destPath, destContent);
};

/**
 * Generates the texture_list.json file if required and textures have changed.
 */
const generateTextureListIfNeeded = async (
	pack: PackConfig,
	outDir: string,
	textureChangesDetected: boolean,
): Promise<void> => {
	if (!textureChangesDetected || pack.type !== "resource" || !pack.generateTextureList) return;

	const textureDir = path.join(outDir, TEXTURES_DIR_PREFIX);
	const textureFiles = await glob("**/*.png", { cwd: textureDir });
	const textureList = textureFiles.map(
		(file) => `${TEXTURES_DIR_PREFIX}${file.replaceAll("\\", "/").replace(/\.[^/.]+$/, "")}`,
	);
	const json = JSON.stringify(textureList, null, 2);

	await fs.outputFile(path.join(outDir, TEXTURE_LIST_PATH), json, "utf8");
};

/**
 * Bundles scripts using esbuild if required and script files have changed.
 */
const bundleScriptsIfNeeded = async (
	pack: PackConfig,
	srcDir: string,
	outDir: string,
	shouldBundle: boolean,
): Promise<void> => {
	if (!shouldBundle || pack.type !== "behavior" || !pack.scripts) return;
	const scriptsOutDir = path.join(outDir, "scripts");
	if (pack.clean) {
		await fs.rm(scriptsOutDir, { recursive: true, force: true });
	}
	await bundleScripts(pack.scripts, path.join(srcDir, "scripts"), scriptsOutDir);
};

const compilePack = async (ctx: BuildPackContext): Promise<{ newCache: Cache }> => {
	const { pack, srcDir, outDir, signal } = ctx;
	signal?.throwIfAborted();

	const { changes, newCache } = await detectChanges(ctx);
	if (changes.length === 0) {
		return { newCache };
	}

	let shouldBundleScripts = false;
	let textureChangesDetected = false;

	const fileProcessingPromises: Promise<void>[] = [];

	for (const change of changes) {
		signal?.throwIfAborted();
		const relativePath = path.relative(srcDir, change.filePath).replaceAll("\\", "/");

		if (
			pack.type === "behavior" &&
			pack.scripts &&
			SCRIPT_FILE_EXTENSIONS.has(path.extname(change.filePath))
		) {
			shouldBundleScripts = true;
			continue; // Let esbuild handle these files
		}

		if (relativePath.startsWith(TEXTURES_DIR_PREFIX) && path.extname(change.filePath) === ".png") {
			textureChangesDetected = true;
		}
		if (relativePath === TEXTURE_LIST_PATH) {
			textureChangesDetected = true; // In case the user modifies it manually
			continue;
		}

		fileProcessingPromises.push(applyFileChange(change, ctx));
	}

	await Promise.all(fileProcessingPromises);

	await Promise.all([
		bundleScriptsIfNeeded(pack, srcDir, outDir, shouldBundleScripts),
		generateTextureListIfNeeded(pack, outDir, textureChangesDetected),
	]);

	return { newCache };
};

const writeManifestFile = async (pack: PackConfig, signal?: AbortSignal): Promise<void> => {
	signal?.throwIfAborted();
	const filePath = path.resolve(path.join(pack.outDir, "manifest.json"));
	const json = JSON.stringify(pack.manifest, null, 2);
	await fs.outputFile(filePath, json, "utf8");
};

export const buildPack = async (pack: PackConfig, signal?: AbortSignal): Promise<void> => {
	signal?.throwIfAborted();

	const srcDir = path.resolve(pack.srcDir);
	const outDir = path.resolve(pack.outDir);

	if (!(await fs.pathExists(srcDir))) {
		throw new Error("srcDir does not exist");
	}

	if (pack.clean) {
		await fs.rm(outDir, { force: true, recursive: true });
		console.log(`Cleaned the previous build of '${pack.name}'`);
	}
	await fs.ensureDir(outDir);

	await writeManifestFile(pack, signal);

	// In-memory cache, cleared on exit.
	let cache: Cache = {};

	const runCompile = async (): Promise<void> => {
		signal?.throwIfAborted();
		try {
			console.log(`Compiling the pack '${pack.name}'...`);
			const startTime = performance.now();

			const ctx: BuildPackContext = { pack, cache, srcDir, outDir, signal };
			const { newCache } = await compilePack(ctx);
			cache = newCache; // Update cache for the next run

			const endTime = performance.now();
			const compileTimeString = (endTime - startTime).toFixed(2);
			console.log(
				chalk.green(`Compiled the pack '${pack.name}' successfully in ${compileTimeString}ms`),
			);
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				console.warn(chalk.yellow(`Aborted compiling the pack '${pack.name}'`));
			} else {
				console.error(chalk.red(`Error compiling the pack '${pack.name}'`));
				console.error(error);
			}
		}
	};

	await runCompile();

	if (!pack.watch) return;

	signal?.throwIfAborted();
	const watcher = chokidar.watch(srcDir, {
		persistent: true,
		awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
		atomic: 100,
		ignoreInitial: true,
		ignored: (entry) => !shouldInclude(path.resolve(entry), pack),
	});

	const runCompileDebounced = debounce(
		async () => {
			console.log(`File change(s) detected in '${pack.name}'. Recompiling...`);
			await runCompile();
		},
		100,
		signal,
	);

	watcher
		.on("ready", () => console.log(chalk.blue(`Watching for file changes in '${pack.name}'...`)))
		.on("error", (error) => console.error(chalk.red(`Error watching '${pack.name}':`, error)))
		.on("add", runCompileDebounced)
		.on("change", runCompileDebounced)
		.on("unlink", runCompileDebounced);

	return new Promise<void>((resolve, reject) => {
		if (signal?.aborted) {
			watcher
				.close()
				.then(() => reject(signal.reason))
				.catch(reject);
			return;
		}
		signal?.addEventListener(
			"abort",
			() => {
				watcher
					.close()
					.then(() => {
						console.log(chalk.blue(`Stopped watching '${pack.name}'`));
						resolve();
					})
					.catch((error) => {
						console.error(chalk.red(`Error stopping watcher for '${pack.name}':`, error));
						reject(error);
					});
			},
			{ once: true },
		);
	});
};
