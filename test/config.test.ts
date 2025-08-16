import { defineConfig, type BuildConfigFunction } from "@/config";
import { describe, expect, it } from "vitest";

describe("defineConfig()", () => {
	it("returns the exact same object", () => {
		const fn: BuildConfigFunction = () => ({});
		const received = defineConfig(fn);

		expect(received).toBe(fn);
	});
});
