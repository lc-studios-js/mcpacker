import path from "node:path";
import type { BuildConfig } from "./config";
import { pathToFileURL } from "node:url";
import type { CliArgs } from "./types";

export const loadConfig = async (filePath: string, cliArgs: CliArgs): Promise<BuildConfig> => {
	const url = pathToFileURL(path.resolve(filePath)).toString();
	const imported = await import(url);
	const configFn = imported.default as unknown;

	if (configFn == undefined || typeof configFn !== "function") {
		throw new Error(
			`Config file must default-export a function. You can import { defineConfig() } from "@lc-studios-js/mcpacker"`,
		);
	}

	const config = configFn(cliArgs);

	if (typeof config !== "object") {
		throw new Error(`Config must be an object. Received ${typeof config}`);
	}

	return config;
};
