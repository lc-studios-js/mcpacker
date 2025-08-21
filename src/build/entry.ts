import type { BuildConfig } from "@/config";
import chalk from "chalk";
import { buildPack } from "./build-pack";

export const build = async (config: BuildConfig, signal?: AbortSignal): Promise<void> => {
	signal?.throwIfAborted();

	if (config.packs === undefined || config.packs.length <= 0) {
		console.warn(chalk.yellow("Build ignored because no packs are defined"));
		return;
	}

	console.log(chalk.magenta("Build start"));

	const promises = config.packs.map((pack) => {
		return buildPack(pack, signal);
	});

	await Promise.all(promises);

	console.log(chalk.magenta("Build finished"));
};
