#!/usr/bin/env node

import chalk from "chalk";
import { program } from "commander";
import { fileURLToPath } from "node:url";
import packageData from "../package.json" with { type: "json" };
import { build } from "./build/entry";
import type { BuildConfig } from "./config";
import { loadConfig } from "./config-loader";
import type { CliArgs } from "./types";

const main = async () => {
	program
		.name("mcpacker")
		.description("Minecraft Bedrock addon compiler")
		.version(packageData.version)
		.option("-c, --config <file>", "path to the configuration file", "mcpacker.config.mjs")
		.option("-w, --watch", "sets property 'watch' in config function args")
		.option("--packVersion <version>", "sets property 'packVersion' in config function args");

	await program.parseAsync(process.argv);

	const options = program.opts();

	let packVersion: CliArgs["packVersion"] = undefined;

	if (options.packVersion !== undefined) {
		const regex = /^\d+\.\d+\.\d+$/;
		if (!regex.test(options.packVersion)) {
			console.error(chalk.red(`packVersion must match the pattern ${regex.source}`));
			return;
		}

		// @ts-expect-error
		packVersion = (options.packVersion as string).split(".").map((value) => Number(value));
	}

	const cliArgsObject: CliArgs = {
		packVersion,
		watch: !!options.watch,
	};

	let config: BuildConfig;
	try {
		config = await loadConfig(options.config, cliArgsObject);
	} catch (error) {
		console.error(chalk.red(`Failed to load config file (${options.config})`, error));
		return;
	}

	const controller = new AbortController();
	const { signal } = controller;

	const onInterrupt = () => {
		console.warn(chalk.yellow("Aborting..."));
		controller.abort();
	};

	process.once("SIGINT", onInterrupt);

	await build(config, signal);

	process.off("SIGINT", onInterrupt);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
